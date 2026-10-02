import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type {
  MonitoringPeriodFilter,
  MonitoringQuery,
} from "@pfram/shared-types";
import { useAuth } from "./auth";
import {
  formatBp,
  formatIndonesianDate,
  formatIndonesianTime,
  formatWeightChange,
  formatWeightKg,
  getAdministrativeStatus,
  SOURCE_LABELS,
} from "./monitoring-api";
import {
  useMidwifeMonitoringChartData,
  useMidwifeMonitoringList,
  useMidwifeMonitoringSummary,
} from "./monitoring-queries";
import {
  PeriodFilterBar,
  WebBloodPressureLineChart,
  WebWeightLineChart,
} from "./web-monitoring-charts";
import { MidwifeMonitoringForm } from "./MidwifeMonitoringForm";
import { MidwifeAncSection } from "./MidwifeAncSection";
import { MidwifeDangerScreeningSection } from "./MidwifeDangerScreeningSection";
import { MidwifeP4kSection } from "./MidwifeP4kSection";
import { MidwifeHomeVisitSection } from "./MidwifeHomeVisitSection";

interface MotherDetail {
  publicId: string;
  fullName: string;
  age: number | null;
  phoneNumber?: string;
  address?: string | null;
  facility?: { publicId: string; name: string } | null;
  activePregnancy?: {
    publicId?: string;
    gestationalAge?: { weeks: number; days: number } | null;
    trimester?: number | null;
    estimatedDueDate?: string;
  } | null;
}

