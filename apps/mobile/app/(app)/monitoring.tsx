import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@pfram/design-tokens";
import {
  AppButton,
  AppCard,
  AppHeader,
  ErrorState,
  LoadingState,
  ScreenContainer,
} from "../../components/ui";
import { MonitoringSummaryCard } from "../../components/monitoring";
import { useAuth } from "../../lib/auth";
import { useMonitoringSummary } from "../../lib/monitoring-queries";

export default function MonitoringDashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading, isError, refetch } = useMonitoringSummary();

  const pregnancy = user?.activePregnancy;
  const gestationalAgeText = pregnancy?.gestationalAge
    ? `${pregnancy.gestationalAge.weeks} minggu ${pregnancy.gestationalAge.days} hari`
    : "Belum tersedia";
  const trimesterText = pregnancy?.trimester ? `Trimester ${pregnancy.trimester}` : "-";
  const dueDateText = pregnancy?.estimatedDueDate ?? "-";

  return (
    <ScreenContainer>
      <AppHeader
        title="Pantau Kehamilan"
        subtitle="Pemantauan fisik mandiri ibu hamil"
      />

      <AppCard>
        <Text style={s.cardTitle}>Data Kehamilan</Text>
        <View style={s.pregnancyInfoRow}>
          <Text style={s.label}>Usia kehamilan:</Text>
          <Text style={s.value}>{gestationalAgeText}</Text>
        </View>
        <View style={s.pregnancyInfoRow}>
          <Text style={s.label}>Trimester:</Text>
          <Text style={s.value}>{trimesterText}</Text>
        </View>
        <View style={s.pregnancyInfoRow}>
          <Text style={s.label}>Perkiraan persalinan (HPL):</Text>
          <Text style={s.value}>{dueDateText}</Text>
        </View>
      </AppCard>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message="Terdapat masalah saat memuat data."
          retryTitle="Coba Lagi"
          onRetry={() => refetch()}
        />
      ) : (
        <MonitoringSummaryCard summary={summary} />
      )}

      <View style={s.actions}>
        <AppButton
          title="+ Tambah Catatan"
          onPress={() => router.push("/monitoring/new")}
        />
        <AppButton
          title="Riwayat Pemantauan"
          onPress={() => router.push("/monitoring/history")}
        />
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pregnancyInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
