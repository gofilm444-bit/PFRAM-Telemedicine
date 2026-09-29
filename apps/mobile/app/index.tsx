import { Redirect } from "expo-router";
import { LoadingState } from "../components/ui";
import { useAuth } from "../lib/auth";
import { destinationFor } from "../lib/profile-routing";
export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/onboarding" />;
  return <Redirect href={destinationFor(user)} />;
}
