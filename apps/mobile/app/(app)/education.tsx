import { AppHeader, EmptyState, ScreenContainer } from "../../components/ui";
export default function Education() {
  return (
    <ScreenContainer>
      <AppHeader
        title="Edukasi"
        subtitle="Konten akan ditinjau tenaga kesehatan pada fase berikutnya."
      />
      <EmptyState message="Belum ada materi edukasi." />
    </ScreenContainer>
  );
}
