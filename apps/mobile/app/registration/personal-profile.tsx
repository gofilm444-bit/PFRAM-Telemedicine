import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motherProfileFieldsSchema } from "@pfram/validation";
import type { z } from "zod";
import { router } from "expo-router";
import {
  AppButton,
  AppCard,
  AppHeader,
  AppTextInput,
  ChoiceSelect,
  ErrorState,
  ScreenContainer,
  StatusBadge,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { registrationDraft } from "../../lib/registration-draft";

const personalStepSchema = motherProfileFieldsSchema.omit({
  primaryFacilityPublicId: true,
});
type Values = z.input<typeof personalStepSchema>;
type Region = { publicId: string; name: string };
type Page<T> = { items: T[] };
export default function PersonalProfile() {
  const { request, user } = useAuth();
  const [error, setError] = useState("");
  const [regions, setRegions] = useState<Record<string, Region[]>>({});
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(personalStepSchema),
    defaultValues: { fullName: user?.displayName ?? "" },
  });
  const province = watch("provincePublicId");
  const regency = watch("regencyPublicId");
  const district = watch("districtPublicId");
  useEffect(() => {
    request<Page<Region>>("/reference/regions?level=PROVINCE&limit=100")
      .then((v) => setRegions((r) => ({ ...r, province: v.items })))
      .catch(() =>
        setError("Wilayah tidak dapat dimuat. Periksa koneksi dan coba lagi."),
      );
  }, [request]);
  useEffect(() => {
    if (!province) return;
    setValue("regencyPublicId", "");
    setValue("districtPublicId", "");
    setValue("villagePublicId", undefined);
    request<Region[]>(`/reference/regions/${province}/children`)
      .then((v) => setRegions((r) => ({ ...r, regency: v })))
      .catch(() => setError("Kabupaten/kota gagal dimuat."));
  }, [province, request, setValue]);
  useEffect(() => {
    if (!regency) return;
    setValue("districtPublicId", "");
    setValue("villagePublicId", undefined);
    request<Region[]>(`/reference/regions/${regency}/children`)
      .then((v) => setRegions((r) => ({ ...r, district: v })))
      .catch(() => setError("Kecamatan gagal dimuat."));
  }, [regency, request, setValue]);
  useEffect(() => {
    if (!district) return;
    setValue("villagePublicId", undefined);
    request<Region[]>(`/reference/regions/${district}/children`)
      .then((v) => setRegions((r) => ({ ...r, village: v })))
      .catch(() => setError("Kelurahan/desa gagal dimuat."));
  }, [district, request, setValue]);
  return (
    <ScreenContainer>
      <AppHeader
        title="Profil pribadi"
        subtitle="Langkah 1 dari 3 · Progres dapat dilanjutkan setelah login kembali."
      />
      <StatusBadge label="Data pribadi" />
      {error && <ErrorState message={error} />}
      <AppCard>
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <AppTextInput
              label="Nama lengkap"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="preferredName"
          render={({ field }) => (
            <AppTextInput
              label="Nama panggilan"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={errors.preferredName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="dateOfBirth"
          render={({ field }) => (
            <AppTextInput
              label="Tanggal lahir (YYYY-MM-DD)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="1995-05-15"
              error={errors.dateOfBirth?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <AppTextInput
              label="Alamat"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              multiline
              error={errors.address?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="provincePublicId"
          render={({ field }) => (
            <ChoiceSelect
              label="Provinsi"
              value={field.value}
              onChange={field.onChange}
              options={(regions.province ?? []).map((v) => ({
                label: v.name,
                value: v.publicId,
              }))}
              error={errors.provincePublicId?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="regencyPublicId"
          render={({ field }) => (
            <ChoiceSelect
              label="Kabupaten/Kota"
              value={field.value}
              onChange={field.onChange}
              options={(regions.regency ?? []).map((v) => ({
                label: v.name,
                value: v.publicId,
              }))}
              error={errors.regencyPublicId?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="districtPublicId"
          render={({ field }) => (
            <ChoiceSelect
              label="Kecamatan"
              value={field.value}
              onChange={field.onChange}
              options={(regions.district ?? []).map((v) => ({
                label: v.name,
                value: v.publicId,
              }))}
              error={errors.districtPublicId?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="villagePublicId"
          render={({ field }) => (
            <ChoiceSelect
              label="Kelurahan/Desa (opsional)"
              value={field.value}
              onChange={field.onChange}
              options={(regions.village ?? []).map((v) => ({
                label: v.name,
                value: v.publicId,
              }))}
              error={errors.villagePublicId?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="familyContactName"
          render={({ field }) => (
            <AppTextInput
              label="Nama kontak keluarga"
              value={field.value ?? ""}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="familyContactPhone"
          render={({ field }) => (
            <AppTextInput
              label="Nomor kontak keluarga"
              keyboardType="phone-pad"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={errors.familyContactPhone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="emergencyContactName"
          render={({ field }) => (
            <AppTextInput
              label="Nama kontak darurat"
              value={field.value ?? ""}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="emergencyContactPhone"
          render={({ field }) => (
            <AppTextInput
              label="Nomor kontak darurat"
              keyboardType="phone-pad"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={errors.emergencyContactPhone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="emergencyContactRelationship"
          render={({ field }) => (
            <AppTextInput
              label="Hubungan kontak darurat"
              value={field.value ?? ""}
              onChangeText={field.onChange}
            />
          )}
        />
        <AppButton
          title={isSubmitting ? "Memeriksa…" : "Lanjut pilih fasilitas"}
          disabled={isSubmitting}
          onPress={() =>
            void handleSubmit(async (values) => {
              setError("");
              try {
                const facilities = await request<Page<{ publicId: string }>>(
                  `/reference/facilities?district=${values.districtPublicId}&limit=1`,
                );
                if (!facilities.items.length)
                  throw new Error(
                    "Belum ada fasilitas aktif pada kecamatan yang dipilih.",
                  );
                registrationDraft.setPersonal(values);
                router.push("/registration/facility");
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Data belum dapat dilanjutkan",
                );
              }
            })()
          }
        />
      </AppCard>
    </ScreenContainer>
  );
}
