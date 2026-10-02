export const scheduledNotifications = [];

export const setNotificationHandler = (handler) => handler;

export const getPermissionsAsync = async () => ({
  status: "granted",
  granted: true,
  canAskAgain: true,
  expires: "never",
});

export const requestPermissionsAsync = async () => ({
  status: "granted",
  granted: true,
  canAskAgain: true,
  expires: "never",
});

export const scheduleNotificationAsync = async (request) => {
  const identifier = "notif-" + Math.random().toString(36).substring(2, 9);
  scheduledNotifications.push({ identifier, ...request });
  return identifier;
};

export const cancelScheduledNotificationAsync = async (identifier) => {
  const index = scheduledNotifications.findIndex((n) => n.identifier === identifier);
  if (index !== -1) {
    scheduledNotifications.splice(index, 1);
  }
};

export const cancelAllScheduledNotificationsAsync = async () => {
  scheduledNotifications.length = 0;
};

export const getAllScheduledNotificationsAsync = async () => [...scheduledNotifications];

export const SchedulableTriggerInputTypes = {
  DAILY: "daily",
  TIME_INTERVAL: "timeInterval",
  DATE: "date",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

export default {
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  SchedulableTriggerInputTypes,
};
