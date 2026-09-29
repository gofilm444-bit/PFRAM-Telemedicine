import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { PregnancySummary } from "@pfram/shared-types";
import {
  AppButton,
  AppCard,
  AppHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { router } from "expo-router";
export default function PregnancyPage() {
  const { request } = useAuth();
  const [data, setData] = useState<PregnancySummary[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    request<PregnancySummary[]>("/mother/pregnancies")
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Gagal memuat kehamilan"),
      );
  }, [request]);
  return (
    <ScreenContainer>
      <AppHeader
        title="Profil Kehamilan"
        subtitle="Ringkasan, bukan diagnosis klinis."
      />
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingState />
      ) : data.length === 0 ? (
        <EmptyState message="Profil kehamilan belum tersedia." />
      ) : (
        data.map((v) => (
          <AppCard key={v.publicId}>
            <Text>Status: {v.status}</Text>
            <Text>
              Usia kehamilan:{" "}
              {v.gestationalAge
                ? `${v.gestationalAge.weeks} minggu ${v.gestationalAge.days} hari`
                : "-"}
            </Text>
            <Text>Trimester: {v.trimester ?? "-"}</Text>
            <Text>Perkiraan persalinan: {v.estimatedDueDate}</Text>
            <Text>Jenis: {v.pregnancyType}</Text>
          </AppCard>
        ))
      )}
      <AppButton title="Kembali" onPress={() => router.back()} />
    </ScreenContainer>
  );
}
