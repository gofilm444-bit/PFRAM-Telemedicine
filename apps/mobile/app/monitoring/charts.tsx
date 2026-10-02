import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { spacing } from "@pfram/design-tokens";
import type { MonitoringPeriodFilter } from "@pfram/shared-types";
import {
  AppButton,
  AppHeader,
  ErrorState,
  LoadingState,
  ScreenContainer,
} from "../../components/ui";
import {
  BloodPressureLineChart,
  PeriodFilterBar,
  WeightLineChart,
} from "../../components/monitoring-charts";
import { useAuth } from "../../lib/auth";
import { useMonitoringChartData } from "../../lib/monitoring-queries";

export default function MonitoringChartsScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<MonitoringPeriodFilter>("7_days");

  const {
    isLoading,
    isError,
    refetch,
    weightPoints,
    bpPoints,
  } = useMonitoringChartData(period, user?.activePregnancy);

  return (
    <ScreenContainer>
      <AppHeader
        title="Perkembangan Pemantauan"
        subtitle="Grafik pemantauan fisik selama kehamilan"
      />

      {/* Filter Periode */}
      <PeriodFilterBar selected={period} onSelect={setPeriod} />

      {/* Loading & Error States */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message="Terdapat masalah saat memuat grafik."
          retryTitle="Coba Lagi"
          onRetry={() => refetch()}
        />
      ) : (
        <View style={s.chartsContainer}>
          {/* Grafik Berat Badan */}
          <WeightLineChart points={weightPoints} />

          {/* Grafik Tekanan Darah */}
          <BloodPressureLineChart points={bpPoints} />
        </View>
      )}

      {/* Footer Navigation */}
      <View style={s.footerActions}>
        <AppButton
          title="+ Tambah Catatan"
          onPress={() => router.push("/monitoring/new")}
        />
        <AppButton title="Kembali" onPress={() => router.back()} />
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  chartsContainer: {
    gap: spacing.sm,
  },
  footerActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
