import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AdminUserListItem } from "@pfram/shared-types";
import { useAuth } from "./auth";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  MetricCard,
  PageHeader,
  PasswordInput,
  StatusBadge,
  formatUserRole,
  formatUserStatus,
} from "./components";

interface FacilityOption {
  publicId: string;
  name: string;
  type: string;
}

interface UserSummaryCounts {
  MOTHER: number;
  MIDWIFE: number;
  ADMIN: number;
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return "Belum pernah masuk";
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

export function AdminUsersPage() {
  const { user: currentUser, request } = useAuth();

  // Filter & Pagination State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Data State
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [summaryCounts, setSummaryCounts] = useState<UserSummaryCounts | null>(null);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUserListItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUserListItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form State
  const [createRole, setCreateRole] = useState<"ADMIN" | "MIDWIFE">("MIDWIFE");
  const [createFullName, setCreateFullName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createStrNumber, setCreateStrNumber] = useState("");
  const [createFacilityId, setCreateFacilityId] = useState("");
  const [createFormError, setCreateFormError] = useState("");

  // Reset Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetFormError, setResetFormError] = useState("");

  // Load summary counts
  const loadSummary = useCallback(() => {
    request<{ counts: UserSummaryCounts }>("/users/summary")
      .then((res) => setSummaryCounts(res.counts))
      .catch(() => {
        // Fallback or silent ignore
      });
  }, [request]);

  // Load facilities for midwife creation
  const loadFacilities = useCallback(() => {
    request<{ items: FacilityOption[] }>("/reference/facilities?limit=100")
      .then((res) => setFacilities(res.items ?? []))
      .catch(() => {
        // Silently ignore if facility lookup fails
      });
  }, [request]);

  // Load users list
  const loadUsers = useCallback(() => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search.trim()) params.set("search", search.trim());
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    request<{
      items: AdminUserListItem[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/admin/users?${params.toString()}`)
      .then((res) => {
        setUsers(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Gagal memuat daftar pengguna");
      })
      .finally(() => setLoading(false));
  }, [page, search, roleFilter, statusFilter, request]);

  useEffect(() => {
    loadSummary();
    loadFacilities();
  }, [loadSummary, loadFacilities]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Create Account Submit
  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreateFormError("");

    if (!createFullName.trim()) {
      setCreateFormError("Nama lengkap wajib diisi.");
      return;
    }
    if (!createPhone.trim()) {
      setCreateFormError("Nomor HP wajib diisi.");
      return;
    }
    if (createPassword.length < 10) {
      setCreateFormError("Kata sandi minimal 10 karakter.");
      return;
    }
    if (!/[A-Z]/.test(createPassword) || !/[a-z]/.test(createPassword) || !/\d/.test(createPassword)) {
      setCreateFormError("Kata sandi harus mengandung huruf besar, huruf kecil, dan angka.");
      return;
    }
    if (createPassword !== createConfirmPassword) {
      setCreateFormError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setActionLoading(true);
    try {
      await request("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          role: createRole,
          fullName: createFullName.trim(),
          phoneNumber: createPhone.trim(),
          password: createPassword,
          ...(createRole === "MIDWIFE" && createStrNumber.trim()
            ? { professionalRegistrationNumber: createStrNumber.trim() }
            : {}),
          ...(createRole === "MIDWIFE" && createFacilityId
            ? { primaryFacilityPublicId: createFacilityId }
            : {}),
        }),
      });

      setFeedback({
        type: "success",
        message: `Akun ${createRole === "ADMIN" ? "Administrator" : "Bidan"} atas nama ${createFullName} berhasil dibuat.`,
      });
      setIsCreateOpen(false);
      // Reset form
      setCreateFullName("");
      setCreatePhone("");
      setCreatePassword("");
      setCreateConfirmPassword("");
      setCreateStrNumber("");
      setCreateFacilityId("");
      loadUsers();
      loadSummary();
    } catch (err) {
      setCreateFormError(
        err instanceof Error ? err.message : "Gagal membuat akun pengguna",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetFormError("");

    if (newPassword.length < 10) {
      setResetFormError("Kata sandi baru minimal 10 karakter.");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setResetFormError("Kata sandi harus mengandung huruf besar, huruf kecil, dan angka.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetFormError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setActionLoading(true);
    try {
      await request(`/admin/users/${resetTarget.publicId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });

      setFeedback({
        type: "success",
        message: `Kata sandi untuk ${resetTarget.displayName} berhasil direset dan seluruh sesi login aktif telah dicabut.`,
      });
      setResetTarget(null);
      setNewPassword("");
      setConfirmNewPassword("");
      loadUsers();
    } catch (err) {
      setResetFormError(
        err instanceof Error ? err.message : "Gagal mereset kata sandi",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Deactivate Account
  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      await request(`/admin/users/${deactivateTarget.publicId}/deactivate`, {
        method: "POST",
      });
      setFeedback({
        type: "success",
        message: `Akun ${deactivateTarget.displayName} berhasil dinonaktifkan. Sesi login dicabut, riwayat data tetap aman.`,
      });
      setDeactivateTarget(null);
      loadUsers();
      loadSummary();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menonaktifkan akun",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Activate Account
  const handleActivate = async (user: AdminUserListItem) => {
    setActionLoading(true);
    try {
      await request(`/admin/users/${user.publicId}/activate`, {
        method: "POST",
      });
      setFeedback({
        type: "success",
        message: `Akun ${user.displayName} berhasil diaktifkan kembali.`,
      });
      loadUsers();
      loadSummary();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal mengaktifkan akun",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unlock Account
  const handleUnlock = async (user: AdminUserListItem) => {
    setActionLoading(true);
    try {
      await request(`/admin/users/${user.publicId}/unlock`, {
        method: "POST",
      });
      setFeedback({
        type: "success",
        message: `Kunci akun ${user.displayName} berhasil dibuka. Percobaan login telah direset.`,
      });
      loadUsers();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal membuka kunci akun",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Manajemen Akun Pengguna"
        description="Kelola akun sistem, hak akses operasional, status aktivasi, dan keamanan kredensial."
        action={
          <Button
            variant="primary"
            onClick={() => {
              setCreateFormError("");
              setIsCreateOpen(true);
            }}
          >
            <span aria-hidden="true">➕</span>
            <span>Tambah Akun Baru</span>
          </Button>
        }
      />

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border p-4 text-sm font-medium shadow-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true">
              {feedback.type === "success" ? "✅" : "⚠️"}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Pengguna"
          value={
            summaryCounts
              ? summaryCounts.ADMIN + summaryCounts.MIDWIFE + summaryCounts.MOTHER
              : total
          }
          description="Semua akun terdaftar"
        />
        <MetricCard
          title="Administrator"
          value={summaryCounts ? summaryCounts.ADMIN : "-"}
          description="Akses konfigurasi & akun"
        />
        <MetricCard
          title="Bidan"
          value={summaryCounts ? summaryCounts.MIDWIFE : "-"}
          description="Tenaga kesehatan klinis"
        />
        <MetricCard
          title="Ibu Hamil"
          value={summaryCounts ? summaryCounts.MOTHER : "-"}
          description="Akun layanan mobile"
        />
      </div>

      {/* Filters & Table Card */}
      <Card>
        {/* Search & Filters */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div>
              <Input
                label="Cari Akun"
                placeholder="Nama atau nomor HP…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <label className="grid gap-1.5 text-sm font-medium text-slate-800">
              <span>Filter Peran</span>
              <select
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Semua Peran</option>
                <option value="ADMIN">Administrator</option>
                <option value="MIDWIFE">Bidan</option>
                <option value="MOTHER">Ibu Hamil</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-slate-800">
              <span>Filter Status</span>
              <select
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="DISABLED">Nonaktif</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span>Ditemukan {total} akun</span>
            {(search || roleFilter !== "ALL" || statusFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("ALL");
                  setStatusFilter("ALL");
                  setPage(1);
                }}
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Loading / Error / Empty States */}
        {error && <ErrorState message={error} />}
        {loading && <LoadingSkeleton className="h-64" />}

        {!loading && !error && users.length === 0 && (
          <EmptyState message="Tidak ada akun pengguna yang sesuai dengan kriteria filter." />
        )}

        {/* Users Table */}
        {!loading && !error && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/60 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Kontak (HP)</th>
                  <th className="py-3 px-4">Peran</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Keamanan & Sesi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => {
                  const isCurrent = currentUser?.publicId === u.publicId;
                  return (
                    <tr
                      key={u.publicId}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name & Display */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {u.displayName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Dibuat {formatDate(u.createdAt)}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {u.phoneNumber}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.role === "ADMIN"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : u.role === "MIDWIFE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-sky-50 text-sky-700 border border-sky-200"
                          }`}
                        >
                          {formatUserRole(u.role)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          variant={u.status === "ACTIVE" ? "success" : "neutral"}
                        >
                          {formatUserStatus(u.status)}
                        </StatusBadge>
                      </td>

                      {/* Security & Login */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {u.isLocked ? (
                            <div className="flex items-center gap-1.5">
                              <StatusBadge variant="danger">
                                🔒 Terkunci ({u.failedLoginCount} gagal)
                              </StatusBadge>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Terakhir: {formatDate(u.lastLoginAt)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Unlock button if locked */}
                          {u.isLocked && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-700 border-amber-300 hover:bg-amber-50"
                              onClick={() => void handleUnlock(u)}
                              disabled={actionLoading}
                              title="Buka kunci akun"
                            >
                              🔓 Buka Kunci
                            </Button>
                          )}

                          {/* Reset Password */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResetFormError("");
                              setNewPassword("");
                              setConfirmNewPassword("");
                              setResetTarget(u);
                            }}
                            disabled={actionLoading}
                          >
                            Reset Sandi
                          </Button>

                          {/* Activate / Deactivate */}
                          {u.status === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setDeactivateTarget(u)}
                              disabled={actionLoading || isCurrent}
                              title={
                                isCurrent
                                  ? "Tidak dapat menonaktifkan akun sendiri"
                                  : "Nonaktifkan akun"
                              }
                            >
                              Nonaktifkan
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleActivate(u)}
                              disabled={actionLoading}
                            >
                              Aktifkan
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && !error && users.length > 0 && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-600">
            <div>
              Halaman <span className="font-semibold text-slate-900">{page}</span>{" "}
              dari <span className="font-semibold text-slate-900">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || actionLoading}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || actionLoading}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL 1: CREATE ACCOUNT */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3
                  id="create-account-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Tambah Akun Pengguna Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Buat akun operasional untuk Administrator atau Bidan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            {createFormError && (
              <div className="mt-4">
                <ErrorState message={createFormError} />
              </div>
            )}

            <form onSubmit={(e) => void handleCreateSubmit(e)} className="mt-4 space-y-4">
              {/* Role Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Pilih Peran Akun
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateRole("MIDWIFE")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${
                      createRole === "MIDWIFE"
                        ? "border-pfram-primary bg-emerald-50 text-pfram-text ring-2 ring-pfram-primary/30"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>🩺</span>
                    <span>Bidan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateRole("ADMIN")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${
                      createRole === "ADMIN"
                        ? "border-pfram-primary bg-emerald-50 text-pfram-text ring-2 ring-pfram-primary/30"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>⚙️</span>
                    <span>Administrator</span>
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  ℹ️ Akun Ibu Hamil didaftarkan secara khusus melalui pendaftaran ibu hamil baru di faskes.
                </p>
              </div>

              {/* Full Name */}
              <Input
                label="Nama Lengkap & Gelar"
                placeholder={
                  createRole === "ADMIN"
                    ? "Contoh: Budi Santoso, S.Kom"
                    : "Contoh: Bdn. Siti Nurhaliza, S.Tr.Keb"
                }
                required
                value={createFullName}
                onChange={(e) => setCreateFullName(e.target.value)}
              />

              {/* Phone Number */}
              <div>
                <Input
                  label="Nomor Handphone"
                  placeholder="Contoh: 081234567890 atau 6281234567890"
                  required
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Gunakan format nomor seluler aktif Indonesia (minimal 10 digit).
                </p>
              </div>

              {/* Initial Password */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <PasswordInput
                    label="Kata Sandi Awal"
                    placeholder="Min. 10 karakter"
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                  />
                </div>
                <div>
                  <PasswordInput
                    label="Konfirmasi Kata Sandi"
                    placeholder="Ulangi kata sandi"
                    required
                    value={createConfirmPassword}
                    onChange={(e) => setCreateConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Wajib mengandung huruf besar, huruf kecil, dan angka.
              </p>

              {/* Midwife-specific fields */}
              {createRole === "MIDWIFE" && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-3">
                  <div className="text-xs font-bold text-pfram-text">
                    Informasi Praktik Bidan
                  </div>
                  <Input
                    label="Nomor Surat Tanda Registrasi (STR) (Opsional)"
                    placeholder="Contoh: 19 02 5 2 1 20-1234567"
                    value={createStrNumber}
                    onChange={(e) => setCreateStrNumber(e.target.value)}
                  />

                  <label className="grid gap-1.5 text-sm font-medium text-slate-800">
                    <span>Fasilitas Kesehatan Penugasan Utama (Opsional)</span>
                    <select
                      className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                      value={createFacilityId}
                      onChange={(e) => setCreateFacilityId(e.target.value)}
                    >
                      <option value="">-- Pilih Fasilitas Kesehatan --</option>
                      {facilities.map((f) => (
                        <option key={f.publicId} value={f.publicId}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={actionLoading}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Menyimpan…" : "Simpan Akun Baru"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET PASSWORD */}
      {resetTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3
                  id="reset-password-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Reset Kata Sandi
                </h3>
                <p className="text-xs text-slate-500">
                  Tetapkan kata sandi baru untuk akun pengguna ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs space-y-1">
              <div>
                <span className="font-semibold text-slate-700">Nama:</span>{" "}
                <span className="text-slate-900">{resetTarget.displayName}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Nomor HP:</span>{" "}
                <span className="font-mono text-slate-900">{resetTarget.phoneNumber}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Peran:</span>{" "}
                <span className="text-slate-900">{formatUserRole(resetTarget.role)}</span>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-800">
              ⚠️ Mereset kata sandi akan otomatis <b>mencabut seluruh sesi login aktif</b> pengguna di web dan aplikasi mobile.
            </div>

            {resetFormError && (
              <div className="mt-3">
                <ErrorState message={resetFormError} />
              </div>
            )}

            <form
              onSubmit={(e) => void handleResetPasswordSubmit(e)}
              className="mt-4 space-y-3.5"
            >
              <PasswordInput
                label="Kata Sandi Baru"
                placeholder="Min. 10 karakter"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <PasswordInput
                label="Konfirmasi Kata Sandi Baru"
                placeholder="Ulangi kata sandi baru"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />

              <p className="text-[11px] text-slate-500">
                Wajib mengandung minimal 10 karakter dengan huruf besar, huruf kecil, dan angka.
              </p>

              <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setResetTarget(null)}
                  disabled={actionLoading}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Mereset…" : "Simpan Kata Sandi Baru"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DEACTIVATE CONFIRMATION */}
      {deactivateTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="text-2xl" aria-hidden="true">⚠️</span>
              <h3 id="deactivate-title" className="text-lg font-bold text-slate-900">
                Konfirmasi Penonaktifan Akun
              </h3>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              Apakah Anda yakin ingin menonaktifkan akun{" "}
              <b>{deactivateTarget.displayName}</b> ({deactivateTarget.phoneNumber})?
            </p>

            <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <p>• Pengguna tidak akan dapat masuk ke sistem.</p>
              <p>• Sesi login yang sedang aktif akan segera dicabut.</p>
              <p>
                • <b>Data & riwayat klinis tidak dihapus:</b> Riwayat pemeriksaan, penugasan, dan catatan konsultasi tetap tersimpan aman.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeactivateTarget(null)}
                disabled={actionLoading}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleDeactivate()}
                disabled={actionLoading}
              >
                {actionLoading ? "Memproses…" : "Ya, Nonaktifkan Akun"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
