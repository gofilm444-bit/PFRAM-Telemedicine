import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./auth";
import type { HomeVisitItem } from "@pfram/shared-types";

export function MidwifeHomeVisitSection({
  motherPublicId,
}: {
  motherPublicId?: string;
}) {
  const { request } = useAuth();
  const [visits, setVisits] = useState<HomeVisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("10:00");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchVisits = useCallback(async () => {
    if (!motherPublicId) return;
    setLoading(true);
    setError("");
    try {
      const res = await request<{ items: HomeVisitItem[]; total: number }>(
        `/midwife/home-visits?motherPublicId=${motherPublicId}`,
      );
      setVisits(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat kunjungan");
    } finally {
      setLoading(false);
    }
  }, [motherPublicId, request]);

  useEffect(() => {
    void fetchVisits();
  }, [fetchVisits]);

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr || !purpose || !motherPublicId) return;

    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${dateStr}T${timeStr}:00Z`).toISOString();
      await request("/midwife/home-visits", {
        method: "POST",
        body: JSON.stringify({
          motherPublicId,
          scheduledAt,
          purpose,
          notes: notes || undefined,
        }),
      });
      setShowAddForm(false);
      setPurpose("");
      setNotes("");
      await fetchVisits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menjadwalkan kunjungan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    publicId: string,
    status: "COMPLETED" | "CANCELLED",
  ) => {
    try {
      await request(`/midwife/home-visits/${publicId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await fetchVisits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Kunjungan Rumah (Home Visit)
          </h2>
          <p className="text-sm text-slate-500">
            Jadwal dan rekam jejak kunjungan langsung ke tempat tinggal ibu binaan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-xl bg-pfram-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pfram-text"
        >
          {showAddForm ? "Batal" : "+ Jadwalkan Kunjungan"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={(e) => void handleScheduleVisit(e)}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <h3 className="text-base font-bold text-slate-800">
            Jadwalkan Kunjungan Rumah Baru
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tanggal Kunjungan
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Jam Kunjungan (WIT)
              </label>
              <input
                type="time"
                required
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tujuan Kunjungan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Evaluasi kesiapan persalinan trimester 3 dan cek lingkungan"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Catatan Khusus (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Catatan akses transportasi atau kondisi lingkungan rumah..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-pfram-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pfram-text disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Jadwal"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">
          Memuat riwayat kunjungan...
        </div>
      ) : visits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500">
            Belum ada jadwal kunjungan rumah untuk ibu ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => {
            const date = new Date(v.scheduledAt);
            const dateFormatted = date.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            const timeFormatted = date.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={v.publicId}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">
                      📅 {dateFormatted}, {timeFormatted} WIT
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        v.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : v.status === "CANCELLED"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {v.status === "COMPLETED"
                        ? "Selesai"
                        : v.status === "CANCELLED"
                          ? "Dibatalkan"
                          : "Terjadwal"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    Tujuan: {v.purpose}
                  </p>
                  {v.notes && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Catatan: {v.notes}
                    </p>
                  )}
                </div>

                {v.status === "SCHEDULED" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleUpdateStatus(v.publicId, "COMPLETED")
                      }
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      ✓ Tandai Selesai
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleUpdateStatus(v.publicId, "CANCELLED")
                      }
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Batalkan
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
