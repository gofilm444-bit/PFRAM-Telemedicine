import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motherProfileFieldsSchema, publicIdSchema } from "@pfram/validation";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { onboardingDraft } from "../onboarding-draft";
import { MotherAppShell } from "../MotherAppShell";
import { Button, Card, ErrorState, Input, Select, StatusBadge } from "../../components";

const personalStepSchema = motherProfileFieldsSchema
  .omit({
    primaryFacilityPublicId: true,
  })
  .extend({
    villagePublicId: z
      .union([z.literal(""), publicIdSchema])
      .optional()
      .transform((val) => (val ? val : undefined)),
  });

type Values = z.input<typeof personalStepSchema>;
type Region = { publicId: string; name: string };
type Page<T> = { items: T[] };

export function MotherPersonalProfilePage() {
  const { request, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [regions, setRegions] = useState<Record<string, Region[]>>({});

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(personalStepSchema),
    defaultValues: {
      fullName: user?.displayName ?? "",
      preferredName: "",
      dateOfBirth: "",
      address: "",
      provincePublicId: "",
      regencyPublicId: "",
      districtPublicId: "",
      villagePublicId: "",
      familyContactName: "",
      familyContactPhone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      ...(onboardingDraft.getPersonal() ?? {}),
    },
  });

  const province = watch("provincePublicId");
  const regency = watch("regencyPublicId");
  const district = watch("districtPublicId");

  // Load provinces on mount
  useEffect(() => {
    request<Page<Region>>("/reference/regions?level=PROVINCE&limit=100")
      .then((v) => setRegions((r) => ({ ...r, province: v.items })))
      .catch(() =>
        setError("Wilayah tidak dapat dimuat. Periksa koneksi dan coba lagi."),
      );
  }, [request]);

  // Load regencies when province changes
  useEffect(() => {
    if (!province) return;
    setValue("regencyPublicId", "");
    setValue("districtPublicId", "");
    setValue("villagePublicId", "");
    request<Region[]>(`/reference/regions/${province}/children`)
      .then((v) => setRegions((r) => ({ ...r, regency: v })))
      .catch(() => setError("Kabupaten/kota gagal dimuat."));
  }, [province, request, setValue]);

  // Load districts when regency changes
  useEffect(() => {
    if (!regency) return;
    setValue("districtPublicId", "");
    setValue("villagePublicId", "");
    request<Region[]>(`/reference/regions/${regency}/children`)
      .then((v) => setRegions((r) => ({ ...r, district: v })))
      .catch(() => setError("Kecamatan gagal dimuat."));
  }, [regency, request, setValue]);

  // Load villages when district changes
  useEffect(() => {
    if (!district) return;
    setValue("villagePublicId", "");
    request<Region[]>(`/reference/regions/${district}/children`)
      .then((v) => setRegions((r) => ({ ...r, village: v })))
      .catch(() => setError("Kelurahan/desa gagal dimuat."));
  }, [district, request, setValue]);

  const onSubmit = async (values: Values) => {
    setError("");
    try {
      const facilities = await request<Page<{ publicId: string }>>(
        `/reference/facilities?district=${values.districtPublicId}&limit=1`,
      );
      if (!facilities.items.length) {
        throw new Error(
          "Belum ada fasilitas aktif pada kecamatan yang dipilih. Silakan pilih wilayah lain.",
        );
      }
      onboardingDraft.setPersonal(values);
      navigate("/m/onboarding/facility");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Data profil belum dapat dilanjutkan.",
      );
    }
  };

  return (
    <MotherAppShell
      title="Data Pribadi"
      subtitle="Langkah 1 dari 3 · Profil Ibu"
      hideBottomNav
      actions={
        <StatusBadge variant="info" size="sm">
          Langkah 1/3
        </StatusBadge>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <ErrorState message={error} />}

        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Identitas Calon Ibu
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Isi data diri sesuai Kartu Tanda Penduduk (KTP) atau identitas resmi.
            </p>
          </div>

          <Input
            id="fullName"
            label="Nama Lengkap *"
            placeholder="Masukkan nama lengkap"
            error={errors.fullName?.message}
            {...register("fullName")}
          />

          <Input
            id="preferredName"
            label="Nama Panggilan"
            placeholder="Contoh: Ibu Rahma"
            error={errors.preferredName?.message}
            {...register("preferredName")}
          />

          <Input
            id="dateOfBirth"
            type="date"
            label="Tanggal Lahir *"
            error={errors.dateOfBirth?.message}
            {...register("dateOfBirth")}
          />

          <Input
            id="address"
            label="Alamat Domisili *"
            placeholder="Jalan, RT/RW, Dusun"
            error={errors.address?.message}
            {...register("address")}
          />
        </Card>

        {/* Region Cascade Card */}
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Wilayah Domisili
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tentukan wilayah tempat tinggal untuk menghubungkan fasilitas kesehatan terdekat.
            </p>
          </div>

          <Controller
            control={control}
            name="provincePublicId"
            render={({ field }) => (
              <Select
                id="provincePublicId"
                label="Provinsi *"
                placeholder="-- Pilih Provinsi --"
                value={field.value}
                onChange={field.onChange}
                options={(regions.province ?? []).map((v) => ({
                  value: v.publicId,
                  label: v.name,
                }))}
                error={errors.provincePublicId?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="regencyPublicId"
            render={({ field }) => (
              <Select
                id="regencyPublicId"
                label="Kabupaten / Kota *"
                placeholder="-- Pilih Kabupaten/Kota --"
                value={field.value}
                onChange={field.onChange}
                disabled={!province}
                options={(regions.regency ?? []).map((v) => ({
                  value: v.publicId,
                  label: v.name,
                }))}
                error={errors.regencyPublicId?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="districtPublicId"
            render={({ field }) => (
              <Select
                id="districtPublicId"
                label="Kecamatan *"
                placeholder="-- Pilih Kecamatan --"
                value={field.value}
                onChange={field.onChange}
                disabled={!regency}
                options={(regions.district ?? []).map((v) => ({
                  value: v.publicId,
                  label: v.name,
                }))}
                error={errors.districtPublicId?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="villagePublicId"
            render={({ field }) => (
              <Select
                id="villagePublicId"
                label="Kelurahan / Desa"
                placeholder="-- Pilih Desa (Opsional) --"
                value={field.value ?? ""}
                onChange={field.onChange}
                disabled={!district}
                options={(regions.village ?? []).map((v) => ({
                  value: v.publicId,
                  label: v.name,
                }))}
                error={errors.villagePublicId?.message}
              />
            )}
          />
        </Card>

        {/* Emergency Contacts Card */}
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Kontak Darurat & Keluarga
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Informasi pendamping atau keluarga yang dapat dihubungi saat dibutuhkan.
            </p>
          </div>

          <Input
            id="familyContactName"
            label="Nama Suami / Keluarga"
            placeholder="Nama lengkap suami atau anggota keluarga"
            error={errors.familyContactName?.message}
            {...register("familyContactName")}
          />

          <Input
            id="familyContactPhone"
            label="Nomor Telepon Keluarga"
            placeholder="08xxxxxxxxxx"
            error={errors.familyContactPhone?.message}
            {...register("familyContactPhone")}
          />

          <div className="pt-2 border-t border-slate-100">
            <Input
              id="emergencyContactName"
              label="Nama Kontak Darurat"
              placeholder="Nama kontak darurat"
              error={errors.emergencyContactName?.message}
              {...register("emergencyContactName")}
            />
          </div>

          <Input
            id="emergencyContactPhone"
            label="Nomor Telepon Kontak Darurat"
            placeholder="08xxxxxxxxxx"
            error={errors.emergencyContactPhone?.message}
            {...register("emergencyContactPhone")}
          />

          <Input
            id="emergencyContactRelationship"
            label="Hubungan dengan Ibu"
            placeholder="Contoh: Suami, Orang Tua, Saudara"
            error={errors.emergencyContactRelationship?.message}
            {...register("emergencyContactRelationship")}
          />
        </Card>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-12 text-sm font-bold shadow-md shadow-emerald-900/10"
          >
            {isSubmitting ? "Memeriksa Wilayah…" : "Lanjut Pilih Fasilitas"}
          </Button>
        </div>
      </form>
    </MotherAppShell>
  );
}
