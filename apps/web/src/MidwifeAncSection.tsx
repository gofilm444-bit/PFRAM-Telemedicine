import { useState } from "react";
import type {
  AncSchedule,
  AncVisitStatus,
  AncVisitType,
} from "@pfram/shared-types";
import {
  ANC_STATUS_BADGES,
  ANC_VISIT_TYPE_OPTIONS,
  formatAncDateTime,
} from "./anc-api";
import {
  useCreateMidwifeMotherSchedule,
  useMidwifeMotherAdherence,
  useMidwifeMotherSchedules,
  useUpdateMidwifeMotherSchedule,
} from "./anc-queries";

export function MidwifeAncSection({
  motherPublicId,
}: {
  motherPublicId: string;
}) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AncSchedule | null>(
    null,
  );

  const queryParam =
    filterStatus === "ALL" ? undefined : { status: filterStatus };

  const adherenceQuery = useMidwifeMotherAdherence(motherPublicId);
  const schedulesQuery = useMidwifeMotherSchedules(motherPublicId, queryParam);

  const adherence = adherenceQuery.data;
  const schedules = schedulesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Standar Acuan ANC Kemenkes RI Banner */}
      <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
              ℹ
            </span>
            <h3 className="text-sm font-bold text-sky-900">
              Standar Pelayanan Antenatal Terpadu Kemenkes RI
            </h3>
          </div>
          <span className="inline-flex items-center rounded-full bg-sky-200/70 px-2.5 py-0.5 text-xs font-bold text-sky-800">
            Standar Minimal 6 Kali Kunjungan
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-sky-950">
          <div className="rounded-xl bg-white/80 p-3 border border-sky-100">
            <div className="font-bold text-sky-900">Trimester 1: Min. 1x</div>
            <div className="mt-1 text-slate-600">K1 wajib dokter + USG skrining awal</div>
          </div>
          <div className="rounded-xl bg-white/80 p-3 border border-sky-100">
            <div className="font-bold text-sky-900">Trimester 2: Min. 2x</div>
            <div className="mt-1 text-slate-600">K2 & K3 pemantauan rutin oleh bidan</div>
          </div>
          <div className="rounded-xl bg-white/80 p-3 border border-sky-100">
            <div className="font-bold text-sky-900">Trimester 3: Min. 3x</div>
            <div className="mt-1 text-slate-600">K4 (bidan), K5 (dokter+USG), K6 (bidan)</div>
          </div>
          <div className="rounded-xl bg-sky-100/70 p-3 border border-sky-200">
            <div className="font-bold text-sky-900">Kontak Dokter: Min. 2x</div>
            <div className="mt-1 text-sky-800">Minimal 1x di TM 1 & 1x di TM 3 mencakup USG</div>
          </div>
        </div>
      </div>

      {/* 1. Adherence Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Tablet Tambah Darah (TTD) Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Kepatuhan Tablet Tambah Darah (TTD)
            </h3>
            {adherence && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                {adherence.ironTabletsAdherencePercentage}% Patuh
              </span>
            )}
          </div>

          {adherenceQuery.isLoading ? (
            <div className="mt-4 text-xs text-slate-400">Memuat rekap...</div>
          ) : adherence ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-pfram-primary">
                  {adherence.ironTabletsCompleted}
                </span>
                <span className="text-sm text-slate-500">
                  / {adherence.ironTabletsTotal} tablet dikonfirmasi diminum
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, adherence.ironTabletsAdherencePercentage)}%`,
                  }}
                />
              </div>

              <p className="text-xs text-slate-400">
                Dihitung dari konfirmasi harian ibu hamil dalam 30 hari terakhir.
              </p>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">
              Belum ada riwayat kepatuhan TTD.
            </div>
          )}
        </div>

        {/* ANC Visit Adherence Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Kepatuhan Kunjungan Pemeriksaan (ANC)
          </h3>

          {adherenceQuery.isLoading ? (
            <div className="mt-4 text-xs text-slate-400">Memuat rekap...</div>
          ) : adherence ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="text-xl font-bold text-slate-800">
                    {adherence.ancCompleted}
                  </div>
                  <div className="text-[11px] font-medium text-emerald-600">
                    Sudah Hadir
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="text-xl font-bold text-slate-800">
                    {adherence.ancMissedUnconfirmed}
                  </div>
                  <div className="text-[11px] font-medium text-amber-600">
                    Belum Hadir
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="text-xl font-bold text-slate-800">
                    {adherence.ancTotalScheduled}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">
                    Total Jadwal
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                * Kunjungan yang belum dikonfirmasi hadir setelah tanggal jadwal
                dapat difollow-up oleh bidan pendamping.
              </p>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400">
              Belum ada data jadwal ANC.
            </div>
          )}
        </div>
      </div>

      {/* 2. Schedule List Header & Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Jadwal Pemeriksaan ANC Ibu Binaan
            </h2>
            <p className="text-xs text-slate-500">
              Kelola tanggal pemeriksaan antenatal berkala dan pantau kehadiran.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-pfram-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-pfram-text"
            >
              + Jadwalkan Kunjungan Baru
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: "Semua", value: "ALL" },
            { label: "Terjadwal", value: "SCHEDULED" },
            { label: "Sudah Hadir", value: "COMPLETED" },
            { label: "Belum Dikonfirmasi", value: "MISSED" },
            { label: "Dibatalkan", value: "CANCELLED" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterStatus(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filterStatus === tab.value
                  ? "bg-pfram-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Schedule List */}
        <div className="mt-4">
          {schedulesQuery.isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Memuat daftar jadwal ANC...
            </div>
          ) : schedulesQuery.isError ? (
            <div className="py-8 text-center text-xs text-red-500">
              Gagal memuat jadwal ANC: {(schedulesQuery.error as Error)?.message}
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Belum ada jadwal pemeriksaan ANC untuk kategori ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold uppercase text-slate-400">
                    <th className="py-3 pr-4">Tanggal & Waktu</th>
                    <th className="py-3 px-4">Jenis Kunjungan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Fasilitas</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 pl-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((item) => {
                    const badge =
                      ANC_STATUS_BADGES[item.status] ??
                      ANC_STATUS_BADGES.SCHEDULED!;

                    return (
                      <tr key={item.publicId} className="hover:bg-slate-50/50">
                        <td className="py-3 pr-4 font-semibold text-slate-800">
                          {formatAncDateTime(item.scheduledAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-700">
                              {item.visitType === "DOCTOR_ANC"
                                ? "Pemeriksaan Dokter"
                                : "Pemeriksaan Rutin (ANC)"}
                            </span>
                            {item.doctorRequired && (
                              <span className="text-[11px] font-semibold text-blue-600">
                                🩺 Wajib Dokter
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {item.facility?.name ?? "-"}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 max-w-[200px] truncate">
                          {item.notes ?? "-"}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingSchedule(item)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-pfram-primary hover:text-pfram-primary"
                          >
                            Ubah
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modal Tambah Jadwal Baru */}
      {showAddModal && (
        <AddScheduleModal
          motherPublicId={motherPublicId}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 4. Modal Edit Jadwal */}
      {editingSchedule && (
        <EditScheduleModal
          motherPublicId={motherPublicId}
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
        />
      )}
    </div>
  );
}

function AddScheduleModal({
  motherPublicId,
  onClose,
}: {
  motherPublicId: string;
  onClose: () => void;
}) {
  const createMutation = useCreateMidwifeMotherSchedule();

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [visitType, setVisitType] = useState<AncVisitType>("ANC");
  const [doctorRequired, setDoctorRequired] = useState(false);
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) {
      setErrorMsg("Tanggal kunjungan wajib diisi.");
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    createMutation.mutate(
      {
        motherPublicId,
        input: {
          scheduledAt,
          visitType,
          doctorRequired,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          setErrorMsg(
            err instanceof Error ? err.message : "Gagal menyimpan jadwal ANC.",
          );
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-800">
          Jadwalkan Kunjungan ANC Baru
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Buat jadwal pemeriksaan antenatal care untuk ibu binaan.
        </p>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Tanggal Kunjungan
            </label>
            <input
              type="date"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-pfram-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Waktu Pemeriksaan (WIB)
            </label>
            <input
              type="time"
              required
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-pfram-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Jenis Kunjungan
            </label>
            <select
              value={visitType}
              onChange={(e) => {
                const val = e.target.value as AncVisitType;
                setVisitType(val);
                if (val === "DOCTOR_ANC") setDoctorRequired(true);
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-pfram-primary focus:outline-none"
            >
              {ANC_VISIT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="doctorRequired"
              checked={doctorRequired}
              onChange={(e) => setDoctorRequired(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-pfram-primary focus:ring-pfram-primary"
            />
            <label htmlFor="doctorRequired" className="text-xs font-medium text-slate-700">
              Memerlukan pemeriksaan oleh dokter
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Catatan / Instruksi Edukasi
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Bawa buku KIA, puasa 8 jam sebelum cek darah rutin"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-pfram-primary focus:outline-none"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl bg-pfram-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-pfram-text disabled:opacity-50"
            >
              {createMutation.isPending ? "Menyimpan…" : "Simpan Jadwal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditScheduleModal({
  motherPublicId,
  schedule,
  onClose,
}: {
  motherPublicId: string;
  schedule: AncSchedule;
  onClose: () => void;
}) {
  const updateMutation = useUpdateMidwifeMotherSchedule();

  const initialDateStr = schedule.scheduledAt.slice(0, 10);
  const initialTimeStr = schedule.scheduledAt.includes("T")
    ? schedule.scheduledAt.slice(11, 16)
    : "09:00";

  const [scheduledDate, setScheduledDate] = useState(initialDateStr);
  const [scheduledTime, setScheduledTime] = useState(initialTimeStr);
  const [status, setStatus] = useState<AncVisitStatus>(schedule.status);
  const [doctorRequired, setDoctorRequired] = useState(schedule.doctorRequired);
  const [notes, setNotes] = useState(schedule.notes ?? "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    updateMutation.mutate(
      {
        motherPublicId,
        schedulePublicId: schedule.publicId,
        input: {
          scheduledAt,
          status,
          doctorRequired,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          setErrorMsg(
            err instanceof Error ? err.message : "Gagal memperbarui jadwal ANC.",
          );
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-800">
          Ubah Jadwal & Status Kunjungan
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Ubah tanggal atau perbarui status kehadiran pemeriksaan antenatal.
        </p>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Tanggal Kunjungan
            </label>
            <input
              type="date"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-pfram-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Waktu Pemeriksaan (WIB)
            </label>
            <input
              type="time"
              required
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-pfram-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Status Kunjungan
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AncVisitStatus)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-pfram-primary focus:outline-none"
            >
              <option value="SCHEDULED">Terjadwal</option>
              <option value="COMPLETED">Sudah Hadir</option>
              <option value="MISSED">Belum Dikonfirmasi</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editDoctorRequired"
              checked={doctorRequired}
              onChange={(e) => setDoctorRequired(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-pfram-primary focus:ring-pfram-primary"
            />
            <label htmlFor="editDoctorRequired" className="text-xs font-medium text-slate-700">
              Memerlukan pemeriksaan oleh dokter
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Catatan / Instruksi
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-pfram-primary focus:outline-none"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-xl bg-pfram-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-pfram-text disabled:opacity-50"
            >
              {updateMutation.isPending ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
