import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
} from "@pfram/design-tokens";
import { AppHeader, ScreenContainer } from "../../components/ui";
import {
  ANC_STATUS_BADGES,
  formatAncDateShort,
  formatAncTime,
  isAncAppointmentDayArrived,
} from "../../lib/anc-api";
import {
  useConfirmAncAttendance,
  useMotherAncSchedules,
  useMotherReminderSettings,
} from "../../lib/anc-queries";
import { ReminderSettingsModal } from "../../components/anc";

export default function MotherAncScreen() {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const schedulesQuery = useMotherAncSchedules(
    filterStatus === "ALL" ? undefined : { status: filterStatus },
  );
  const settingsQuery = useMotherReminderSettings();
  const confirmMutation = useConfirmAncAttendance();

  const schedules = schedulesQuery.data?.items ?? [];

  const handleConfirm = async (publicId: string) => {
    try {
      await confirmMutation.mutateAsync(publicId);
    } catch (e) {
      console.warn("Failed to confirm attendance", e);
    }
  };

  return (
    <ScreenContainer scroll={false}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>← Kembali</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pengaturan Notifikasi"
          style={styles.settingsBtn}
          onPress={() => setShowSettingsModal(true)}
        >
          <Text style={styles.settingsBtnText}>⚙ Pengaturan</Text>
        </Pressable>
      </View>

      <AppHeader
        title="Jadwal Pemeriksaan ANC"
        subtitle="Pantau kunjungan antenatal berkala dan pastikan kondisi Ibu & Janin sehat."
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { label: "Semua", val: "ALL" },
          { label: "Terjadwal", val: "SCHEDULED" },
          { label: "Sudah Hadir", val: "COMPLETED" },
          { label: "Belum Hadir", val: "MISSED" },
        ].map((f) => (
          <Pressable
            key={f.val}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${f.label}`}
            style={[
              styles.filterTab,
              filterStatus === f.val && styles.filterTabActive,
            ]}
            onPress={() => setFilterStatus(f.val)}
          >
            <Text
              style={[
                styles.filterTabText,
                filterStatus === f.val && styles.filterTabTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Schedules List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {schedulesQuery.isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.mutedText}>Memuat jadwal...</Text>
          </View>
        ) : schedules.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Belum Ada Jadwal</Text>
            <Text style={styles.emptyDesc}>
              Bidan pendamping akan menambahkan jadwal ANC berkala sesuai usia
              kehamilan Ibu.
            </Text>
          </View>
        ) : (
          schedules.map((item) => {
            const badge =
              ANC_STATUS_BADGES[item.status] ?? ANC_STATUS_BADGES.SCHEDULED!;

            return (
              <View key={item.publicId} style={styles.scheduleCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardDate}>
                      📅 {formatAncDateShort(item.scheduledAt)}
                    </Text>
                    <Text style={styles.cardTime}>
                      {formatAncTime(item.scheduledAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: badge.bg },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {item.doctorRequired && (
                  <View style={styles.doctorRequiredBadge}>
                    <Text style={styles.doctorRequiredText}>
                      🩺 Pemeriksaan Dokter (USG & Skrining)
                    </Text>
                  </View>
                )}

                {item.facility?.name && (
                  <Text style={styles.facilityText}>
                    📍 {item.facility.name}
                  </Text>
                )}

                {item.notes && (
                  <Text style={styles.notesText}>Catatan: {item.notes}</Text>
                )}

                {item.status === "SCHEDULED" && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isAncAppointmentDayArrived(item.scheduledAt)
                        ? "Konfirmasi sudah datang"
                        : "Belum hari pemeriksaan"
                    }
                    style={[
                      styles.confirmAttendanceBtn,
                      (!isAncAppointmentDayArrived(item.scheduledAt) ||
                        confirmMutation.isPending) &&
                        styles.btnDisabled,
                    ]}
                    onPress={() => handleConfirm(item.publicId)}
                    disabled={
                      !isAncAppointmentDayArrived(item.scheduledAt) ||
                      confirmMutation.isPending
                    }
                  >
                    {confirmMutation.isPending ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.confirmAttendanceText}>
                        {isAncAppointmentDayArrived(item.scheduledAt)
                          ? "✓ Konfirmasi Sudah Hadir"
                          : "Belum Hari Pemeriksaan"}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })
        )}

        {/* Kemenkes Standard Guide Box */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>
            📘 Standar 6x Pemeriksaan ANC (Kemenkes)
          </Text>
          <View style={styles.guideRow}>
            <Text style={styles.guideTrimester}>Trimester 1 (0-12 mg):</Text>
            <Text style={styles.guideDetail}>
              Minimal 2x (1x oleh Dokter + USG Trimester 1)
            </Text>
          </View>
          <View style={styles.guideRow}>
            <Text style={styles.guideTrimester}>Trimester 2 (13-27 mg):</Text>
            <Text style={styles.guideDetail}>Minimal 2x (oleh Bidan)</Text>
          </View>
          <View style={styles.guideRow}>
            <Text style={styles.guideTrimester}>Trimester 3 (28-40 mg):</Text>
            <Text style={styles.guideDetail}>
              Minimal 2x (1x oleh Dokter pada TM 3 + USG)
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Reminder Settings Modal */}
      <ReminderSettingsModal
        visible={showSettingsModal}
        settings={settingsQuery.data}
        onClose={() => setShowSettingsModal(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
  },
  settingsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: radius.sm,
  },
  settingsBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterTabTextActive: {
    color: colors.white,
  },
  listContainer: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  scheduleCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardHeaderLeft: {
    gap: 2,
  },
  cardDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardTime: {
    fontSize: 12,
    color: "#64748B",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  doctorRequiredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  doctorRequiredText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  facilityText: {
    fontSize: 12,
    color: "#475569",
  },
  notesText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
  },
  confirmAttendanceBtn: {
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  confirmAttendanceText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  guideCard: {
    backgroundColor: "#F0FDF4",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 6,
    marginTop: spacing.sm,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  guideRow: {
    gap: 1,
  },
  guideTrimester: {
    fontSize: 11,
    fontWeight: "700",
    color: "#14532D",
  },
  guideDetail: {
    fontSize: 11,
    color: "#166534",
  },
  centerBox: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyBox: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  mutedText: {
    fontSize: 12,
    color: "#94A3B8",
  },
});
