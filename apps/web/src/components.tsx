import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import { useEffect, useId, useState } from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import type { UserRole } from "@pfram/shared-types";
import { useAuth } from "./auth";

/* =========================================================================
   BUTTON COMPONENT WITH EXPLICIT VARIANTS
   ========================================================================= */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-pfram-primary text-white hover:bg-pfram-text active:bg-pfram-text shadow-sm border border-transparent focus-visible:ring-pfram-primary/50",
  secondary:
    "bg-emerald-50 text-pfram-text hover:bg-emerald-100/90 active:bg-emerald-200/80 border border-emerald-200/90 shadow-sm focus-visible:ring-pfram-primary/50",
  outline:
    "bg-white text-pfram-primary hover:bg-emerald-50 active:bg-emerald-100 border border-pfram-primary shadow-sm focus-visible:ring-pfram-primary/50",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm border border-transparent focus-visible:ring-rose-500/50",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent focus-visible:ring-slate-300",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "min-h-11 px-4 py-2 text-sm rounded-xl gap-2",
  lg: "min-h-12 px-5 py-2.5 text-base rounded-xl gap-2.5",
};

export const Button = ({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled,
  ...props
}: ButtonProps) => {
  // Gracefully handle legacy calls that passed white background overrides in className
  const resolvedVariant: ButtonVariant =
    variant === "primary" &&
    (className.includes("bg-white") || className.includes("border-slate") || className.includes("ring-pfram-primary"))
      ? "outline"
      : variant;

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer ${variantStyles[resolvedVariant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  );
};

/* =========================================================================
   INPUT & PASSWORD INPUT COMPONENTS
   ========================================================================= */

export const Input = ({
  label,
  error,
  id,
  className = "",
  ...p
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label htmlFor={inputId} className="grid gap-1.5 text-sm font-medium text-slate-800">
      <span>{label}</span>
      <input
        id={inputId}
        className={`min-h-11 rounded-xl border ${error ? "border-rose-500 ring-1 ring-rose-500/20" : "border-slate-300"} bg-white px-3.5 text-slate-900 shadow-sm transition-colors focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20 ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...p}
      />
      {error && (
        <span id={`${inputId}-error`} role="alert" className="text-xs font-semibold text-status-emergency">
          {error}
        </span>
      )}
    </label>
  );
};

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string | undefined;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = ({
  label,
  error,
  id,
  options,
  placeholder,
  className = "",
  ...props
}: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <label htmlFor={selectId} className="grid gap-1.5 text-sm font-medium text-slate-800">
      <span>{label}</span>
      <select
        id={selectId}
        className={`min-h-11 rounded-xl border ${error ? "border-rose-500 ring-1 ring-rose-500/20" : "border-slate-300"} bg-white px-3.5 text-slate-900 shadow-sm transition-colors focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20 ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={`${selectId}-error`} role="alert" className="text-xs font-semibold text-status-emergency">
          {error}
        </span>
      )}
    </label>
  );
};

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
      {crossed && <path d="m4 4 16 16" />}
    </svg>
  );
}

export function PasswordInput({
  label,
  error,
  id,
  className = "",
  ...props
}: Omit<Parameters<typeof Input>[0], "type">) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const actionLabel = visible
    ? "Sembunyikan kata sandi"
    : "Tampilkan kata sandi";

  return (
    <div className="grid gap-1.5 text-sm font-medium text-slate-800">
      <label htmlFor={inputId}>{label}</label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          className={`min-h-11 w-full rounded-xl border ${error ? "border-rose-500 ring-1 ring-rose-500/20" : "border-slate-300"} bg-white px-3.5 pr-12 text-slate-900 shadow-sm transition-colors focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20 ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={actionLabel}
          title={actionLabel}
          className="absolute inset-y-0 right-1 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-pfram-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pfram-primary/40"
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>
      {error && (
        <span
          id={`${inputId}-error`}
          role="alert"
          className="text-xs font-semibold text-status-emergency"
        >
          {error}
        </span>
      )}
    </div>
  );
}

/* =========================================================================
   CONTAINERS & TYPOGRAPHY
   ========================================================================= */

export const Card = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-emerald-950/5 ${className}`}
  >
    {children}
  </section>
);

export const Badge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-pfram-text">
    {children}
  </span>
);

