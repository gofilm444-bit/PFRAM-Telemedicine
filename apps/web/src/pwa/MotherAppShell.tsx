import type { ReactNode } from "react";
import { MotherTopBar } from "./MotherTopBar";
import { MotherBottomNav } from "./MotherBottomNav";
import { useOnlineStatus } from "./useOnlineStatus";

export interface MotherAppShellProps {
  children: ReactNode;
  title?: string | undefined;
  subtitle?: string | undefined;
  showBack?: boolean | undefined;
  onBack?: (() => void) | undefined;
  actions?: ReactNode | undefined;
  hideBottomNav?: boolean | undefined;
  hideTopBar?: boolean | undefined;
}

export function MotherAppShell({
  children,
  title,
  subtitle,
  showBack = false,
  onBack,
  actions,
  hideBottomNav = false,
  hideTopBar = false,
}: MotherAppShellProps) {
  const isOnline = useOnlineStatus();

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#FFF8F2]">
      {/* Centered mobile app canvas */}
      <div className="relative mx-auto flex min-h-screen min-h-[100dvh] w-full max-w-md flex-col bg-[#FFF8F2] shadow-xl md:border-x md:border-slate-200/70">
        {!hideTopBar && (
          <MotherTopBar
            title={title}
            subtitle={subtitle}
            showBack={showBack}
            onBack={onBack}
            actions={actions}
          />
        )}

        {!isOnline && (
          <aside
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 border-b border-amber-200/90 bg-amber-50 px-3.5 py-2 text-xs text-amber-900 shadow-sm"
          >
            <span aria-hidden="true" className="text-sm">⚠️</span>
            <p className="flex-1 text-[11px] leading-tight">
              <strong className="font-semibold">Anda sedang offline.</strong> Beberapa fitur membutuhkan koneksi internet.
            </p>
          </aside>
        )}

        <main
          className={`flex-1 px-4 py-5 ${
            hideBottomNav
              ? "pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
              : "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
          }`}
        >
          {children}
        </main>

        {!hideBottomNav && <MotherBottomNav />}
      </div>
    </div>
  );
}
