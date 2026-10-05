import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { onboardingDraft } from "../onboarding-draft";
import { MotherAppShell } from "../MotherAppShell";
import { Button, Card, ErrorState, StatusBadge } from "../../components";

interface Facility {
  publicId: string;
  name: string;
  type: string;
  address: string;
  phoneNumber?: string | null | undefined;
}

export function MotherFacilityPage() {
  const { request, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const draft = onboardingDraft.getPersonal();

  const [facilities, setFacilities] = useState<Facility[] | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draft) return;
    setLoading(true);
    request<{ items: Facility[] }>(
      `/reference/facilities?district=${draft.districtPublicId}&limit=100`,
    )
      .then((res) => {
        setFacilities(res.items);
        if (res.items.length === 1 && res.items[0]) {
          setSelectedFacilityId(res.items[0].publicId);
        }
      })
      .catch(() => {
        setError("Daftar fasilitas kesehatan gagal dimuat. Periksa koneksi.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [draft, request]);

  if (!draft) {
    return (
      <MotherAppShell
        title="Pilih Fasilitas"
        subtitle="Langkah 2 dari 3 · Fasilitas Kesehatan"
        hideBottomNav
      >
        <Card className="border border-slate-200/90 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/60">
            ⚠️
          </div>
          <h2 className="mt-3 text-base font-bold text-slate-900">
            Data Profil Belum Tersedia
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Silakan lengkapi data profil pribadi terlebih dahulu sebelum memilih fasilitas.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              onClick={() => navigate("/m/onboarding/personal")}
              className="w-full"
            >
              Isi Data Pribadi
            </Button>
          </div>
        </Card>
      </MotherAppShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId) {
      setError("Pilih fasilitas pelayanan primer terdekat Anda.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await request("/mother/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...draft,
          primaryFacilityPublicId: selectedFacilityId,
        }),
      });
      await refreshProfile();
      navigate("/m/onboarding/pregnancy");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan pilihan fasilitas kesehatan.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MotherAppShell
      title="Pilih Fasilitas"
      subtitle="Langkah 2 dari 3 · Fasilitas Kesehatan"
      showBack
      onBack={() => navigate("/m/onboarding/personal")}
      hideBottomNav
      actions={
        <StatusBadge variant="info" size="sm">
          Langkah 2/3
        </StatusBadge>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorState message={error} />}

        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Fasilitas Pelayanan Primer
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Puskesmas atau klinik yang bertanggung jawab atas pemantauan kehamilan Ibu.
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
              Memuat fasilitas kesehatan sekitar domisili…
            </div>
          ) : !facilities || facilities.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Tidak ditemukan fasilitas kesehatan di kecamatan terpilih. Silakan ubah data domisili.
            </div>
          ) : (
            <div className="space-y-2.5">
              {facilities.map((fac) => {
                const isSelected = selectedFacilityId === fac.publicId;
                return (
                  <label
                    key={fac.publicId}
                    htmlFor={`facility-${fac.publicId}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-pfram-primary bg-emerald-50/60 ring-2 ring-pfram-primary/20"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <input
                      type="radio"
                      id={`facility-${fac.publicId}`}
                      name="selectedFacility"
                      value={fac.publicId}
                      checked={isSelected}
                      onChange={() => setSelectedFacilityId(fac.publicId)}
                      className="mt-1 h-4 w-4 text-pfram-primary focus:ring-pfram-primary/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {fac.name}
                        </span>
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                          {fac.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                        {fac.address}
                      </p>
                      {fac.phoneNumber && (
                        <p className="mt-1 text-[11px] font-medium text-emerald-700">
                          📞 {fac.phoneNumber}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/m/onboarding/personal")}
            className="flex-1"
          >
            Kembali
          </Button>
          <Button
            type="submit"
            disabled={!selectedFacilityId || loading || submitting}
            className="flex-1"
          >
            {submitting ? "Menyimpan…" : "Lanjut ke Data Kehamilan"}
          </Button>
        </div>
      </form>
    </MotherAppShell>
  );
}
