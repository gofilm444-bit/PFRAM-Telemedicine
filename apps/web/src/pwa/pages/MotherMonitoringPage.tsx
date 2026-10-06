import { useState } from "react";
import {
  monitoringCreateSchema,
  monitoringUpdateSchema,
} from "@pfram/validation";
import type {
  MonitoringListItem,
  MonitoringPeriodFilter,
  MonitoringQuery,
  MonitoringUpdateInput,
} from "@pfram/shared-types";
import { useAuth } from "../../auth";
import { Button, Card } from "../../components";
import {
  formatBp,
  formatIndonesianDate,
  formatIndonesianDateTime,
  formatWeightChange,
  formatWeightKg,
  MOTHER_SOURCE_LABELS,
} from "../../monitoring-api";
import {
  useArchiveMotherMonitoring,
  useCreateMotherMonitoring,
  useMotherMonitoringChartData,
  useMotherMonitoringList,
  useMotherMonitoringSummary,
  useUpdateMotherMonitoring,
} from "../../monitoring-queries";
import {
  PeriodFilterBar,
  WebBloodPressureLineChart,
  WebWeightLineChart,
} from "../../web-monitoring-charts";
import { MotherAppShell } from "../MotherAppShell";

type HistoryFilterType = "all" | "weight" | "blood_pressure";

