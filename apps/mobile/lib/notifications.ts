import * as Notifications from "expo-notifications";

// Set notification presentation options
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Gracefully ignored in environments where native module isn't loaded
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch {
    return false;
  }
}

export function parseHourMinute(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(":");
  const hour = parseInt(parts[0] ?? "20", 10);
  const minute = parseInt(parts[1] ?? "00", 10);
  return {
    hour: isNaN(hour) ? 20 : Math.min(23, Math.max(0, hour)),
    minute: isNaN(minute) ? 0 : Math.min(59, Math.max(0, minute)),
  };
}

export async function scheduleDailyIronTabletReminder(
  timeStr: string = "20:00",
): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const { hour, minute } = parseHourMinute(timeStr);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Waktunya Minum Tablet Tambah Darah (TTD) 💊",
        body: "Minum 1 tablet tambah darah dengan air putih untuk cegah anemia. Ketuk untuk konfirmasi 'Sudah Minum'.",
        data: { type: "IRON_TABLET" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  } catch (error) {
    console.warn("Failed to schedule daily iron tablet reminder", error);
    return null;
  }
}

export async function scheduleAncVisitReminder(
  schedulePublicId: string,
  scheduledAt: Date,
  daysBefore: number = 1,
  timeStr: string = "08:00",
): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const { hour, minute } = parseHourMinute(timeStr);

  // Target date is scheduledAt minus daysBefore
  const reminderDate = new Date(scheduledAt);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);
  reminderDate.setHours(hour, minute, 0, 0);

  const secondsUntil = Math.floor((reminderDate.getTime() - Date.now()) / 1000);
  if (secondsUntil <= 0) return null; // Time is already past

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Pengingat Pemeriksaan Kehamilan (ANC) 🩺",
        body:
          daysBefore === 0
            ? "Hari ini jadwal pemeriksaan ANC Anda. Jangan lupa membawa buku KIA dan kartu identitas."
            : `${daysBefore} hari lagi jadwal pemeriksaan ANC Anda. Pastikan kondisi siap ya Bu!`,
        data: { type: "ANC_VISIT", schedulePublicId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
      },
    });
    return id;
  } catch (error) {
    console.warn("Failed to schedule ANC visit reminder", error);
    return null;
  }
}

export async function scheduleSnoozeReminder(
  minutes: 10 | 30 | 60,
): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Pengingat TTD (Waktu Tunda Selesai) 💊",
        body: `Waktu tunda ${minutes} menit selesai. Yuk minum tablet tambah darah sekarang demi kesehatan Ibu dan Buah Hati!`,
        data: { type: "IRON_TABLET_SNOOZED" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutes * 60,
      },
    });
    return id;
  } catch (error) {
    console.warn("Failed to schedule snooze reminder", error);
    return null;
  }
}

export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn("Failed to cancel notification", error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn("Failed to cancel all notifications", error);
  }
}
