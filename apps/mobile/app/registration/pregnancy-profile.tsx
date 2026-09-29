import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pregnancySchema } from "@pfram/validation";
import type { z } from "zod";
import { router } from "expo-router";
import {
  AppButton,
  AppCard,
  AppHeader,
  AppTextInput,
  ChoiceSelect,
  ConsentCheckbox,
  ErrorState,
  ScreenContainer,
  StatusBadge,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";

type Values = z.input<typeof pregnancySchema>;
const yesNo = [
  { label: "Ya", value: "true" },
  { label: "Tidak", value: "false" },
];
export default function PregnancyProfile() {
  const { request, refreshProfile } = useAuth();
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(pregnancySchema),
    defaultValues: {
      gestationalAgeSource: "LMP",
      pregnancyType: "UNKNOWN",
      previousPregnancyCount: 0,
      previousDeliveryCount: 0,
      miscarriageCount: 0,
      previousCesarean: false,
      hypertensionHistory: false,
      preeclampsiaHistory: false,
      diabetesHistory: false,
      heartDiseaseHistory: false,
      kidneyDiseaseHistory: false,
    },
  });
  const source = watch("gestationalAgeSource");
  return (
    <ScreenContainer>
      <AppHeader
        title="Profil kehamilan"
        subtitle="Langkah 3 dari 3 · Data ini bukan diagnosis dan dapat dikoreksi setelah pemeriksaan."
      />
      <StatusBadge label="Kehamilan aktif" />
      {error && <ErrorState message={error} />}
      <AppCard>
        <Controller
          control={control}
          name="gestationalAgeSource"
          render={({ field }) => (
            <ChoiceSelect
              label="Apakah HPHT diketahui?"
              value={field.value}
              onChange={field.onChange}
              options={[
                { label: "HPHT diketahui", value: "LMP" },
                {
                  label: "HPHT tidak diketahui · penilaian tenaga kesehatan",
                  value: "HEALTH_WORKER_ASSESSMENT",
                },
              ]}
              error={errors.gestationalAgeSource?.message}
            />
          )}
        />
        {source === "LMP" ? (
          <Controller
            control={control}
            name="lastMenstrualPeriod"
            render={({ field }) => (
              <AppTextInput
                label="Hari pertama haid terakhir (YYYY-MM-DD)"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                error={errors.lastMenstrualPeriod?.message}
              />
            )}
          />
        ) : (
          <>
            <Controller
              control={control}
              name="assessmentDate"
              render={({ field }) => (
                <AppTextInput
                  label="Tanggal penilaian tenaga kesehatan"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  error={errors.assessmentDate?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="initialGestationalAgeWeeks"
              render={({ field }) => (
                <AppTextInput
                  label="Usia kehamilan awal (minggu)"
                  keyboardType="number-pad"
                  value={field.value === undefined ? "" : String(field.value)}
                  onChangeText={field.onChange}
                  error={errors.initialGestationalAgeWeeks?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="initialGestationalAgeDays"
              render={({ field }) => (
                <AppTextInput
                  label="Tambahan hari (0-6)"
                  keyboardType="number-pad"
                  value={field.value === undefined ? "" : String(field.value)}
                  onChangeText={field.onChange}
                  error={errors.initialGestationalAgeDays?.message}
                />
              )}
            />
          </>
        )}
        <Controller
          control={control}
          name="pregnancyType"
          render={({ field }) => (
            <ChoiceSelect
              label="Jenis kehamilan"
              value={field.value}
              onChange={field.onChange}
              options={[
                { label: "Tunggal", value: "SINGLETON" },
                { label: "Kembar", value: "MULTIPLE" },
                { label: "Tidak tahu", value: "UNKNOWN" },
              ]}
            />
          )}
        />
        <Controller
          control={control}
          name="previousPregnancyCount"
          render={({ field }) => (
            <AppTextInput
              label="Jumlah kehamilan sebelumnya"
              keyboardType="number-pad"
              value={String(field.value ?? 0)}
              onChangeText={field.onChange}
              error={errors.previousPregnancyCount?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="previousDeliveryCount"
          render={({ field }) => (
            <AppTextInput
              label="Jumlah persalinan sebelumnya"
              keyboardType="number-pad"
              value={String(field.value ?? 0)}
              onChangeText={field.onChange}
              error={errors.previousDeliveryCount?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="miscarriageCount"
          render={({ field }) => (
            <AppTextInput
              label="Jumlah keguguran"
              keyboardType="number-pad"
              value={String(field.value ?? 0)}
              onChangeText={field.onChange}
              error={errors.miscarriageCount?.message}
            />
          )}
        />
        {(
          [
            "previousCesarean",
            "hypertensionHistory",
            "preeclampsiaHistory",
            "diabetesHistory",
            "heartDiseaseHistory",
            "kidneyDiseaseHistory",
          ] as const
        ).map((name, i) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field }) => (
              <ChoiceSelect
                label={
                  [
                    "Riwayat operasi sesar",
                    "Riwayat hipertensi yang dilaporkan",
                    "Riwayat preeklampsia yang dilaporkan",
                    "Riwayat diabetes yang dilaporkan",
                    "Riwayat penyakit jantung yang dilaporkan",
                    "Riwayat penyakit ginjal yang dilaporkan",
                  ][i] ?? name
                }
                value={String(field.value)}
                onChange={(v) => field.onChange(v === "true")}
                options={yesNo}
              />
            )}
          />
        ))}
        <Controller
          control={control}
          name="otherDiseaseHistory"
          render={({ field }) => (
            <AppTextInput
              label="Riwayat lain yang ingin disampaikan (opsional)"
              multiline
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={errors.otherDiseaseHistory?.message}
            />
          )}
        />
        <ConsentCheckbox
          checked={consent}
          onPress={() => setConsent((v) => !v)}
          label="Saya memahami data ini dapat diperbarui setelah pemeriksaan tenaga kesehatan dan aplikasi tidak memberikan diagnosis."
        />
        <AppButton
          title={isSubmitting ? "Menyimpan…" : "Simpan profil kehamilan"}
          disabled={!consent || isSubmitting}
          onPress={() =>
            void handleSubmit(async (values) => {
              setError("");
              try {
                await request("/mother/pregnancies", {
                  method: "POST",
                  body: JSON.stringify(values),
                });
                await refreshProfile();
                router.replace("/(app)/home");
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Profil kehamilan gagal disimpan",
                );
              }
            })()
          }
        />
      </AppCard>
    </ScreenContainer>
  );
}
