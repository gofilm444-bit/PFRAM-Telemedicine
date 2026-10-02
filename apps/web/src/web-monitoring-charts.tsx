import { useState } from "react";
import type {
  BloodPressureChartPoint,
  MonitoringPeriodFilter,
  WeightChartPoint,
} from "@pfram/shared-types";
import {
  formatGestationalAge,
  formatIndonesianDate,
  formatIndonesianTime,
  formatWeightKg,
  SOURCE_LABELS,
} from "./monitoring-api";

/* -------------------------------------------------------------------------- */
/*  Period Filter Bar                                                         */
/* -------------------------------------------------------------------------- */

export const PERIOD_OPTIONS: Array<{
  id: MonitoringPeriodFilter;
  label: string;
}> = [
  { id: "7_days", label: "7 Hari" },
  { id: "30_days", label: "30 Hari" },
  { id: "active_pregnancy", label: "Kehamilan Ini" },
];

export function PeriodFilterBar({
  selected,
  onSelect,
}: {
  selected: MonitoringPeriodFilter;
  onSelect: (filter: MonitoringPeriodFilter) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter Periode Grafik"
      className="flex flex-wrap gap-2"
    >
      {PERIOD_OPTIONS.map((opt) => {
        const isActive = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(opt.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-pfram-primary text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function formatShortDate(isoString: string): string {
  if (!isoString) return "";
  if (isoString.includes("T")) {
    const [datePart] = isoString.split("T");
    const parts = datePart?.split("-");
    if (parts && parts.length === 3) {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      const monthIdx = Number(parts[1]) - 1;
      return `${Number(parts[2])} ${monthNames[monthIdx] ?? ""}`;
    }
  }
  const d = new Date(isoString);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/* -------------------------------------------------------------------------- */
/*  Web Weight Line Chart                                                     */
/* -------------------------------------------------------------------------- */

export function WebWeightLineChart({
  points,
}: {
  points: WeightChartPoint[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    points.length > 0 ? (points[points.length - 1]?.id ?? null) : null,
  );
  const [showTable, setShowTable] = useState(false);

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-800">
          Grafik Perkembangan Berat Badan
        </h3>
        <div className="my-8 text-center text-sm text-slate-500">
          Belum ada data berat badan untuk ditampilkan.
        </div>
      </div>
    );
  }

  const selectedPoint =
    points.find((p) => p.id === selectedId) ?? points[points.length - 1];

  const values = points.map((p) => p.weightKg);
  const minValRaw = Math.min(...values);
  const maxValRaw = Math.max(...values);
  const isSingle = points.length === 1;

  const paddingVal =
    minValRaw === maxValRaw
      ? 2
      : Math.max(1, (maxValRaw - minValRaw) * 0.15);
  const minY = Math.floor(Math.max(0, minValRaw - paddingVal));
  const maxY = Math.ceil(maxValRaw + paddingVal);
  const rangeY = maxY - minY || 1;

  const width = 600;
  const height = 220;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const yTicks = [maxY, Number(((maxY + minY) / 2).toFixed(1)), minY];

  const coords = points.map((p, idx) => {
    const x = isSingle
      ? paddingLeft + plotWidth / 2
      : paddingLeft + idx * (plotWidth / Math.max(1, points.length - 1));
    const ratio = (p.weightKg - minY) / rangeY;
    const y = paddingTop + plotHeight - ratio * plotHeight;
    return { ...p, x, y };
  });

  const pathD = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">
          Grafik Perkembangan Berat Badan
        </h3>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          Satuan: kg
        </span>
      </div>

      {isSingle && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          Grafik akan lebih informatif setelah ada pengukuran berikutnya.
        </div>
      )}

      {/* Tooltip Card */}
      {selectedPoint && (
        <div
          role="region"
          aria-label="Rincian titik berat badan terpilih"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3"
        >
          <div>
            <div className="text-xs text-slate-500">
              {formatIndonesianDate(selectedPoint.recordedAt)} •{" "}
              {formatIndonesianTime(selectedPoint.recordedAt)}
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Sumber:{" "}
              <span className="text-pfram-primary">
                {SOURCE_LABELS[selectedPoint.source] ?? selectedPoint.source}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-pfram-primary">
              {formatWeightKg(selectedPoint.weightKg)}
            </div>
            {selectedPoint.gestationalAge && (
              <div className="text-xs text-slate-600">
                Usia kehamilan:{" "}
                {formatGestationalAge(selectedPoint.gestationalAge)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Responsive SVG Chart */}
      <div className="relative mt-4 w-full overflow-hidden rounded-lg border border-slate-100 bg-slate-50/50 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Grafik perkembangan berat badan ibu dengan ${points.length} titik pengukuran`}
        >
          {/* Grid lines & Y labels */}
          {yTicks.map((tick, idx) => {
            const y =
              paddingTop +
              plotHeight -
              ((tick - minY) / rangeY) * plotHeight;
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#64748B"
                  fontWeight="500"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Line Path */}
          {!isSingle && (
            <path
              d={pathD}
              fill="none"
              stroke="#168C68"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {coords.map((pt) => {
            const isSelected = pt.id === selectedPoint?.id;
            return (
              <g
                key={pt.id}
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setSelectedId(pt.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedId(pt.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Titik berat ${formatWeightKg(pt.weightKg)}, tanggal ${formatIndonesianDate(pt.recordedAt)}`}
              >
                {isSelected && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="10"
                    fill="#42B8A5"
                    opacity="0.3"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : 4.5}
                  fill="#168C68"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={paddingTop + plotHeight + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748B"
                  fontWeight="500"
                >
                  {formatShortDate(pt.recordedAt)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Accessible Table Fallback */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs font-semibold text-pfram-primary hover:underline"
        >
          {showTable ? "Sembunyikan Tabel Data" : "Lihat Tabel Data"}
        </button>

        {showTable && (
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Tanggal & Waktu
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Berat Badan
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Usia Kehamilan
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Sumber
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {points.map((pt) => (
                  <tr key={`tbl-${pt.id}`} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2">
                      {formatIndonesianDate(pt.recordedAt)}
                      <div className="text-[10px] text-slate-500">
                        {formatIndonesianTime(pt.recordedAt)}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-800">
                      {formatWeightKg(pt.weightKg)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {formatGestationalAge(pt.gestationalAge) ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {SOURCE_LABELS[pt.source] ?? pt.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Web Blood Pressure Line Chart                                             */
/* -------------------------------------------------------------------------- */

export function WebBloodPressureLineChart({
  points,
}: {
  points: BloodPressureChartPoint[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    points.length > 0 ? (points[points.length - 1]?.id ?? null) : null,
  );
  const [showTable, setShowTable] = useState(false);

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-800">
          Grafik Perkembangan Tekanan Darah
        </h3>
        <div className="my-8 text-center text-sm text-slate-500">
          Belum ada data tekanan darah untuk ditampilkan.
        </div>
      </div>
    );
  }

  const selectedPoint =
    points.find((p) => p.id === selectedId) ?? points[points.length - 1];

  const systolicVals = points.map((p) => p.systolicBp);
  const diastolicVals = points.map((p) => p.diastolicBp);
  const allVals = [...systolicVals, ...diastolicVals];
  const minValRaw = Math.min(...allVals);
  const maxValRaw = Math.max(...allVals);
  const isSingle = points.length === 1;

  const minY = Math.floor(Math.max(30, minValRaw - 10));
  const maxY = Math.ceil(maxValRaw + 10);
  const rangeY = maxY - minY || 1;

  const width = 600;
  const height = 220;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const yTicks = [maxY, Number(((maxY + minY) / 2).toFixed(0)), minY];

  const coords = points.map((p, idx) => {
    const x = isSingle
      ? paddingLeft + plotWidth / 2
      : paddingLeft + idx * (plotWidth / Math.max(1, points.length - 1));
    const sysRatio = (p.systolicBp - minY) / rangeY;
    const diaRatio = (p.diastolicBp - minY) / rangeY;
    const sysY = paddingTop + plotHeight - sysRatio * plotHeight;
    const diaY = paddingTop + plotHeight - diaRatio * plotHeight;
    return { ...p, x, sysY, diaY };
  });

  const sysPathD = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.sysY}` : `${acc} L ${curr.x} ${curr.sysY}`;
  }, "");

  const diaPathD = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.diaY}` : `${acc} L ${curr.x} ${curr.diaY}`;
  }, "");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">
          Grafik Perkembangan Tekanan Darah
        </h3>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          Satuan: mmHg
        </span>
      </div>

      {/* Neutral Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-pfram-primary" />
          <span>Sistolik (mmHg)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-pfram-primary bg-pfram-teal" />
          <span>Diastolik (mmHg)</span>
        </div>
      </div>

      {isSingle && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          Grafik akan lebih informatif setelah ada pengukuran berikutnya.
        </div>
      )}

      {/* Tooltip Card */}
      {selectedPoint && (
        <div
          role="region"
          aria-label="Rincian titik tekanan darah terpilih"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3"
        >
          <div>
            <div className="text-xs text-slate-500">
              {formatIndonesianDate(selectedPoint.recordedAt)} •{" "}
              {formatIndonesianTime(selectedPoint.recordedAt)}
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Sumber:{" "}
              <span className="text-pfram-primary">
                {SOURCE_LABELS[selectedPoint.source] ?? selectedPoint.source}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-pfram-primary">
              {selectedPoint.systolicBp} / {selectedPoint.diastolicBp} mmHg
            </div>
            {selectedPoint.gestationalAge && (
              <div className="text-xs text-slate-600">
                Usia kehamilan:{" "}
                {formatGestationalAge(selectedPoint.gestationalAge)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Responsive SVG Chart */}
      <div className="relative mt-4 w-full overflow-hidden rounded-lg border border-slate-100 bg-slate-50/50 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Grafik tekanan darah dengan ${points.length} titik pengukuran sistolik dan diastolik`}
        >
          {/* Grid lines & Y labels */}
          {yTicks.map((tick, idx) => {
            const y =
              paddingTop +
              plotHeight -
              ((tick - minY) / rangeY) * plotHeight;
            return (
              <g key={`grid-bp-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#64748B"
                  fontWeight="500"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Systolic Line */}
          {!isSingle && (
            <path
              d={sysPathD}
              fill="none"
              stroke="#168C68"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Diastolic Line */}
          {!isSingle && (
            <path
              d={diaPathD}
              fill="none"
              stroke="#42B8A5"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {coords.map((pt) => {
            const isSelected = pt.id === selectedPoint?.id;
            return (
              <g
                key={pt.id}
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => setSelectedId(pt.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedId(pt.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Tekanan darah ${pt.systolicBp}/${pt.diastolicBp} mmHg, tanggal ${formatIndonesianDate(pt.recordedAt)}`}
              >
                {/* Systolic dot */}
                {isSelected && (
                  <circle
                    cx={pt.x}
                    cy={pt.sysY}
                    r="9"
                    fill="#168C68"
                    opacity="0.3"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.sysY}
                  r={isSelected ? 5.5 : 4}
                  fill="#168C68"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />

                {/* Diastolic rect/diamond */}
                {isSelected && (
                  <rect
                    x={pt.x - 8}
                    y={pt.diaY - 8}
                    width="16"
                    height="16"
                    fill="#42B8A5"
                    opacity="0.3"
                    rx="3"
                  />
                )}
                <rect
                  x={pt.x - 4}
                  y={pt.diaY - 4}
                  width="8"
                  height="8"
                  fill="#FFFFFF"
                  stroke="#42B8A5"
                  strokeWidth="2"
                  rx="2"
                />

                {/* X Axis label */}
                <text
                  x={pt.x}
                  y={paddingTop + plotHeight + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748B"
                  fontWeight="500"
                >
                  {formatShortDate(pt.recordedAt)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Accessible Table Fallback */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs font-semibold text-pfram-primary hover:underline"
        >
          {showTable ? "Sembunyikan Tabel Data" : "Lihat Tabel Data"}
        </button>

        {showTable && (
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Tanggal & Waktu
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Sistolik
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Diastolik
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Usia Kehamilan
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Sumber
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {points.map((pt) => (
                  <tr key={`tbl-bp-${pt.id}`} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2">
                      {formatIndonesianDate(pt.recordedAt)}
                      <div className="text-[10px] text-slate-500">
                        {formatIndonesianTime(pt.recordedAt)}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-800">
                      {pt.systolicBp} mmHg
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-800">
                      {pt.diastolicBp} mmHg
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {formatGestationalAge(pt.gestationalAge) ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {SOURCE_LABELS[pt.source] ?? pt.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
