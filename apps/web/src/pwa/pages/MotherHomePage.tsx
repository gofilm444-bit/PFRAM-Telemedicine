import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth";
import { MotherAppShell } from "../MotherAppShell";
import { Card, StatusBadge, Button } from "../../components";
import { motherAncApi, formatAncDateShort, formatAncTime } from "../../anc-api";
import {
  motherMonitoringApi,
  formatIndonesianDate,
  formatWeightKg,
  formatBp,
} from "../../monitoring-api";

export function MotherHomePage() {
  const { user } = useAuth();

  // 1. Fetch upcoming ANC schedule
  const upcomingAncQuery = useQuery({
    queryKey: ["mother", "anc", "upcoming"],
    queryFn: () => motherAncApi.getUpcomingSchedule(),
    retry: 1,
    staleTime: 60_000,
  });

  // 2. Fetch latest monitoring summary
  const monitoringQuery = useQuery({
    queryKey: ["mother", "monitoring", "summary"],
    queryFn: () => motherMonitoringApi.getMonitoringSummary(),
    retry: 1,
    staleTime: 60_000,
  });

  const activePregnancy = user?.activePregnancy;
  const facility = user?.selectedFacility;
  const midwifeAssignment = user?.activeMidwifeAssignment;

  // Format gestational age
  const gestationalAgeText = activePregnancy?.gestationalAge
    ? `${activePregnancy.gestationalAge.weeks} Minggu ${activePregnancy.gestationalAge.days} Hari`
    : "Menghitung usia kehamilan…";

  // Trimester label
  const trimesterLabel =
    activePregnancy?.trimester === 1
      ? "Trimester I"
      : activePregnancy?.trimester === 2
        ? "Trimester II"
        : activePregnancy?.trimester === 3
          ? "Trimester III"
          : "-";

  // Estimated Due Date (HPL)
  const hplText = activePregnancy?.estimatedDueDate
    ? formatIndonesianDate(activePregnancy.estimatedDueDate)
    : "-";

  // Friendly greetings
  const greetingName = user?.displayName?.trim() || "Ibu";

  return (
    <MotherAppShell
      title="PFRAM Telemedicine"
      subtitle="Pantau Kehamilan, Lindungi Ibu dan Bayi"
    >
      <div className="space-y-4">
        {/* A. GREETING & MATERNAL STATUS */}
        <section className="flex items-center justify-between gap-3 pt-1">
          <div>
            <span className="text-xs font-medium text-slate-500">
              Selamat datang di PFRAM Telemedicine
            </span>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
              Halo, {greetingName}!
            </h1>
          </div>
          <StatusBadge
            variant={activePregnancy ? "success" : "info"}
            size="sm"
          >
            {activePregnancy ? "Kehamilan Aktif" : "Menunggu Data"}
          </StatusBadge>
        </section>

        {/* B. PREGNANCY HERO CARD */}
        <section aria-labelledby="pregnancy-hero-title">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#168C68] to-[#155E4B] p-5 text-white shadow-lg shadow-emerald-950/15">
            {/* Background subtle decoration */}
            <div
              className="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 rounded-full bg-white/10 blur-xl"
              aria-hidden="true"
            />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-100/90">
                  Kehamilan Anda
                </span>
                <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {trimesterLabel}
                </span>
              </div>

              <div>
                <h2
                  id="pregnancy-hero-title"
                  className="text-2xl font-black tracking-tight text-white leading-tight"
                >
                  {gestationalAgeText}
                </h2>
                <p className="mt-1 text-xs text-emerald-100">
                  Perkiraan Persalinan (HPL):{" "}
                  <strong className="font-semibold text-white">{hplText}</strong>
                </p>
              </div>

              {/* Progress bar visual indicator */}
              {activePregnancy?.gestationalAge && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-emerald-200">
                    <span>Minggu {activePregnancy.gestationalAge.weeks}</span>
                    <span>Target 40 Minggu</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-950/30">
                    <div
                      className="h-full rounded-full bg-emerald-300 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(5, (activePregnancy.gestationalAge.weeks / 40) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* CLINICAL SERVICES / ACTION CARDS */}
        <section aria-label="Layanan Klinis Ibu">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Link
              to="/m/anc"
              className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all hover:border-pfram-primary hover:bg-emerald-50/20 active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-pfram-primary ring-1 ring-emerald-200/60 mb-1.5">
                🗓️
              </div>
              <span className="text-xs font-bold text-slate-900 leading-tight">
                Jadwal ANC
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Standar 10T
              </span>
            </Link>

            <Link
              to="/m/danger-screening"
              className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all hover:border-rose-400 hover:bg-rose-50/20 active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-lg text-rose-700 ring-1 ring-rose-200/60 mb-1.5">
                🩺
              </div>
              <span className="text-xs font-bold text-slate-900 leading-tight">
                Tanda Bahaya
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Skrining Mandiri
              </span>
            </Link>

            <Link
              to="/m/p4k"
              className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all hover:border-sky-400 hover:bg-sky-50/20 active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-lg text-sky-700 ring-1 ring-sky-200/60 mb-1.5">
                👶
              </div>
              <span className="text-xs font-bold text-slate-900 leading-tight">
                P4K & Rujukan
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Kesiapan Lahir
              </span>
            </Link>
          </div>
        </section>

        {/* C. IMPORTANT NEXT ACTION (UPCOMING ANC) */}
        <section aria-labelledby="upcoming-anc-heading">
          <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-sm text-pfram-primary ring-1 ring-emerald-200/50">
                  🗓️
                </span>
                <h3
                  id="upcoming-anc-heading"
                  className="text-xs font-bold uppercase tracking-wider text-slate-800"
                >
                  Jadwal Pemeriksaan ANC
                </h3>
              </div>
              <Link
                to="/m/anc"
                className="text-xs font-bold text-pfram-primary hover:text-pfram-text hover:underline"
              >
                Lihat Jadwal
              </Link>
            </div>

            {upcomingAncQuery.isLoading ? (
              <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
                Memeriksa jadwal pemeriksaan…
              </div>
            ) : upcomingAncQuery.isError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 flex items-center justify-between">
                <span>Jadwal ANC belum dapat dimuat saat ini.</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => upcomingAncQuery.refetch()}
                >
                  Coba lagi
                </Button>
              </div>
            ) : upcomingAncQuery.data ? (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {formatAncDateShort(upcomingAncQuery.data.scheduledAt)}
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Pukul {formatAncTime(upcomingAncQuery.data.scheduledAt)} WIT
                    </span>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-800 shadow-2xs">
                    {upcomingAncQuery.data.doctorRequired
                      ? "Pemeriksaan Dokter (USG)"
                      : "Pemeriksaan Bidan (ANC)"}
                  </span>
                </div>

                {upcomingAncQuery.data.facility && (
                  <p className="text-[11px] text-slate-600 border-t border-emerald-200/50 pt-2">
                    📍 {upcomingAncQuery.data.facility.name}
                  </p>
                )}
                {upcomingAncQuery.data.notes && (
                  <p className="text-[11px] italic text-slate-500">
                    Catatan: {upcomingAncQuery.data.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <p className="text-xs font-medium text-slate-700">
                  Belum ada jadwal ANC mendatang
                </p>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Bidan pendamping akan menjadwalkan pemeriksaan antenatal berikutnya sesuai standar 6 kali kunjungan Kemenkes RI.
                </p>
              </div>
            )}
          </Card>
        </section>

        {/* D. HEALTH SNAPSHOT (MONITORING SUMMARY) */}
        <section aria-labelledby="health-snapshot-heading">
          <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-sm text-teal-700 ring-1 ring-teal-200/50">
                  💓
                </span>
                <h3
                  id="health-snapshot-heading"
                  className="text-xs font-bold uppercase tracking-wider text-slate-800"
                >
                  Ringkasan Pemantauan Fisik
                </h3>
              </div>
              <Link
                to="/m/monitoring"
                className="text-xs font-bold text-pfram-primary hover:text-pfram-text hover:underline"
              >
                Lihat Semua
              </Link>
            </div>

            {monitoringQuery.isLoading ? (
              <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
                Memuat data pengukuran…
              </div>
            ) : monitoringQuery.isError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 flex items-center justify-between">
                <span>Data pemantauan belum dapat dimuat saat ini.</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => monitoringQuery.refetch()}
                >
                  Coba lagi
                </Button>
              </div>
            ) : monitoringQuery.data &&
              (monitoringQuery.data.latestWeight !== null ||
                monitoringQuery.data.latestBloodPressure !== null) ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Weight Box */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Berat Badan Terakhir
                  </span>
                  <span className="mt-1 text-base font-bold text-slate-900 block">
                    {formatWeightKg(monitoringQuery.data.latestWeight)}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-400 block truncate">
                    {monitoringQuery.data.latestWeightRecordedAt
                      ? formatIndonesianDate(monitoringQuery.data.latestWeightRecordedAt)
                      : "-"}
                  </span>
                </div>

                {/* Blood Pressure Box */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Tekanan Darah Terakhir
                  </span>
                  <span className="mt-1 text-base font-bold text-slate-900 block">
                    {monitoringQuery.data.latestBloodPressure
                      ? formatBp(
                          monitoringQuery.data.latestBloodPressure.systolic,
                          monitoringQuery.data.latestBloodPressure.diastolic,
                        )
                      : "-"}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-400 block truncate">
                    {monitoringQuery.data.latestBloodPressureRecordedAt
                      ? formatIndonesianDate(
                          monitoringQuery.data.latestBloodPressureRecordedAt,
                        )
                      : "-"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <p className="text-xs font-medium text-slate-700">
                  Belum ada catatan pemantauan
                </p>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Catatan berat badan dan tekanan darah mandiri atau dari posyandu/faskes akan muncul di sini.
                </p>
                <div className="mt-3">
                  <Link
                    to="/m/monitoring"
                    className="inline-flex items-center gap-1 text-xs font-bold text-pfram-primary hover:underline"
                  >
                    Buka Halaman Pemantauan →
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* E. CARE TEAM & HEALTH FACILITY CARD */}
        <section aria-labelledby="care-team-heading">
          <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sm text-sky-700 ring-1 ring-sky-200/50">
                  🏥
                </span>
                <h3
                  id="care-team-heading"
                  className="text-xs font-bold uppercase tracking-wider text-slate-800"
                >
                  Tim Pendamping Maternal
                </h3>
              </div>
              <StatusBadge
                variant={midwifeAssignment ? "success" : "info"}
                size="sm"
              >
                {midwifeAssignment ? "Bidan Terhubung" : "Sedang Diproses"}
              </StatusBadge>
            </div>

            <div className="space-y-3 text-xs">
              {/* Primary Facility */}
              <div>
                <span className="text-slate-500 block">Fasilitas Pelayanan Primer:</span>
                <p className="mt-0.5 font-bold text-slate-900 text-sm">
                  {facility?.name || "Belum memilih fasilitas kesehatan"}
                </p>
                {facility?.phoneNumber && (
                  <a
                    href={`tel:${facility.phoneNumber.replace(/[^\d+]/g, "")}`}
                    className="mt-1 inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
                  >
                    <span>📞 {facility.phoneNumber}</span>
                  </a>
                )}
              </div>

              {/* Midwife */}
              <div className="border-t border-slate-100 pt-2.5">
                <span className="text-slate-500 block">Bidan Pendamping:</span>
                {midwifeAssignment?.midwife ? (
                  <div>
                    <p className="mt-0.5 font-bold text-slate-900 text-sm">
                      {midwifeAssignment.midwife.fullName}
                    </p>
                    {midwifeAssignment.midwife.whatsappNumber && (
                      <p className="mt-0.5 text-slate-600">
                        Kontak: {midwifeAssignment.midwife.whatsappNumber}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-0.5 font-medium text-slate-600">
                    Bidan pendamping sedang diproses oleh fasilitas kesehatan Anda.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* F. QUICK ACTIONS GRID */}
        <section aria-label="Aksi Cepat">
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/m/monitoring"
              className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-pfram-primary hover:bg-emerald-50/30 active:scale-95"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-pfram-primary ring-1 ring-emerald-200/60">
                📊
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Pantau Fisik
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  BB & Tensi
                </span>
              </div>
            </Link>

            <Link
              to="/m/consultation"
              className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-pfram-primary hover:bg-emerald-50/30 active:scale-95"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xl text-teal-700 ring-1 ring-teal-200/60">
                💬
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Konsultasi
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  Pesan ke Bidan
                </span>
              </div>
            </Link>

            <Link
              to="/m/education"
              className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-pfram-primary hover:bg-emerald-50/30 active:scale-95"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-700 ring-1 ring-amber-200/60">
                📖
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Edukasi KIA
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  Panduan Kehamilan
                </span>
              </div>
            </Link>

            <Link
              to="/m/account"
              className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-pfram-primary hover:bg-emerald-50/30 active:scale-95"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-700 ring-1 ring-slate-200">
                ⚙️
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Akun & Profil
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  Data Pengguna
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* G. CLINICAL SAFETY & EMERGENCY ADVISORY */}
        <section aria-labelledby="safety-advisory-heading">
          <Card className="border border-rose-200 bg-rose-50/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-800">
              <span className="text-base" aria-hidden="true">
                ⚠️
              </span>
              <h4
                id="safety-advisory-heading"
                className="text-xs font-bold uppercase tracking-wider"
              >
                Peringatan Medis & Kedaruratan
              </h4>
            </div>

            <p className="text-[11px] text-rose-950 leading-relaxed">
              Bila Ibu mengalami tanda bahaya (seperti perdarahan, sakit kepala hebat, kejang, demam tinggi, bengkak mendadak, atau gerakan janin berkurang):
            </p>

            <div className="rounded-lg bg-white/90 p-2.5 border border-rose-200/80">
              <p className="text-xs font-bold text-rose-900 text-center leading-snug">
                Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.
              </p>
            </div>

            <p className="text-[10px] text-rose-800/80 leading-tight">
              Aplikasi ini adalah media telemonitoring pendamping, bukan pengganti pemeriksaan medis atau diagnosis dokter.
            </p>
          </Card>
        </section>
      </div>
    </MotherAppShell>
  );
}
