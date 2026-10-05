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
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-bold text-pfram-text ring-1 ring-emerald-300/50">
              {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : "I"}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-bold text-slate-900">
                {user?.displayName || "Pengguna Ibu"}
              </h2>
              <p className="text-xs text-slate-500">
                {user?.phoneNumber ?? "-"}
              </p>
              <div className="mt-2 flex items-center gap-2">
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
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Layanan Fasilitas & Bidan
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500">Fasilitas Pelayanan Primer:</span>
              <p className="mt-0.5 font-bold text-slate-800">
                {user?.selectedFacility?.name ?? "Belum memilih fasilitas primer"}
              </p>
              {user?.selectedFacility?.phoneNumber && (
                <p className="text-slate-600 mt-0.5">
                  📞 {user.selectedFacility.phoneNumber}
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-2.5">
              <span className="text-slate-500">Bidan Pendamping:</span>
              <p className="mt-0.5 font-bold text-slate-800">
                {user?.activeMidwifeAssignment?.midwife.fullName ??
                  "Bidan pendamping sedang diproses"}
              </p>
              {user?.activeMidwifeAssignment?.midwife.whatsappNumber && (
                <p className="text-slate-600 mt-0.5">
                  WhatsApp: {user.activeMidwifeAssignment.midwife.whatsappNumber}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Web / PWA Notification Settings */}
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Pengingat & Notifikasi Web
            </h3>
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
            <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">
              Peramban saat ini tidak mendukung Web Notifications API. Anda tetap dapat melihat jadwal kunjungan langsung pada tab ANC.
            </div>
          ) : notificationPermission === "granted" ? (
            <div className="space-y-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80 p-3 text-xs text-emerald-950">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <span>🔔</span>
                <span>Notifikasi Aktif (Waktu Indonesia Timur · WIT)</span>
              </div>
              <p className="text-[11px] text-emerald-900/80">
                Pemberitahuan dikirim secara otomatis. Isi pengingat bersifat netral dan dirancang menjaga kerahasiaan medis ibu.
              </p>
              <div className="mt-1 rounded bg-white/80 p-2 text-[11px] text-slate-600 border border-emerald-100">
                <span className="font-semibold text-slate-700">Contoh format: </span>
                <em>"Pengingat Jadwal PFRAM: Waktunya pemeriksaan kehamilan / minum TTD."</em>
              </div>
            </div>
          ) : notificationPermission === "denied" ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Izin Notifikasi Diblokir</p>
              <p className="text-[11px] text-amber-800">
                Peramban Anda memblokir izin pemberitahuan. Untuk menerima pengingat jadwal, aktifkan notifikasi melalui ikon setelan di bilah alamat peramban.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                Aktifkan pemberitahuan peramban untuk menerima pengingat jadwal pemeriksaan dan suplemen kehamilan tepat waktu.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleEnableNotifications}
                className="w-full flex items-center justify-center gap-2 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
              >
                <span>🔔</span>
                <span>Aktifkan Pengingat</span>
              </Button>
            </div>
          )}
        </Card>

        {/* Security & Access Notice */}
        <Card className="border border-slate-200/80 bg-slate-50/60 p-4">
          <h3 className="text-xs font-bold text-slate-800 mb-1">
            Keamanan Akun
          </h3>
          <ul className="space-y-1 text-[11px] text-slate-600 list-disc list-inside">
            <li>Sesi masuk dilindungi sistem autentikasi aman</li>
            <li>Data hanya dapat diakses sesuai hak peran pengguna</li>
            <li>Jangan membagikan kata sandi atau kode masuk kepada siapa pun</li>
          </ul>
        </Card>

        {/* About App (Subtle) */}
        <div className="rounded-xl border border-slate-200/60 bg-white/70 p-4 text-center">
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
            className="w-full min-h-11 text-xs font-bold shadow-sm"
          >
            {loggingOut ? "Keluar…" : "Keluar dari Akun"}
          </Button>
        </div>
      </div>
    </MotherAppShell>
  );
}
