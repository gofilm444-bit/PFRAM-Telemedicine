import { Link, useLocation } from "react-router-dom";

export interface NavTabItem {
  to: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const TABS: NavTabItem[] = [
  {
    to: "/m/home",
    label: "Beranda",
    icon: (active) => (
      <svg
        className={`h-5 w-5 transition-colors ${active ? "text-pfram-primary" : "text-slate-400"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2 : 1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    to: "/m/monitoring",
    label: "Pantau",
    icon: (active) => (
      <svg
        className={`h-5 w-5 transition-colors ${active ? "text-pfram-primary" : "text-slate-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.25 : 1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    to: "/m/consultation",
    label: "Konsultasi",
    icon: (active) => (
      <svg
        className={`h-5 w-5 transition-colors ${active ? "text-pfram-primary" : "text-slate-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.25 : 1.75}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    to: "/m/education",
    label: "Edukasi",
    icon: (active) => (
      <svg
        className={`h-5 w-5 transition-colors ${active ? "text-pfram-primary" : "text-slate-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.25 : 1.75}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  {
    to: "/m/account",
    label: "Akun",
    icon: (active) => (
      <svg
        className={`h-5 w-5 transition-colors ${active ? "text-pfram-primary" : "text-slate-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.25 : 1.75}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

export function MotherBottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Navigasi aplikasi ibu"
      className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-md border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
    >
      <div className="flex h-16 items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const isActive = location.pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[48px] min-w-[48px] py-1 transition-all active:scale-95 ${
                isActive
                  ? "text-pfram-primary font-semibold"
                  : "text-slate-400 hover:text-slate-600 font-normal"
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-full px-3 py-1 transition-all ${
                  isActive ? "bg-emerald-100/70 text-pfram-primary shadow-2xs" : "text-slate-400"
                }`}
              >
                {tab.icon(isActive)}
              </div>
              <span
                className={`text-[10px] leading-none tracking-tight ${
                  isActive ? "font-bold text-pfram-primary" : "text-slate-500 font-medium"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
