import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius, spacing } from "@pfram/design-tokens";
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
} from "../lib/monitoring-api";

/* -------------------------------------------------------------------------- */
/*  Period Filter Chips                                                       */
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
    <View style={s.periodRow} accessibilityRole="tablist">
      {PERIOD_OPTIONS.map((opt) => {
        const isActive = selected === opt.id;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter periode ${opt.label}`}
            onPress={() => onSelect(opt.id)}
            style={[s.periodChip, isActive && s.periodChipActive]}
          >
            <Text
              style={[s.periodChipText, isActive && s.periodChipTextActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helper: Line segment renderer                                             */
/* -------------------------------------------------------------------------- */

function LineSegment({
  x1,
  y1,
  x2,
  y2,
  color,
  strokeWidth = 2,
  isDashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth?: number;
  isDashed?: boolean;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: cx - length / 2,
        top: cy - strokeWidth / 2,
        width: length,
        height: strokeWidth,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
        opacity: isDashed ? 0.75 : 1,
      }}
    />
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
/*  Grafik Perkembangan Berat Badan                                           */
/* -------------------------------------------------------------------------- */

export function WeightLineChart({
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
      <View style={s.cardContainer}>
        <Text style={s.cardTitle}>Grafik Berat Badan</Text>
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>
            Belum ada data berat badan untuk ditampilkan.
          </Text>
        </View>
      </View>
    );
  }

  const selectedPoint =
    points.find((p) => p.id === selectedId) ?? points[points.length - 1];

  // Axis bounds
  const values = points.map((p) => p.weightKg);
  const minValRaw = Math.min(...values);
  const maxValRaw = Math.max(...values);
  const isSingle = points.length === 1;

  // Add 1-2 kg padding
  const paddingVal = minValRaw === maxValRaw ? 2 : Math.max(1, (maxValRaw - minValRaw) * 0.15);
  const minY = Math.floor(Math.max(0, minValRaw - paddingVal));
  const maxY = Math.ceil(maxValRaw + paddingVal);
  const rangeY = maxY - minY || 1;

  const chartHeight = 180;
  const paddingLeft = 45;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 30;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const pointSpacing = Math.max(70, 320 / Math.max(points.length, 1));
  const plotWidth = Math.max(280, (points.length - 1) * pointSpacing);
  const contentWidth = plotWidth + paddingLeft + paddingRight;

  const yTicks = [
    maxY,
    Number(((maxY + minY) / 2).toFixed(1)),
    minY,
  ];

  const coords = points.map((p, idx) => {
    const x = isSingle
      ? paddingLeft + plotWidth / 2
      : paddingLeft + idx * (plotWidth / Math.max(1, points.length - 1));
    const ratio = (p.weightKg - minY) / rangeY;
    const y = paddingTop + plotHeight - ratio * plotHeight;
    return { ...p, x, y };
  });

  return (
    <View style={s.cardContainer}>
      <View style={s.cardHeaderRow}>
        <Text style={s.cardTitle}>Grafik Berat Badan</Text>
        <Text style={s.unitBadge}>Satuan: kg</Text>
      </View>

      {isSingle && (
        <View style={s.singleNoticeBox}>
          <Text style={s.singleNoticeText}>
            Grafik akan lebih informatif setelah ada pengukuran berikutnya.
          </Text>
        </View>
      )}

      {/* Tooltip Card */}
      {selectedPoint && (
        <View
          style={s.tooltipBox}
          accessible={true}
          accessibilityLabel="Rincian titik pengukuran berat badan terpilih"
        >
          <View style={s.tooltipRow}>
            <Text style={s.tooltipDate}>
              {formatIndonesianDate(selectedPoint.recordedAt)} •{" "}
              {formatIndonesianTime(selectedPoint.recordedAt)}
            </Text>
            <Text style={s.tooltipSource}>
              {(SOURCE_LABELS as Record<string, string>)[selectedPoint.source] ?? selectedPoint.source}
            </Text>
          </View>
          <View style={s.tooltipValRow}>
            <Text style={s.tooltipWeightVal}>
              {formatWeightKg(selectedPoint.weightKg)}
            </Text>
            {selectedPoint.gestationalAge && (
              <Text style={s.tooltipGaText}>
                Usia kehamilan:{" "}
                {formatGestationalAge(selectedPoint.gestationalAge)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Chart Canvas */}
      <View
        style={s.chartOuterWrapper}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={`Grafik berat badan dengan ${points.length} titik pengukuran.`}
      >
        {/* Y Axis Grid & Labels (Static overlay) */}
        <View style={[s.yAxisOverlay, { height: chartHeight }]}>
          {yTicks.map((tick, idx) => {
            const topPos =
              paddingTop +
              plotHeight -
              ((tick - minY) / rangeY) * plotHeight -
              7;
            return (
              <Text
                key={idx}
                style={[s.axisTickLabel, { top: Math.max(0, topPos) }]}
              >
                {tick}
              </Text>
            );
          })}
        </View>

        {/* Horizontal scrollable plot area */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={points.length > 4}
          contentContainerStyle={{ width: Math.max(contentWidth, 340) }}
        >
          <View style={{ width: Math.max(contentWidth, 340), height: chartHeight }}>
            {/* Grid Lines */}
            {yTicks.map((tick, idx) => {
              const y =
                paddingTop +
                plotHeight -
                ((tick - minY) / rangeY) * plotHeight;
              return (
                <View
                  key={`grid-${idx}`}
                  style={[s.gridLine, { top: y, width: contentWidth }]}
                />
              );
            })}

            {/* Connecting lines */}
            {coords.map((curr, idx) => {
              if (idx === 0) return null;
              const prev = coords[idx - 1]!;
              return (
                <LineSegment
                  key={`seg-${curr.id}`}
                  x1={prev.x}
                  y1={prev.y}
                  x2={curr.x}
                  y2={curr.y}
                  color={colors.primary}
                  strokeWidth={3}
                />
              );
            })}

            {/* Points */}
            {coords.map((pt) => {
              const isSelected = pt.id === selectedPoint?.id;
              return (
                <Pressable
                  key={pt.id}
                  hitSlop={16}
                  accessibilityRole="button"
                  accessibilityLabel={`Titik berat ${formatWeightKg(pt.weightKg)}, tanggal ${formatIndonesianDate(pt.recordedAt)}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedId(pt.id)}
                  style={[
                    s.pointTouchable,
                    {
                      left: pt.x - (isSelected ? 10 : 7),
                      top: pt.y - (isSelected ? 10 : 7),
                      width: isSelected ? 20 : 14,
                      height: isSelected ? 20 : 14,
                      borderRadius: isSelected ? 10 : 7,
                    },
                    isSelected && s.pointSelected,
                  ]}
                >
                  <View style={s.pointInner} />
                </Pressable>
              );
            })}

            {/* X Axis Labels */}
            {coords.map((pt) => (
              <Text
                key={`label-${pt.id}`}
                style={[
                  s.xAxisLabel,
                  {
                    left: pt.x - 30,
                    top: paddingTop + plotHeight + 8,
                    width: 60,
                  },
                ]}
                numberOfLines={1}
              >
                {formatShortDate(pt.recordedAt)}
              </Text>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Accessibility Fallback Table Toggle */}
      <View style={s.fallbackContainer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showTable ? "Sembunyikan data tabel" : "Lihat data tabel"}
          onPress={() => setShowTable((prev) => !prev)}
          style={s.fallbackButton}
        >
          <Text style={s.fallbackButtonText}>
            {showTable ? "Sembunyikan Tabel Data" : "Lihat Tabel Data"}
          </Text>
        </Pressable>

        {showTable && (
          <View
            style={s.tableContainer}
            accessible={true}
            accessibilityLabel="Tabel data perkembangan berat badan"
          >
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Tanggal & Waktu</Text>
              <Text style={[s.tableHeaderCell, { flex: 1.5 }]}>Berat</Text>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Usia Kehamilan</Text>
            </View>
            {points.map((pt) => (
              <View
                key={`tbl-${pt.id}`}
                style={s.tableRow}
                accessible={true}
                accessibilityLabel={`${formatIndonesianDate(pt.recordedAt)}, berat ${formatWeightKg(pt.weightKg)}`}
              >
                <Text style={[s.tableCell, { flex: 2 }]}>
                  {formatIndonesianDate(pt.recordedAt)}
                  {"\n"}
                  <Text style={s.tableSubCell}>
                    {formatIndonesianTime(pt.recordedAt)}
                  </Text>
                </Text>
                <Text style={[s.tableCellBold, { flex: 1.5 }]}>
                  {formatWeightKg(pt.weightKg)}
                </Text>
                <Text style={[s.tableCell, { flex: 2 }]}>
                  {formatGestationalAge(pt.gestationalAge) ?? "-"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grafik Perkembangan Tekanan Darah                                         */
/* -------------------------------------------------------------------------- */

export function BloodPressureLineChart({
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
      <View style={s.cardContainer}>
        <Text style={s.cardTitle}>Grafik Tekanan Darah</Text>
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>
            Belum ada data tekanan darah untuk ditampilkan.
          </Text>
        </View>
      </View>
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

  // Add 10 mmHg bounds
  const minY = Math.floor(Math.max(30, minValRaw - 10));
  const maxY = Math.ceil(maxValRaw + 10);
  const rangeY = maxY - minY || 1;

  const chartHeight = 180;
  const paddingLeft = 45;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 30;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const pointSpacing = Math.max(70, 320 / Math.max(points.length, 1));
  const plotWidth = Math.max(280, (points.length - 1) * pointSpacing);
  const contentWidth = plotWidth + paddingLeft + paddingRight;

  const yTicks = [
    maxY,
    Number(((maxY + minY) / 2).toFixed(0)),
    minY,
  ];

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

  return (
    <View style={s.cardContainer}>
      <View style={s.cardHeaderRow}>
        <Text style={s.cardTitle}>Grafik Tekanan Darah</Text>
        <Text style={s.unitBadge}>Satuan: mmHg</Text>
      </View>

      {/* Legends without clinical labels */}
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View
            style={[
              s.legendDot,
              { backgroundColor: colors.primary, borderRadius: 5 },
            ]}
          />
          <Text style={s.legendText}>Sistolik (mmHg)</Text>
        </View>
        <View style={s.legendItem}>
          <View
            style={[
              s.legendDot,
              {
                backgroundColor: colors.teal,
                borderColor: colors.primary,
                borderWidth: 1,
              },
            ]}
          />
          <Text style={s.legendText}>Diastolik (mmHg)</Text>
        </View>
      </View>

      {isSingle && (
        <View style={s.singleNoticeBox}>
          <Text style={s.singleNoticeText}>
            Grafik akan lebih informatif setelah ada pengukuran berikutnya.
          </Text>
        </View>
      )}

      {/* Tooltip Card */}
      {selectedPoint && (
        <View
          style={s.tooltipBox}
          accessible={true}
          accessibilityLabel="Rincian titik pengukuran tekanan darah terpilih"
        >
          <View style={s.tooltipRow}>
            <Text style={s.tooltipDate}>
              {formatIndonesianDate(selectedPoint.recordedAt)} •{" "}
              {formatIndonesianTime(selectedPoint.recordedAt)}
            </Text>
            <Text style={s.tooltipSource}>
              {(SOURCE_LABELS as Record<string, string>)[selectedPoint.source] ?? selectedPoint.source}
            </Text>
          </View>
          <View style={s.tooltipValRow}>
            <Text style={s.tooltipBpVal}>
              {selectedPoint.systolicBp} / {selectedPoint.diastolicBp} mmHg
            </Text>
            {selectedPoint.gestationalAge && (
              <Text style={s.tooltipGaText}>
                Usia kehamilan:{" "}
                {formatGestationalAge(selectedPoint.gestationalAge)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Chart Canvas */}
      <View
        style={s.chartOuterWrapper}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={`Grafik tekanan darah dengan ${points.length} titik pengukuran sistolik dan diastolik.`}
      >
        {/* Y Axis Overlay */}
        <View style={[s.yAxisOverlay, { height: chartHeight }]}>
          {yTicks.map((tick, idx) => {
            const topPos =
              paddingTop +
              plotHeight -
              ((tick - minY) / rangeY) * plotHeight -
              7;
            return (
              <Text
                key={idx}
                style={[s.axisTickLabel, { top: Math.max(0, topPos) }]}
              >
                {tick}
              </Text>
            );
          })}
        </View>

        {/* Scrollable area */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={points.length > 4}
          contentContainerStyle={{ width: Math.max(contentWidth, 340) }}
        >
          <View style={{ width: Math.max(contentWidth, 340), height: chartHeight }}>
            {/* Grid lines */}
            {yTicks.map((tick, idx) => {
              const y =
                paddingTop +
                plotHeight -
                ((tick - minY) / rangeY) * plotHeight;
              return (
                <View
                  key={`grid-bp-${idx}`}
                  style={[s.gridLine, { top: y, width: contentWidth }]}
                />
              );
            })}

            {/* Connecting lines - Systolic */}
            {coords.map((curr, idx) => {
              if (idx === 0) return null;
              const prev = coords[idx - 1]!;
              return (
                <LineSegment
                  key={`sys-seg-${curr.id}`}
                  x1={prev.x}
                  y1={prev.sysY}
                  x2={curr.x}
                  y2={curr.sysY}
                  color={colors.primary}
                  strokeWidth={3}
                />
              );
            })}

            {/* Connecting lines - Diastolic */}
            {coords.map((curr, idx) => {
              if (idx === 0) return null;
              const prev = coords[idx - 1]!;
              return (
                <LineSegment
                  key={`dia-seg-${curr.id}`}
                  x1={prev.x}
                  y1={prev.diaY}
                  x2={curr.x}
                  y2={curr.diaY}
                  color={colors.teal}
                  strokeWidth={2.5}
                  isDashed
                />
              );
            })}

            {/* Points - Systolic & Diastolic */}
            {coords.map((pt) => {
              const isSelected = pt.id === selectedPoint?.id;
              return (
                <View key={`pt-group-${pt.id}`}>
                  {/* Systolic Point */}
                  <Pressable
                    hitSlop={16}
                    accessibilityRole="button"
                    accessibilityLabel={`Sistolik ${pt.systolicBp} mmHg, tanggal ${formatIndonesianDate(pt.recordedAt)}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedId(pt.id)}
                    style={[
                      s.pointTouchable,
                      {
                        left: pt.x - (isSelected ? 9 : 7),
                        top: pt.sysY - (isSelected ? 9 : 7),
                        width: isSelected ? 18 : 14,
                        height: isSelected ? 18 : 14,
                        borderRadius: 9,
                        backgroundColor: colors.primary,
                      },
                      isSelected && s.pointSelected,
                    ]}
                  />

                  {/* Diastolic Point */}
                  <Pressable
                    hitSlop={16}
                    accessibilityRole="button"
                    accessibilityLabel={`Diastolik ${pt.diastolicBp} mmHg, tanggal ${formatIndonesianDate(pt.recordedAt)}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedId(pt.id)}
                    style={[
                      s.pointTouchable,
                      {
                        left: pt.x - (isSelected ? 9 : 7),
                        top: pt.diaY - (isSelected ? 9 : 7),
                        width: isSelected ? 18 : 14,
                        height: isSelected ? 18 : 14,
                        borderRadius: 3,
                        backgroundColor: colors.white,
                        borderWidth: 2,
                        borderColor: colors.teal,
                      },
                      isSelected && s.pointSelected,
                    ]}
                  />
                </View>
              );
            })}

            {/* X Axis Labels */}
            {coords.map((pt) => (
              <Text
                key={`label-bp-${pt.id}`}
                style={[
                  s.xAxisLabel,
                  {
                    left: pt.x - 30,
                    top: paddingTop + plotHeight + 8,
                    width: 60,
                  },
                ]}
                numberOfLines={1}
              >
                {formatShortDate(pt.recordedAt)}
              </Text>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Accessibility Fallback Table Toggle */}
      <View style={s.fallbackContainer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showTable ? "Sembunyikan data tabel" : "Lihat data tabel"}
          onPress={() => setShowTable((prev) => !prev)}
          style={s.fallbackButton}
        >
          <Text style={s.fallbackButtonText}>
            {showTable ? "Sembunyikan Tabel Data" : "Lihat Tabel Data"}
          </Text>
        </Pressable>

        {showTable && (
          <View
            style={s.tableContainer}
            accessible={true}
            accessibilityLabel="Tabel data perkembangan tekanan darah"
          >
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Tanggal & Waktu</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>Sistolik</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>Diastolik</Text>
              <Text style={[s.tableHeaderCell, { flex: 1.5 }]}>Usia Kehamilan</Text>
            </View>
            {points.map((pt) => (
              <View
                key={`tbl-bp-${pt.id}`}
                style={s.tableRow}
                accessible={true}
                accessibilityLabel={`${formatIndonesianDate(pt.recordedAt)}, tekanan darah ${pt.systolicBp} per ${pt.diastolicBp} mmHg`}
              >
                <Text style={[s.tableCell, { flex: 2 }]}>
                  {formatIndonesianDate(pt.recordedAt)}
                  {"\n"}
                  <Text style={s.tableSubCell}>
                    {formatIndonesianTime(pt.recordedAt)}
                  </Text>
                </Text>
                <Text style={[s.tableCellBold, { flex: 1 }]}>
                  {pt.systolicBp}
                </Text>
                <Text style={[s.tableCellBold, { flex: 1 }]}>
                  {pt.diastolicBp}
                </Text>
                <Text style={[s.tableCell, { flex: 1.5 }]}>
                  {formatGestationalAge(pt.gestationalAge) ?? "-"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const s = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2ECE9",
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  unitBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.neutral,
    backgroundColor: "#F0F5F3",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  legendRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
  },
  legendText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  periodRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#C7D8D2",
    alignItems: "center",
    justifyContent: "center",
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  periodChipTextActive: {
    color: colors.white,
  },
  singleNoticeBox: {
    backgroundColor: "#FFF8F2",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#FCE5D8",
  },
  singleNoticeText: {
    fontSize: 12,
    color: "#8B572A",
    lineHeight: 16,
  },
  tooltipBox: {
    backgroundColor: "#F3F9F6",
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: "#D3E9E2",
    marginBottom: spacing.sm,
  },
  tooltipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tooltipDate: {
    fontSize: 12,
    color: colors.neutral,
  },
  tooltipSource: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  tooltipValRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  tooltipWeightVal: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  tooltipBpVal: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  tooltipGaText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
  },
  chartOuterWrapper: {
    position: "relative",
    borderWidth: 1,
    borderColor: "#EBF2EF",
    borderRadius: radius.md,
    backgroundColor: "#FAFCFB",
    overflow: "hidden",
  },
  yAxisOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 40,
    zIndex: 10,
    backgroundColor: "rgba(250, 252, 251, 0.95)",
    borderRightWidth: 1,
    borderColor: "#EBF2EF",
  },
  axisTickLabel: {
    position: "absolute",
    right: 4,
    fontSize: 10,
    color: colors.neutral,
    textAlign: "right",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    height: 1,
    backgroundColor: "#EBF2EF",
  },
  pointTouchable: {
    position: "absolute",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  pointInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  pointSelected: {
    borderWidth: 3,
    borderColor: colors.teal,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  xAxisLabel: {
    position: "absolute",
    fontSize: 10,
    color: colors.neutral,
    textAlign: "center",
  },
  emptyBox: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    color: colors.neutral,
    textAlign: "center",
  },
  fallbackContainer: {
    marginTop: spacing.sm,
  },
  fallbackButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  fallbackButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  tableContainer: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: "#E2ECE9",
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#EDF5F2",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#E2ECE9",
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#F0F5F3",
    alignItems: "center",
  },
  tableCell: {
    fontSize: 12,
    color: colors.text,
  },
  tableSubCell: {
    fontSize: 10,
    color: colors.neutral,
  },
  tableCellBold: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
});
