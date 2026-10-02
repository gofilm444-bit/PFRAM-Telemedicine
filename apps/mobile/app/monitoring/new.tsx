import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { spacing } from "@pfram/design-tokens";
import type { MonitoringSource } from "@pfram/shared-types";
import {
  AppButton,
  AppHeader,
  ScreenContainer,
} from "../../components/ui";
import { MonitoringForm } from "../../components/monitoring";
import { useCreateMonitoring } from "../../lib/monitoring-queries";

export default function NewMonitoringScreen() {
  const createMutation = useCreateMonitoring();
  const [serverError, setServerError] = useState<string>("");

  const handleSubmit = async (data: {
    recordedAt: string;
    source: MonitoringSource;
    weightKg?: number | null;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    notes?: string | null;
  }) => {
    setServerError("");
    try {
      await createMutation.mutateAsync({
        recordedAt: data.recordedAt,
        source: data.source,
        weightKg: data.weightKg ?? undefined,
        systolicBp: data.systolicBp ?? undefined,
        diastolicBp: data.diastolicBp ?? undefined,
        notes: data.notes ?? undefined,
      });
      router.back();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menyimpan catatan pemantauan. Silakan coba lagi.";
      setServerError(message);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader
        title="Tambah Catatan"
        subtitle="Catat berat badan dan/atau tekanan darah"
      />

      <MonitoringForm
        onSubmit={handleSubmit}
        loading={createMutation.isPending}
        serverError={serverError}
      />

      <View style={s.footer}>
        <AppButton title="Kembali" onPress={() => router.back()} />
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  footer: {
    marginTop: spacing.md,
  },
});
