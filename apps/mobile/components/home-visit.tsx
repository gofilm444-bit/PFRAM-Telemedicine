import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "@pfram/design-tokens";
import type { HomeVisitItem } from "@pfram/shared-types";
import { formatHomeVisitDate } from "../lib/home-visit-api";

export function MotherHomeVisitCard({
  visits,
  isLoading,
}: {
  visits?: HomeVisitItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.mutedText}>Memuat jadwal kunjungan rumah...</Text>
      </View>
    );
  }

  const upcomingVisits = visits?.filter((v) => v.status === "SCHEDULED") ?? [];
  const nextVisit = upcomingVisits[0];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardBadge}>KUNJUNGAN RUMAH</Text>
      </View>
      <Text style={styles.cardTitle}>Jadwal Kunjungan Bidan</Text>

      {nextVisit ? (
        <View style={styles.contentWrap}>
          <Text style={styles.dateText}>
            📅 {formatHomeVisitDate(nextVisit.scheduledAt)}
          </Text>
          <Text style={styles.purposeText}>
            Tujuan: {nextVisit.purpose}
          </Text>
          <Text style={styles.midwifeText}>
            Bidan: {nextVisit.midwifeName}
          </Text>
          {nextVisit.notes && (
            <Text style={styles.notesText}>Catatan: {nextVisit.notes}</Text>
          )}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          Belum ada jadwal kunjungan rumah dari bidan pendamping.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  contentWrap: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  purposeText: {
    fontSize: 13,
    color: "#334155",
  },
  midwifeText: {
    fontSize: 13,
    color: "#475569",
    fontStyle: "italic",
  },
  notesText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  mutedText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
  },
});
