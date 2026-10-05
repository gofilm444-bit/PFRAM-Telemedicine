import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export interface MotherTopBarProps {
  title?: string | undefined;
  subtitle?: string | undefined;
  showBack?: boolean | undefined;
  onBack?: (() => void) | undefined;
  actions?: ReactNode | undefined;
}

export function MotherTopBar({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions,
}: MotherTopBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-center gap-3 min-w-0">
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Kembali"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <svg
              className="h-5 w-5 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 p-1.5 shadow-sm ring-1 ring-emerald-200/60">
            <img
              src="/brand/logo-symbol.png"
              alt="PFRAM"
              className="h-7 w-7 object-contain"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {title ? (
            <h1 className="truncate text-base font-bold text-slate-900 leading-tight">
              {title}
            </h1>
          ) : (
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 leading-tight">
                PFRAM
              </span>
              <span className="text-[11px] font-medium text-pfram-primary">
                Telemedicine Maternal
              </span>
            </div>
          )}
          {subtitle && (
            <p className="truncate text-xs font-medium text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