export function MidwifeMotherDetailPage() {
  const { motherPublicId } = useParams<{ motherPublicId: string }>();
  const navigate = useNavigate();
  const { request } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "monitoring" | "anc" | "danger-screening" | "p4k" | "visits" | "profile"
  >("monitoring");
  const [showAddForm, setShowAddForm] = useState(false);
  const [chartPeriod, setChartPeriod] =
    useState<MonitoringPeriodFilter>("7_days");
  const [historyType, setHistoryType] = useState<
    "all" | "weight" | "blood_pressure"
  >("all");
  const [historyPage, setHistoryPage] = useState(1);
  const historyLimit = 10;

  // 1. Fetch Mother Profile
  const motherQuery = useQuery({
    queryKey: ["midwife", "mother", motherPublicId],
    queryFn: () => request<MotherDetail>(`/midwife/mothers/${motherPublicId}`),
    enabled: Boolean(motherPublicId),
      });

  // 2. Fetch Monitoring Summary
  const summaryQuery = useMidwifeMonitoringSummary(motherPublicId ?? "");

  // 3. Fetch Monitoring List
  const historyQueryParam: MonitoringQuery = {
    type: historyType,
    page: historyPage,
    limit: historyLimit,
    sort: "desc",
  };
  const listQuery = useMidwifeMonitoringList(
    motherPublicId ?? "",
    historyQueryParam,
  );

  // 4. Fetch Chart Data
  const pregnancySummary = motherQuery.data?.activePregnancy
    ? {
        publicId: motherQuery.data.activePregnancy.publicId ?? "",
        status: "ACTIVE",
        pregnancyType: "SINGLETON",
        completedProfile: true,
        estimatedDueDate:
          motherQuery.data.activePregnancy.estimatedDueDate ?? "",
        gestationalAge:
          motherQuery.data.activePregnancy.gestationalAge ?? null,
        trimester:
          (motherQuery.data.activePregnancy.trimester as 1 | 2 | 3) ?? null,
      }
    : null;

  const chartData = useMidwifeMonitoringChartData(
    motherPublicId ?? "",
    chartPeriod,
    pregnancySummary,
  );

  if (motherQuery.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-sm font-semibold text-slate-500">
          Memuat data ibu binaan...
        </div>
      </div>
    );
  }

  if (motherQuery.isError || !motherQuery.data) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800">
          Akses Ditolak atau Ibu Binaan Tidak Ditemukan
        </h2>
        <p className="mt-2 text-sm text-red-600">
          Anda hanya dapat melihat dan mengelola pemantauan bagi ibu hamil yang
          memiliki penugasan aktif (ACTIVE assignment) kepada Anda.
        </p>
        <button
          type="button"
          onClick={() => navigate("/my-mothers")}
          className="mt-5 rounded-xl bg-pfram-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pfram-text"
        >
          Kembali ke Daftar Ibu Binaan
        </button>
      </div>
    );
  }

  const mother = motherQuery.data;
  const summary = summaryQuery.data;
  const adminStatus = getAdministrativeStatus(summary);

  return (
    <div className="space-y-6">
      {/* Header & Mother Info Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                to="/my-mothers"
                className="text-xs font-semibold text-slate-500 hover:text-pfram-primary"
              >
                ← Ibu Binaan
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-pfram-primary">
                Detail Pemantauan
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-800">
              {mother.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Usia: {mother.age ?? "-"} tahun •{" "}
              {mother.facility?.name ?? "Belum memilih fasilitas"}
              {mother.address && (
                <span> • Alamat: {mother.address}</span>
              )}
              {" "}•{" "}
              <a
                href={"https://maps.google.com/?q=" + encodeURIComponent(mother.address || (mother.fullName + " " + (mother.facility?.name ?? "")))}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-pfram-primary underline hover:text-pfram-primary/80"
              >
                📍 Buka di Maps ↗
              </a>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Non-clinical Administrative Status Badge */}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {adminStatus}
            </span>
            {mother.activePregnancy?.gestationalAge ? (
              <span className="text-xs font-medium text-slate-500">
                Usia Gestasi:{" "}
                <span className="font-semibold text-slate-700">
                  {mother.activePregnancy.gestationalAge.weeks} minggu{" "}
                  {mother.activePregnancy.gestationalAge.days} hari
                </span>{" "}
                (Trimester {mother.activePregnancy.trimester})
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Profil kehamilan belum aktif
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex border-b border-slate-200" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "monitoring"}
            onClick={() => setActiveTab("monitoring")}
            className={`border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "monitoring"
                ? "border-pfram-primary text-pfram-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Pemantauan Fisik
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "anc"}
            onClick={() => setActiveTab("anc")}
            className={`border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "anc"
                ? "border-pfram-primary text-pfram-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Jadwal ANC & Kepatuhan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "danger-screening"}
            onClick={() => setActiveTab("danger-screening")}
            className={`border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "danger-screening"
                ? "border-pfram-primary text-pfram-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Screening & Tanda Bahaya
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "p4k"}
            onClick={() => setActiveTab("p4k")}
            className={`border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "p4k"
                ? "border-pfram-primary text-pfram-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            P4K & Rujukan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "visits"}
            onClick={() => setActiveTab("visits")}
            className={"border-b-2 px-5 py-3 text-sm font-bold transition " + (activeTab === "visits" ? "border-pfram-primary text-pfram-primary" : "border-transparent text-slate-500 hover:text-slate-800")}
          >
            Kunjungan Rumah
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            className={`border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "profile"
                ? "border-pfram-primary text-pfram-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Profil & Kehamilan
          </button>
        </div>
      </div>

      {/* Tab: Jadwal ANC & Kepatuhan */}
      {activeTab === "anc" && motherPublicId && (
        <MidwifeAncSection motherPublicId={motherPublicId} />
      )}

      {/* Tab: Screening & Tanda Bahaya */}
      {activeTab === "danger-screening" && motherPublicId && (
        <MidwifeDangerScreeningSection motherPublicId={motherPublicId} />
      )}

      {/* Tab: P4K & Rencana Rujukan */}
      {activeTab === "p4k" && motherPublicId && (
        <MidwifeP4kSection motherPublicId={motherPublicId} />
      )}

      {/* Tab: Kunjungan Rumah */}
      {activeTab === "visits" && motherPublicId && (
        <MidwifeHomeVisitSection motherPublicId={motherPublicId} />
      )}

      {/* Tab: Profil & Kehamilan */}
      {activeTab === "profile" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">
            Rincian Profil Ibu Hamil
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Nama Lengkap
              </span>
              <p className="font-semibold text-slate-800">{mother.fullName}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Usia
              </span>
              <p className="font-semibold text-slate-800">
                {mother.age ?? "-"} tahun
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Fasilitas Kesehatan Primer
              </span>
              <p className="font-semibold text-slate-800">
                {mother.facility?.name ?? "Belum terdaftar"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Taksiran Persalinan (HPL)
              </span>
              <p className="font-semibold text-slate-800">
                {mother.activePregnancy?.estimatedDueDate ?? "-"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Usia Kehamilan
              </span>
              <p className="font-semibold text-slate-800">
                {mother.activePregnancy?.gestationalAge
                  ? `${mother.activePregnancy.gestationalAge.weeks} minggu ${mother.activePregnancy.gestationalAge.days} hari`
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Pemantauan Fisik */}
      {activeTab === "monitoring" && (
        <div className="space-y-6">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              Ringkasan Kondisi Fisik Ibu
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="rounded-xl bg-pfram-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pfram-text"
            >
              + Tambah Pengukuran
            </button>
          </div>

          {/* Add Measurement Modal / Section */}
          {showAddForm && (
            <MidwifeMonitoringForm
              motherPublicId={mother.publicId}
              onSuccess={() => {
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Summary Cards */}
          {summaryQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100 p-4"
                />
              ))}
            </div>
          ) : summaryQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Terdapat masalah saat memuat ringkasan pemantauan.{" "}
              <button
                type="button"
                onClick={() => summaryQuery.refetch()}
                className="font-bold underline ml-2"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Berat Badan Terakhir */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Berat Badan Terakhir
                </span>
                <div className="mt-2 text-2xl font-bold text-slate-800">
                  {summary?.latestWeight !== null &&
                  summary?.latestWeight !== undefined
                    ? formatWeightKg(summary.latestWeight)
                    : "Belum ada catatan"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {summary?.latestWeightRecordedAt
                    ? formatIndonesianDate(summary.latestWeightRecordedAt)
                    : "Belum ada pengukuran"}
                </div>
              </div>

              {/* Tekanan Darah Terakhir */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tekanan Darah Terakhir
                </span>
                <div className="mt-2 text-2xl font-bold text-slate-800">
                  {summary?.latestBloodPressure
                    ? formatBp(
                        summary.latestBloodPressure.systolic,
                        summary.latestBloodPressure.diastolic,
                      )
                    : "Belum ada catatan"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {summary?.latestBloodPressureRecordedAt
                    ? formatIndonesianDate(
                        summary.latestBloodPressureRecordedAt,
                      )
                    : "Belum ada pengukuran"}
                </div>
              </div>

              {/* Perubahan Berat */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Perubahan Berat Badan
                </span>
                <div className="mt-2 text-2xl font-bold text-slate-800">
                  {summary?.weightChange !== null &&
                  summary?.weightChange !== undefined
                    ? formatWeightChange(summary.weightChange)
                    : "-"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Dari catatan sebelumnya
                </div>
              </div>

              {/* Total Catatan */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Catatan
                </span>
                <div className="mt-2 text-2xl font-bold text-slate-800">
                  {summary?.totalEntries ?? 0}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Catatan aktif tersimpan
                </div>
              </div>
            </div>
          )}

          {/* Section: Grafik Perkembangan */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Grafik Perkembangan Pemantauan
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisasi perkembangan berat badan dan tekanan darah.
                </p>
              </div>
              <PeriodFilterBar
                selected={chartPeriod}
                onSelect={setChartPeriod}
              />
            </div>

            {chartData.isLoading ? (
              <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
            ) : chartData.isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Terdapat masalah saat memuat grafik.{" "}
                <button
                  type="button"
                  onClick={() => chartData.refetch()}
                  className="font-bold underline ml-2"
                >
                  Coba Lagi
                </button>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <WebWeightLineChart points={chartData.weightPoints} />
                <WebBloodPressureLineChart points={chartData.bpPoints} />
              </div>
            )}
          </div>

          {/* Section: Riwayat Pemantauan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Riwayat Pemantauan Fisik
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar seluruh catatan pengukuran terurut dari yang terbaru.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2">
                {[
                  { id: "all" as const, label: "Semua" },
                  { id: "weight" as const, label: "Berat Badan" },
                  { id: "blood_pressure" as const, label: "Tekanan Darah" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setHistoryType(f.id);
                      setHistoryPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      historyType === f.id
                        ? "bg-pfram-primary text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List Table Content */}
            {listQuery.isLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Memuat riwayat pemantauan...
              </div>
            ) : listQuery.isError ? (
              <div className="my-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
                Terdapat masalah saat memuat data pemantauan.{" "}
                <button
                  type="button"
                  onClick={() => listQuery.refetch()}
                  className="font-bold underline ml-2"
                >
                  Coba Lagi
                </button>
              </div>
            ) : (listQuery.data?.items?.length ?? 0) === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-500">
                  Belum ada data pemantauan.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 rounded-xl bg-pfram-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-pfram-text"
                >
                  Tambah Pengukuran
                </button>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Tanggal & Waktu
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Berat Badan
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Tekanan Darah
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Sumber
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Pencatat
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {listQuery.data?.items.map((item) => (
                        <tr key={item.publicId} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">
                              {formatIndonesianDate(item.recordedAt)}
                            </div>
                            <div className="text-xs text-slate-400">
                              {formatIndonesianTime(item.recordedAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {formatWeightKg(item.weightKg)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {formatBp(item.systolicBp, item.diastolicBp)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">
                              {SOURCE_LABELS[item.source] ?? item.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {item.createdByName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {Math.ceil((listQuery.data?.total ?? 0) / historyLimit) > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <span className="text-xs text-slate-500">
                      Halaman {historyPage} dari{" "}
                      {Math.ceil(
                        (listQuery.data?.total ?? 0) / historyLimit,
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={
                        historyPage >=
                        Math.ceil((listQuery.data?.total ?? 0) / historyLimit)
                      }
                      onClick={() => setHistoryPage((p) => p + 1)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Selanjutnya
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
