import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motherRegistrationSchema } from "@pfram/validation";
import type { z } from "zod";
import { PframApiError } from "@pfram/api-client";
import { useAuth } from "../../auth";
import {
  Button,
  Card,
  ErrorState,
  Input,
  PasswordInput,
} from "../../components";

type RegisterFormValues = Omit<
  z.input<typeof motherRegistrationSchema>,
  "consentDocumentIds" | "clientType"
>;

interface ConsentDoc {
  id: string;
  title: string;
  documentType?: string;
  version?: string;
}

type ConsentState = "loading" | "success" | "error" | "empty";

function mapRegistrationError(err: unknown): string {
  if (err instanceof PframApiError) {
    if (err.code === "PHONE_ALREADY_REGISTERED") {
      return "Nomor handphone sudah terdaftar. Silakan gunakan nomor lain atau masuk ke akun Anda.";
    }
    if (err.code === "CONSENT_INVALID") {
      return "Dokumen persetujuan layanan tidak aktif atau telah diperbarui. Silakan muat ulang halaman.";
    }
    if (err.code === "VALIDATION_ERROR") {
      const details = err.details as
        { fieldErrors?: Record<string, string[]> } | undefined;
      const fieldErrors = details?.fieldErrors;
      if (fieldErrors?.consentDocumentIds?.[0]) {
        return "Silakan setujui dokumen persetujuan layanan untuk melanjutkan pendaftaran.";
      }
      if (fieldErrors?.phoneNumber?.[0]) {
        return "Nomor handphone tidak valid. Gunakan format nomor Indonesia (contoh: 081234567890).";
      }
      if (fieldErrors?.password?.[0]) {
        return "Kata sandi harus minimal 10 karakter dan mengandung huruf besar, huruf kecil, dan angka.";
      }
      if (fieldErrors?.fullName?.[0]) {
        return "Nama lengkap wajib diisi minimal 2 karakter.";
      }
      return "Data pendaftaran tidak valid. Silakan periksa kembali isian formulir.";
    }
    if (err.status === 429) {
      return "Terlalu banyak percobaan pendaftaran. Silakan tunggu beberapa saat.";
    }
    if (
      err.message &&
      !err.message.includes("Array must contain") &&
      !err.message.includes("{") &&
      !err.message.includes("Prisma")
    ) {
      return err.message;
    }
  }

  if (err instanceof Error) {
    if (err.message.includes("Array must contain at least 1 element")) {
      return "Silakan setujui dokumen persetujuan layanan untuk melanjutkan pendaftaran.";
    }
    if (
      err.message.includes("Failed to fetch") ||
      err.message.includes("NetworkError")
    ) {
      return "Gagal terhubung ke server. Periksa koneksi internet Anda.";
    }
    if (
      /^[A-Z_]+$/.test(err.message) ||
      err.message.includes("prisma") ||
      err.message.includes("fastify")
    ) {
      return "Pendaftaran akun ibu gagal. Silakan coba beberapa saat lagi.";
    }
    return err.message;
  }

  return "Pendaftaran akun ibu gagal. Silakan coba beberapa saat lagi.";
}

