import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pregnancySchema } from "@pfram/validation";
import type { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { onboardingDraft } from "../onboarding-draft";
import { MotherAppShell } from "../MotherAppShell";
import { Button, Card, ErrorState, Input, StatusBadge } from "../../components";

type Values = z.input<typeof pregnancySchema>;

export function MotherPregnancyProfilePage() {
  const { request, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(pregnancySchema),
    defaultValues: {
      gestationalAgeSource: "LMP",
      lastMenstrualPeriod: "",
      pregnancyType: "SINGLETON",
      previousPregnancyCount: 0,
      previousDeliveryCount: 0,
      miscarriageCount: 0,
      previousCesarean: false,
      hypertensionHistory: false,
      preeclampsiaHistory: false,
      diabetesHistory: false,
      heartDiseaseHistory: false,
      kidneyDiseaseHistory: false,
      otherDiseaseHistory: "",
      additionalNotes: "",
    },
  });

  const source = watch("gestationalAgeSource");

  const onSubmit = async (values: Values) => {
    if (!agreeTerms) {
      setError("Harap centang persetujuan informasi kehamilan.");
      return;
    }
    setError("");
    try {
      await request("/mother/pregnancies", {
        method: "POST",
        body: JSON.stringify(values),
      });
      onboardingDraft.clear();
      await refreshProfile();
      navigate("/m/home");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Gagal menyimpan data kehamilan. Periksa kembali isian.",
      );
    }
  };

  return (
    <MotherAppShell
      title="Data Kehamilan"
      subtitle="Langkah 3 dari 3 · Profil Klinis"
      showBack
      onBack={() => navigate("/m/onboarding/facility")}
      hideBottomNav
      actions={
        <StatusBadge variant="info" size="sm">
          Langkah 3/3
        </StatusBadge>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <ErrorState message={error} />}

        {/* Gestational Age Calculation Source */}
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Perkiraan Usia Kehamilan
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pilih metode perhitungan usia kehamilan berdasarkan data yang paling pasti.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label
              className={`flex cursor-pointer flex-col rounded-xl border p-3 text-center transition-all ${
                source === "LMP"
                  ? "border-pfram-primary bg-emerald-50/60 ring-2 ring-pfram-primary/20"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                value="LMP"
                {...register("gestationalAgeSource")}
                className="sr-only"
              />
              <span className="text-xs font-bold text-slate-900">
                HPHT (Haid Terakhir)
              </span>
              <span className="mt-0.5 text-[11px] text-slate-500">
                Ingat hari pertama haid terakhir
              </span>
            </label>

            <label
              className={`flex cursor-pointer flex-col rounded-xl border p-3 text-center transition-all ${
                source === "HEALTH_WORKER_ASSESSMENT"
                  ? "border-pfram-primary bg-emerald-50/60 ring-2 ring-pfram-primary/20"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                value="HEALTH_WORKER_ASSESSMENT"
                {...register("gestationalAgeSource")}
                className="sr-only"
              />
              <span className="text-xs font-bold text-slate-900">
                Penilaian Nakes / USG
              </span>
              <span className="mt-0.5 text-[11px] text-slate-500">
                Ditentukan oleh Bidan/Dokter
              </span>
            </label>
          </div>

          {source === "LMP" ? (
            <Input
              id="lastMenstrualPeriod"
              type="date"
              label="Hari Pertama Haid Terakhir (HPHT) *"
              error={errors.lastMenstrualPeriod?.message}
              {...register("lastMenstrualPeriod")}
            />
          ) : (
            <div className="space-y-3">
              <Input
                id="assessmentDate"
                type="date"
                label="Tanggal Pemeriksaan Nakes *"
                error={errors.assessmentDate?.message}
                {...register("assessmentDate")}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="initialGestationalAgeWeeks"
                  type="number"
                  label="Minggu *"
                  placeholder="0 - 45"
                  error={errors.initialGestationalAgeWeeks?.message}
                  {...register("initialGestationalAgeWeeks")}
                />
                <Input
                  id="initialGestationalAgeDays"
                  type="number"
                  label="Hari *"
                  placeholder="0 - 6"
                  error={errors.initialGestationalAgeDays?.message}
                  {...register("initialGestationalAgeDays")}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Obstetric History */}
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Riwayat Obstetri (Kehamilan Terdahulu)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Status Gravida, Para, Abortus (GPA) untuk menentukan rencana asuhan.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Input
              id="previousPregnancyCount"
              type="number"
              label="Hamil Ke- *"
              error={errors.previousPregnancyCount?.message}
              {...register("previousPregnancyCount")}
            />
            <Input
              id="previousDeliveryCount"
              type="number"
              label="Persalinan *"
              error={errors.previousDeliveryCount?.message}
              {...register("previousDeliveryCount")}
            />
            <Input
              id="miscarriageCount"
              type="number"
              label="Keguguran *"
              error={errors.miscarriageCount?.message}
              {...register("miscarriageCount")}
            />
          </div>

          <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-700">
            <input
              type="checkbox"
              {...register("previousCesarean")}
              className="h-4 w-4 rounded border-slate-300 text-pfram-primary focus:ring-pfram-primary"
            />
            <span>Pernah menjalani operasi sesar (Sectio Caesarea) sebelumnya</span>
          </label>
        </Card>

        {/* Medical History */}
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-3">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Riwayat Penyakit Penyerta
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Centang jika memiliki riwayat penyakit berikut sebelum atau saat kehamilan.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { id: "hypertensionHistory", label: "Hipertensi (Tekanan Darah Tinggi)" },
              { id: "preeclampsiaHistory", label: "Riwayat Preeklampsia / Kejang Kehamilan" },
              { id: "diabetesHistory", label: "Diabetes Melitus (Kencing Manis)" },
              { id: "heartDiseaseHistory", label: "Penyakit Jantung" },
              { id: "kidneyDiseaseHistory", label: "Penyakit Ginjal" },
            ].map((d) => (
              <label key={d.id} className="flex items-center gap-2.5 text-xs text-slate-700">
                <input
                  type="checkbox"
                  {...register(d.id as keyof Values)}
                  className="h-4 w-4 rounded border-slate-300 text-pfram-primary focus:ring-pfram-primary"
                />
                <span>{d.label}</span>
              </label>
            ))}
          </div>

          <div className="pt-2">
            <Input
              id="otherDiseaseHistory"
              label="Penyakit Lain / Alergi (Opsional)"
              placeholder="Asma, alergi obat, tiroid, dll."
              error={errors.otherDiseaseHistory?.message}
              {...register("otherDiseaseHistory")}
            />
          </div>
        </Card>

        {/* Consent and Submit */}
        <Card className="border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
          <label className="flex items-start gap-2.5 text-xs text-emerald-950">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-pfram-primary focus:ring-pfram-primary"
            />
            <span>
              Saya menyatakan bahwa data profil dan riwayat kehamilan yang diisi adalah benar, serta bersedia memantau kondisi kehamilan bersama tenaga kesehatan terhubung.
            </span>
          </label>
        </Card>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={!agreeTerms || isSubmitting}
            className="w-full min-h-12 text-sm font-bold shadow-md shadow-emerald-900/10"
          >
            {isSubmitting ? "Menyimpan Data Kehamilan…" : "Selesaikan & Buka Aplikasi"}
          </Button>
        </div>
      </form>
    </MotherAppShell>
  );
}
