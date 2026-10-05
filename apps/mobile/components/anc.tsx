import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
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
import type {
  AdherenceSummary,
  AncSchedule,
  MotherReminderSettings,
  Reminder,
} from "@pfram/shared-types";
import {
  ANC_STATUS_BADGES,
  formatAncDateShort,
  formatAncTime,
  isAncAppointmentDayArrived,
} from "../lib/anc-api";
import {
  useCompleteReminder,
  useConfirmAncAttendance,
  useSnoozeReminder,
  useUpdateReminderSettings,
} from "../lib/anc-queries";
import { scheduleSnoozeReminder } from "../lib/notifications";

// ==========================================
// 1. Upcoming ANC Card
// ==========================================
export function UpcomingAncCard({
  schedule,
  isLoading,
}: {
  schedule: AncSchedule | null | undefined;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const confirmMutation = useConfirmAncAttendance();
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    if (!schedule) return;
    try {
      await confirmMutation.mutateAsync(schedule.publicId);
      setConfirmed(true);
    } catch (e) {
      console.warn("Failed to confirm ANC attendance", e);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.cardBadge}>JADWAL PEMERIKSAAN ANC</Text>
          <Text style={styles.cardTitle}>Pemeriksaan Kehamilan</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lihat semua jadwal"
          style={styles.linkButton}
          onPress={() => router.push("/mother/anc")}
        >
          <Text style={styles.linkButtonText}>Lihat Semua →</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.mutedText}>Memuat jadwal...</Text>
        </View>
      ) : schedule ? (
        <View style={styles.contentWrap}>
          <View style={styles.scheduleInfo}>
            <View style={styles.dateTimeRow}>
              <Text style={styles.dateText}>
                📅 {formatAncDateShort(schedule.scheduledAt)}
              </Text>
              <Text style={styles.timeText}>
                ⏰ {formatAncTime(schedule.scheduledAt)}
              </Text>
            </View>

            <View style={styles.badgeRow}>
              {schedule.doctorRequired && (
                <View style={styles.doctorBadge}>
                  <Text style={styles.doctorBadgeText}>🩺 Wajib Dokter</Text>
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      ANC_STATUS_BADGES[schedule.status]?.bg ?? "#EFF6FF",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        ANC_STATUS_BADGES[schedule.status]?.text ?? "#1D4ED8",
                    },
                  ]}
                >
                  {ANC_STATUS_BADGES[schedule.status]?.label ?? schedule.status}
                </Text>
              </View>
            </View>

            {schedule.facility?.name && (
              <Text style={styles.facilityText}>
                📍 Lokasi: {schedule.facility.name}
              </Text>
            )}

            {schedule.notes && (
              <Text style={styles.notesText}>Catatan: {schedule.notes}</Text>
            )}
          </View>

          {schedule.status === "SCHEDULED" && !confirmed && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isAncAppointmentDayArrived(schedule.scheduledAt)
                  ? "Konfirmasi sudah datang"
                  : "Belum hari pemeriksaan"
              }
              style={[
                styles.confirmButton,
                (!isAncAppointmentDayArrived(schedule.scheduledAt) ||
                  confirmMutation.isPending) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={
                !isAncAppointmentDayArrived(schedule.scheduledAt) ||
                confirmMutation.isPending
              }
            >
              {confirmMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {isAncAppointmentDayArrived(schedule.scheduledAt)
                    ? "✓ Konfirmasi Sudah Hadir"
                    : "Belum Hari Pemeriksaan"}
                </Text>
              )}
            </Pressable>
          )}

          {confirmed && (
            <View style={styles.successBox}>
              <Text style={styles.successBoxText}>
                ✓ Terima kasih, kehadiran pemeriksaan telah dikonfirmasi!
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Belum ada jadwal ANC mendatang dari bidan.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka panduan jadwal"
            style={styles.outlineButton}
            onPress={() => router.push("/mother/anc")}
          >
            <Text style={styles.outlineButtonText}>Lihat Standar Jadwal ANC</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ==========================================
// 2. Daily Iron Tablet (TTD) Card
// ==========================================
export function DailyIronTabletCard({
  reminder,
  isLoading,
}: {
  reminder: Reminder | null | undefined;
  isLoading?: boolean;
}) {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const completeMutation = useCompleteReminder();
  const snoozeMutation = useSnoozeReminder();

  const handleComplete = async () => {
    if (!reminder) return;
    try {
      await completeMutation.mutateAsync(reminder.publicId);
    } catch (e) {
      console.warn("Failed to complete TTD reminder", e);
    }
  };

  const handleSnooze = async (minutes: 10 | 30 | 60) => {
    if (!reminder) return;
    try {
      await snoozeMutation.mutateAsync({
        publicId: reminder.publicId,
        input: { minutes },
      });
      await scheduleSnoozeReminder(minutes);
      setShowSnoozeOptions(false);
    } catch (e) {
      console.warn("Failed to snooze TTD reminder", e);
    }
  };

  const isCompleted = reminder?.status === "COMPLETED";
  const isSnoozed = reminder?.status === "SNOOZED";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.cardBadge}>PENGINGAT HARIAN</Text>
          <Text style={styles.cardTitle}>Tablet Tambah Darah (TTD)</Text>
        </View>
        <Text style={styles.pillTime}>
          {reminder?.reminderTime ?? "20:00"} WIT
        </Text>
      </View>

      <Text style={styles.instructionText}>
        Minum 1 tablet setiap hari untuk mencegah anemia dan mendukung tumbuh
        kembang janin secara optimal.
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : isCompleted ? (
        <View style={styles.completedBox}>
          <Text style={styles.completedBoxText}>
            ✓ Hebat! Ibu sudah meminum tablet tambah darah hari ini.
          </Text>
        </View>
      ) : (
        <View style={styles.actionContainer}>
          {isSnoozed && (
            <View style={styles.snoozedBanner}>
              <Text style={styles.snoozedBannerText}>
                ⏰ Ditunda hingga:{" "}
                {reminder?.snoozedUntil
                  ? formatAncTime(reminder.snoozedUntil)
                  : "Nanti"}
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Konfirmasi sudah minum"
              style={[
                styles.primaryActionButton,
                completeMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={handleComplete}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryActionButtonText}>
                  💊 Sudah Minum
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tunda reminder"
              style={styles.secondaryActionButton}
              onPress={() => setShowSnoozeOptions(!showSnoozeOptions)}
            >
              <Text style={styles.secondaryActionButtonText}>⏱ Tunda</Text>
            </Pressable>
          </View>

          {showSnoozeOptions && (
            <View style={styles.snoozeMenu}>
              <Text style={styles.snoozeMenuTitle}>Pilih waktu tunda:</Text>
              <View style={styles.snoozeButtonsRow}>
                {[10, 30, 60].map((mins) => (
                  <Pressable
                    key={mins}
                    accessibilityRole="button"
                    accessibilityLabel={`Tunda ${mins} menit`}
                    style={styles.snoozeOptionBtn}
                    onPress={() => handleSnooze(mins as 10 | 30 | 60)}
                    disabled={snoozeMutation.isPending}
                  >
                    <Text style={styles.snoozeOptionText}>
                      {mins === 60 ? "1 Jam" : `${mins} Menit`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ==========================================
// 3. Adherence Summary Card
// ==========================================
export function AdherenceSummaryCard({
  adherence,
  isLoading,
}: {
  adherence: AdherenceSummary | null | undefined;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.mutedText}>Memuat rekap kepatuhan...</Text>
      </View>
    );
  }

  if (!adherence) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.cardBadge}>REKAP KEPATUHAN</Text>
          <Text style={styles.cardTitle}>Kepatuhan Perawatan</Text>
        </View>
        <View style={styles.adherenceScoreBadge}>
          <Text style={styles.adherenceScoreText}>
            {adherence.ironTabletsAdherencePercentage}% Patuh
          </Text>
        </View>
      </View>

      {/* Progress Bar TTD */}
      <View style={styles.metricSection}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Tablet Tambah Darah (30 Hari)</Text>
          <Text style={styles.metricValue}>
            {adherence.ironTabletsCompleted} / {adherence.ironTabletsTotal}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(
                  100,
                  adherence.ironTabletsAdherencePercentage,
                )}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* ANC Stats Grid */}
      <View style={styles.ancStatsRow}>
        <View style={styles.ancStatCol}>
          <Text style={styles.ancStatNumber}>{adherence.ancCompleted}</Text>
          <Text style={styles.ancStatLabel}>Sudah Hadir</Text>
        </View>
        <View style={styles.ancStatCol}>
          <Text style={styles.ancStatNumber}>
            {adherence.ancMissedUnconfirmed}
          </Text>
          <Text style={styles.ancStatLabel}>Belum Hadir</Text>
        </View>
        <View style={styles.ancStatCol}>
          <Text style={styles.ancStatNumber}>
            {adherence.ancTotalScheduled}
          </Text>
          <Text style={styles.ancStatLabel}>Total Terjadwal</Text>
        </View>
      </View>
    </View>
  );
}

// ==========================================
// 4. Reminder Settings Modal
// ==========================================
export function ReminderSettingsModal({
  visible,
  settings,
  onClose,
}: {
  visible: boolean;
  settings: MotherReminderSettings | null | undefined;
  onClose: () => void;
}) {
  const updateMutation = useUpdateReminderSettings();
  const [ironEnabled, setIronEnabled] = useState(
    settings?.ironTabletEnabled ?? true,
  );
  const [ironTime, setIronTime] = useState(settings?.ironTabletTime ?? "20:00");
  const [ancEnabled, setAncEnabled] = useState(
    settings?.ancReminderEnabled ?? true,
  );
  const [ancDaysBefore, setAncDaysBefore] = useState(
    settings?.ancReminderDaysBefore ?? 1,
  );

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        ironTabletEnabled: ironEnabled,
        ironTabletTime: ironTime,
        ancReminderEnabled: ancEnabled,
        ancReminderDaysBefore: ancDaysBefore,
      });
      onClose();
    } catch (e) {
      console.warn("Failed to update reminder settings", e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Pengaturan Pengingat</Text>
          <Text style={styles.modalSubtitle}>
            Atur jam dan frekuensi notifikasi sesuai kenyamanan Ibu.
          </Text>

          {/* TTD Toggle */}
          <View style={styles.settingItem}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Pengingat Tablet Darah</Text>
              <Text style={styles.settingDesc}>
                Notifikasi setiap malam untuk minum tablet
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle pengingat tablet darah"
              style={[
                styles.toggleBtn,
                ironEnabled ? styles.toggleOn : styles.toggleOff,
              ]}
              onPress={() => setIronEnabled(!ironEnabled)}
            >
              <Text style={styles.toggleText}>{ironEnabled ? "AKTIF" : "OFF"}</Text>
            </Pressable>
          </View>

          {/* TTD Time Options */}
          {ironEnabled && (
            <View style={styles.timeOptionRow}>
              {["19:00", "20:00", "21:00", "21:30"].map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityLabel={`Pilih jam ${t}`}
                  style={[
                    styles.timeChoice,
                    ironTime === t && styles.timeChoiceSelected,
                  ]}
                  onPress={() => setIronTime(t)}
                >
                  <Text
                    style={[
                      styles.timeChoiceText,
                      ironTime === t && styles.timeChoiceTextSelected,
                    ]}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* ANC Toggle */}
          <View style={styles.settingItem}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Pengingat Kunjungan ANC</Text>
              <Text style={styles.settingDesc}>
                Notifikasi sebelum tanggal pemeriksaan tiba
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle pengingat kunjungan ANC"
              style={[
                styles.toggleBtn,
                ancEnabled ? styles.toggleOn : styles.toggleOff,
              ]}
              onPress={() => setAncEnabled(!ancEnabled)}
            >
              <Text style={styles.toggleText}>{ancEnabled ? "AKTIF" : "OFF"}</Text>
            </Pressable>
          </View>

          {/* ANC Days Before Options */}
          {ancEnabled && (
            <View style={styles.timeOptionRow}>
              {[
                { label: "Hari-H", val: 0 },
                { label: "H-1", val: 1 },
                { label: "H-2", val: 2 },
                { label: "H-3", val: 3 },
              ].map((opt) => (
                <Pressable
                  key={opt.val}
                  accessibilityRole="button"
                  accessibilityLabel={`Pilih pengingat ${opt.label}`}
                  style={[
                    styles.timeChoice,
                    ancDaysBefore === opt.val && styles.timeChoiceSelected,
                  ]}
                  onPress={() => setAncDaysBefore(opt.val)}
                >
                  <Text
                    style={[
                      styles.timeChoiceText,
                      ancDaysBefore === opt.val && styles.timeChoiceTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.modalActionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Batal"
              style={styles.modalCancelBtn}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Batal</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Simpan pengaturan"
              style={styles.modalSaveBtn}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.modalSaveText}>Simpan</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: colors.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  linkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  contentWrap: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  scheduleInfo: {
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 6,
  },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  timeText: {
    fontSize: 12,
    color: "#64748B",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  doctorBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  doctorBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  facilityText: {
    fontSize: 12,
    color: "#475569",
  },
  notesText: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
  },
  confirmButton: {
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successBox: {
    backgroundColor: "#ECFDF5",
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  successBoxText: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "600",
    textAlign: "center",
  },
  emptyContainer: {
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  outlineButton: {
    minHeight: minimumTouchTarget,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  centerContainer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  mutedText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  pillTime: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F766E",
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  instructionText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  completedBox: {
    backgroundColor: "#F0FDF4",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  completedBoxText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  actionContainer: {
    gap: spacing.xs,
  },
  snoozedBanner: {
    backgroundColor: "#FFFBEB",
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  snoozedBannerText: {
    color: "#92400E",
    fontSize: 11,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryActionButton: {
    flex: 2,
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: minimumTouchTarget,
    backgroundColor: "#F1F5F9",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionButtonText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  snoozeMenu: {
    backgroundColor: "#F8FAFC",
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
    marginTop: 4,
  },
  snoozeMenuTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  snoozeButtonsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  snoozeOptionBtn: {
    flex: 1,
    minHeight: 36,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  snoozeOptionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  adherenceScoreBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  adherenceScoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  metricSection: {
    gap: 6,
    marginTop: spacing.xs,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricLabel: {
    fontSize: 12,
    color: "#475569",
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 999,
  },
  ancStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  ancStatCol: {
    alignItems: "center",
    gap: 2,
  },
  ancStatNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  ancStatLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: -4,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: spacing.sm,
  },
  settingTextWrap: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  settingDesc: {
    fontSize: 11,
    color: "#64748B",
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  toggleOn: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  toggleOff: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  toggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  timeOptionRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  timeChoice: {
    flex: 1,
    minHeight: 36,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  timeChoiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChoiceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  timeChoiceTextSelected: {
    color: colors.white,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: minimumTouchTarget,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalSaveBtn: {
    flex: 2,
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
});
