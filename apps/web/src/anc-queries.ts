import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  AncScheduleCreateInput,
  AncScheduleUpdateInput,
} from "@pfram/shared-types";
import { midwifeAncApi, motherAncApi } from "./anc-api";

export const midwifeAncKeys = {
  all: ["midwife", "anc"] as const,
  schedules: (motherPublicId: string, query?: unknown) =>
    ["midwife", "mother", motherPublicId, "anc-schedules", query ?? {}] as const,
  adherence: (motherPublicId: string) =>
    ["midwife", "mother", motherPublicId, "adherence-summary"] as const,
  missed: () => ["midwife", "anc-missed"] as const,
};

export function useMidwifeMotherSchedules(
  motherPublicId: string,
  query?: { status?: string; page?: number; limit?: number; sort?: "asc" | "desc" },
) {
  return useQuery({
    queryKey: midwifeAncKeys.schedules(motherPublicId, query),
    queryFn: () => midwifeAncApi.getMotherSchedules(motherPublicId, query),
    enabled: Boolean(motherPublicId),
  });
}

export function useMidwifeMotherAdherence(motherPublicId: string) {
  return useQuery({
    queryKey: midwifeAncKeys.adherence(motherPublicId),
    queryFn: () => midwifeAncApi.getMotherAdherenceSummary(motherPublicId),
    enabled: Boolean(motherPublicId),
  });
}

export function useMidwifeMissedAnc() {
  return useQuery({
    queryKey: midwifeAncKeys.missed(),
    queryFn: () => midwifeAncApi.getMissedAnc(),
  });
}

export function useCreateMidwifeMotherSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      motherPublicId,
      input,
    }: {
      motherPublicId: string;
      input: AncScheduleCreateInput;
    }) => midwifeAncApi.createMotherSchedule(motherPublicId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["midwife", "mother", variables.motherPublicId, "anc-schedules"],
      });
      queryClient.invalidateQueries({
        queryKey: midwifeAncKeys.adherence(variables.motherPublicId),
      });
      queryClient.invalidateQueries({
        queryKey: midwifeAncKeys.missed(),
      });
    },
  });
}

export function useUpdateMidwifeMotherSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      motherPublicId,
      schedulePublicId,
      input,
    }: {
      motherPublicId: string;
      schedulePublicId: string;
      input: AncScheduleUpdateInput;
    }) =>
      midwifeAncApi.updateMotherSchedule(
        motherPublicId,
        schedulePublicId,
        input,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["midwife", "mother", variables.motherPublicId, "anc-schedules"],
      });
      queryClient.invalidateQueries({
        queryKey: midwifeAncKeys.adherence(variables.motherPublicId),
      });
      queryClient.invalidateQueries({
        queryKey: midwifeAncKeys.missed(),
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Mother ANC Queries & Mutations                                            */
/* -------------------------------------------------------------------------- */

export const motherAncKeys = {
  all: ["mother", "anc"] as const,
  upcoming: () => ["mother", "anc", "upcoming"] as const,
  schedules: (query?: unknown) =>
    ["mother", "anc", "schedules", query ?? "all"] as const,
  detail: (publicId: string) =>
    ["mother", "anc", "schedule", publicId] as const,
  adherence: () => ["mother", "anc", "adherence"] as const,
  reminders: (query?: unknown) =>
    ["mother", "anc", "reminders", query ?? "all"] as const,
  settings: () => ["mother", "anc", "settings"] as const,
  recommendations: () => ["mother", "anc", "recommendations"] as const,
};

export function useMotherUpcomingAnc() {
  return useQuery({
    queryKey: motherAncKeys.upcoming(),
    queryFn: () => motherAncApi.getUpcomingSchedule(),
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
    queryKey: motherAncKeys.schedules(query),
    queryFn: () => motherAncApi.getSchedules(query),
    retry: 1,
  });
}

export function useMotherAdherenceSummary() {
  return useQuery({
    queryKey: motherAncKeys.adherence(),
    queryFn: () => motherAncApi.getAdherenceSummary(),
    retry: 1,
  });
}

export function useMotherRecommendations() {
  return useQuery({
    queryKey: motherAncKeys.recommendations(),
    queryFn: () => motherAncApi.getRecommendations(),
    retry: 1,
  });
}

export function useConfirmAncAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) => motherAncApi.confirmAttendance(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motherAncKeys.all });
      queryClient.invalidateQueries({ queryKey: ["mother", "anc"] });
    },
  });
}
