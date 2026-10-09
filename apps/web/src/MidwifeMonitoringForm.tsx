import { useState } from "react";
import { monitoringCreateSchema } from "@pfram/validation";
import type { MonitoringSource } from "@pfram/shared-types";
import { MONITORING_SOURCES } from "./monitoring-api";
import { useCreateMidwifeMonitoring } from "./monitoring-queries";
import { extractAndMapError } from "./error-mapping";

export function MidwifeMonitoringForm({
  motherPublicId,
  onSuccess,
  onCancel,
}: {
  motherPublicId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
  const defaultLocalDatetime = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);

  const [recordedAt, setRecordedAt] = useState(defaultLocalDatetime);
  const [source, setSource] = useState<MonitoringSource>("MIDWIFE");
  const [weightInput, setWeightInput] = useState("");
  const [systolicInput, setSystolicInput] = useState("");
  const [diastolicInput, setDiastolicInput] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateMidwifeMonitoring(motherPublicId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    // Normalize weight comma to dot
    let weightKg: number | undefined;
    if (weightInput.trim()) {
      const normalized = weightInput.trim().replace(",", ".");
      const num = Number(normalized);
      if (isNaN(num)) {
        setFieldErrors((prev) => ({
          ...prev,
          weightKg: "Berat badan harus berupa angka",
        }));
        return;
      }
      weightKg = num;
    }

    let systolicBp: number | undefined;
    if (systolicInput.trim()) {
      const num = Number(systolicInput.trim());
      if (isNaN(num)) {
        setFieldErrors((prev) => ({
          ...prev,
          systolicBp: "Sistolik harus berupa angka bulat",
        }));
        return;
      }
      systolicBp = Math.round(num);
    }

    let diastolicBp: number | undefined;
    if (diastolicInput.trim()) {
      const num = Number(diastolicInput.trim());
      if (isNaN(num)) {
        setFieldErrors((prev) => ({
          ...prev,
          diastolicBp: "Diastolik harus berupa angka bulat",
        }));
        return;
      }
      diastolicBp = Math.round(num);
    }

    // Convert local datetime to ISO string
    let recordedAtIso: string;
    try {
      recordedAtIso = new Date(recordedAt).toISOString();
    } catch {
      setFieldErrors((prev) => ({
        ...prev,
        recordedAt: "Format tanggal tidak valid",
      }));
      return;
    }

    const payload = {
      recordedAt: recordedAtIso,
      source,
      weightKg,
      systolicBp,
      diastolicBp,
      notes: notes.trim() || undefined,
    };

    const parsed = monitoringCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const formattedErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (path) {
          formattedErrors[String(path)] = issue.message;
        } else {
          setFormError(issue.message);
        }
      }
      if (Object.keys(formattedErrors).length > 0) {
        setFieldErrors(formattedErrors);
      }
      return;
    }

    try {
      await createMutation.mutateAsync(parsed.data);
      onSuccess();
    } catch (err: unknown) {
      const mapped = extractAndMapError(err);
      setFormError(
        mapped.message || "Terdapat masalah saat menyimpan data pengukuran.",
      );
      if (mapped.fieldErrors && Object.keys(mapped.fieldErrors).length > 0) {
        setFieldErrors(mapped.fieldErrors);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            Tambah Pengukuran Fisik Ibu
          </h3>
          <p className="text-xs text-slate-500">
            Masukkan hasil pemantauan berat badan atau tekanan darah.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Tutup form"
        >
          ✕
        </button>
      </div>

      {formError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Tanggal & Waktu */}
        <div>
          <label
            htmlFor="recordedAt"
            className="block text-xs font-semibold uppercase text-slate-600"
          >
            Tanggal & Waktu Pengukuran
          </label>
          <input
            id="recordedAt"
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-1 focus:ring-pfram-primary"
            required
          />
          {fieldErrors.recordedAt && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.recordedAt}</p>
          )}
        </div>

        {/* Sumber Pengukuran */}
        <div>
          <label
            htmlFor="source"
            className="block text-xs font-semibold uppercase text-slate-600"
          >
            Sumber Pengukuran
          </label>
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value as MonitoringSource)}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-1 focus:ring-pfram-primary"
          >
            {MONITORING_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {fieldErrors.source && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.source}</p>
          )}
        </div>

        {/* Berat Badan */}
        <div>
          <label
            htmlFor="weightKg"
            className="block text-xs font-semibold uppercase text-slate-600"
          >
            Berat Badan (kg) <span className="text-slate-400 font-normal">opsional</span>
          </label>
          <div className="relative mt-1">
            <input
              id="weightKg"
              type="text"
              inputMode="decimal"
              placeholder="Contoh: 62,5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-800 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-1 focus:ring-pfram-primary"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
              kg
            </span>
          </div>
          {fieldErrors.weightKg && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.weightKg}</p>
          )}
        </div>

        {/* Tekanan Darah (Sistolik & Diastolik) */}
        <div>
          <span className="block text-xs font-semibold uppercase text-slate-600">
            Tekanan Darah (mmHg) <span className="text-slate-400 font-normal">opsional</span>
          </span>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="systolicBp" className="sr-only">
                Sistolik
              </label>
              <input
                id="systolicBp"
                type="number"
                placeholder="Sistolik (cth: 120)"
                value={systolicInput}
                onChange={(e) => setSystolicInput(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-1 focus:ring-pfram-primary"
              />
              {fieldErrors.systolicBp && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.systolicBp}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="diastolicBp" className="sr-only">
                Diastolik
              </label>
              <input
                id="diastolicBp"
                type="number"
                placeholder="Diastolik (cth: 80)"
                value={diastolicInput}
                onChange={(e) => setDiastolicInput(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-1 focus:ring-pfram-primary"
              />
              {fieldErrors.diastolicBp && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.diastolicBp}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Catatan */}
        <div>
          <label
            htmlFor="notes"
            className="block text-xs font-semibold uppercase text-slate-600"
          >
            Catatan <span className="text-slate-400 font-normal">opsional</span>
          </label>
          <textarea
            id="notes"
            rows={2}
            placeholder="Tambahkan catatan khusus bila diperlukan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-1 focus:ring-pfram-primary"
          />
          {fieldErrors.notes && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={createMutation.isPending}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-xl bg-pfram-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pfram-text disabled:opacity-50"
          >
            {createMutation.isPending ? "Menyimpan..." : "Simpan Pengukuran"}
          </button>
        </div>
      </form>
    </div>
  );
}
