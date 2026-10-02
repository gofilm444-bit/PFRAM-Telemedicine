import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
} from "@pfram/design-tokens";
import type {
  MonitoringEntry,
  MonitoringListItem,
  MonitoringSource,
  MonitoringSummary,
} from "@pfram/shared-types";
import {
  monitoringCreateSchema,
  monitoringUpdateSchema,
} from "@pfram/validation";
import {
  formatIndonesianDateTime,
  formatWeightChange,
  formatWeightKg,
  MONITORING_SOURCES,
  normalizeBpInput,
  normalizeWeightInput,
  SOURCE_LABELS,
} from "../lib/monitoring-api";
import {
  AppButton,
  AppCard,
  AppTextInput,
  ChoiceSelect,
} from "./ui";

/* -------------------------------------------------------------------------- */
/*                            MonitoringMetricCard                            */
/* -------------------------------------------------------------------------- */

export function MonitoringMetricCard({
  title,
  value,
  recordedAt,
  emptyMessage,
}: {
  title: string;
  value: string | null;
  recordedAt?: string | null;
  emptyMessage: string;
}) {
  return (
    <View style={s.metricCard}>
      <Text style={s.metricTitle}>{title}</Text>
      {value ? (
        <View style={s.metricValueContainer}>
          <Text style={s.metricValue}>{value}</Text>
          {recordedAt && (
            <Text style={s.metricDate}>{formatIndonesianDateTime(recordedAt)}</Text>
          )}
        </View>
      ) : (
        <Text style={s.metricEmpty}>{emptyMessage}</Text>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                           MonitoringSummaryCard                            */
/* -------------------------------------------------------------------------- */

export function MonitoringSummaryCard({
  summary,
}: {
  summary: MonitoringSummary | null | undefined;
}) {
  const weightVal =
    summary?.latestWeight !== null && summary?.latestWeight !== undefined
      ? formatWeightKg(summary.latestWeight)
      : null;

  const bpVal = summary?.latestBloodPressure
    ? `${summary.latestBloodPressure.systolic}/${summary.latestBloodPressure.diastolic} mmHg`
    : null;

  const weightChangeStr = formatWeightChange(summary?.weightChange);

  return (
    <AppCard>
      <Text style={s.sectionHeader}>Ringkasan Pemantauan</Text>

      <MonitoringMetricCard
        title="BERAT BADAN TERAKHIR"
        value={weightVal}
        recordedAt={summary?.latestWeightRecordedAt}
        emptyMessage="Belum ada catatan berat badan"
      />

      <MonitoringMetricCard
        title="TEKANAN DARAH TERAKHIR"
        value={bpVal}
        recordedAt={summary?.latestBloodPressureRecordedAt}
        emptyMessage="Belum ada catatan tekanan darah"
      />

      <View style={s.summaryMeta}>
        <Text style={s.metaText}>
          Total catatan:{" "}
          <Text style={s.metaBold}>{summary?.totalEntries ?? 0}</Text>
        </Text>
        {weightChangeStr !== null && (
          <Text style={s.metaText}>
            Perubahan dari catatan sebelumnya:{" "}
            <Text style={s.metaBold}>{weightChangeStr}</Text>
          </Text>
        )}
      </View>
    </AppCard>
  );
}

/* -------------------------------------------------------------------------- */
/*                           MonitoringHistoryItem                            */
/* -------------------------------------------------------------------------- */

export function MonitoringHistoryItem({
  item,
  onPress,
}: {
  item: MonitoringListItem | MonitoringEntry;
  onPress?: () => void;
}) {
  const hasWeight = item.weightKg !== null && item.weightKg !== undefined;
  const hasBp =
    item.systolicBp !== null &&
    item.systolicBp !== undefined &&
    item.diastolicBp !== null &&
    item.diastolicBp !== undefined;
  const sourceLabel = SOURCE_LABELS[item.source] ?? item.source;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Catatan ${formatIndonesianDateTime(item.recordedAt)}`}
      onPress={onPress}
      style={({ pressed }) => [s.historyCard, pressed && s.pressed]}
    >
      <View style={s.historyHeader}>
        <Text style={s.historyDate}>
          {formatIndonesianDateTime(item.recordedAt)}
        </Text>
        <View style={s.sourceBadge}>
          <Text style={s.sourceBadgeText}>{sourceLabel}</Text>
        </View>
      </View>

      <View style={s.historyDataRow}>
        {hasWeight && (
          <View style={s.historyDataItem}>
            <Text style={s.historyDataLabel}>Berat badan</Text>
            <Text style={s.historyDataValue}>{formatWeightKg(item.weightKg)}</Text>
          </View>
        )}

        {hasBp && (
          <View style={s.historyDataItem}>
            <Text style={s.historyDataLabel}>Tekanan darah</Text>
            <Text style={s.historyDataValue}>
              {item.systolicBp}/{item.diastolicBp} mmHg
            </Text>
          </View>
        )}
      </View>

      {Boolean(item.notes) && (
        <View style={s.notesRow}>
          <Text style={s.notesBadge}>Catatan:</Text>
          <Text numberOfLines={2} style={s.notesText}>
            {item.notes}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/*                               ConfirmDialog                                */
/* -------------------------------------------------------------------------- */

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  onConfirm,
  onCancel,
  loading = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <Text accessibilityRole="header" style={s.modalTitle}>
            {title}
          </Text>
          <Text style={s.modalMessage}>{message}</Text>
          <View style={s.modalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              disabled={loading}
              onPress={onCancel}
              style={[s.modalButton, s.modalCancelButton]}
            >
              <Text style={s.modalCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              disabled={loading}
              onPress={onConfirm}
              style={[s.modalButton, s.modalConfirmButton]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={s.modalConfirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MonitoringForm                               */
/* -------------------------------------------------------------------------- */

export interface MonitoringFormValues {
  recordedAt: string;
  source: MonitoringSource;
  weightKg: string;
  systolicBp: string;
  diastolicBp: string;
  notes: string;
}

export function MonitoringForm({
  initialValues,
  onSubmit,
  isEdit = false,
  loading = false,
  serverError,
}: {
  initialValues?: Partial<MonitoringFormValues>;
  onSubmit: (data: {
    recordedAt: string;
    source: MonitoringSource;
    weightKg?: number | null;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    notes?: string | null;
  }) => Promise<void> | void;
  isEdit?: boolean;
  loading?: boolean;
  serverError?: string;
}) {
  const [recordedAt, setRecordedAt] = useState<string>(
    initialValues?.recordedAt ?? new Date().toISOString().slice(0, 16),
  );
  const [source, setSource] = useState<MonitoringSource>(
    initialValues?.source ?? "SELF",
  );
  const [weightKg, setWeightKg] = useState<string>(
    initialValues?.weightKg ?? "",
  );
  const [systolicBp, setSystolicBp] = useState<string>(
    initialValues?.systolicBp ?? "",
  );
  const [diastolicBp, setDiastolicBp] = useState<string>(
    initialValues?.diastolicBp ?? "",
  );
  const [notes, setNotes] = useState<string>(initialValues?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting || loading) return;

    setErrors({});

    // Normalization
    const normWeight = normalizeWeightInput(weightKg);
    const normSystolic = normalizeBpInput(systolicBp);
    const normDiastolic = normalizeBpInput(diastolicBp);
    const normNotes = notes.trim() ? notes.trim() : undefined;

    // Convert date string to ISO if needed
    let isoRecordedAt: string;
    try {
      const d = new Date(recordedAt);
      if (isNaN(d.getTime())) {
        setErrors({ recordedAt: "Format tanggal dan waktu tidak valid" });
        return;
      }
      isoRecordedAt = d.toISOString();
    } catch {
      setErrors({ recordedAt: "Format tanggal dan waktu tidak valid" });
      return;
    }

    const payload = {
      recordedAt: isoRecordedAt,
      source,
      weightKg: normWeight,
      systolicBp: normSystolic,
      diastolicBp: normDiastolic,
      notes: normNotes,
    };

    const schema = isEdit ? monitoringUpdateSchema : monitoringCreateSchema;
    const result = schema.safeParse(payload);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const fieldName = (issue.path[0] as string) || "form";
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        recordedAt: isoRecordedAt,
        source,
        weightKg: normWeight ?? (isEdit ? null : undefined),
        systolicBp: normSystolic ?? (isEdit ? null : undefined),
        diastolicBp: normDiastolic ?? (isEdit ? null : undefined),
        notes: normNotes ?? (isEdit ? null : undefined),
      });
    } catch {
      // In case the parent didn't handle it
    } finally {
      setSubmitting(false);
    }
  };

  const isButtonDisabled = submitting || loading;

  return (
    <View style={s.formContainer}>
      {Boolean(serverError) && (
        <Text accessibilityRole="alert" style={s.serverErrorBox}>
          {serverError}
        </Text>
      )}

      {Boolean(errors.form) && (
        <Text accessibilityRole="alert" style={s.serverErrorBox}>
          {errors.form}
        </Text>
      )}

      <AppTextInput
        label="Tanggal & Waktu Pengukuran (YYYY-MM-DDTHH:mm)"
        value={recordedAt}
        onChangeText={setRecordedAt}
        placeholder="2026-09-29T08:30"
        error={errors.recordedAt}
      />

      <ChoiceSelect
        label="Sumber Pengukuran"
        value={source}
        options={MONITORING_SOURCES}
        onChange={(val) => setSource(val as MonitoringSource)}
        error={errors.source}
      />

      <AppTextInput
        label="Berat Badan (kg) — Opsional"
        value={weightKg}
        onChangeText={setWeightKg}
        placeholder="Contoh: 60,5"
        keyboardType="decimal-pad"
        error={errors.weightKg}
      />

      <AppTextInput
        label="Tekanan Darah Sistolik (mmHg) — Opsional"
        value={systolicBp}
        onChangeText={setSystolicBp}
        placeholder="Contoh: 120"
        keyboardType="number-pad"
        error={errors.systolicBp}
      />

      <AppTextInput
        label="Tekanan Darah Diastolik (mmHg) — Opsional"
        value={diastolicBp}
        onChangeText={setDiastolicBp}
        placeholder="Contoh: 80"
        keyboardType="number-pad"
        error={errors.diastolicBp}
      />

      <AppTextInput
        label="Catatan Tambahan — Opsional"
        value={notes}
        onChangeText={setNotes}
        placeholder="Catatan kondisi fisik saat pengukuran"
        multiline
        numberOfLines={3}
        error={errors.notes}
      />

      <AppButton
        title={isButtonDisabled ? "Menyimpan..." : "Simpan Catatan"}
        onPress={handleSubmit}
        disabled={isButtonDisabled}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const s = StyleSheet.create({
  metricCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    gap: spacing.xs,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.neutral,
    letterSpacing: 0.5,
  },
  metricValueContainer: {
    gap: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  metricDate: {
    fontSize: 12,
    color: "#586B65",
  },
  metricEmpty: {
    fontSize: 14,
    color: colors.neutral,
    fontStyle: "italic",
    paddingVertical: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryMeta: {
    paddingTop: spacing.xs,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
  },
  metaText: {
    fontSize: 14,
    color: colors.text,
  },
  metaBold: {
    fontWeight: "700",
  },
  historyCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2ECE8",
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "#DDF3EC",
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  historyDataRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  historyDataItem: {
    gap: 2,
  },
  historyDataLabel: {
    fontSize: 12,
    color: colors.neutral,
  },
  historyDataValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  notesRow: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.cream,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  notesBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: "#586B65",
  },
  formContainer: {
    gap: spacing.md,
  },
  serverErrorBox: {
    color: colors.emergency,
    backgroundColor: "#FFF0EF",
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  modalMessage: {
    fontSize: 14,
    color: "#586B65",
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  modalButton: {
    minHeight: minimumTouchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: "#EEF3F0",
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  modalConfirmButton: {
    backgroundColor: colors.emergency,
  },
  modalConfirmText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
});