export function MotherRegisterPage() {
  const { registerMother, request } = useAuth();
  const navigate = useNavigate();
  const [consents, setConsents] = useState<ConsentDoc[]>([]);
  const [acceptedConsentIds, setAcceptedConsentIds] = useState<string[]>([]);
  const [consentStatus, setConsentStatus] = useState<ConsentState>("loading");
  const [consentError, setConsentError] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  useEffect(() => {
    document.title = "Daftar Akun Ibu Hamil — PFRAM Telemedicine";
  }, []);

  const fetchConsents = useCallback(async () => {
    setConsentStatus("loading");
    setConsentError("");
    try {
      const docs = await request<ConsentDoc[]>("/auth/consents");
      if (Array.isArray(docs) && docs.length > 0) {
        setConsents(docs);
        setConsentStatus("success");
      } else {
        setConsents([]);
        setConsentStatus("empty");
      }
    } catch {
      setConsents([]);
      setConsentStatus("error");
      setConsentError("Dokumen persetujuan layanan belum dapat dimuat.");
    }
  }, [request]);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const allAgreed =
    consentStatus === "success" &&
    consents.length > 0 &&
    consents.every((c) => acceptedConsentIds.includes(c.id));

  const onSubmit = async (values: RegisterFormValues) => {
    if (consentStatus === "loading") {
      setError("Mohon tunggu, dokumen persetujuan layanan sedang dimuat.");
      return;
    }

    if (!allAgreed || acceptedConsentIds.length === 0) {
      setError(
        "Silakan setujui dokumen persetujuan layanan untuk melanjutkan pendaftaran.",
      );
      return;
    }
    setError("");

    try {
      const payload = {
        ...values,
        consentDocumentIds: acceptedConsentIds,
        clientType: "web" as const,
      };

      const parseResult = motherRegistrationSchema.safeParse(payload);
      if (!parseResult.success) {
        const fieldErrors = parseResult.error.flatten().fieldErrors;
        if (fieldErrors.consentDocumentIds?.[0]) {
          throw new Error(
            "Silakan setujui dokumen persetujuan layanan untuk melanjutkan pendaftaran.",
          );
        }
        const firstError = Object.values(fieldErrors)[0]?.[0];
        throw new Error(firstError || "Data pendaftaran tidak valid.");
      }

      await registerMother(payload);
      navigate("/m", { replace: true });
    } catch (err) {
      setError(mapRegistrationError(err));
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF8F2] px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-md">
          {/* Logo & Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 p-2.5 shadow-sm ring-1 ring-emerald-200/60">
              <img
                src="/brand/logo-symbol.png"
                alt="Logo PFRAM"
                width={36}
                height={36}
                loading="eager"
                decoding="async"
                className="h-9 w-9 object-contain"
              />
            </div>
            <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
              Daftar Akun Ibu Hamil
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Aplikasi Resmi Telemedicine Maternal & Neonatal Maluku Utara
            </p>
          </div>

          {error && (
            <div className="mt-5">
              <ErrorState message={error} />
            </div>
          )}

          {/* Registration Form */}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="fullName"
              label="Nama Lengkap *"
              placeholder="Contoh: Rahmawati Hasan"
              autoComplete="name"
              error={errors.fullName?.message}
              {...register("fullName")}
            />

            <Input
              id="phoneNumber"
              label="Nomor Handphone *"
              placeholder="Contoh: 0853xxxxxxxx"
              autoComplete="tel"
              error={errors.phoneNumber?.message}
              {...register("phoneNumber")}
            />

            <PasswordInput
              id="password"
              label="Kata Sandi *"
              placeholder="Minimal 10 karakter (huruf besar, kecil, angka)"
              error={errors.password?.message}
              {...register("password")}
            />

            <PasswordInput
              id="passwordConfirmation"
              label="Konfirmasi Kata Sandi *"
              placeholder="Ulangi kata sandi"
              error={errors.passwordConfirmation?.message}
              {...register("passwordConfirmation")}
            />

            {/* Consent Agreement */}
            {consentStatus === "loading" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 flex items-center gap-2.5">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-pfram-primary" />
                <span>Memuat dokumen persetujuan layanan…</span>
              </div>
            )}

            {consentStatus === "error" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-700 flex items-center justify-between">
                <span>
                  {consentError ||
                    "Dokumen persetujuan layanan belum dapat dimuat."}
                </span>
                <button
                  type="button"
                  onClick={fetchConsents}
                  className="ml-2 font-semibold text-pfram-primary hover:underline min-h-[44px] px-2 flex items-center"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {consentStatus === "empty" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800">
                Dokumen persetujuan layanan saat ini belum tersedia. Pendaftaran
                akun belum dapat diproses.
              </div>
            )}

            {consentStatus === "success" &&
              consents.length === 1 &&
              (() => {
                const doc = consents[0];
                if (!doc) return null;
                return (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        id="consentAgreed"
                        checked={acceptedConsentIds.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAcceptedConsentIds([doc.id]);
                          } else {
                            setAcceptedConsentIds([]);
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-pfram-primary focus:ring-pfram-primary"
                      />
                      <span className="text-xs text-slate-700 leading-snug select-none">
                        Saya menyetujui ketentuan layanan dan pemrosesan data
                        medis:{" "}
                        <span className="font-semibold text-slate-800">
                          {doc.title}
                        </span>
                      </span>
                    </label>
                  </div>
                );
              })()}

            {consentStatus === "success" && consents.length > 1 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer border-b border-slate-200 pb-2">
                  <input
                    type="checkbox"
                    id="consentAgreedAll"
                    checked={acceptedConsentIds.length === consents.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAcceptedConsentIds(consents.map((c) => c.id));
                      } else {
                        setAcceptedConsentIds([]);
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-pfram-primary focus:ring-pfram-primary"
                  />
                  <span className="text-xs font-semibold text-slate-800 select-none">
                    Saya menyetujui seluruh ketentuan layanan dan pemrosesan
                    data medis:
                  </span>
                </label>
                {consents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-start gap-2.5 cursor-pointer pl-1"
                  >
                    <input
                      type="checkbox"
                      id={`consentAgreed-${doc.id}`}
                      checked={acceptedConsentIds.includes(doc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAcceptedConsentIds((prev) => [...prev, doc.id]);
                        } else {
                          setAcceptedConsentIds((prev) =>
                            prev.filter((id) => id !== doc.id),
                          );
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-pfram-primary focus:ring-pfram-primary"
                    />
                    <span className="text-xs text-slate-700 leading-snug select-none">
                      {doc.title}
                      {doc.version ? ` (v${doc.version})` : ""}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full text-sm font-semibold shadow-md"
              disabled={isSubmitting || !allAgreed}
            >
              {isSubmitting ? "Mendaftarkan Akun…" : "Daftar Akun Ibu"}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-600">
            Sudah memiliki akun?{" "}
            <Link
              to="/login"
              className="font-bold text-pfram-primary hover:text-pfram-text hover:underline min-h-[44px] py-2 px-1 inline-flex items-center"
            >
              Masuk ke PFRAM
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
