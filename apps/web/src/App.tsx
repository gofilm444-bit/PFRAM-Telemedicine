import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { loginSchema } from "@pfram/validation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { AuthProvider, useAuth } from "./auth";
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  MetricCard,
  PageHeader,
  PasswordInput,
  ProtectedRoute,
  RoleGuard,
  StatusBadge,
  formatAuditAction,
  formatAuditResult,
  formatUserRole,
  formatUserStatus,
} from "./components";
import {
  AssignmentsPage,
  FacilitiesPage,
  MidwifeProfilePage,
  MidwivesPage,
  MothersPage,
  RegionsPage,
} from "./stage3";
import { MidwifeDashboardPage } from "./MidwifeDashboardPage";
import { MidwifeMotherDetailPage } from "./MidwifeMotherDetailPage";
import { MidwifeAttentionListPage } from "./MidwifeAttentionListPage";
import { MidwifeMissedAncPage } from "./MidwifeMissedAncPage";
import { MidwifeConsultationPage } from "./MidwifeConsultationPage";
import { AdminEducationListPage } from "./AdminEducationListPage";

/* =========================================================================
   LOGIN SCREEN
   ========================================================================= */

function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { clientType: "web" },
  });

  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF8F2] via-emerald-50/40 to-[#FFF8F2] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8 shadow-lg ring-1 ring-emerald-900/10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 p-2 shadow-sm ring-1 ring-emerald-200/60">
              <img
                src="/brand/logo-symbol.png"
                alt="Logo PFRAM"
                className="h-10 w-10 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Masuk ke PFRAM
            </h1>
            <p className="mt-1 text-xs font-semibold text-pfram-primary">
              Pantau Kehamilan, Lindungi Ibu dan Bayi
            </p>
            <div className="mt-2.5 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-pfram-text ring-1 ring-emerald-200/60">
              Dashboard Bidan & Administrator
            </div>
          </div>

          {error && (
            <div className="mt-5">
              <ErrorState message={error} />
            </div>
          )}

          {/* Form */}
          <form
            className="mt-6 grid gap-4"
            onSubmit={handleSubmit(async (v) => {
              setError("");
              try {
                await login(v.phoneNumber, v.password);
                nav("/dashboard");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Login gagal");
              }
            })}
          >
            <Input
              id="phone"
              label="Nomor Handphone"
              placeholder="Contoh: 081234567890"
              autoComplete="tel"
              error={errors.phoneNumber?.message}
              {...register("phoneNumber")}
            />
            <PasswordInput
              id="password"
              label="Kata Sandi"
              placeholder="Masukkan kata sandi akun"
              error={errors.password?.message}
              {...register("password")}
            />
            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full text-base font-semibold shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Memproses Verifikasi…" : "Masuk ke Dashboard"}
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-500">
            Sistem Terintegrasi Buku KIA Kemenkes RI · Hak Cipta Terlindungi
          </div>
        </Card>
      </div>
    </main>
  );
}

/* =========================================================================
   AUTHENTICATED LAYOUT
   ========================================================================= */

