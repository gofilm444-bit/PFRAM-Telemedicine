import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ReminderSettingsUpdateInput,
  ReminderSnoozeInput,
} from "@pfram/shared-types";
import {
  confirmAncAttendance,
  completeMotherReminder,
  getMotherAdherenceSummary,
  getMotherAncDetail,
  getMotherAncSchedules,
  getMotherRecommendations,
  getMotherReminders,
  getMotherReminderSettings,
  getMotherUpcomingAnc,
  snoozeMotherReminder,
  updateMotherReminderSettings,
} from "./anc-api";

export const ancKeys = {
  all: ["anc"] as const,
  upcoming: () => ["anc", "upcoming"] as const,
  schedules: (query?: unknown) => ["anc", "schedules", query ?? "all"] as const,
  scheduleDetail: (publicId: string) => ["anc", "schedules", publicId] as const,
  adherence: () => ["anc", "adherence"] as const,
  reminders: (query?: unknown) => ["anc", "reminders", query ?? "all"] as const,
  settings: () => ["anc", "settings"] as const,
  recommendations: () => ["anc", "recommendations"] as const,
};

export function useMotherUpcomingAnc() {
  return useQuery({
    queryKey: ancKeys.upcoming(),
    queryFn: () => getMotherUpcomingAnc(),
    retry: 1,
  });
}

export function useMotherAncSchedules(query?: {
  status?: string;
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ancKeys.schedules(query),
    queryFn: () => getMotherAncSchedules(query),
    retry: 1,
  });
}

export function useMotherAncDetail(publicId: string | null | undefined) {
  return useQuery({
    queryKey: ancKeys.scheduleDetail(publicId ?? ""),
    queryFn: () => getMotherAncDetail(publicId!),
    enabled: Boolean(publicId),
    retry: 1,
  });
}

export function useMotherAdherenceSummary() {
  return useQuery({
    queryKey: ancKeys.adherence(),
    queryFn: () => getMotherAdherenceSummary(),
    retry: 1,
  });
}

export function useMotherReminders(query?: {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ancKeys.reminders(query),
    queryFn: () => getMotherReminders(query),
    retry: 1,
  });
}

export function useMotherReminderSettings() {
  return useQuery({
    queryKey: ancKeys.settings(),
    queryFn: () => getMotherReminderSettings(),
    retry: 1,
  });
}

export function useMotherRecommendations() {
  return useQuery({
    queryKey: ancKeys.recommendations(),
    queryFn: () => getMotherRecommendations(),
    retry: 1,
  });
}

export function useConfirmAncAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (publicId: string) => confirmAncAttendance(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ancKeys.all });
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (publicId: string) => completeMotherReminder(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ancKeys.all });
    },
  });
}

export function useSnoozeReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      publicId,
      input,
    }: {
      publicId: string;
      input: ReminderSnoozeInput;
    }) => snoozeMotherReminder(publicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ancKeys.all });
    },
  });
}

export function useUpdateReminderSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReminderSettingsUpdateInput) =>
      updateMotherReminderSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ancKeys.settings() });
    },
  });
}
