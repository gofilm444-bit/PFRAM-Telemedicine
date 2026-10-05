import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export let _triggerNeedRefreshForTesting: (() => void) | null = null;

export function PwaUpdateNotification() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    _triggerNeedRefreshForTesting = () => setNeedRefresh(true);
    try {
      const updateFn = registerSW({
        immediate: true,
        onNeedRefresh() {
          setNeedRefresh(true);
        },
        onOfflineReady() {
          // Precache shell ready offline
        },
      });
      setUpdateSW(() => updateFn);
    } catch {
      // Ignored if service workers are unavailable in environment
    }
    return () => {
      _triggerNeedRefreshForTesting = null;
    };
  }, []);

  if (!needRefresh) return null;

  const handleUpdate = () => {
    const isFormActive =
      Boolean(typeof document !== "undefined" && document.querySelector("input:focus, textarea:focus")) ||
      (typeof window !== "undefined" &&
        Boolean((window as unknown as { __pfram_active_recording?: boolean }).__pfram_active_recording));

    if (isFormActive) {
      const proceed = window.confirm(
        "Ada input atau formulir yang sedang aktif. Anda yakin ingin memperbarui dan memuat ulang sekarang?",
      );
      if (!proceed) return;
    }

    if (updateSW) {
      void updateSW();
    } else {
      window.location.reload();
    }
  };

  return (
    <aside
      aria-label="Pemberitahuan pembaruan aplikasi"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10 sm:left-auto sm:right-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
          <svg
            className="h-5 w-5 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">
            Versi baru PFRAM tersedia
          </h2>
          <p className="mt-0.5 text-xs text-slate-300">
            Pembaruan sistem siap diterapkan untuk stabilitas dan fitur terkini.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpdate}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
            >
              Perbarui
            </button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