function Layout() {
  return (
    <AppShell>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />

        {/* ADMIN ROUTES */}
        <Route
          path="regions"
          element={
            <RoleGuard roles={["ADMIN"]}>
              <RegionsPage />
            </RoleGuard>
          }
        />
        <Route
          path="facilities"
          element={
            <RoleGuard roles={["ADMIN"]}>
              <FacilitiesPage />
            </RoleGuard>
          }
        />
        <Route
          path="midwives"
          element={
            <RoleGuard roles={["ADMIN"]}>
              <MidwivesPage />
            </RoleGuard>
          }
        />
        <Route
          path="mothers"
          element={
            <RoleGuard roles={["ADMIN"]}>
              <MothersPage />
            </RoleGuard>
          }
        />
        <Route
          path="assignments"
          element={
            <RoleGuard roles={["ADMIN"]}>
              <AssignmentsPage />
            </RoleGuard>
          }
        />
        <Route
          path="education"
          element={
            <RoleGuard roles={["ADMIN"]}>
              <AdminEducationListPage />
            </RoleGuard>
          }
        />

        {/* MIDWIFE ROUTES */}
        <Route
          path="my-mothers"
          element={
            <RoleGuard roles={["MIDWIFE"]}>
              <MothersPage midwife />
            </RoleGuard>
          }
        />
        <Route
          path="my-mothers/:motherPublicId"
          element={
            <RoleGuard roles={["MIDWIFE"]}>
              <MidwifeMotherDetailPage />
            </RoleGuard>
          }
        />
        <Route
          path="danger-follow-ups"
          element={
            <RoleGuard roles={["MIDWIFE"]}>
              <MidwifeAttentionListPage />
            </RoleGuard>
          }
        />
        <Route
          path="anc-missed"
          element={
            <RoleGuard roles={["MIDWIFE"]}>
              <MidwifeMissedAncPage />
            </RoleGuard>
          }
        />
        <Route
          path="consultations"
          element={
            <RoleGuard roles={["MIDWIFE"]}>
              <MidwifeConsultationPage />
            </RoleGuard>
          }
        />
        <Route
          path="consultations/:threadPublicId"
          element={
            <RoleGuard roles={["MIDWIFE"]}>
              <MidwifeConsultationPage />
            </RoleGuard>
          }
        />
        <Route
          path="midwife-profile"
          element={
            <RoleGuard roles={["MIDWIFE"]}>
              <MidwifeProfilePage />
            </RoleGuard>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

/* =========================================================================
   DASHBOARD DISPATCHER
   ========================================================================= */

function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "MIDWIFE") {
    return (
      <RoleGuard roles={["MIDWIFE"]}>
        <MidwifeDashboardPage />
      </RoleGuard>
    );
  }
  if (user?.role === "ADMIN") {
    return (
      <RoleGuard roles={["ADMIN"]}>
        <AdminDashboard />
      </RoleGuard>
    );
  }
  return <Navigate to="/403" replace />;
}

/* =========================================================================
   ADMIN DASHBOARD
   ========================================================================= */

const ADMIN_METRIC_CONFIG: Record<
  string,
  { label: string; description: string; icon: string }
> = {
  REGIONS: {
    label: "Wilayah",
    description: "Cakupan wilayah administrasi terdaftar",
    icon: "🗺️",
  },
  FACILITIES: {
    label: "Fasilitas Kesehatan",
    description: "Puskesmas, RS, dan klinik aktif",
    icon: "🏥",
  },
  MIDWIFE: {
    label: "Bidan",
    description: "Tenaga bidan pembina terdaftar",
    icon: "👩‍⚕️",
  },
  MOTHER: {
    label: "Ibu Hamil",
    description: "Sasaran ibu binaan sistem",
    icon: "🤰",
  },
  COMPLETED_PROFILES: {
    label: "Profil Ibu Lengkap",
    description: "Kependudukan & kehamilan tervalidasi",
    icon: "📋",
  },
  UNASSIGNED: {
    label: "Belum Ditugaskan Bidan",
    description: "Perlu penetapan bidan pembina",
    icon: "⏳",
  },
};

function AdminDashboard() {
  const { request } = useAuth();
  const [data, setData] = useState<{
    counts: Record<string, number>;
    audit: { action: string; result: string; createdAt: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    request<typeof data>("/users/summary")
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Gagal memuat ringkasan sistem");
        setLoading(false);
      });
  }, [request]);

  const metricKeys = [
    "REGIONS",
    "FACILITIES",
    "MIDWIFE",
    "MOTHER",
    "COMPLETED_PROFILES",
    "UNASSIGNED",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Administrator"
        description="Ringkasan operasional sistem, cakupan fasilitas, dan audit aktivitas PFRAM."
      />

      {error && <ErrorState message={error} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricKeys.map((k) => (
            <LoadingSkeleton key={k} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricKeys.map((k) => {
            const conf = ADMIN_METRIC_CONFIG[k] ?? {
              label: k,
              description: "Metrik sistem",
              icon: "📊",
            };
            const val = data?.counts[k] ?? 0;
            return (
              <MetricCard
                key={k}
                title={conf.label}
                value={val}
                description={conf.description}
                icon={<span className="text-xl">{conf.icon}</span>}
              />
            );
          })}
        </div>
      )}

      {/* System Status Card */}
      <Card className="border-l-4 border-l-pfram-primary bg-emerald-50/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Status Sistem</h2>
            <p className="mt-1 text-sm text-slate-600">
              Layanan API aktif · Terhubung ke basis data operasional · Keamanan sesi terverifikasi
            </p>
          </div>
          <StatusBadge variant="success" size="md">
            Sistem Siap
          </StatusBadge>
        </div>
      </Card>

      {/* Audit Log Card */}
      <Card>
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Audit Aktivitas Terbaru</h2>
            <p className="text-xs text-slate-500">
              Catatan keamanan dan riwayat tindakan pengguna terkini
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {data?.audit?.length ?? 0} catatan
          </span>
        </div>

        {data?.audit && data.audit.length > 0 ? (
          <div className="divide-y divide-slate-100 overflow-hidden">
            {data.audit.map((a, i) => {
              const { label: resultLabel, isSuccess } = formatAuditResult(a.result);
              const actionLabel = formatAuditAction(a.action);
              const formattedTime = new Date(a.createdAt).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div
                  key={i}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900">
                      {actionLabel}
                    </p>
                    <p className="text-xs text-slate-500">{formattedTime}</p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge variant={isSuccess ? "success" : "danger"}>
                      {resultLabel}
                    </StatusBadge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState message="Belum ada catatan aktivitas audit." />
        )}
      </Card>
    </div>
  );
}

/* =========================================================================
   PROFILE SCREEN
   ========================================================================= */

function Profile() {
  const { user } = useAuth();
  const humanRole = formatUserRole(user?.role);
  const humanStatus = formatUserStatus(user?.status);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Profil Pengguna"
        description="Informasi identitas dan hak akses akun Anda di sistem PFRAM."
      />

      <Card className="p-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pfram-primary text-2xl font-bold text-white shadow-sm">
            {user?.displayName ? user.displayName[0]?.toUpperCase() : "U"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.displayName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge variant="info">{humanRole}</StatusBadge>
              <StatusBadge variant={user?.status === "ACTIVE" ? "success" : "neutral"}>
                {humanStatus}
              </StatusBadge>
            </div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nomor Handphone
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {user?.phoneNumber ?? "-"}
            </dd>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              ID Publik Akun
            </dt>
            <dd className="mt-1 text-xs font-mono text-slate-800">
              {user?.publicId ?? "-"}
            </dd>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Peran Sistem
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {humanRole}
            </dd>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status Akun
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {humanStatus}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

/* =========================================================================
   ERROR / FALLBACK PAGES
   ========================================================================= */

const Forbidden = () => (
  <main className="grid min-h-screen place-items-center bg-[#FFF8F2] p-5">
    <Card className="max-w-md text-center p-8">
      <div className="mb-3 text-4xl" aria-hidden="true">🚫</div>
      <h1 className="text-2xl font-bold text-slate-900">403 — Akses Ditolak</h1>
      <p className="mt-2 text-sm text-slate-600">
        Peran akun Anda tidak memiliki izin untuk membuka halaman ini.
      </p>
      <div className="mt-6">
        <Button onClick={() => window.history.back()} variant="outline">
          Kembali
        </Button>
      </div>
    </Card>
  </main>
);

const NotFound = () => (
  <div className="max-w-md py-12 text-center">
    <div className="mb-3 text-4xl" aria-hidden="true">🔍</div>
    <h1 className="text-2xl font-bold text-slate-900">404 — Halaman Tidak Ditemukan</h1>
    <p className="mt-2 text-sm text-slate-600">
      Alamat tautan yang Anda tuju tidak tersedia atau telah dipindahkan.
    </p>
  </div>
);

/* =========================================================================
   APPLICATION ROOT
   ========================================================================= */

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/403" element={<Forbidden />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
