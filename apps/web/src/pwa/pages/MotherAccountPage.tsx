import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { MotherAppShell } from "../MotherAppShell";
import { Button, Card, StatusBadge } from "../../components";

export function MotherAccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const notificationSupported = typeof window !== "undefined" && "Notification" in window && !!window.Notification;
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window && window.Notification) {
      return (window.Notification.permission as NotificationPermission) || "default";
    }
    return "default";
  });

  const handleEnableNotifications = async () => {
    if (!notificationSupported) return;
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        try {
          new Notification("Pengingat Jadwal PFRAM", {
            body: "Pengingat jadwal kehamilan aktif (WIT).",
            icon: "/icons/icon-192.png",
          });
        } catch {
          // Ignored
        }
      }
    } catch {
      // Ignored
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch {
      // Fallback redirect even if logout endpoint network fails
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <MotherAppShell
      title="Akun Saya"
      subtitle="Profil Pengguna & Layanan"
    >
      <div className="space-y-4">
        {/* User Identity Card */}
        <Card className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-emerald-50/25 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-xl font-bold text-pfram-deep ring-2 ring-emerald-200/60 shadow-inner">
              {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : "I"}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-bold text-slate-900">
                {user?.displayName || "Pengguna Ibu"}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {user?.phoneNumber ?? "-"}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <StatusBadge
                  variant={user?.status === "ACTIVE" ? "success" : "warning"}
                  size="sm"
                >
                  {user?.status === "ACTIVE" ? "Akun Aktif" : "Menunggu Verifikasi"}
                </StatusBadge>
              </div>
            </div>
          </div>
        </Card>

        {/* Primary Health Facility & Care Team */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3.5">
          <div className="border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <span className="text-sm">🏥</span>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Layanan Fasilitas & Bidan
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500">Fasilitas Pelayanan Primer:</span>
              <p className="mt-1 font-bold text-slate-800">
                {user?.selectedFacility?.name ?? "Belum memilih fasilitas primer"}
              </p>
              {user?.selectedFacility?.phoneNumber && (
                <div className="mt-1.5 flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                  <span>📞</span>
                  <a
                    href={`tel:${user.selectedFacility.phoneNumber}`}
                    className="hover:text-pfram-primary hover:underline"
                  >
                    {user.selectedFacility.phoneNumber}
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500">Bidan Pendamping:</span>
              <p className="mt-1 font-bold text-slate-800">
                {user?.activeMidwifeAssignment?.midwife.fullName ??
                  "Bidan pendamping sedang diproses"}
              </p>
              {user?.activeMidwifeAssignment?.midwife.whatsappNumber && (
                <div className="mt-1.5 flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                  <span>💬 WhatsApp:</span>
                  <a
                    href={`https://wa.me/${user.activeMidwifeAssignment.midwife.whatsappNumber.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-pfram-primary hover:underline font-semibold text-emerald-700"
                  >
                    {user.activeMidwifeAssignment.midwife.whatsappNumber}
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Web / PWA Notification Settings */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3.5">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔔</span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Pengingat & Notifikasi Web
              </h3>
            </div>
            {notificationSupported ? (
              <StatusBadge
                variant={
                  notificationPermission === "granted"
                    ? "success"
                    : notificationPermission === "denied"
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              >
                {notificationPermission === "granted"
                  ? "Notifikasi Aktif"
                  : notificationPermission === "denied"
                  ? "Izin Diblokir"
                  : "Belum Aktif"}
              </StatusBadge>
            ) : (
              <StatusBadge variant="neutral" size="sm">
                Tidak Didukung
              </StatusBadge>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Pengingat jadwal ANC dan minum Tablet Tambah Darah (TTD) sesuai zona waktu operasional Maluku Utara (WIT).
          </p>

          {!notificationSupported ? (
            <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 leading-normal border border-slate-100">
              Peramban saat ini tidak mendukung Web Notifications API. Anda tetap dapat melihat jadwal kunjungan langsung pada tab ANC.
            </div>
          ) : notificationPermission === "granted" ? (
            <div className="space-y-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 text-xs text-emerald-950">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <span>🔔</span>
                <span>Notifikasi Aktif (Waktu Indonesia Timur · WIT)</span>
              </div>
              <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                Pemberitahuan dikirim secara otomatis. Isi pengingat bersifat netral dan dirancang menjaga kerahasiaan medis ibu.
              </p>
              <div className="rounded-lg bg-white/90 p-2.5 text-[11px] text-slate-600 border border-emerald-100 shadow-2xs">
                <span className="font-semibold text-slate-700">Contoh format: </span>
                <span className="italic text-slate-600">"Pengingat Jadwal PFRAM: Waktunya pemeriksaan kehamilan / minum TTD."</span>
              </div>
            </div>
          ) : notificationPermission === "denied" ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3.5 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <span>⚠️</span>
                <span>Izin Notifikasi Diblokir</span>
              </p>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Peramban Anda memblokir izin pemberitahuan. Untuk menerima pengingat jadwal, aktifkan notifikasi melalui ikon setelan di bilah alamat peramban.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Aktifkan pemberitahuan peramban untuk menerima pengingat jadwal pemeriksaan dan suplemen kehamilan tepat waktu.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleEnableNotifications}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold"
              >
                <span>🔔</span>
                <span>Aktifkan Pengingat</span>
              </Button>
            </div>
          )}
        </Card>

        {/* Security & Access Notice */}
        <Card className="rounded-2xl border border-slate-200/70 bg-[#FCFBF9] p-4.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs">🛡️</span>
            <h3 className="text-xs font-bold text-slate-800">
              Keamanan Akun
            </h3>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-pfram-primary font-bold">✓</span>
              <span>Sesi masuk dilindungi sistem autentikasi aman</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pfram-primary font-bold">✓</span>
              <span>Data hanya dapat diakses sesuai hak peran pengguna</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pfram-primary font-bold">✓</span>
              <span>Jangan membagikan kata sandi atau kode masuk kepada siapa pun</span>
            </li>
          </ul>
        </Card>

        {/* About App (Subtle) */}
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 text-center">
          <h4 className="text-xs font-bold text-slate-800">
            PFRAM Telemedicine
          </h4>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Pantau Kehamilan, Lindungi Ibu dan Bayi
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            Sistem Terintegrasi Buku KIA Kemenkes RI · Versi 0.1.0
          </p>
        </div>

        {/* Logout Action */}
        <div className="pt-2">
          <Button
            type="button"
            variant="danger"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full min-h-11 rounded-xl text-xs font-bold shadow-sm"
          >
            {loggingOut ? "Keluar…" : "Keluar dari Akun"}
          </Button>
        </div>
      </div>
    </MotherAppShell>
  );
}
