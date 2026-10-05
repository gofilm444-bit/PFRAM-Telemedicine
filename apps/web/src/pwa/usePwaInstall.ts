import { useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Module-level runtime memory (singleton).
// Captured events live ONLY in runtime memory.
// NEVER written to localStorage, sessionStorage, IndexedDB, or cookies.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstalledState = false;
let isListening = false;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  for (const sub of subscribers) {
    sub();
  }
}

function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as unknown as { standalone?: boolean })?.standalone === true,
  );
}

export function initPwaInstallListener() {
  if (typeof window === "undefined" || isListening) return;
  isListening = true;

  if (checkIsStandalone()) {
    isInstalledState = true;
  }

  // Monitor standalone display-mode media query changes
  try {
    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", (e) => {
      if (e.matches) {
        isInstalledState = true;
        deferredPrompt = null;
        notifySubscribers();
      }
    });
  } catch {
    // Ignore environments where matchMedia.addEventListener is not supported
  }

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    // Prevent Chromium mini-infobar
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener("appinstalled", () => {
    isInstalledState = true;
    deferredPrompt = null;
    notifySubscribers();
  });
}

// Auto-initialize once on module evaluation in browser environments
if (typeof window !== "undefined") {
  initPwaInstallListener();
}

/**
 * Resets in-memory state for test isolation across test suites.
 */
export function _resetPwaInstallStateForTesting() {
  deferredPrompt = null;
  isInstalledState = checkIsStandalone();
  notifySubscribers();
}

export function usePwaInstall() {
  // Ensure listener is initialized
  if (typeof window !== "undefined" && !isListening) {
    initPwaInstallListener();
  }

  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    () => deferredPrompt,
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    return isInstalledState || checkIsStandalone();
  });

  useEffect(() => {
    const update = () => {
      setPromptEvent(deferredPrompt);
      setIsInstalled(isInstalledState || checkIsStandalone());
    };

    // Synchronize current in-memory state immediately
    update();

    subscribers.add(update);
    return () => {
      subscribers.delete(update);
    };
  }, []);

  const isIos =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/.test(navigator.userAgent) &&
    !(typeof window !== "undefined" && (window as unknown as { MSStream?: unknown }).MSStream);

  const promptInstall = async (): Promise<"accepted" | "dismissed" | null> => {
    if (!deferredPrompt) return null;
    const currentEvent = deferredPrompt;
    // Clear deferred prompt immediately so it cannot be invoked twice on the same event
    deferredPrompt = null;
    notifySubscribers();

    try {
      await currentEvent.prompt();
      const choice = await currentEvent.userChoice;
      if (choice.outcome === "accepted") {
        isInstalledState = true;
      }
      return choice.outcome;
    } catch {
      // Dismissal or abort is not an application error
      return "dismissed";
    } finally {
      notifySubscribers();
    }
  };

  const canInstall = Boolean(promptEvent && !isInstalled);

  return {
    canInstall,
    isInstalled,
    isIos,
    canShowIosGuidance: isIos && !isInstalled,
    promptInstall,
  };
}
