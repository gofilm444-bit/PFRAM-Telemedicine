import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MotherAppShell } from "../MotherAppShell";
import { Card, Button } from "../../components";
import {
  useMotherUpcomingAnc,
  useMotherAncSchedules,
  useMotherAdherenceSummary,
  useMotherRecommendations,
  useConfirmAncAttendance,
} from "../../anc-queries";
import { formatAncDateTime, formatAncDateShort, ANC_STATUS_BADGES } from "../../anc-api";
import { useAuth } from "../../auth";
import type { AncRuleSet } from "@pfram/shared-types";
import { isAncAppointmentDayArrived } from "@pfram/validation";

function isDateArrivedOrPast(scheduledAt: string | Date): boolean {
  return isAncAppointmentDayArrived(scheduledAt);
}

type FilterTab = "all" | "upcoming" | "completed";

export function MotherAncPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { data: upcoming, isLoading: loadingUpcoming } = useMotherUpcomingAnc();
  const { data: adherence } = useMotherAdherenceSummary();
  const { data: recommendationsData } = useMotherRecommendations();
  const { data: schedulesData, isLoading: loadingSchedules } = useMotherAncSchedules();

  const confirmMutation = useConfirmAncAttendance();

  const schedules = schedulesData?.items ?? [];

  const filteredSchedules = schedules.filter((s) => {
    if (activeFilter === "upcoming") {
      return s.status === "SCHEDULED";
    }
    if (activeFilter === "completed") {
      return s.status === "COMPLETED";
    }
    return true;
  });

  const handleConfirmAttendance = async (publicId: string) => {
    setConfirmingId(publicId);
    try {
      await confirmMutation.mutateAsync(publicId);
    } catch {
      // error handled by mutation
    } finally {
      setConfirmingId(null);
    }
  };

  const ruleSet = (recommendationsData as unknown as { ruleSet?: AncRuleSet })?.ruleSet;

  const completedCount =
    adherence?.ancCompleted ?? (adherence as unknown as Record<string, number>)?.completedVisits ?? 0;
  const targetVisits =
    ruleSet?.minimumVisits ??
    (adherence as unknown as Record<string, number>)?.totalTargetVisits ??
    6;
  const adherenceRate =
    (adherence as unknown as Record<string, number>)?.adherencePercentage ??
    (targetVisits > 0 ? Math.round((completedCount / targetVisits) * 100) : 0);
  const ttdRate =
    adherence?.ironTabletsAdherencePercentage ??
    (adherence as unknown as Record<string, number>)?.ironSupplementationPercentage ??
    0;

  const rawRecs = Array.isArray(recommendationsData)
    ? recommendationsData
    : (recommendationsData?.recommendations as unknown[]);
  const recList =
    (rawRecs as Array<{ id?: string; title?: string; description?: string; isDoctorVisit?: boolean }> | undefined) ?? [];

  const facilityName =
    user?.selectedFacility?.name ??
    (user as unknown as Record<string, { name?: string }>)?.assignedFacility?.name ??
    "Puskesmas Kalumata";
  const midwifeName =
    user?.activeMidwifeAssignment?.midwife?.fullName ??
    (user as unknown as Record<string, { fullName?: string }>)?.assignedMidwife?.fullName ??
    "Bidan Pendamping Faskes";
  const midwifePhone =
    user?.activeMidwifeAssignment?.midwife?.whatsappNumber ??
    (user as unknown as Record<string, { phoneNumber?: string }>)?.assignedMidwife?.phoneNumber ??
    "";

  return (
    <MotherAppShell
      title="Jadwal ANC"
      subtitle="Pemeriksaan Kehamilan & Kepatuhan"
      showBack={true}
      onBack={() => navigate("/m/home")}
    >
      <div className="space-y-4">
        {/* Routine Clinical Safety Note */}
        <div
          role="note"
          aria-label="Catatan Keselamatan Medis"
          className="rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-2.5 text-xs text-slate-700 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <span className="text-sm shrink-0" aria-hidden="true">
              ℹ️
            </span>
            <div className="leading-snug">
              <span className="font-semibold text-slate-900">Catatan Medis: </span>
              <span>Bila mengalami keluhan darurat kehamilan, </span>
              <strong className="font-semibold text-slate-900">
                Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.
              </strong>
            </div>
          </div>
        </div>

        {/* Title Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Jadwal & Kepatuhan ANC</h1>
          <p className="mt-1 text-xs text-slate-500">
            Pantau jadwal pemeriksaan kehamilan 6x sesuai standar Kemenkes RI
          </p>
        </div>

        {/* Adherence Summary Card */}
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ringkasan Kepatuhan ANC
              </p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {adherenceRate}%
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                {completedCount} dari {targetVisits} Kunjungan
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Kepatuhan TTD: <strong className="text-slate-800 font-bold">{ttdRate}%</strong>
              </p>
            </div>
          </div>

          {/* Kemenkes RI Standard Visit Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Target Kemenkes RI ({targetVisits} Kunjungan)
              </span>
              <span className="text-slate-500 font-medium">
                {completedCount}/{targetVisits} Terpenuhi
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, adherenceRate))}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 flex flex-col justify-between">
                <p className="font-bold text-slate-700">Trimester 1</p>
                <p className="text-slate-600 font-medium text-[10px] mt-0.5">
                  Min. {ruleSet?.trimesterDistribution?.trimester1?.minVisits ?? 2} kunjungan
                </p>
                {(ruleSet?.trimesterDistribution?.trimester1?.minDoctorVisits ?? 1) > 0 && (
                  <p className="text-purple-700 font-semibold text-[9.5px] mt-0.5">
                    {ruleSet?.trimesterDistribution?.trimester1?.minDoctorVisits ?? 1}x Dokter + USG
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 flex flex-col justify-between">
                <p className="font-bold text-slate-700">Trimester 2</p>
                <p className="text-slate-600 font-medium text-[10px] mt-0.5">
                  Min. {ruleSet?.trimesterDistribution?.trimester2?.minVisits ?? 2} kunjungan
                </p>
                {Boolean(ruleSet?.trimesterDistribution?.trimester2?.minDoctorVisits) && (
                  <p className="text-purple-700 font-semibold text-[9.5px] mt-0.5">
                    {ruleSet?.trimesterDistribution?.trimester2?.minDoctorVisits}x Dokter + USG
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 flex flex-col justify-between">
                <p className="font-bold text-slate-700">Trimester 3</p>
                <p className="text-slate-600 font-medium text-[10px] mt-0.5">
                  Min. {ruleSet?.trimesterDistribution?.trimester3?.minVisits ?? 2} kunjungan
                </p>
                {(ruleSet?.trimesterDistribution?.trimester3?.minDoctorVisits ?? 1) > 0 && (
                  <p className="text-purple-700 font-semibold text-[9.5px] mt-0.5">
                    {ruleSet?.trimesterDistribution?.trimester3?.minDoctorVisits ?? 1}x Dokter + USG
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Upcoming Visit Highlight Card */}
        {loadingUpcoming ? (
          <Card className="border border-slate-200/90 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500 text-center py-4">Memuat kunjungan berikutnya...</p>
          </Card>
        ) : upcoming ? (
          <div aria-label="Kunjungan Berikutnya">
            <Card className="border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  📅 Kunjungan Berikutnya
                </span>
                {upcoming.doctorRequired && (
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                    Wajib Dokter + USG
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {(upcoming as unknown as Record<string, number>).contactNumber
                    ? `Kontak ke-${(upcoming as unknown as Record<string, number>).contactNumber}`
                    : "Kontak ke-1"}
                </h2>
                <p className="text-sm font-semibold text-emerald-800 mt-0.5">
                  {formatAncDateTime(upcoming.scheduledAt)}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  📍 {upcoming.facility?.name ?? "Fasilitas Kesehatan"}
                </p>
                {upcoming.notes && (
                  <p className="text-xs text-slate-500 mt-1 italic">
                    "{upcoming.notes}"
                  </p>
                )}
              </div>

              {/* Recommendations / Requirements */}
              {recList.length > 0 && (
                <div className="mt-2 rounded-xl bg-white/80 p-3 border border-emerald-100 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Rekomendasi Medis
                  </p>
                  {recList.map((rec, i) => (
                    <div key={rec.id ?? i} className="text-xs text-slate-700">
                      <span className="font-semibold text-emerald-800">• {rec.title}: </span>
                      <span>{rec.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {upcoming.status === "SCHEDULED" && (
                <div className="pt-2">
                  {isDateArrivedOrPast(upcoming.scheduledAt) ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5"
                      disabled={confirmMutation.isPending && confirmingId === upcoming.publicId}
                      onClick={() => handleConfirmAttendance(upcoming.publicId)}
                    >
                      {confirmMutation.isPending && confirmingId === upcoming.publicId
                        ? "Menyimpan Konfirmasi..."
                        : "Konfirmasi Saya Sudah Datang"}
                    </Button>
                  ) : (
                    <div className="rounded-lg bg-blue-50/80 border border-blue-200/80 px-3 py-2 text-xs text-blue-800 flex items-center gap-2">
                      <span aria-hidden="true">🗓️</span>
                      <span>
                        Konfirmasi kehadiran mandiri akan tersedia pada hari pemeriksaan (
                        {formatAncDateShort(upcoming.scheduledAt)}).
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        ) : null}

        {/* Schedule List & Filter Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Daftar Pemeriksaan ANC
            </h2>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {(
                [
                  { id: "all", label: "Semua" },
                  { id: "upcoming", label: "Mendatang" },
                  { id: "completed", label: "Selesai" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    activeFilter === tab.id
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loadingSchedules ? (
            <Card className="border border-slate-200/90 bg-white p-6 text-center text-sm text-slate-500">
              Memuat daftar jadwal ANC...
            </Card>
          ) : filteredSchedules.length === 0 ? (
            <Card className="border border-slate-200/90 bg-white p-8 text-center shadow-sm">
              <span className="text-3xl" aria-hidden="true">
                📋
              </span>
              <h3 className="mt-2 text-sm font-bold text-slate-900">
                Belum Ada Jadwal ANC
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                Jadwal pemeriksaan kehamilan akan dibuat oleh bidan atau dokter pemeriksa Anda.
              </p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredSchedules.map((schedule, idx) => {
                const badgeInfo = ANC_STATUS_BADGES[schedule.status] ?? {
                  label: schedule.status,
                  className: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const contactNumber =
                  (schedule as unknown as Record<string, number>).contactNumber ?? (idx + 1);

                return (
                  <Card
                    key={schedule.publicId}
                    className="border border-slate-200/90 bg-white p-4 shadow-sm space-y-2 transition-all hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            Kontak ke-{contactNumber}
                          </h3>
                          {schedule.doctorRequired && (
                            <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 ring-1 ring-purple-200">
                              Wajib Dokter + USG
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatAncDateTime(schedule.scheduledAt)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeInfo.className}`}
                      >
                        {badgeInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-50">
                      <span>📍 {schedule.facility?.name ?? "Puskesmas"}</span>
                      {schedule.status === "SCHEDULED" &&
                        (isDateArrivedOrPast(schedule.scheduledAt) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-700 hover:text-emerald-800 text-xs font-semibold p-0 h-auto"
                            disabled={confirmMutation.isPending && confirmingId === schedule.publicId}
                            onClick={() => handleConfirmAttendance(schedule.publicId)}
                          >
                            {confirmMutation.isPending && confirmingId === schedule.publicId
                              ? "Menyimpan..."
                              : "Konfirmasi Saya Sudah Datang"}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            Tersedia pd {formatAncDateShort(schedule.scheduledAt)}
                          </span>
                        ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Assigned Midwife / Care Team Card */}
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Fasilitas & Bidan Pendamping
          </h2>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">
              {facilityName}
            </p>
            <p className="text-xs text-slate-600">
              Bidan: {midwifeName}
            </p>
            {midwifePhone && (
              <p className="text-xs text-slate-500">
                Kontak: {midwifePhone}
              </p>
            )}
          </div>
        </Card>
      </div>
    </MotherAppShell>
  );
}
