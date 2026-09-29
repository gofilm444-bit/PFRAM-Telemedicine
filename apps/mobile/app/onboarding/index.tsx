import { useState } from "react";
import { Text, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AppButton, AppHeader, ScreenContainer } from "../../components/ui";
import { colors } from "@pfram/design-tokens";
const slides = [
  ["Pantau Kehamilan", "Catat kondisi kehamilan secara berkala dengan mudah."],
  ["Kenali Tanda Bahaya", "Lakukan skrining awal dan baca arahan yang jelas."],
  [
    "Terhubung dengan Bidan",
    "Lihat jadwal pemeriksaan dan hubungi bidan pendamping.",
  ],
] as const;
export default function Onboarding() {
  const [i, setI] = useState(0);
  const slide = slides[i] ?? slides[0];
  return (
    <ScreenContainer>
      <View style={s.hero}>
        <Text style={s.mark}>P</Text>
        <AppHeader title={slide[0]} subtitle={slide[1]} />
        <Text style={s.note}>
          Fitur medis belum diaktifkan pada tahap fondasi.
        </Text>
      </View>
      <AppButton
        title={i === 2 ? "Mulai" : "Lanjut"}
        onPress={() =>
          i === 2 ? router.replace("/auth/welcome") : setI(i + 1)
        }
      />
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  hero: { flex: 1, justifyContent: "center", gap: 20 },
  mark: {
    width: 72,
    height: 72,
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: 24,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 36,
    fontWeight: "800",
  },
  note: { color: colors.neutral },
});
