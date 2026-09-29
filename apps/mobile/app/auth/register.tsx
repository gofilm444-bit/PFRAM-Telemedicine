import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  AppButton,
  AppHeader,
  AppTextInput,
  ConsentCheckbox,
  ErrorState,
  PasswordInput,
  ScreenContainer,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { destinationFor } from "../../lib/profile-routing";

export default function Register() {
  const { register, request } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    password: "",
    passwordConfirmation: "",
  });
  const [consents, setConsents] = useState<{ id: string; title: string }[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    request<{ id: string; title: string }[]>("/auth/consents")
      .then(setConsents)
      .catch(() => setError("Dokumen persetujuan belum dapat dimuat."));
  }, [request]);
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((v) => ({ ...v, [key]: value }));
  return (
    <ScreenContainer>
      <AppHeader
        title="Daftar akun ibu"
        subtitle="Buat akun dasar. Profil kehamilan dilengkapi pada tahap berikutnya."
      />
      {error && <ErrorState message={error} />}
      <AppTextInput
        label="Nama lengkap"
        value={form.fullName}
        onChangeText={set("fullName")}
      />
      <AppTextInput
        label="Nomor HP"
        keyboardType="phone-pad"
        value={form.phoneNumber}
        onChangeText={set("phoneNumber")}
      />
      <PasswordInput
        label="Kata sandi"
        value={form.password}
        onChangeText={set("password")}
      />
      <PasswordInput
        label="Konfirmasi kata sandi"
        value={form.passwordConfirmation}
        onChangeText={set("passwordConfirmation")}
      />
      <ConsentCheckbox
        checked={agreed}
        onPress={() => setAgreed((v) => !v)}
        label={`Saya menyetujui dokumen aktif: ${consents.map((x) => x.title).join(", ") || "memuat…"}`}
      />
      <AppButton
        title="Daftar"
        disabled={!agreed || !consents.length}
        onPress={async () => {
          try {
            const user = await register({
              ...form,
              consentDocumentIds: consents.map((x) => x.id),
            });
            router.replace(destinationFor(user));
          } catch (e) {
            setError(e instanceof Error ? e.message : "Registrasi gagal");
          }
        }}
      />
    </ScreenContainer>
  );
}
