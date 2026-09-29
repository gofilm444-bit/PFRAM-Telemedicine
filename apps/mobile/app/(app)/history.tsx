import { AppHeader, EmptyState, ScreenContainer } from "../../components/ui";
export default function History() {
  return (
    <ScreenContainer>
      <AppHeader
        title="Riwayat"
        subtitle="Riwayat pemantauan belum tersedia."
      />
      <EmptyState />
    </ScreenContainer>
  );
}
