import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  AppButton,
  AppCard,
  AppHeader,
  ErrorState,
  LoadingState,
  ScreenContainer,
  StatusBadge,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { router } from "expo-router";
type Assignment = {
  publicId?: string;
  status?: string;
  message?: string;
  midwife?: { fullName: string; whatsappNumber: string | null };
  facility?: {
    name: string;
    phoneNumber: string | null;
    whatsappNumber: string | null;
  };
};
export default function CareTeamPage() {
  const { request } = useAuth();
  const [data, setData] = useState<Assignment | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    request<Assignment>("/mother/midwife-assignment")
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Gagal memuat pendamping"),
      );
  }, [request]);
  return (
    <ScreenContainer>
      <AppHeader title="Bidan dan Fasilitas" />
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingState />
      ) : (
        <AppCard>
          {data.midwife ? (
            <>
              <StatusBadge label="Bidan pendamping aktif" />
              <Text>Nama: {data.midwife.fullName}</Text>
              <Text>
                WhatsApp: {data.midwife.whatsappNumber ?? "Belum tersedia"}
              </Text>
            </>
          ) : (
            <>
              <StatusBadge label="Belum ditetapkan" />
              <Text>
                {data.message ?? "Bidan pendamping belum ditetapkan."}
              </Text>
            </>
          )}
          <Text>
            Fasilitas:{" "}
            {data.facility?.name ?? "Lihat fasilitas pada profil pribadi"}
          </Text>
          <Text>
            Kontak fasilitas:{" "}
            {data.facility?.whatsappNumber ??
              data.facility?.phoneNumber ??
              "Belum tersedia"}
          </Text>
        </AppCard>
      )}
      <AppButton title="Kembali" onPress={() => router.back()} />
    </ScreenContainer>
  );
}
