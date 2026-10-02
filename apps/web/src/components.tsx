import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { useId, useState } from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import type { UserRole } from "@pfram/shared-types";
import { useAuth } from "./auth";
export const Button = ({
  className = "",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={`min-h-11 rounded-xl bg-pfram-primary px-4 py-2 font-semibold text-white hover:bg-pfram-text disabled:opacity-60 ${className}`}
    {...p}
  />
);
export const Input = ({
  label,
  error,
  ...p
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
}) => (
  <label className="grid gap-1 text-sm font-medium">
    <span>{label}</span>
    <input
      className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
      aria-invalid={!!error}
      aria-describedby={error ? `${p.id}-error` : undefined}
      {...p}
    />
    {error && (
      <span id={`${p.id}-error`} role="alert" className="text-status-emergency">
        {error}
      </span>
    )}
  </label>
);
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
    <div className="grid gap-1 text-sm font-medium">
      <label htmlFor={inputId}>{label}</label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          className={`min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-12 text-slate-900 ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={actionLabel}
          title={actionLabel}
          className="absolute inset-y-0 right-1 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-pfram-primary"
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>
      {error && (
        <span
          id={`${inputId}-error`}
          role="alert"
          className="text-status-emergency"
        >
          {error}
        </span>
      )}
    </div>
  );
}
export const Card = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-900/10 ${className}`}
  >
    {children}
  </section>
);
export const Badge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-pfram-text">
    {children}
  </span>
);
export const Alert = ({ children }: { children: ReactNode }) => (
  <div
    role="status"
    className="rounded-xl border-l-4 border-status-info bg-blue-50 p-4 text-slate-700"
  >
    {children}
  </div>
);
export const PageHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <header>
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="mt-1 text-slate-600">{description}</p>
  </header>
);
export const EmptyState = ({
  message = "Belum ada data.",
}: {
  message?: string;
}) => (
  <div className="rounded-xl border border-dashed p-6 text-center text-slate-600">
    {message}
  </div>
);
export const ErrorState = ({
  message = "Terjadi kesalahan.",
}: {
  message?: string;
}) => (
  <div role="alert" className="rounded-xl bg-red-50 p-4 text-status-emergency">
    {message}
  </div>
);
export const LoadingSkeleton = () => (
  <div
    aria-label="Memuat"
    className="h-24 animate-pulse rounded-xl bg-emerald-100"
  />
);
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSkeleton />;
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
export function Sidebar() {
  const { user } = useAuth();
  const roleLinks = navigationForRole(user?.role);
  return <SidebarContent roleLinks={roleLinks} />;
}
export function navigationForRole(role?: UserRole): Array<[string, string]> {
  const adminLinks: Array<[string, string]> = [
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
export function SidebarContent({
  roleLinks,
}: {
  roleLinks: Array<[string, string]>;
}) {
  return (
    <aside className="hidden w-64 bg-pfram-text p-6 text-white md:block">
      <div className="text-xl font-bold">PFRAM</div>
      <p className="mt-1 text-sm text-emerald-100">
        Pantau Kehamilan, Lindungi Ibu dan Bayi
      </p>
      <nav aria-label="Menu utama" className="mt-8 grid gap-2">
        <NavLink className="rounded-lg p-3 hover:bg-white/10" to="/dashboard">
          Dashboard
        </NavLink>
        <NavLink className="rounded-lg p-3 hover:bg-white/10" to="/profile">
          Profil
        </NavLink>
        {roleLinks.map(([to, label]) => (
          <NavLink
            key={to}
            className="rounded-lg p-3 hover:bg-white/10"
            to={to}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
export function Topbar() {
  const { user, logout } = useAuth();
  return (
    <header className="flex min-h-16 items-center justify-between border-b bg-white px-5">
      <span className="font-semibold md:hidden">PFRAM</span>
      <span className="ml-auto mr-4 text-sm">{user?.displayName}</span>
      <Button
        onClick={() => void logout()}
        className="bg-white text-pfram-primary ring-1 ring-pfram-primary"
      >
        Keluar
      </Button>
    </header>
  );
}
