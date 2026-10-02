import { useState } from "react";
import { Link } from "react-router-dom";
import type {
  DangerFollowUpListItem,
  DangerFollowUpStatus,
} from "@pfram/shared-types";
import { PageHeader } from "./components";
import {
  FOLLOW_UP_OPTIONS,
  FOLLOW_UP_STATUS_BADGES,
  formatScreeningDate,
  SCREENING_STATUS_BADGES,
} from "./danger-screening-api";
import {
  useMidwifeDangerFollowUps,
  useUpdateMidwifeDangerFollowUp,
} from "./danger-screening-queries";

export function MidwifeAttentionListPage() {
  const { data, isLoading, isError, refetch } = useMidwifeDangerFollowUps();
  const updateMutation = useUpdateMidwifeDangerFollowUp();

  const [selectedItem, setSelectedItem] =
    useState<DangerFollowUpListItem | null>(null);
  const [newStatus, setNewStatus] = useState<DangerFollowUpStatus>("CONTACTED");
  const [notes, setNotes] = useState("");
  const [updateError, setUpdateError] = useState("");

  const items = data?.items ?? [];

  const openUpdateModal = (item: DangerFollowUpListItem) => {
    setSelectedItem(item);
    setNewStatus(item.followUpStatus);
    setNotes(item.followUpNotes ?? "");
    setUpdateError("");
  };

  const closeUpdateModal = () => {
    setSelectedItem(null);
    setUpdateError("");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setUpdateError("");

    try {
      await updateMutation.mutateAsync({
        publicId: selectedItem.publicId,
        motherPublicId: selectedItem.mother.publicId,
        input: {
          status: newStatus,
          notes: notes.trim() || null,
        },
      });
      closeUpdateModal();
    } catch (err) {
      setUpdateError(
        err instanceof Error ? err.message : "Gagal memperbarui status tindak lanjut",
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Antrean Perlu Tindak Lanjut"
        description="Daftar skrining tanda bahaya ibu binaan yang membutuhkan perhatian, kontak segera, atau konfirmasi rujukan faskes."
      />

      {isLoading && (
        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
          <div className="text-sm font-semibold text-slate-500">
            Memuat antrean tindak lanjut...
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h3 className="text-sm font-bold text-red-800">
            Gagal Memuat Antrean Tindak Lanjut
          </h3>
          <p className="mt-1 text-xs text-red-600">
            Terjadi kendala saat mengambil data antrean tindak lanjut tanda bahaya.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-pfram-primary px-4 py-2 text-xs font-semibold text-white"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            ✓
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-800">
            Semua Tindak Lanjut Selesai
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Tidak ada laporan tanda bahaya ibu binaan yang membutuhkan tindakan saat ini.
          </p>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="grid gap-4">
          {items.map((item) => {
            const hasUrgent = item.status === "REQUIRES_IMMEDIATE_CARE";
            return (
              <div
                key={item.publicId}
                className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
                  hasUrgent
                    ? "border-red-300 bg-red-50/40"
                    : "border-amber-300 bg-amber-50/40"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/my-mothers/${item.mother.publicId}`}
                        className="text-base font-bold text-slate-900 hover:text-pfram-primary hover:underline"
                      >
                        {item.mother.fullName}
                      </Link>
                      {item.mother.phoneNumber && (
                        <span className="text-xs text-slate-500">
                          ({item.mother.phoneNumber})
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Skrining: {formatScreeningDate(item.screenedAt)}
                      {item.gestationalAge && (
                        <span>
                          {" "}
                          • Usia Kehamilan: {item.gestationalAge.weeks} minggu{" "}
                          {item.gestationalAge.days} hari (Trimester {item.trimester})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                        SCREENING_STATUS_BADGES[item.status].className
                      }`}
                    >
                      {SCREENING_STATUS_BADGES[item.status].label}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        FOLLOW_UP_STATUS_BADGES[item.followUpStatus].className
                      }`}
                    >
                      {FOLLOW_UP_STATUS_BADGES[item.followUpStatus].label}
                    </span>
                  </div>
                </div>

                {/* Reported Signs */}
                <div className="mt-3 rounded-xl border border-white/60 bg-white/70 p-3 text-xs">
                  <span className="font-bold text-slate-700">
                    Gejala yang Dilaporkan ({item.reportedSignsCount}):
                  </span>
                  <ul className="mt-1 list-disc pl-5 space-y-0.5 text-slate-600">
                    {item.reportedSigns.map((sign, idx) => (
                      <li key={idx} className="font-medium text-slate-800">
                        {sign}
                      </li>
                    ))}
                  </ul>
                </div>

                {item.followUpNotes && (
                  <p className="mt-2 text-xs text-slate-600 italic">
                    Catatan: {item.followUpNotes}
                  </p>
                )}

                {/* Card Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 pt-3">
                  <div className="text-xs text-slate-500">
                    {item.facility && (
                      <span>Faskes: {item.facility.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/my-mothers/${item.mother.publicId}`}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Buka Profil Ibu
                    </Link>
                    <button
                      type="button"
                      onClick={() => openUpdateModal(item)}
                      className="rounded-xl bg-pfram-primary px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-pfram-text"
                    >
                      Tindak Lanjut
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UPDATE MODAL */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="follow-up-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 id="follow-up-modal-title" className="text-base font-bold text-slate-900">
                Tindak Lanjut — {selectedItem.mother.fullName}
              </h3>
              <button
                type="button"
                onClick={closeUpdateModal}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              {updateError && (
                <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  {updateError}
                </div>
              )}

              <label className="block text-xs font-semibold text-slate-700">
                Status Tindak Lanjut
                <select
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value as DangerFollowUpStatus)
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
                Catatan Tindak Lanjut
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan tindakan bidan (telepon, rujukan, instruksi faskes)..."
                  className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 shadow-sm focus:border-pfram-primary focus:outline-none"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeUpdateModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-pfram-primary px-5 py-2 text-xs font-semibold text-white shadow hover:bg-pfram-text disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
