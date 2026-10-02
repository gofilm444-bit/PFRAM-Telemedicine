import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { colors, radius, spacing } from "@pfram/design-tokens";
import {
  AppButton,
  AppCard,
  AppHeader,
  ErrorState,
  LoadingState,
  ScreenContainer,
} from "../../components/ui";
import { ConfirmDialog } from "../../components/monitoring";
import {
  formatIndonesianDate,
  formatIndonesianTime,
  formatWeightKg,
  SOURCE_LABELS,
} from "../../lib/monitoring-api";
import {
  useArchiveMonitoring,
  useMonitoringDetail,
} from "../../lib/monitoring-queries";

export default function MonitoringDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading, isError, refetch } = useMonitoringDetail(id);
  const archiveMutation = useArchiveMonitoring();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveError, setArchiveError] = useState<string>("");

  const handleArchive = async () => {
    if (!id) return;
    setArchiveError("");
    try {
      await archiveMutation.mutateAsync(id);
      setShowArchiveDialog(false);
      router.back();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal mengarsipkan catatan. Silakan coba lagi.";
      setArchiveError(message);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <AppHeader title="Detail Catatan" />
        <LoadingState />
      </ScreenContainer>
    );
  }

  if (isError || !item) {
    return (
      <ScreenContainer>
        <AppHeader title="Detail Catatan" />
        <ErrorState
          message="Terdapat masalah saat memuat data."
          retryTitle="Coba Lagi"
          onRetry={() => refetch()}
        />
        <AppButton title="Kembali" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  const sourceLabel = SOURCE_LABELS[item.source] ?? item.source;
  const weightStr =
    item.weightKg !== null && item.weightKg !== undefined
      ? formatWeightKg(item.weightKg)
      : "-";
  const bpStr =
    item.systolicBp !== null &&
    item.systolicBp !== undefined &&
    item.diastolicBp !== null &&
    item.diastolicBp !== undefined
      ? `${item.systolicBp}/${item.diastolicBp} mmHg`
      : "-";

  return (
    <ScreenContainer>
      <AppHeader
        title="Detail Catatan"
        subtitle={`Pengukuran pada ${formatIndonesianDate(item.recordedAt)}`}
      />

      {Boolean(archiveError) && (
        <Text accessibilityRole="alert" style={s.errorBox}>
          {archiveError}
        </Text>
      )}

      <AppCard>
        <View style={s.row}>
          <Text style={s.label}>Tanggal Pengukuran</Text>
          <Text style={s.value}>{formatIndonesianDate(item.recordedAt)}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Waktu Pengukuran</Text>
          <Text style={s.value}>{formatIndonesianTime(item.recordedAt)}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Sumber Pengukuran</Text>
          <View style={s.sourceBadge}>
            <Text style={s.sourceBadgeText}>{sourceLabel}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.row}>
          <Text style={s.label}>Berat Badan</Text>
          <Text style={s.valueBold}>{weightStr}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Tekanan Darah</Text>
          <Text style={s.valueBold}>{bpStr}</Text>
        </View>

        <View style={s.divider} />

        <View style={s.notesContainer}>
          <Text style={s.label}>Catatan</Text>
          <Text style={s.notesText}>{item.notes || "-"}</Text>
        </View>
      </AppCard>

      <View style={s.actions}>
        <AppButton
          title="Edit"
          onPress={() =>
            router.push(`/monitoring/${item.publicId}/edit` as Href)
          }
        />
        <AppButton
          title="Arsipkan"
          onPress={() => setShowArchiveDialog(true)}
        />
        <AppButton title="Kembali" onPress={() => router.back()} />
      </View>

      <ConfirmDialog
        visible={showArchiveDialog}
        title="Arsipkan catatan?"
        message="Catatan ini tidak akan tampil lagi dalam riwayat aktif."
        confirmLabel="Arsipkan"
        cancelLabel="Batal"
        loading={archiveMutation.isPending}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveDialog(false)}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: 14,
    color: colors.neutral,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  valueBold: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "#DDF3EC",
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginVertical: spacing.xs,
  },
  notesContainer: {
    gap: 4,
    paddingVertical: spacing.xs,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorBox: {
    color: colors.emergency,
    backgroundColor: "#FFF0EF",
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: 14,
  },
});