export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export function StatusBadge({
  children,
  variant = "neutral",
  size = "sm",
  className = "",
}: {
  children: ReactNode;
  variant?: StatusBadgeVariant;
  size?: "sm" | "md";
  className?: string;
}) {
  const styles: Record<StatusBadgeVariant, string> = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200 ring-emerald-500/20",
    warning: "bg-amber-50 text-amber-800 border-amber-200 ring-amber-500/20",
    danger: "bg-rose-50 text-rose-800 border-rose-200 ring-rose-500/20",
    info: "bg-sky-50 text-sky-800 border-sky-200 ring-sky-500/20",
    neutral: "bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/10",
  };
  const dotStyles: Record<StatusBadgeVariant, string> = {
    success: "bg-emerald-600",
    warning: "bg-amber-500",
    danger: "bg-rose-600",
    info: "bg-sky-600",
    neutral: "bg-slate-500",
  };
  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-xs font-medium",
    md: "px-3 py-1 text-sm font-semibold",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ring-1 ${styles[variant]} ${sizeStyles[size]} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotStyles[variant]}`}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

export const Alert = ({ children }: { children: ReactNode }) => (
  <div
    role="status"
    className="rounded-xl border-l-4 border-status-info bg-sky-50 p-4 text-slate-700 shadow-sm"
  >
    {children}
  </div>
);

export const PageHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

export const EmptyState = ({
  message = "Belum ada data.",
}: {
  message?: string;
}) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center text-slate-500">
    <div className="mb-2 text-2xl" aria-hidden="true">📂</div>
    <p className="text-sm font-medium">{message}</p>
  </div>
);

export const ErrorState = ({
  message = "Terjadi kesalahan.",
}: {
  message?: string;
}) => (
  <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-status-emergency shadow-sm">
    <span className="text-lg" aria-hidden="true">⚠️</span>
    <span>{message}</span>
  </div>
);

export const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div
    aria-label="Memuat"
    className={`min-h-24 animate-pulse rounded-xl bg-emerald-100/70 ${className}`}
  />
);

export function MetricCard({
  title,
  value,
  description,
  badge,
  icon,
  className = "",
  onClick,
}: {
  title: string;
  value: ReactNode;
  description?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`relative overflow-hidden transition-all hover:shadow-md ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            {value}
          </div>
          {description && (
            <p className="text-xs text-slate-600">{description}</p>
          )}
        </div>
        {(icon || badge) && (
          <div className="flex flex-col items-end gap-1.5">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-pfram-primary">
                {icon}
              </div>
            )}
            {badge}
          </div>
        )}
      </div>
    </Card>
  );
}

/* =========================================================================
   AUTHENTICATION & ACCESS GUARDS
   ========================================================================= */

export function AppLoadingScreen({ message = "Memulihkan sesi dan memuat data…" }: { message?: string }) {
  return (
    <div
      role="status"
      aria-label="Memuat aplikasi"
      className="flex min-h-screen flex-col items-center justify-center bg-[#FFF8F2] px-4 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 p-3 shadow-sm ring-1 ring-emerald-200/60 animate-pulse">
        <img
          src="/brand/logo-symbol.png"
          alt="PFRAM"
          className="h-10 w-10 object-contain"
        />
      </div>
      <h2 className="mt-4 text-base font-bold tracking-tight text-slate-800">
        PFRAM Telemedicine
      </h2>
      <p className="mt-1 text-xs text-slate-500">{message}</p>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user && typeof document !== "undefined") {
      let metaRobots = document.querySelector('meta[name="robots"]');
      if (!metaRobots) {
        metaRobots = document.createElement("meta");
        metaRobots.setAttribute("name", "robots");
        document.head.appendChild(metaRobots);
      }
      metaRobots.setAttribute("content", "noindex, nofollow");
    }
  }, [user]);

  if (loading) return <AppLoadingScreen />;
  return user ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}

