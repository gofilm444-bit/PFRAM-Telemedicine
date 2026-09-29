import { Text } from "react-native";
import { router } from "expo-router";
import {
  AppButton,
  AppCard,
  AppHeader,
  ScreenContainer,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
export default function Account() {
  const { user, logout } = useAuth();
  return (
    <ScreenContainer>
      <AppHeader title="Akun" />
      <AppCard>
        <Text>Nama: {user?.displayName}</Text>
        <Text>Nomor HP: {user?.phoneNumber}</Text>
        <Text>Status: {user?.status}</Text>
      </AppCard>
      <AppButton
        title="Profil pribadi"
        onPress={() => router.push("/mother/profile")}
      />
      <AppButton
        title="Profil kehamilan"
        onPress={() => router.push("/mother/pregnancy")}
      />
      <AppButton
        title="Bidan pendamping dan fasilitas"
        onPress={() => router.push("/mother/care-team")}
      />
      <AppButton
        title="Keluar"
        onPress={async () => {
          await logout();
          router.replace("/auth/welcome");
        }}
      />
    </ScreenContainer>
  );
}
