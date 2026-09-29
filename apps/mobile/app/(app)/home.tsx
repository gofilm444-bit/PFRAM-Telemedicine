import { Text } from "react-native";
import {
  AppButton,
  AppCard,
  AppHeader,
  ScreenContainer,
  StatusBadge,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
export default function Home() {
  const { user } = useAuth();
  return (
    <ScreenContainer>
      <AppHeader
        title={`Halo, ${user?.displayName ?? "Ibu"}`}
        subtitle="Pantau Kehamilan, Lindungi Ibu dan Bayi"
      />
      <StatusBadge label="Fondasi aktif" />
      <AppCard>
        <Text>
          Usia kehamilan:{" "}
          {user?.activePregnancy?.gestationalAge
            ? `${user.activePregnancy.gestationalAge.weeks} minggu ${user.activePregnancy.gestationalAge.days} hari`
            : "Belum tersedia"}
        </Text>
        <Text>Trimester: {user?.activePregnancy?.trimester ?? "-"}</Text>
        <Text>
          Perkiraan persalinan: {user?.activePregnancy?.estimatedDueDate ?? "-"}
        </Text>
        <Text>
          Fasilitas: {user?.selectedFacility?.name ?? "Belum dipilih"}
        </Text>
        <Text>
          Bidan pendamping:{" "}
          {user?.activeMidwifeAssignment?.midwife.fullName ??
            "Bidan pendamping belum ditetapkan"}
        </Text>
      </AppCard>
      <AppCard>
        <Text>
          Modul medis, skrining, dan tindak lanjut belum diaktifkan. Jangan
          gunakan aplikasi ini untuk diagnosis.
        </Text>
        <AppButton title="Fitur segera hadir" disabled />
      </AppCard>
    </ScreenContainer>
  );
}
