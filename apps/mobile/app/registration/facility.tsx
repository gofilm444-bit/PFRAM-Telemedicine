import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  AppButton,
  AppCard,
  AppHeader,
  ChoiceSelect,
  ErrorState,
  LoadingState,
  ScreenContainer,
  StatusBadge,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { registrationDraft } from "../../lib/registration-draft";

type Facility = {
  publicId: string;
  name: string;
  type: string;
  address: string;
  phoneNumber: string | null;
};
export default function FacilityPage() {
  const { request, refreshProfile } = useAuth();
  const draft = registrationDraft.getPersonal();
  const [items, setItems] = useState<Facility[] | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!draft) return;
    request<{ items: Facility[] }>(
      `/reference/facilities?district=${draft.districtPublicId}&limit=100`,
    )
      .then((v) => setItems(v.items))
      .catch(() => setError("Fasilitas gagal dimuat. Coba lagi."));
  }, [draft, request]);
  if (!draft)
    return (
      <ScreenContainer>
        <AppHeader title="Pilih fasilitas" />
        <ErrorState message="Data profil belum tersedia. Kembali dan lengkapi profil pribadi." />
        <AppButton
          title="Kembali ke profil pribadi"
          onPress={() => router.replace("/registration/personal-profile")}
        />
      </ScreenContainer>
    );
  return (
    <ScreenContainer>
      <AppHeader
        title="Fasilitas kesehatan"
        subtitle="Langkah 2 dari 3 · Pilih fasilitas aktif di wilayah Anda."
      />
      <StatusBadge label="Fasilitas utama" />
      {error && <ErrorState message={error} />}
      {!items ? (
        <LoadingState />
      ) : (
        <AppCard>
          <ChoiceSelect
            label="Pilih fasilitas"
            value={selected}
            onChange={setSelected}
            options={items.map((v) => ({
              value: v.publicId,
              label: `${v.name} · ${v.type}`,
            }))}
          />
          {selected && (
            <>
              {items
                .filter((v) => v.publicId === selected)
                .map((v) => (
                  <AppCard key={v.publicId}>
                    <AppHeader title={v.name} subtitle={v.address} />
                  </AppCard>
                ))}
            </>
          )}
          <AppButton
            title={saving ? "Menyimpan…" : "Simpan dan lanjut"}
            disabled={!selected || saving}
            onPress={() =>
              void (async () => {
                setSaving(true);
                setError("");
                try {
                  await request("/mother/profile", {
                    method: "PUT",
                    body: JSON.stringify({
                      ...draft,
                      primaryFacilityPublicId: selected,
                    }),
                  });
                  registrationDraft.clear();
                  await refreshProfile();
                  router.replace("/registration/pregnancy-profile");
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Profil gagal disimpan",
                  );
                } finally {
                  setSaving(false);
                }
              })()
            }
          />
        </AppCard>
      )}
    </ScreenContainer>
  );
}
