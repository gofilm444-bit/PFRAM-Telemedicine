import { AppHeader, EmptyState, ScreenContainer } from "../../components/ui";
export default function Monitoring() {
  return (
    <ScreenContainer>
      <AppHeader
        title="Pantau"
        subtitle="Modul pemantauan masih dalam tahap pengembangan."
      />
      <EmptyState message="Belum ada fitur pemantauan aktif." />
    </ScreenContainer>
  );
}
