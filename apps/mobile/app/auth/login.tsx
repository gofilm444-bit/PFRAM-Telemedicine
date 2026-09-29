import { useState } from "react";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@pfram/validation";
import type { z } from "zod";
import {
  AppButton,
  AppHeader,
  AppTextInput,
  ErrorState,
  PasswordInput,
  ScreenContainer,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { destinationFor } from "../../lib/profile-routing";

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { clientType: "mobile", phoneNumber: "", password: "" },
  });
  return (
    <ScreenContainer>
      <AppHeader title="Masuk" subtitle="Gunakan akun PFRAM Anda." />
      {error && <ErrorState message={error} />}
      <Controller
        control={control}
        name="phoneNumber"
        render={({ field }) => (
          <AppTextInput
            label="Nomor HP"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.phoneNumber?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <PasswordInput
            label="Kata sandi"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />
      <AppButton
        title={isSubmitting ? "Memproses…" : "Masuk"}
        disabled={isSubmitting}
        onPress={handleSubmit(async (v) => {
          try {
            const user = await login(v.phoneNumber, v.password);
            router.replace(destinationFor(user));
          } catch (e) {
            setError(e instanceof Error ? e.message : "Login gagal");
          }
        })}
      />
    </ScreenContainer>
  );
}