export function RoleGuard({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? (
    <>{children}</>
  ) : (
    <Navigate to="/403" replace />
  );
}

/* =========================================================================
   NAVIGATION & ROLES
   ========================================================================= */

export function navigationForRole(role?: UserRole): Array<[string, string]> {
  const adminLinks: Array<[string, string]> = [
    ["/users", "Manajemen Akun"],
    ["/regions", "Wilayah"],
    ["/facilities", "Fasilitas Kesehatan"],
    ["/midwives", "Bidan"],
    ["/mothers", "Ibu Hamil"],
    ["/assignments", "Penugasan Bidan"],
    ["/education", "Materi Edukasi"],
  ];
  const midwifeLinks: Array<[string, string]> = [
    ["/my-mothers", "Ibu Binaan"],
    ["/danger-follow-ups", "Perlu Tindak Lanjut"],
    ["/anc-missed", "Jadwal Belum Hadir"],
    ["/consultations", "Konsultasi"],
    ["/midwife-profile", "Profil Bidan"],
  ];
  return role === "ADMIN" ? adminLinks : role === "MIDWIFE" ? midwifeLinks : [];
}

/* =========================================================================
   APP SHELL, SIDEBAR & TOPBAR
   ========================================================================= */

export function Sidebar({ onLinkClick }: { onLinkClick?: (() => void) | undefined }) {
  const { user } = useAuth();
  const roleLinks = navigationForRole(user?.role);
  return <SidebarContent roleLinks={roleLinks} onLinkClick={onLinkClick} />;
}

export function SidebarContent({
  roleLinks,
  onLinkClick,
}: {
  roleLinks: Array<[string, string]>;
  onLinkClick?: (() => void) | undefined;
}) {
  const linkBaseClasses =
    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all";

  return (
    <aside className="flex h-full w-64 flex-col bg-pfram-text p-6 text-white shadow-xl">
      {/* Brand Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm">
          <img
            src="/brand/logo-symbol.png"
            alt="PFRAM Logo"
            className="h-8 w-8 object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold tracking-tight text-white leading-tight">
            PFRAM
          </div>
          <div className="text-[11px] font-medium leading-tight text-emerald-200">
            Telemedicine KIA
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-emerald-100/80 leading-relaxed">
        Pantau Kehamilan, Lindungi Ibu dan Bayi
      </p>

      {/* Navigation */}
      <nav aria-label="Menu utama" className="mt-8 flex-1 space-y-1.5 overflow-y-auto">
        <NavLink
          to="/dashboard"
          onClick={onLinkClick}
          className={({ isActive }) =>
            `${linkBaseClasses} ${
              isActive
                ? "bg-white/20 font-semibold text-white shadow-sm ring-1 ring-white/25"
                : "font-medium text-emerald-100 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          <span className="text-base" aria-hidden="true">📊</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/profile"
          onClick={onLinkClick}
          className={({ isActive }) =>
            `${linkBaseClasses} ${
              isActive
                ? "bg-white/20 font-semibold text-white shadow-sm ring-1 ring-white/25"
                : "font-medium text-emerald-100 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          <span className="text-base" aria-hidden="true">👤</span>
          <span>Profil</span>
        </NavLink>

        <div className="my-3 border-t border-emerald-600/50 pt-2">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">
            Menu Operasional
          </p>
        </div>

        {roleLinks.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            onClick={onLinkClick}
            className={({ isActive }) =>
              `${linkBaseClasses} ${
                isActive
                  ? "bg-white/20 font-semibold text-white shadow-sm ring-1 ring-white/25"
                  : "font-medium text-emerald-100 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-emerald-600/40 text-[11px] text-emerald-200/70">
        Buku KIA Kemenkes RI · V1
      </div>
    </aside>
  );
}

export function Topbar({ onMenuToggle }: { onMenuToggle?: (() => void) | undefined }) {
  const { user, logout } = useAuth();
  const humanRole = formatUserRole(user?.role);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 backdrop-blur-sm">
      {/* Mobile brand & toggle */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Buka menu navigasi"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pfram-primary/50"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <img src="/brand/logo-symbol.png" alt="PFRAM" className="h-7 w-7 object-contain" />
          <span className="font-bold text-slate-800">PFRAM</span>
        </div>
      </div>

      {/* User profile & actions */}
      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-900 leading-tight">
            {user?.displayName ?? "Pengguna"}
          </div>
          <div className="mt-0.5 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-pfram-text ring-1 ring-emerald-200/60">
            {humanRole}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void logout()}
          className="border-slate-300 text-slate-700 hover:border-pfram-primary hover:bg-emerald-50 hover:text-pfram-primary"
        >
          Keluar
        </Button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#FFF8F2]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-black/20 text-white hover:bg-black/30"
            >
              ✕
            </button>
            <Sidebar onLinkClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/* =========================================================================
   HUMAN-READABLE PRESENTATION FORMATTERS
   ========================================================================= */

export function formatUserRole(role?: string): string {
  if (role === "ADMIN") return "Administrator";
  if (role === "MIDWIFE") return "Bidan";
  if (role === "MOTHER") return "Ibu Hamil";
  return role ?? "-";
}

export function formatUserStatus(status?: string): string {
  if (status === "ACTIVE") return "Aktif";
  if (status === "INACTIVE" || status === "DISABLED") return "Nonaktif";
  return status ?? "-";
}

export function formatAssignmentStatus(status?: string): {
  label: string;
  variant: StatusBadgeVariant;
} {
  switch (status) {
    case "ACTIVE":
      return { label: "Aktif", variant: "success" };
    case "REPLACED":
      return { label: "Diganti", variant: "warning" };
    case "COMPLETED":
      return { label: "Selesai", variant: "info" };
    case "CANCELLED":
      return { label: "Dibatalkan", variant: "neutral" };
    default:
      return { label: status ?? "-", variant: "neutral" };
  }
}

export function formatRegionLevel(level?: string): string {
  switch (level) {
    case "PROVINCE":
      return "Provinsi";
    case "REGENCY":
      return "Kabupaten/Kota";
    case "DISTRICT":
      return "Kecamatan";
    case "VILLAGE":
      return "Kelurahan/Desa";
    default:
      return level ?? "-";
  }
}

export function formatFacilityType(type?: string): string {
  switch (type) {
    case "PUSKESMAS":
      return "Puskesmas";
    case "HOSPITAL":
      return "Rumah Sakit";
    case "CLINIC":
      return "Klinik";
    case "INDEPENDENT_MIDWIFE":
      return "Praktik Mandiri Bidan";
    case "REFERRAL_FACILITY":
      return "Fasilitas Rujukan";
    case "OTHER":
      return "Lainnya";
    default:
      return type ?? "-";
  }
}

export function formatAuditAction(action?: string): string {
  if (!action) return "-";
  const map: Record<string, string> = {
    LOGIN_SUCCESS: "Masuk Sistem Berhasil",
    LOGIN_FAILED: "Percobaan Masuk Ditolak",
    LOGOUT: "Keluar dari Sistem",
    USER_LOGOUT: "Keluar dari Sistem",
    REGISTER_SUCCESS: "Registrasi Akun Berhasil",
    REGISTER_FAILED: "Registrasi Akun Gagal",
    TOKEN_REFRESHED: "Sesi Login Diperbarui",
    USER_CREATED: "Akun Pengguna Dibuat",
    USER_ACTIVATED: "Akun Pengguna Diaktifkan",
    USER_DEACTIVATED: "Akun Pengguna Dinonaktifkan",
    USER_UNLOCKED: "Kunci Akun Pengguna Dibuka",
    USER_PASSWORD_RESET: "Kata Sandi Pengguna Direset",
    REGION_CREATED: "Wilayah Baru Ditambahkan",
    REGION_UPDATED: "Wilayah Diperbarui",
    REGION_ACTIVATED: "Wilayah Diaktifkan",
    REGION_DEACTIVATED: "Wilayah Dinonaktifkan",
    FACILITY_CREATED: "Fasilitas Baru Ditambahkan",
    FACILITY_UPDATED: "Fasilitas Diperbarui",
    FACILITY_ACTIVATED: "Fasilitas Diaktifkan",
    FACILITY_DEACTIVATED: "Fasilitas Dinonaktifkan",
    ASSIGNMENT_CREATED: "Penugasan Bidan Dibuat",
    ASSIGNMENT_REPLACED: "Pergantian Bidan Ditugaskan",
    ASSIGNMENT_COMPLETED: "Penugasan Bidan Diselesaikan",
    ASSIGNMENT_CANCELLED: "Penugasan Bidan Dibatalkan",
    MIDWIFE_PROFILE_CREATED: "Profil Bidan Dibuat",
    MIDWIFE_PROFILE_UPDATED: "Profil Bidan Diperbarui",
    MIDWIFE_FACILITY_ASSIGNED: "Penugasan Fasilitas Bidan Diperbarui",
    MIDWIFE_REGION_ASSIGNED: "Wilayah Kerja Bidan Ditetapkan",
    MIDWIFE_ASSIGNED_TO_MOTHER: "Bidan Ditugaskan ke Ibu Hamil",
    MOTHER_PROFILE_UPDATED: "Profil Ibu Hamil Diperbarui",
    PREGNANCY_CREATED: "Data Kehamilan Baru Dicatat",
    PREGNANCY_UPDATED: "Data Kehamilan Diperbarui",
    HOME_VISIT_SCHEDULED: "Jadwal Kunjungan Rumah Dibuat",
    HOME_VISIT_CREATED: "Kunjungan Rumah Dicatat",
    HOME_VISIT_UPDATED: "Kunjungan Rumah Diperbarui",
    EDUCATION_ARTICLE_CREATED: "Materi Edukasi Dibuat",
    EDUCATION_ARTICLE_CREATE_FAILED: "Pembuatan Materi Edukasi Gagal",
    EDUCATION_ARTICLE_UPDATED: "Materi Edukasi Diperbarui",
    EDUCATION_ARTICLE_ARCHIVED: "Materi Edukasi Diarsipkan",
    CONFIRM_ANC_ATTENDANCE: "Kehadiran ANC Dikonfirmasi",
    UPDATE_REMINDER_SETTINGS: "Pengaturan Pengingat Diperbarui",
    COMPLETE_REMINDER: "Pengingat Diselesaikan",
    SNOOZE_REMINDER: "Pengingat Ditunda",
    CREATE_ANC_SCHEDULE: "Jadwal ANC Dibuat",
    UPDATE_ANC_SCHEDULE: "Jadwal ANC Diperbarui",
    CONSULTATION_MESSAGE_SENT_BY_MOTHER: "Pesan Konsultasi dari Ibu Hamil",
    CONSULTATION_MESSAGE_SENT_BY_MIDWIFE: "Balasan Konsultasi dari Bidan",
    CONSULTATION_ATTENTION_UPDATED: "Status Perhatian Konsultasi Diperbarui",
    CONSULTATION_STATUS_UPDATED: "Status Selesai Konsultasi Diperbarui",
    CREATE_VIDEO_CONSULTATION: "Jadwal Telekonsultasi Video Dibuat",
    UPDATE_VIDEO_CONSULTATION: "Jadwal Telekonsultasi Video Diperbarui",
    UPDATE_VIDEO_CONSULTATION_STATUS: "Status Telekonsultasi Video Diperbarui",
    DANGER_SCREENING_CREATED: "Skrining Tanda Bahaya Dicatat",
    DANGER_SCREENING_VIEWED_BY_MIDWIFE: "Skrining Ditinjau oleh Bidan",
    DANGER_FOLLOWUP_UPDATED: "Tindak Lanjut Tanda Bahaya Diperbarui",
    MONITORING_CREATED: "Catatan Pemantauan Fisik Dibuat",
    MONITORING_UPDATED: "Catatan Pemantauan Fisik Diperbarui",
    MONITORING_ARCHIVED: "Catatan Pemantauan Fisik Diarsipkan",
    MONITORING_VIEWED_BY_MIDWIFE: "Pemantauan Fisik Ditinjau oleh Bidan",
    P4K_UPDATED: "Perencanaan Persalinan (P4K) Diperbarui",
    P4K_CHECKLIST_UPDATED: "Checklist P4K Diperbarui",
    REFERRAL_PLAN_UPDATED: "Rencana Rujukan Diperbarui",
    P4K_UPDATED_BY_MIDWIFE: "P4K Diperbarui oleh Bidan",
    REFERRAL_PLAN_UPDATED_BY_MIDWIFE: "Rencana Rujukan Diperbarui oleh Bidan",
  };
  return (
    map[action] ??
    action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}

export function formatAuditResult(result?: string): {
  label: string;
  isSuccess: boolean;
} {
  if (result === "SUCCESS") return { label: "Berhasil", isSuccess: true };
  if (result === "FAILED") return { label: "Gagal", isSuccess: false };
  return {
    label: result ?? "-",
    isSuccess: result?.toLowerCase().includes("success") ?? false,
  };
}
