import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius, spacing } from "@pfram/design-tokens";
import type { DangerScreening } from "@pfram/shared-types";
import { AppHeader, ScreenContainer } from "../../../components/ui";
import { formatScreeningDate } from "../../../lib/danger-screening-api";
import { useMotherDangerScreenings } from "../../../lib/danger-screening-queries";

export default function MotherDangerScreeningHistoryScreen() {
  const { data, isLoading, isError, refetch } = useMotherDangerScreenings();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = data?.items ?? [];

  return (
    <ScreenContainer>
      <AppHeader
        title="Riwayat Skrining"
        subtitle="Catatan riwayat evaluasi tanda bahaya kehamilan"
      />

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Memuat riwayat skrining...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Gagal memuat riwayat skrining tanda bahaya.
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Belum Ada Riwayat Skrining</Text>
          <Text style={styles.emptyText}>
            Ibu belum pernah melakukan skrining tanda bahaya kehamilan. Lakukan
            skrining mandiri jika merasakan gejala tidak biasa.
          </Text>
        </View>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <View style={styles.list}>
          {items.map((item: DangerScreening) => {
            const isExpanded = expandedId === item.publicId;
            const isUrgent = item.status === "REQUIRES_IMMEDIATE_CARE";
            const isWarning = item.status === "DANGER_SIGN_REPORTED";

            return (
              <View
                key={item.publicId}
                style={[
                  styles.historyCard,
                  isUrgent
                    ? styles.historyCardUrgent
                    : isWarning
                      ? styles.historyCardWarning
                      : styles.historyCardSafe,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardDate}>
                      {formatScreeningDate(item.screenedAt)}
                    </Text>
                    <Text style={styles.cardStatusLabel}>
                      {isUrgent
                        ? "🚨 Segera ke Faskes"
                        : isWarning
                          ? "⚠️ Perlu Perhatian"
                          : "✓ Tidak Ada Bahaya"}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.reportedSignsCount} Tanda
                    </Text>
                  </View>
                </View>

                {item.followUpNotes && (
                  <Text style={styles.notesText}>
                    Catatan Bidan: {item.followUpNotes}
                  </Text>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isExpanded ? "Tutup Rincian Jawaban" : "Buka Rincian Jawaban"
                  }
                  style={styles.expandButton}
                  onPress={() =>
                    setExpandedId(isExpanded ? null : item.publicId)
                  }
                >
                  <Text style={styles.expandButtonText}>
                    {isExpanded ? "Sembunyikan Jawaban ▲" : "Lihat Rincian Jawaban ▼"}
                  </Text>
                </Pressable>

                {isExpanded && item.responses && (
                  <View style={styles.detailsContainer}>
                    {item.responses.map((resp, i) => (
                      <View key={i} style={styles.detailRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailTitle}>{resp.title}</Text>
                          <Text style={styles.detailQuestion}>
                            {resp.question}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.detailAnswer,
                            resp.answer ? styles.answerYes : styles.answerNo,
                          ]}
                        >
                          {resp.answer ? "YA" : "TIDAK"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: "#64748b",
  },
  errorBox: {
    padding: spacing.lg,
    backgroundColor: "#fef2f2",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyCard: {
    padding: spacing.xl,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  historyCardUrgent: {
    borderColor: "#fca5a5",
    backgroundColor: "#fff5f5",
  },
  historyCardWarning: {
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
  },
  historyCardSafe: {
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardDate: {
    fontSize: 12,
    color: "#64748b",
  },
  cardStatusLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#475569",
  },
  notesText: {
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  expandButton: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center",
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  detailsContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
  },
  detailQuestion: {
    fontSize: 11,
    color: "#64748b",
  },
  detailAnswer: {
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  answerYes: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },
  answerNo: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
  },
});
