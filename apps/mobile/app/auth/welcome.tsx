import { router } from "expo-router";
import {
  AppButton,
  AppCard,
  AppHeader,
  ScreenContainer,
} from "../../components/ui";
export default function Welcome() {
  return (
    <ScreenContainer>
      <AppHeader
        title="Selamat datang di PFRAM"
        subtitle="Pantau Kehamilan, Lindungi Ibu dan Bayi"
      />
      <AppCard>
        <AppButton title="Masuk" onPress={() => router.push("/auth/login")} />
        <AppButton
          title="Daftar akun ibu"
          onPress={() => router.push("/auth/register")}
        />
      </AppCard>
    </ScreenContainer>
  );
}
