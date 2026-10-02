import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { type Href, router } from "expo-router";
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
} from "@pfram/design-tokens";
import type {
  DangerScreening,
  DangerSignRule,
} from "@pfram/shared-types";
import {
  cleanPhoneForUrl,
  getDangerDeepLinks,
} from "../lib/danger-screening-api";
import {
  useCreateMotherDangerScreening,
  useMotherDangerSigns,
} from "../lib/danger-screening-queries";

// ==========================================
// 1. HOME CARD COMPONENT
// ==========================================
export function DangerScreeningHomeCard({
  onPressStart,
  onPressHistory,
}: {
  onPressStart?: () => void;
  onPressHistory?: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>⚠️</Text>
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>Kenali Tanda Bahaya</Text>
          <Text style={styles.cardSubtitle}>
            Skrining mandiri cepat berbasis panduan resmi Buku KIA
          </Text>
        </View>
      </View>

      <Text style={styles.cardBody}>
        Periksa gejala seperti perdarahan, nyeri perut hebat, atau demam tinggi.
        Segera kenali kondisi darurat yang membutuhkan penanganan medis segera.
      </Text>

      <View style={styles.cardActionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mulai Skrining Mandiri Tanda Bahaya"
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={
            onPressStart ??
            (() => router.push("/mother/danger-screening" as Href))
          }
        >
          <Text style={styles.primaryButtonText}>Mulai Skrining</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lihat Riwayat Skrining Tanda Bahaya"
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
          onPress={
            onPressHistory ??
            (() => router.push("/mother/danger-screening/history" as Href))
          }
        >
          <Text style={styles.secondaryButtonText}>Riwayat</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ==========================================
// 2. SURVEY QUESTIONNAIRE COMPONENT
// ==========================================
export function DangerScreeningSurvey({
  onCompleted,
  fallbackMidwifePhone,
  fallbackFacilityPhone,
}: {
  onCompleted?: (result: DangerScreening) => void;
  fallbackMidwifePhone?: string | null;
  fallbackFacilityPhone?: string | null;
}) {
  const { data, isLoading, isError, refetch } = useMotherDangerSigns();
  const createMutation = useCreateMotherDangerScreening();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<DangerScreening | null>(
    null,
  );

  const rules: DangerSignRule[] = data?.rules ?? [];
  const ruleSetVersion = data?.ruleSet?.version ?? "KEMENKES-KIA-2023-V1";

  // Check if any answered rule is URGENT and answer is YES
  const hasLocalUrgentDanger = rules.some(
    (r) => r.severityCategory === "URGENT" && answers[r.code] === true,
  );

  const currentRule = rules[currentIndex];
  const isLastQuestion = rules.length > 0 && currentIndex === rules.length - 1;
  const isAllAnswered =
    rules.length > 0 && rules.every((r) => answers[r.code] !== undefined);

  const handleAnswer = (answer: boolean) => {
    if (!currentRule) return;
    setAnswers((prev) => ({ ...prev, [currentRule.code]: answer }));
    setSubmitError(null);

    // Auto-advance if not on the last question
    if (currentIndex < rules.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!isAllAnswered) return;
    setSubmitError(null);

    const payload = {
      ruleSetVersion,
      responses: rules.map((r) => ({
        ruleCode: r.code,
        answer: answers[r.code] ?? false,
      })),
    };

    try {
      const res = await createMutation.mutateAsync(payload);
      setSubmittedResult(res);
      onCompleted?.(res);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Gagal mengirimkan skrining. Silakan coba lagi.",
      );
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentIndex(0);
    setSubmitError(null);
    setSubmittedResult(null);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat pertanyaan skrining...</Text>
      </View>
    );
  }

  if (isError || rules.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Gagal Mengambil Pertanyaan</Text>
        <Text style={styles.errorSubtitle}>
          Terjadi gangguan saat memuat panduan tanda bahaya kehamilan.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Coba Lagi Memuat Pertanyaan"
          style={styles.retryButton}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </Pressable>
      </View>
    );
  }

  if (submittedResult) {
    return (
      <DangerScreeningResultView
        result={submittedResult}
        onReset={handleReset}
        fallbackMidwifePhone={fallbackMidwifePhone}
        fallbackFacilityPhone={fallbackFacilityPhone}
      />
    );
  }

  return (
    <View style={styles.surveyContainer}>
      {/* LOCAL EMERGENCY FALLBACK BANNER (shown whenever an URGENT rule is answered YES) */}
      {hasLocalUrgentDanger && (
        <View style={styles.emergencyBanner} accessibilityRole="alert">
          <Text style={styles.emergencyBannerTitle}>
            🚨 PERINGATAN DARURAT KEHAMILAN
          </Text>
          <Text style={styles.emergencyBannerText}>
            Ibu melaporkan gejala tanda bahaya yang memerlukan penanganan segera.
            Jangan menunda. Segera menuju fasilitas kesehatan terdekat!
          </Text>
          <View style={styles.emergencyActionRow}>
            {fallbackFacilityPhone && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hubungi Fasilitas Kesehatan Sekarang"
                style={styles.emergencyCallButton}
                onPress={() =>
                  Linking.openURL(`tel:${cleanPhoneForUrl(fallbackFacilityPhone)}`)
                }
              >
                <Text style={styles.emergencyCallButtonText}>
                  Telepon Puskesmas/RS
                </Text>
              </Pressable>
            )}
            {fallbackMidwifePhone && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hubungi Bidan Sekarang"
                style={styles.emergencyCallButton}
                onPress={() =>
                  Linking.openURL(`tel:${cleanPhoneForUrl(fallbackMidwifePhone)}`)
                }
              >
                <Text style={styles.emergencyCallButtonText}>Telepon Bidan</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* PROGRESS BAR & COUNTER */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Pertanyaan {currentIndex + 1} dari {rules.length}
        </Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentIndex + 1) / rules.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* QUESTION CARD */}
      {currentRule && (
        <View style={styles.questionCard}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {currentRule.severityCategory === "URGENT"
                ? "DARURAT SEGERA"
                : "PERLU PERHATIAN"}
            </Text>
          </View>

          <Text style={styles.questionTitle}>{currentRule.title}</Text>
          <Text style={styles.questionText}>{currentRule.question}</Text>
          {currentRule.description && (
            <Text style={styles.questionDescription}>
              {currentRule.description}
            </Text>
          )}

          {/* YES / NO BUTTONS */}
          <View style={styles.answerButtonGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Jawab Ya untuk ${currentRule.title}`}
              accessibilityState={{ selected: answers[currentRule.code] === true }}
              style={[
                styles.answerButton,
                styles.yesButton,
                answers[currentRule.code] === true && styles.yesButtonSelected,
              ]}
              onPress={() => handleAnswer(true)}
            >
              <Text
                style={[
                  styles.answerButtonText,
                  answers[currentRule.code] === true &&
                    styles.answerButtonTextSelected,
                ]}
              >
                YA
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Jawab Tidak untuk ${currentRule.title}`}
              accessibilityState={{
                selected: answers[currentRule.code] === false,
              }}
              style={[
                styles.answerButton,
                styles.noButton,
                answers[currentRule.code] === false && styles.noButtonSelected,
              ]}
              onPress={() => handleAnswer(false)}
            >
              <Text
                style={[
                  styles.answerButtonText,
                  answers[currentRule.code] === false &&
                    styles.answerButtonTextSelected,
                ]}
              >
                TIDAK
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* NAVIGATION CONTROLS */}
      <View style={styles.navRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pertanyaan Sebelumnya"
          disabled={currentIndex === 0}
          style={[
            styles.navButton,
            currentIndex === 0 && styles.navButtonDisabled,
          ]}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
        >
          <Text style={styles.navButtonText}>Sebelumnya</Text>
        </Pressable>

        {isLastQuestion ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kirim Hasil Skrining"
            disabled={!isAllAnswered || createMutation.isPending}
            style={[
              styles.submitButton,
              (!isAllAnswered || createMutation.isPending) &&
                styles.navButtonDisabled,
            ]}
            onPress={handleSubmit}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Kirim Skrining</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pertanyaan Selanjutnya"
            style={styles.navButton}
            onPress={() =>
              setCurrentIndex((prev) => Math.min(rules.length - 1, prev + 1))
            }
          >
            <Text style={styles.navButtonText}>Selanjutnya</Text>
          </Pressable>
        )}
      </View>

      {/* ERROR BANNER WITH RETRY */}
      {submitError && (
        <View style={styles.submitErrorCard} accessibilityRole="alert">
          <Text style={styles.submitErrorText}>{submitError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Coba Kirim Lagi"
            style={styles.submitErrorRetryButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitErrorRetryText}>Coba Kirim Lagi</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ==========================================
// 3. RESULT VIEW COMPONENT
// ==========================================
export function DangerScreeningResultView({
  result,
  onReset,
  fallbackMidwifePhone,
  fallbackFacilityPhone,
}: {
  result: DangerScreening;
  onReset?: () => void;
  fallbackMidwifePhone?: string | null;
  fallbackFacilityPhone?: string | null;
}) {
  const isUrgent = result.status === "REQUIRES_IMMEDIATE_CARE";
  const isWarning = result.status === "DANGER_SIGN_REPORTED";

  const deepLinks = getDangerDeepLinks(
    fallbackMidwifePhone,
    fallbackFacilityPhone,
  );

  return (
    <View style={styles.resultContainer}>
      <View
        style={[
          styles.resultHeaderCard,
          isUrgent
            ? styles.resultCardUrgent
            : isWarning
              ? styles.resultCardWarning
              : styles.resultCardSafe,
        ]}
      >
        <Text style={styles.resultBadge}>
          {isUrgent
            ? "DARURAT SEGERA"
            : isWarning
              ? "PERLU EVALUASI TENAGA KESEHATAN"
              : "KONDISI NORMAL / AMAN"}
        </Text>

        <Text style={styles.resultMainTitle}>
          {isUrgent
            ? "Segera Menuju Fasilitas Kesehatan!"
            : isWarning
              ? "Perlu Perhatian & Konsultasi Bidan"
              : "Tidak Ada Tanda Bahaya Terlapor"}
        </Text>

        <Text style={styles.resultDescription}>
          {isUrgent
            ? "Jangan menunggu balasan melalui aplikasi. Segera datangi IGD Puskesmas atau Rumah Sakit terdekat bersama suami atau keluarga pendamping."
            : isWarning
              ? "Ditemukan gejala yang memerlukan penilaian langsung oleh bidan. Hubungi bidan pendamping Ibu untuk mendapatkan petunjuk."
              : "Saat ini tidak ada tanda bahaya utama kehamilan yang dilaporkan. Tetap pantau kondisi fisik secara mandiri dan penuhi jadwal kunjungan ANC."}
        </Text>
      </View>

      {/* REPORTED SYMPTOMS LIST */}
      {result.reportedSignsCount > 0 && result.responses && (
        <View style={styles.reportedListCard}>
          <Text style={styles.reportedListTitle}>
            Gejala yang Dilaporkan ({result.reportedSignsCount}):
          </Text>
          {result.responses
            .filter((r) => r.answer)
            .map((r, i) => (
              <View key={i} style={styles.reportedItem}>
                <Text style={styles.reportedItemBullet}>•</Text>
                <View style={styles.reportedItemContent}>
                  <Text style={styles.reportedItemTitle}>{r.title}</Text>
                  <Text style={styles.reportedItemCategory}>
                    Kategori: {r.severityCategory}
                  </Text>
                </View>
              </View>
            ))}
        </View>
      )}

      {/* EMERGENCY CONTACT ACTION BUTTONS */}
      {(isUrgent || isWarning) && (
        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>Kontak Cepat Fasilitas & Bidan</Text>

          {deepLinks.facilityCallUrl && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Telepon Fasilitas Kesehatan"
              style={[styles.callButton, styles.callFacilityButton]}
              onPress={() => Linking.openURL(deepLinks.facilityCallUrl!)}
            >
              <Text style={styles.callButtonText}>
                📞 Telepon Fasilitas Kesehatan
              </Text>
            </Pressable>
          )}

          {deepLinks.midwifeCallUrl && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Telepon Bidan Pendamping"
              style={[styles.callButton, styles.callMidwifeButton]}
              onPress={() => Linking.openURL(deepLinks.midwifeCallUrl!)}
            >
              <Text style={styles.callButtonText}>
                📞 Telepon Bidan Pendamping
              </Text>
            </Pressable>
          )}

          {deepLinks.midwifeWhatsAppUrl && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="WhatsApp Bidan Pendamping"
              style={[styles.callButton, styles.whatsappButton]}
              onPress={() => Linking.openURL(deepLinks.midwifeWhatsAppUrl!)}
            >
              <Text style={styles.callButtonText}>
                💬 WhatsApp Bidan Pendamping
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* FOOTER ACTIONS */}
      <View style={styles.resultFooterRow}>
        {onReset && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skrining Ulang"
            style={styles.outlineButton}
            onPress={onReset}
          >
            <Text style={styles.outlineButtonText}>Skrining Ulang</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Beranda"
          style={styles.homeButton}
          onPress={() => router.replace("/(app)/home" as Href)}
        >
          <Text style={styles.homeButtonText}>Kembali ke Beranda</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ==========================================
// 4. STYLES
// ==========================================
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 22,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  cardBody: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  cardActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  secondaryButton: {
    minHeight: minimumTouchTarget,
    backgroundColor: "#f1f5f9",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    color: "#475569",
    fontWeight: "bold",
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  centerContainer: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: "#64748b",
  },
  errorContainer: {
    padding: spacing.lg,
    backgroundColor: "#fef2f2",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#991b1b",
  },
  errorSubtitle: {
    fontSize: 13,
    color: "#b91c1c",
    marginTop: 4,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing.md,
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  surveyContainer: {
    gap: spacing.md,
  },
  emergencyBanner: {
    backgroundColor: "#b91c1c",
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  emergencyBannerTitle: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
  emergencyBannerText: {
    color: "#fef2f2",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  emergencyActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emergencyCallButton: {
    flex: 1,
    minHeight: minimumTouchTarget,
    backgroundColor: "#ffffff",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  emergencyCallButtonText: {
    color: "#991b1b",
    fontWeight: "bold",
    fontSize: 13,
  },
  progressContainer: {
    marginBottom: spacing.xs,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#475569",
    letterSpacing: 0.5,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: spacing.xs,
  },
  questionText: {
    fontSize: 15,
    color: "#1e293b",
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  questionDescription: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  answerButtonGroup: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  answerButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  yesButton: {
    backgroundColor: "#fff",
    borderColor: "#ef4444",
  },
  yesButtonSelected: {
    backgroundColor: "#ef4444",
  },
  noButton: {
    backgroundColor: "#fff",
    borderColor: "#64748b",
  },
  noButtonSelected: {
    backgroundColor: "#64748b",
  },
  answerButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  answerButtonTextSelected: {
    color: "#ffffff",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  navButton: {
    flex: 1,
    minHeight: minimumTouchTarget,
    backgroundColor: "#f1f5f9",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#475569",
  },
  submitButton: {
    flex: 1,
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  submitErrorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: spacing.sm,
  },
  submitErrorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  submitErrorRetryButton: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  submitErrorRetryText: {
    color: "#991b1b",
    fontWeight: "bold",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  resultContainer: {
    gap: spacing.md,
  },
  resultHeaderCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  resultCardUrgent: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  resultCardWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  resultCardSafe: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  resultBadge: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resultMainTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: spacing.xs,
  },
  resultDescription: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  reportedListCard: {
    backgroundColor: "#ffffff",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  reportedListTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: spacing.xs,
  },
  reportedItem: {
    flexDirection: "row",
    marginTop: spacing.xs,
  },
  reportedItemBullet: {
    color: "#ef4444",
    fontSize: 16,
    marginRight: 6,
  },
  reportedItemContent: {
    flex: 1,
  },
  reportedItemTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e293b",
  },
  reportedItemCategory: {
    fontSize: 11,
    color: "#64748b",
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: spacing.sm,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: spacing.xs,
  },
  callButton: {
    minHeight: minimumTouchTarget,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  callFacilityButton: {
    backgroundColor: "#b91c1c",
  },
  callMidwifeButton: {
    backgroundColor: "#0284c7",
  },
  whatsappButton: {
    backgroundColor: "#16a34a",
  },
  callButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  resultFooterRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  outlineButton: {
    flex: 1,
    minHeight: minimumTouchTarget,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#475569",
  },
  homeButton: {
    flex: 1,
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
});
