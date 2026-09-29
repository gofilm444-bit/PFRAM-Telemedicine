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
  Alert,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  PasswordInput,
  ProtectedRoute,
  RoleGuard,
  Sidebar,
  Topbar,
} from "./components";
import {
  AssignmentsPage,
  FacilitiesPage,
  MidwifeProfilePage,
  MidwivesPage,
  MothersPage,
  RegionsPage,
} from "./stage3";
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
    <main className="grid min-h-screen place-items-center p-5">
      <Card className="w-full max-w-md">
        <BadgeLogo />
        <h1 className="mt-5 text-2xl font-bold">Masuk ke PFRAM</h1>
        <p className="mb-6 text-slate-600">
          Dashboard khusus bidan dan administrator.
        </p>
        {error && <ErrorState message={error} />}
        <form
          className="mt-4 grid gap-4"
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
            label="Nomor HP"
            autoComplete="tel"
            error={errors.phoneNumber?.message}
            {...register("phoneNumber")}
          />
          <PasswordInput
            id="password"
            label="Kata sandi"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button disabled={isSubmitting}>
            {isSubmitting ? "Memproses…" : "Masuk"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
const BadgeLogo = () => (
  <div
    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pfram-primary font-bold text-white"
    aria-label="PFRAM"
  >
    P
  </div>
);
function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main className="grid gap-6 p-5 lg:p-8">
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
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
              path="my-mothers"
              element={
                <RoleGuard roles={["MIDWIFE"]}>
                  <MothersPage midwife />
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
        </main>
      </div>
    </div>
  );
}
function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "MIDWIFE")
    return (
      <RoleGuard roles={["MIDWIFE"]}>
        <PageHeader
          title="Dashboard Bidan"
          description="Ringkasan fondasi pemantauan PFRAM."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            "Ibu binaan",
            "Pemantauan hari ini",
            "Perlu perhatian",
            "Jadwal hari ini",
          ].map((x) => (
            <Card key={x}>
              <div className="text-sm text-slate-600">{x}</div>
              <div className="mt-2 text-3xl font-bold">0</div>
            </Card>
          ))}
        </div>
        <Alert>
          Modul pemantauan medis akan dibangun pada fase berikutnya dan belum
          aktif.
        </Alert>
      </RoleGuard>
    );
  if (user?.role === "ADMIN")
    return (
      <RoleGuard roles={["ADMIN"]}>
        <AdminDashboard />
      </RoleGuard>
    );
  return <Navigate to="/403" replace />;
}
function AdminDashboard() {
  const { request } = useAuth();
  const [data, setData] = useState<{
    counts: Record<string, number>;
    audit: { action: string; result: string; createdAt: string }[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    request<typeof data>("/users/summary")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat"));
  }, [request]);
  return (
    <>
      <PageHeader
        title="Dashboard Administrator"
        description="Status sistem dan identitas PFRAM."
      />
      {error && <ErrorState message={error} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          "REGIONS",
          "FACILITIES",
          "MIDWIFE",
          "MOTHER",
          "COMPLETED_PROFILES",
          "UNASSIGNED",
        ].map((r) => (
          <Card key={r}>
            <div className="text-sm">{r}</div>
            <div className="text-3xl font-bold">{data?.counts[r] ?? 0}</div>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="font-bold">Status fondasi</h2>
        <p className="mt-2">API aktif · Database diperiksa melalui readiness</p>
      </Card>
      <Card>
        <h2 className="mb-3 font-bold">Audit terbaru</h2>
        {data?.audit.length ? (
          data.audit.map((a, i) => (
            <p key={i} className="border-t py-2 text-sm">
              {a.action} — {a.result}
            </p>
          ))
        ) : (
          <EmptyState />
        )}
      </Card>
    </>
  );
}
function Profile() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Profil" description="Data akun publik yang aman." />
      <Card>
        <dl className="grid gap-3">
          <div>
            <dt className="text-sm text-slate-500">Nama</dt>
            <dd>{user?.displayName}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Peran</dt>
            <dd>{user?.role}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Status</dt>
            <dd>{user?.status}</dd>
          </div>
        </dl>
      </Card>
    </>
  );
}
const Forbidden = () => (
  <main className="grid min-h-screen place-items-center p-5">
    <Card>
      <h1 className="text-2xl font-bold">403 — Akses ditolak</h1>
      <p className="mt-2">
        Peran akun Anda tidak diizinkan membuka halaman ini.
      </p>
    </Card>
  </main>
);
const NotFound = () => (
  <main>
    <h1 className="text-2xl font-bold">404 — Halaman tidak ditemukan</h1>
  </main>
);
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