export function MotherMonitoringPage() {
  const { user } = useAuth();
  const activePregnancy = user?.activePregnancy;

  // 1. Data queries
  const summaryQuery = useMotherMonitoringSummary();

  const [chartPeriod, setChartPeriod] =
    useState<MonitoringPeriodFilter>("active_pregnancy");
  const chartData = useMotherMonitoringChartData(chartPeriod, activePregnancy);

  const [historyType, setHistoryType] = useState<HistoryFilterType>("all");
  const [historyPage, setHistoryPage] = useState<number>(1);
  const historyLimit = 10;

  const historyQueryParam: MonitoringQuery = {
    type: historyType,
    page: historyPage,
    limit: historyLimit,
    sort: "desc",
  };
  const historyQuery = useMotherMonitoringList(historyQueryParam);

  // 2. Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState("");
  const [createFormError, setCreateFormError] = useState("");
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});

  const defaultLocalDatetime = () =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

  const [recordedAt, setRecordedAt] = useState(defaultLocalDatetime());
  const [weightInput, setWeightInput] = useState("");
  const [systolicInput, setSystolicInput] = useState("");
  const [diastolicInput, setDiastolicInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const createMutation = useCreateMotherMonitoring();

  // 3. Edit states
  const [editingItem, setEditingItem] = useState<MonitoringListItem | null>(null);
  const [editRecordedAt, setEditRecordedAt] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editSystolic, setEditSystolic] = useState("");
  const [editDiastolic, setEditDiastolic] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [editFormError, setEditFormError] = useState("");
  const updateMutation = useUpdateMotherMonitoring();

  // 4. Archive dialog states
  const [archivingItem, setArchivingItem] = useState<MonitoringListItem | null>(null);
  const [archiveError, setArchiveError] = useState("");
  const archiveMutation = useArchiveMotherMonitoring();

  // Handle Form Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormError("");
    setCreateFieldErrors({});
    setCreateSuccessMsg("");

    let weightKg: number | undefined;
    if (weightInput.trim()) {
      const normalized = weightInput.trim().replace(",", ".");
      const num = Number(normalized);
      if (isNaN(num)) {
        setCreateFieldErrors((prev) => ({
          ...prev,
          weightKg: "Berat badan harus berupa angka valid",
        }));
        return;
      }
      weightKg = num;
    }

    let systolicBp: number | undefined;
    if (systolicInput.trim()) {
      const num = Number(systolicInput.trim());
      if (isNaN(num)) {
        setCreateFieldErrors((prev) => ({
          ...prev,
          systolicBp: "Tekanan sistolik harus berupa angka bulat",
        }));
        return;
      }
      systolicBp = Math.round(num);
    }

    let diastolicBp: number | undefined;
    if (diastolicInput.trim()) {
      const num = Number(diastolicInput.trim());
      if (isNaN(num)) {
        setCreateFieldErrors((prev) => ({
          ...prev,
          diastolicBp: "Tekanan diastolik harus berupa angka bulat",
        }));
        return;
      }
      diastolicBp = Math.round(num);
    }

    let recordedAtIso: string;
    try {
      const d = new Date(recordedAt);
      if (isNaN(d.getTime())) throw new Error();
      recordedAtIso = d.toISOString();
    } catch {
      setCreateFieldErrors((prev) => ({
        ...prev,
        recordedAt: "Format tanggal tidak valid",
      }));
      return;
    }

    const payload = {
      recordedAt: recordedAtIso,
      source: "SELF" as const,
      weightKg,
      systolicBp,
      diastolicBp,
      notes: notesInput.trim() || undefined,
    };

    const parsed = monitoringCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const formattedErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (path) {
          formattedErrors[String(path)] = issue.message;
        } else {
          setCreateFormError(issue.message);
        }
      }
      if (Object.keys(formattedErrors).length > 0) {
        setCreateFieldErrors(formattedErrors);
      }
      return;
    }

    try {
      await createMutation.mutateAsync(parsed.data);
      setCreateSuccessMsg("Catatan pemantauan berhasil disimpan.");
      setWeightInput("");
      setSystolicInput("");
      setDiastolicInput("");
      setNotesInput("");
      setRecordedAt(defaultLocalDatetime());
      setShowCreateForm(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal menyimpan catatan pemantauan. Silakan periksa koneksi Anda.";
      setCreateFormError(msg);
    }
  };

  // Open Edit Modal
  const startEdit = (item: MonitoringListItem) => {
    setEditingItem(item);
    setEditFieldErrors({});
    setEditFormError("");
    setEditRecordedAt(
      new Date(new Date(item.recordedAt).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
    );
    setEditWeight(item.weightKg !== null && item.weightKg !== undefined ? String(item.weightKg) : "");
    setEditSystolic(item.systolicBp !== null && item.systolicBp !== undefined ? String(item.systolicBp) : "");
    setEditDiastolic(item.diastolicBp !== null && item.diastolicBp !== undefined ? String(item.diastolicBp) : "");
    setEditNotes(item.notes || "");
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditFormError("");
    setEditFieldErrors({});

    let weightKg: number | null | undefined;
    if (editWeight.trim()) {
      const num = Number(editWeight.trim().replace(",", "."));
      if (isNaN(num)) {
        setEditFieldErrors((prev) => ({
          ...prev,
          weightKg: "Berat badan harus berupa angka valid",
        }));
        return;
      }
      weightKg = num;
    } else {
      weightKg = null;
    }

    let systolicBp: number | null | undefined;
    if (editSystolic.trim()) {
      const num = Number(editSystolic.trim());
      if (isNaN(num)) {
        setEditFieldErrors((prev) => ({
          ...prev,
          systolicBp: "Tekanan sistolik harus berupa angka bulat",
        }));
        return;
      }
      systolicBp = Math.round(num);
    } else {
      systolicBp = null;
    }

    let diastolicBp: number | null | undefined;
    if (editDiastolic.trim()) {
      const num = Number(editDiastolic.trim());
      if (isNaN(num)) {
        setEditFieldErrors((prev) => ({
          ...prev,
          diastolicBp: "Tekanan diastolik harus berupa angka bulat",
        }));
        return;
      }
      diastolicBp = Math.round(num);
    } else {
      diastolicBp = null;
    }

    let recordedAtIso: string | undefined;
    try {
      const d = new Date(editRecordedAt);
      if (isNaN(d.getTime())) throw new Error();
      recordedAtIso = d.toISOString();
    } catch {
      setEditFieldErrors((prev) => ({
        ...prev,
        recordedAt: "Format tanggal tidak valid",
      }));
      return;
    }

    const payload = {
      recordedAt: recordedAtIso,
      weightKg: weightKg ?? undefined,
      systolicBp: systolicBp ?? undefined,
      diastolicBp: diastolicBp ?? undefined,
      notes: editNotes.trim() || undefined,
    };

    const parsed = monitoringUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      const formattedErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (path) {
          formattedErrors[String(path)] = issue.message;
        } else {
          setEditFormError(issue.message);
        }
      }
      if (Object.keys(formattedErrors).length > 0) {
        setEditFieldErrors(formattedErrors);
      }
      return;
    }

    const updateInput: MonitoringUpdateInput = {};
    if (parsed.data.recordedAt) updateInput.recordedAt = parsed.data.recordedAt;
    if (parsed.data.weightKg !== undefined) updateInput.weightKg = parsed.data.weightKg;
    if (parsed.data.systolicBp !== undefined) updateInput.systolicBp = parsed.data.systolicBp;
    if (parsed.data.diastolicBp !== undefined) updateInput.diastolicBp = parsed.data.diastolicBp;
    if (parsed.data.notes !== undefined) updateInput.notes = parsed.data.notes;

    try {
      await updateMutation.mutateAsync({
        publicId: editingItem.publicId,
        input: updateInput,
      });
      setEditingItem(null);
      setCreateSuccessMsg("Catatan pemantauan berhasil diperbarui.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal memperbarui catatan pemantauan.";
      setEditFormError(msg);
    }
  };

  // Handle Archive Confirm
  const handleArchiveConfirm = async () => {
    if (!archivingItem) return;
    setArchiveError("");
    try {
      await archiveMutation.mutateAsync(archivingItem.publicId);
      setArchivingItem(null);
      setCreateSuccessMsg("Catatan pemantauan berhasil diarsipkan.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal mengarsipkan catatan.";
      setArchiveError(msg);
    }
  };

  const summary = summaryQuery.data;
  const historyItems = historyQuery.data?.items ?? [];
  const historyTotal = historyQuery.data?.total ?? 0;
  const historyTotalPages = Math.ceil(historyTotal / historyLimit);

  return (
    <MotherAppShell
      title="Pemantauan Fisik"
      subtitle="Catat dan pantau perubahan selama kehamilan"
    >
      <div className="space-y-4">
        {/* A. CLINICAL SAFETY & EMERGENCY ADVISORY */}
        <div
          role="alert"
          className="rounded-2xl border border-rose-200/90 bg-rose-50/80 p-4 text-rose-900 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              ⚠️
            </span>
            <div className="space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Peringatan Medis & Kedaruratan
              </h2>
              <p className="text-xs text-rose-900 leading-relaxed font-medium">
                Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi jika mengalami tanda bahaya seperti perdarahan, nyeri perut hebat, atau sakit kepala berat.
              </p>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {createSuccessMsg && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 shadow-2xs"
          >
            <span>{createSuccessMsg}</span>
            <button
              type="button"
              onClick={() => setCreateSuccessMsg("")}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
              aria-label="Tutup pesan sukses"
            >
              ✕
            </button>
          </div>
        )}

        {/* B. LATEST SUMMARY CARD */}
        <section aria-label="Ringkasan Pemantauan" aria-labelledby="monitoring-summary-heading">
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-sm text-pfram-primary ring-1 ring-emerald-200/50">
                  📊
                </span>
                <h2
                  id="monitoring-summary-heading"
                  className="text-xs font-bold uppercase tracking-wider text-slate-800"
                >
                  Ringkasan Pemantauan
                </h2>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200/60">
                {summary ? `${summary.totalEntries} Catatan` : "0 Catatan"}
              </span>
            </div>

            {summaryQuery.isLoading ? (
              <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
                Memuat ringkasan pemantauan…
              </div>
            ) : summaryQuery.isError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 flex items-center justify-between">
                <span>Data pemantauan belum dapat dimuat saat ini.</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => summaryQuery.refetch()}
                >
                  Coba Lagi
                </Button>
              </div>
            ) : summary && summary.totalEntries > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Weight Box */}
                  <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-3.5 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Berat Badan Terakhir
                    </span>
                    <span className="mt-1 text-2xl font-black text-slate-900 block tracking-tight">
                      {formatWeightKg(summary.latestWeight)}
                    </span>
                    <span className="mt-1 text-[10px] text-slate-400 block truncate">
                      {summary.latestWeightRecordedAt
                        ? formatIndonesianDate(summary.latestWeightRecordedAt)
                        : "-"}
                    </span>
                  </div>

                  {/* Blood Pressure Box */}
                  <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-3.5 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Tekanan Darah Terakhir
                    </span>
                    <span className="mt-1 text-2xl font-black text-slate-900 block tracking-tight">
                      {summary.latestBloodPressure
                        ? formatBp(
                            summary.latestBloodPressure.systolic,
                            summary.latestBloodPressure.diastolic,
                          )
                        : "-"}
                    </span>
                    <span className="mt-1 text-[10px] text-slate-400 block truncate">
                      {summary.latestBloodPressureRecordedAt
                        ? formatIndonesianDate(
                            summary.latestBloodPressureRecordedAt,
                          )
                        : "-"}
                    </span>
                  </div>
                </div>

                {summary.weightChange !== null && summary.weightChange !== undefined && (
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/70 px-3.5 py-2 text-xs text-emerald-900 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Perubahan dari catatan sebelumnya:</span>
                    <span className="font-bold text-emerald-900">
                      {formatWeightChange(summary.weightChange)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <p className="text-xs font-semibold text-slate-800">
                  Belum ada catatan pemantauan
                </p>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Catat berat badan dan tekanan darah mandiri atau dari faskes untuk memantau tren perkembangan kehamilan Ibu.
                </p>
              </div>
            )}

            {/* Quick Action Button to Toggle Form */}
            <div className="pt-1">
              <Button
                type="button"
                variant={showCreateForm ? "secondary" : "primary"}
                className="w-full min-h-[44px] rounded-xl font-bold shadow-sm transition-all"
                onClick={() => {
                  setShowCreateForm((prev) => !prev);
                  setCreateSuccessMsg("");
                  setCreateFormError("");
                  setCreateFieldErrors({});
                }}
              >
                {showCreateForm ? "Tutup Formulir" : "+ Catat Pemantauan"}
              </Button>
            </div>
          </Card>
        </section>

        {/* C. SELF-ENTRY FORM (COLLAPSIBLE) */}
        {showCreateForm && (
          <section aria-labelledby="create-monitoring-form-heading">
            <Card className="border border-emerald-200/90 bg-white p-5 shadow-md space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2
                  id="create-monitoring-form-heading"
                  className="text-sm font-bold text-slate-900"
                >
                  Catat Pemantauan Mandiri
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Masukkan hasil penimbangan berat badan atau pemeriksaan tensi.
                </p>
              </div>

              {createFormError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {createFormError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3.5">
                {/* Tanggal & Waktu */}
                <div>
                  <label
                    htmlFor="recordedAt"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    Tanggal & Waktu Pengukuran *
                  </label>
                  <input
                    type="datetime-local"
                    id="recordedAt"
                    name="recordedAt"
                    value={recordedAt}
                    max={defaultLocalDatetime()}
                    onChange={(e) => setRecordedAt(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-xs text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                    aria-invalid={Boolean(createFieldErrors.recordedAt)}
                  />
                  {createFieldErrors.recordedAt && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {createFieldErrors.recordedAt}
                    </p>
                  )}
                </div>

                {/* Berat Badan */}
                <div>
                  <label
                    htmlFor="weightKg"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    Berat Badan (kg) — Opsional
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="weightKg"
                      name="weightKg"
                      inputMode="decimal"
                      placeholder="Contoh: 58,5"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 pr-12 text-sm text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                      aria-invalid={Boolean(createFieldErrors.weightKg)}
                    />
                    <span className="absolute inset-y-0 right-3.5 flex items-center text-xs font-bold text-slate-400">
                      kg
                    </span>
                  </div>
                  {createFieldErrors.weightKg && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {createFieldErrors.weightKg}
                    </p>
                  )}
                </div>

                {/* Tekanan Darah (Sistolik & Diastolik Paired) */}
                <div>
                  <span className="block text-xs font-bold text-slate-800 mb-1">
                    Tekanan Darah (mmHg) — Opsional
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="systolicBp" className="sr-only">
                        Tekanan Sistolik
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="systolicBp"
                          name="systolicBp"
                          inputMode="numeric"
                          placeholder="Sistolik (120)"
                          value={systolicInput}
                          onChange={(e) => setSystolicInput(e.target.value)}
                          className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                          aria-invalid={Boolean(createFieldErrors.systolicBp)}
                        />
                      </div>
                      {createFieldErrors.systolicBp && (
                        <p className="mt-1 text-[11px] text-rose-600 font-medium">
                          {createFieldErrors.systolicBp}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="diastolicBp" className="sr-only">
                        Tekanan Diastolik
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="diastolicBp"
                          name="diastolicBp"
                          inputMode="numeric"
                          placeholder="Diastolik (80)"
                          value={diastolicInput}
                          onChange={(e) => setDiastolicInput(e.target.value)}
                          className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                          aria-invalid={Boolean(createFieldErrors.diastolicBp)}
                        />
                      </div>
                      {createFieldErrors.diastolicBp && (
                        <p className="mt-1 text-[11px] text-rose-600 font-medium">
                          {createFieldErrors.diastolicBp}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sumber Pengukuran (Non-editable Provenance) */}
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 border border-slate-200/80">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span className="font-medium">
                    Sumber Data: <strong className="text-slate-800">Dicatat sendiri</strong>
                  </span>
                </div>

                {/* Catatan Tambahan */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    maxLength={500}
                    placeholder="Contoh: Pengukuran pagi hari setelah istirahat"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                  />
                </div>

                {/* Submit & Cancel Buttons */}
                <div className="flex gap-2.5 pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createMutation.isPending}
                    className="flex-1 min-h-11 font-bold shadow-md shadow-emerald-950/10"
                  >
                    {createMutation.isPending ? "Menyimpan…" : "Simpan Catatan"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateForm(false)}
                    className="min-h-11 font-semibold"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </Card>
          </section>
        )}

        {/* D. TREND CHARTS SECTION */}
        <section aria-labelledby="monitoring-charts-heading" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="monitoring-charts-heading"
                className="text-sm font-bold text-slate-900"
              >
                Grafik Perkembangan
              </h2>
              <p className="text-xs text-slate-500">
                Tren berat badan dan tekanan darah selama kehamilan
              </p>
            </div>
            <PeriodFilterBar
              selected={chartPeriod}
              onSelect={(p) => setChartPeriod(p)}
            />
          </div>

          {/* Weight Chart */}
          <WebWeightLineChart points={chartData.weightPoints} />

          {/* Blood Pressure Chart */}
          <WebBloodPressureLineChart points={chartData.bpPoints} />
        </section>

        {/* E. HISTORY SECTION */}
        <section aria-labelledby="monitoring-history-heading">
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div>
                <h2
                  id="monitoring-history-heading"
                  className="text-xs font-bold uppercase tracking-wider text-slate-800"
                >
                  Riwayat Pengukuran
                </h2>
                <p className="text-[11px] text-slate-500">
                  Daftar riwayat pemeriksaan fisik tercatat
                </p>
              </div>

              {/* Filter Tabs */}
              <div
                role="tablist"
                aria-label="Filter Tipe Riwayat"
                className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70 shadow-2xs gap-1"
              >
                {(
                  [
                    { id: "all", label: "Semua" },
                    { id: "weight", label: "Berat Badan" },
                    { id: "blood_pressure", label: "Tekanan Darah" },
                  ] as const
                ).map((tab) => {
                  const isActive = historyType === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setHistoryType(tab.id);
                        setHistoryPage(1);
                      }}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-white text-pfram-primary shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900 font-medium"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* History Items List */}
            {historyQuery.isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Memuat riwayat pemantauan…
              </div>
            ) : historyQuery.isError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-800 space-y-2">
                <p>Gagal memuat riwayat pemantauan.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => historyQuery.refetch()}
                >
                  Muat Ulang
                </Button>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                <p className="text-xs font-semibold text-slate-700">
                  Belum ada catatan pemantauan
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Data pengukuran mandiri atau pemeriksaan dari tenaga kesehatan akan tersimpan di sini.
                </p>
                {!showCreateForm && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="mt-3 font-semibold min-h-[40px] rounded-xl"
                    onClick={() => setShowCreateForm(true)}
                  >
                    + Catat Pemantauan Pertama
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {historyItems.map((item) => {
                  const sourceLabel =
                    MOTHER_SOURCE_LABELS[item.source] ?? item.source;
                  const isMotherSelf = item.source === "SELF";

                  return (
                    <div
                      key={item.publicId}
                      className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition hover:border-slate-300 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800">
                          {formatIndonesianDateTime(item.recordedAt)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200/60">
                          {sourceLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {item.weightKg !== null && item.weightKg !== undefined && (
                          <div>
                            <span className="text-[10px] text-slate-500 block">
                              Berat Badan
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              {formatWeightKg(item.weightKg)}
                            </span>
                          </div>
                        )}

                        {item.systolicBp !== null && item.diastolicBp !== null && (
                          <div>
                            <span className="text-[10px] text-slate-500 block">
                              Tekanan Darah
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              {item.systolicBp}/{item.diastolicBp} mmHg
                            </span>
                          </div>
                        )}
                      </div>

                      {item.notes && (
                        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-700">Catatan: </span>
                          {item.notes}
                        </div>
                      )}

                      {/* Action buttons: Mother can edit/archive only SELF entries */}
                      {isMotherSelf && (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-50">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="text-[11px] font-bold text-pfram-primary hover:underline px-2.5 py-1"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchivingItem(item)}
                            className="text-[11px] font-semibold text-rose-600 hover:underline px-2.5 py-1"
                          >
                            Arsipkan
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="min-h-[40px] rounded-xl px-3.5"
                    >
                      Sebelumnya
                    </Button>
                    <span className="text-xs font-medium text-slate-600">
                      Halaman {historyPage} dari {historyTotalPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={historyPage >= historyTotalPages}
                      onClick={() =>
                        setHistoryPage((p) => Math.min(historyTotalPages, p + 1))
                      }
                      className="min-h-[40px] rounded-xl px-3.5"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* F. EDIT MODAL */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 id="edit-dialog-title" className="text-sm font-bold text-slate-900">
                Edit Catatan Pemantauan
              </h2>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Tutup dialog"
              >
                ✕
              </button>
            </div>

            {editFormError && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                {editFormError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label htmlFor="editRecordedAt" className="block text-xs font-bold text-slate-800 mb-1">
                  Tanggal & Waktu Pengukuran *
                </label>
                <input
                  type="datetime-local"
                  id="editRecordedAt"
                  value={editRecordedAt}
                  onChange={(e) => setEditRecordedAt(e.target.value)}
                  className="w-full min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                />
                {editFieldErrors.recordedAt && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    {editFieldErrors.recordedAt}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="editWeight" className="block text-xs font-bold text-slate-800 mb-1">
                  Berat Badan (kg)
                </label>
                <input
                  type="text"
                  id="editWeight"
                  inputMode="decimal"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  className="w-full min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                />
                {editFieldErrors.weightKg && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    {editFieldErrors.weightKg}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="editSystolic" className="block text-xs font-bold text-slate-800 mb-1">
                    Sistolik (mmHg)
                  </label>
                  <input
                    type="text"
                    id="editSystolic"
                    inputMode="numeric"
                    value={editSystolic}
                    onChange={(e) => setEditSystolic(e.target.value)}
                    className="w-full min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                  />
                  {editFieldErrors.systolicBp && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {editFieldErrors.systolicBp}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="editDiastolic" className="block text-xs font-bold text-slate-800 mb-1">
                    Diastolik (mmHg)
                  </label>
                  <input
                    type="text"
                    id="editDiastolic"
                    inputMode="numeric"
                    value={editDiastolic}
                    onChange={(e) => setEditDiastolic(e.target.value)}
                    className="w-full min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                  />
                  {editFieldErrors.diastolicBp && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {editFieldErrors.diastolicBp}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="editNotes" className="block text-xs font-bold text-slate-800 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  id="editNotes"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 shadow-sm focus:border-pfram-primary focus:outline-none focus:ring-2 focus:ring-pfram-primary/20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={updateMutation.isPending}
                  className="flex-1 font-bold"
                >
                  {updateMutation.isPending ? "Menyimpan…" : "Simpan Perubahan"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingItem(null)}
                >
                  Batal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* G. ARCHIVE CONFIRMATION DIALOG */}
      {archivingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-3.5">
            <h2 id="archive-dialog-title" className="text-base font-bold text-slate-900">
              Arsipkan Catatan?
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Catatan ini tidak akan tampil lagi dalam riwayat aktif atau perhitungan ringkasan. Tindakan ini dapat dibatalkan melalui koordinasi dengan bidan.
            </p>

            {archiveError && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                {archiveError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="danger"
                disabled={archiveMutation.isPending}
                onClick={handleArchiveConfirm}
                className="flex-1 font-bold"
              >
                {archiveMutation.isPending ? "Mengarsipkan…" : "Arsipkan"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={archiveMutation.isPending}
                onClick={() => setArchivingItem(null)}
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </MotherAppShell>
  );
}
