import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { spacing } from "@pfram/design-tokens";
import type { MonitoringSource } from "@pfram/shared-types";
import {
  AppButton,
  AppHeader,
  ErrorState,
  LoadingState,
  ScreenContainer,
} from "../../../components/ui";
import { MonitoringForm } from "../../../components/monitoring";
import {
  useMonitoringDetail,
  useUpdateMonitoring,
} from "../../../lib/monitoring-queries";

export default function EditMonitoringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading, isError, refetch } = useMonitoringDetail(id);
  const updateMutation = useUpdateMonitoring();
  const [serverError, setServerError] = useState<string>("");

  if (isLoading) {
    return (
      <ScreenContainer>
        <AppHeader title="Edit Catatan" />
        <LoadingState />
      </ScreenContainer>
    );
  }

  if (isError || !item) {
    return (
      <ScreenContainer>
        <AppHeader title="Edit Catatan" />
        <ErrorState
          message="Terdapat masalah saat memuat data."
          retryTitle="Coba Lagi"
          onRetry={() => refetch()}
        />
        <AppButton title="Kembali" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  const initialValues = {
    recordedAt: item.recordedAt ? item.recordedAt.slice(0, 16) : "",
    source: item.source,
    weightKg:
      item.weightKg !== null && item.weightKg !== undefined
        ? String(item.weightKg).replace(".", ",")
        : "",
    systolicBp:
      item.systolicBp !== null && item.systolicBp !== undefined
        ? String(item.systolicBp)
        : "",
    diastolicBp:
      item.diastolicBp !== null && item.diastolicBp !== undefined
        ? String(item.diastolicBp)
        : "",
    notes: item.notes ?? "",
  };

  const handleSubmit = async (data: {
    recordedAt: string;
    source: MonitoringSource;
    weightKg?: number | null;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    notes?: string | null;
  }) => {
    if (!id) return;
    setServerError("");
    try {
      await updateMutation.mutateAsync({
        publicId: id,
        input: {
          recordedAt: data.recordedAt,
          source: data.source,
          weightKg: data.weightKg,
          systolicBp: data.systolicBp,
          diastolicBp: data.diastolicBp,
          notes: data.notes,
        },
      });
      router.back();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal memperbarui catatan. Silakan coba lagi.";
      setServerError(message);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader
        title="Edit Catatan"
        subtitle="Perbarui data pemantauan fisik"
      />

      <MonitoringForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isEdit
        loading={updateMutation.isPending}
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
