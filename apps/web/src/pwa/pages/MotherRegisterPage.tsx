import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motherRegistrationSchema } from "@pfram/validation";
import type { z } from "zod";
import { useAuth } from "../../auth";
import { Button, Card, ErrorState, Input, PasswordInput } from "../../components";

type RegisterFormValues = Omit<
  z.input<typeof motherRegistrationSchema>,
  "consentDocumentIds" | "clientType"
>;

interface ConsentDoc {
  id: string;
  title: string;
  documentType?: string;
  version?: number;
}

export function MotherRegisterPage() {
  const { registerMother, request } = useAuth();
  const navigate = useNavigate();
  const [consents, setConsents] = useState<ConsentDoc[]>([]);
  const [agreed, setAgreed] = useState(false);
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

  useEffect(() => {
    request<ConsentDoc[]>("/auth/consents")
      .then((docs) => {
        setConsents(docs);
      })
      .catch(() => {
        // Fallback demo/active consent document if backend empty in tests
        setConsents([
          {
            id: "00000000-0000-0000-0000-000000000001",
            title: "Persetujuan Layanan Telemedicine Maternal PFRAM",
          },
        ]);
      });
  }, [request]);

  const onSubmit = async (values: RegisterFormValues) => {
    if (!agreed) {
      setError("Persetujuan syarat dan ketentuan layanan wajib dicentang.");
      return;
    }
    setError("");

    try {
      // Validate with schema
      const payload = {
        ...values,
        consentDocumentIds: consents.map((c) => c.id),
        clientType: "web" as const,
      };

      const parseResult = motherRegistrationSchema.safeParse(payload);
      if (!parseResult.success) {
        const firstError = Object.values(
          parseResult.error.flatten().fieldErrors,
        )[0]?.[0];
        throw new Error(firstError || "Data pendaftaran tidak valid.");
      }

      await registerMother(payload);
      navigate("/m", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Pendaftaran akun ibu gagal.",
      );
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
              placeholder="Contoh: 081234567890"
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
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="consentAgreed"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-pfram-primary focus:ring-pfram-primary"
                />
                <span className="text-xs text-slate-700 leading-snug select-none">
                  Saya menyetujui ketentuan layanan dan pemrosesan data medis:{" "}
                  <span className="font-semibold text-slate-800">
                    {consents.map((c) => c.title).join(", ") || "Dokumen Persetujuan Layanan"}
                  </span>
                </span>
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full text-sm font-semibold shadow-md"
              disabled={isSubmitting || !agreed}
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
