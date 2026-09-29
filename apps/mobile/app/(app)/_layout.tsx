import { Redirect, Tabs } from "expo-router";
import { colors } from "@pfram/design-tokens";
import { LoadingState } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { destinationFor } from "../../lib/profile-routing";
export default function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/auth/welcome" />;
  const destination = destinationFor(user);
  if (destination !== "/(app)/home") return <Redirect href={destination} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Beranda" }} />
      <Tabs.Screen name="monitoring" options={{ title: "Pantau" }} />
      <Tabs.Screen name="education" options={{ title: "Edukasi" }} />
      <Tabs.Screen name="history" options={{ title: "Riwayat" }} />
      <Tabs.Screen name="account" options={{ title: "Akun" }} />
    </Tabs>
  );
}
