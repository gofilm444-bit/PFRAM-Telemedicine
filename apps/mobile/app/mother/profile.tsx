import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  AppButton,
  AppCard,
  AppHeader,
  ErrorState,
  LoadingState,
  ScreenContainer,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { router } from "expo-router";
type Profile = {
  fullName: string;
  preferredName: string | null;
  dateOfBirth: string | null;
  address: string | null;
  province: { name: string } | null;
  regency: { name: string } | null;
  district: { name: string } | null;
  village: { name: string } | null;
  primaryFacility: { name: string } | null;
  profileCompleted: boolean;
};
export default function ProfilePage() {
  const { request } = useAuth();
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    request<Profile>("/mother/profile")
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Gagal memuat profil"),
      );
  }, [request]);
  return (
    <ScreenContainer>
      <AppHeader title="Profil Ibu" />
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingState />
      ) : (
        <AppCard>
          <Text>Nama: {data.fullName}</Text>
          <Text>Nama panggilan: {data.preferredName ?? "-"}</Text>
          <Text>Tanggal lahir: {data.dateOfBirth ?? "-"}</Text>
          <Text>Alamat: {data.address ?? "-"}</Text>
          <Text>
            Wilayah:{" "}
            {[
              data.village?.name,
              data.district?.name,
              data.regency?.name,
              data.province?.name,
            ]
              .filter(Boolean)
              .join(", ")}
          </Text>
          <Text>Fasilitas: {data.primaryFacility?.name ?? "-"}</Text>
        </AppCard>
      )}
      <AppButton
        title="Perbarui profil"
        onPress={() => router.push("/registration/personal-profile")}
      />
      <AppButton title="Kembali" onPress={() => router.back()} />
    </ScreenContainer>
  );
}
