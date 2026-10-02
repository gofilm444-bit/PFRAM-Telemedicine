import { useState } from "react";
import type {
  DangerFollowUpStatus,
  DangerScreening,
} from "@pfram/shared-types";
import {
  FOLLOW_UP_OPTIONS,
  FOLLOW_UP_STATUS_BADGES,
  formatScreeningDate,
  SCREENING_STATUS_BADGES,
} from "./danger-screening-api";
import {
  useMidwifeMotherDangerScreenings,
  useUpdateMidwifeDangerFollowUp,
} from "./danger-screening-queries";

interface Props {
  motherPublicId: string;
}

export function MidwifeDangerScreeningSection({ motherPublicId }: Props) {
  const [selectedScreening, setSelectedScreening] =
    useState<DangerScreening | null>(null);
  const [followUpStatus, setFollowUpStatus] =
    useState<DangerFollowUpStatus>("PENDING");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [updateError, setUpdateError] = useState("");

  const { data, isLoading, isError, refetch } =
    useMidwifeMotherDangerScreenings(motherPublicId);
  const updateMutation = useUpdateMidwifeDangerFollowUp();

  const screenings = data?.items ?? [];
  const latestScreening = screenings[0] ?? null;

  const openDetailModal = (screening: DangerScreening) => {
    setSelectedScreening(screening);
    setFollowUpStatus(screening.followUpStatus);
    setFollowUpNotes(screening.followUpNotes ?? "");
    setUpdateError("");
  };

  const closeModal = () => {
    setSelectedScreening(null);
    setUpdateError("");
  };

  const handleUpdateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScreening) return;
    setUpdateError("");

    try {
      const updated = await updateMutation.mutateAsync({
        publicId: selectedScreening.publicId,
        motherPublicId,
        input: {
          status: followUpStatus,
          notes: followUpNotes.trim() || null,
        },
      });
      setSelectedScreening(updated);
    } catch (err) {
      setUpdateError(
        err instanceof Error ? err.message : "Gagal memperbarui status tindak lanjut",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-sm font-semibold text-slate-500">
          Memuat riwayat skrining tanda bahaya...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h3 className="text-sm font-bold text-red-800">
          Gagal Memuat Data Skrining
        </h3>
        <p className="mt-1 text-xs text-red-600">
          Terjadi gangguan saat mengambil data skrining tanda bahaya ibu.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-lg bg-pfram-primary px-4 py-2 text-xs font-semibold text-white"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* 1. LATEST SCREENING SUMMARY CARD */}
      {latestScreening ? (
        <div
          className={`rounded-2xl border p-6 shadow-sm ${
            latestScreening.status === "REQUIRES_IMMEDIATE_CARE"
              ? "border-red-300 bg-red-50/50"
              : latestScreening.status === "DANGER_SIGN_REPORTED"
                ? "border-amber-300 bg-amber-50/50"
                : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Skrining Mandiri Terakhir
              </span>
              <h3 className="mt-1 text-lg font-bold text-slate-900">
                {formatScreeningDate(latestScreening.screenedAt)}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                  SCREENING_STATUS_BADGES[latestScreening.status].className
                }`}
              >
                {SCREENING_STATUS_BADGES[latestScreening.status].label}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                  FOLLOW_UP_STATUS_BADGES[latestScreening.followUpStatus].className
                }`}
              >
                {FOLLOW_UP_STATUS_BADGES[latestScreening.followUpStatus].label}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3 text-sm">
            <div>
              <span className="text-xs text-slate-500">Tanda Bahaya Terlapor</span>
              <p className="font-bold text-slate-800">
                {latestScreening.reportedSignsCount > 0
                  ? `${latestScreening.reportedSignsCount} Gejala`
                  : "Nihil (Semua Negatif)"}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Acuan Konten Klinis</span>
              <p className="font-semibold text-slate-700">
                Buku KIA ({latestScreening.ruleSetVersion})
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Catatan Bidan</span>
              <p className="text-slate-700 italic">
                {latestScreening.followUpNotes || "Belum ada catatan."}
              </p>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => openDetailModal(latestScreening)}
              className="rounded-xl bg-pfram-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-pfram-text transition"
            >
              Lihat Jawaban & Tindak Lanjut
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          <p className="font-semibold text-slate-700">Belum Ada Skrining Tanda Bahaya</p>
          <p className="mt-1 text-xs text-slate-400">
            Ibu hamil belum pernah mengisi kuesioner skrining mandiri tanda bahaya kehamilan.
          </p>
        </div>
      )}

      {/* 2. HISTORY TABLE */}
      {screenings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800">
            Riwayat Skrining Tanda Bahaya ({screenings.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Waktu Pengisian</th>
                  <th className="px-4 py-3 font-semibold">Hasil Penilaian</th>
                  <th className="px-4 py-3 font-semibold text-center">Gejala</th>
                  <th className="px-4 py-3 font-semibold">Status Tindak Lanjut</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {screenings.map((s) => (
                  <tr key={s.publicId} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatScreeningDate(s.screenedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          SCREENING_STATUS_BADGES[s.status].className
                        }`}
                      >
                        {SCREENING_STATUS_BADGES[s.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {s.reportedSignsCount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          FOLLOW_UP_STATUS_BADGES[s.followUpStatus].className
                        }`}
                      >
                        {FOLLOW_UP_STATUS_BADGES[s.followUpStatus].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDetailModal(s)}
                        className="font-semibold text-pfram-primary hover:text-pfram-text text-xs"
                      >
                        Rincian
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. DETAIL & FOLLOW-UP MODAL */}
      {selectedScreening && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 id="modal-title" className="text-lg font-bold text-slate-900">
                  Rincian Jawaban Skrining Tanda Bahaya
                </h3>
                <p className="text-xs text-slate-500">
                  {formatScreeningDate(selectedScreening.screenedAt)} • Versi:{" "}
                  {selectedScreening.ruleSetVersion}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Questions & Responses */}
            <div className="mt-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Daftar Pertanyaan & Jawaban Ibu
              </h4>
              <div className="space-y-2">
                {selectedScreening.responses?.map((r, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 text-xs ${
                      r.answer
                        ? r.severityCategory === "URGENT"
                          ? "border-red-300 bg-red-50 text-red-900"
                          : "border-amber-300 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold">{r.title}</span>
                        <p className="mt-0.5 text-slate-600">{r.question}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-bold ${
                            r.answer
                              ? r.severityCategory === "URGENT"
                                ? "bg-red-600 text-white"
                                : "bg-amber-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {r.answer ? "YA" : "TIDAK"}
                        </span>
                        {r.answer && (
                          <div className="mt-1 text-[10px] uppercase font-bold text-slate-500">
                            {r.severityCategory}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-Up Update Form */}
            <form onSubmit={handleUpdateFollowUp} className="mt-6 border-t border-slate-200 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pembaruan Tindak Lanjut Bidan
              </h4>

              {updateError && (
                <div className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
                  {updateError}
                </div>
              )}

              <div className="mt-3 grid gap-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Status Tindak Lanjut
                  <select
                    value={followUpStatus}
                    onChange={(e) =>
                      setFollowUpStatus(e.target.value as DangerFollowUpStatus)
                    }
                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-pfram-primary focus:outline-none"
                  >
                    {FOLLOW_UP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-semibold text-slate-700">
                  Catatan Tindak Lanjut (Maksimal 1000 Karakter)
                  <textarea
                    rows={3}
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Contoh: Sudah dihubungi melalui telepon, ibu mengeluhkan perdarahan bercak, disarankan langsung menuju IGD Puskesmas didampingi suami."
                    className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 shadow-sm focus:border-pfram-primary focus:outline-none"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-pfram-primary px-5 py-2 text-xs font-semibold text-white shadow hover:bg-pfram-text disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Tindak Lanjut"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
