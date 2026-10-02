import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  AncScheduleCreateInput,
  AncScheduleUpdateInput,
} from "@pfram/shared-types";
import { midwifeAncApi } from "./anc-api";

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
