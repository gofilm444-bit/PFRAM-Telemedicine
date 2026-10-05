import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  MonitoringCreateInput,
  MonitoringPeriodFilter,
  MonitoringQuery,
  MonitoringUpdateInput,
  PregnancySummary,
} from "@pfram/shared-types";
import {
  buildMonitoringQueryForPeriod,
  createMidwifeMotherMonitoring,
  getMidwifeMotherMonitoringDetail,
  getMidwifeMotherMonitoringList,
  getMidwifeMotherMonitoringSummary,
  mapToBloodPressureChartPoints,
  mapToWeightChartPoints,
  motherMonitoringApi,
} from "./monitoring-api";

export const midwifeMonitoringKeys = {
  all: (motherPublicId: string) =>
    ["midwife", "monitoring", motherPublicId] as const,
  summary: (motherPublicId: string) =>
    ["midwife", "monitoring", motherPublicId, "summary"] as const,
  lists: (motherPublicId: string) =>
    ["midwife", "monitoring", motherPublicId, "list"] as const,
  list: (motherPublicId: string, query?: MonitoringQuery) =>
    ["midwife", "monitoring", motherPublicId, "list", query ?? {}] as const,
  details: (motherPublicId: string) =>
    ["midwife", "monitoring", motherPublicId, "detail"] as const,
  detail: (motherPublicId: string, publicId: string) =>
    ["midwife", "monitoring", motherPublicId, "detail", publicId] as const,
};

export function useMidwifeMonitoringSummary(motherPublicId: string) {
  return useQuery({
    queryKey: midwifeMonitoringKeys.summary(motherPublicId),
    queryFn: () => getMidwifeMotherMonitoringSummary(motherPublicId),
    enabled: Boolean(motherPublicId),
      });
}

export function useMidwifeMonitoringList(
  motherPublicId: string,
  query?: MonitoringQuery,
) {
  return useQuery({
    queryKey: midwifeMonitoringKeys.list(motherPublicId, query),
    queryFn: () => getMidwifeMotherMonitoringList(motherPublicId, query),
    enabled: Boolean(motherPublicId),
      });
}

export function useMidwifeMonitoringDetail(
  motherPublicId: string,
  publicId: string | null | undefined,
) {
  return useQuery({
    queryKey: midwifeMonitoringKeys.detail(motherPublicId, publicId ?? ""),
    queryFn: () => getMidwifeMotherMonitoringDetail(motherPublicId, publicId!),
    enabled: Boolean(motherPublicId && publicId),
      });
}

export function useCreateMidwifeMonitoring(motherPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MonitoringCreateInput) =>
      createMidwifeMotherMonitoring(motherPublicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeMonitoringKeys.summary(motherPublicId),
      });
      queryClient.invalidateQueries({
        queryKey: midwifeMonitoringKeys.lists(motherPublicId),
      });
    },
  });
}

export function useMidwifeMonitoringChartData(
  motherPublicId: string,
  filter: MonitoringPeriodFilter,
  pregnancy?: PregnancySummary | null,
) {
  const query = useMemo(
    () => buildMonitoringQueryForPeriod(filter, pregnancy?.publicId),
    [filter, pregnancy?.publicId],
  );

  const listQuery = useMidwifeMonitoringList(motherPublicId, query);

  const weightPoints = useMemo(
    () => mapToWeightChartPoints(listQuery.data?.items ?? [], pregnancy),
    [listQuery.data?.items, pregnancy],
  );

  const bpPoints = useMemo(
    () => mapToBloodPressureChartPoints(listQuery.data?.items ?? [], pregnancy),
    [listQuery.data?.items, pregnancy],
  );

  return {
    ...listQuery,
    query,
    weightPoints,
    bpPoints,
    totalItems: listQuery.data?.total ?? 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  Mother PWA Monitoring Query Keys & Hooks                                  */
/* -------------------------------------------------------------------------- */

export const motherMonitoringKeys = {
  all: () => ["mother", "monitoring"] as const,
  summary: () => ["mother", "monitoring", "summary"] as const,
  lists: () => ["mother", "monitoring", "list"] as const,
  list: (query?: MonitoringQuery) =>
    ["mother", "monitoring", "list", query ?? {}] as const,
  details: () => ["mother", "monitoring", "detail"] as const,
  detail: (publicId: string) =>
    ["mother", "monitoring", "detail", publicId] as const,
};

export function useMotherMonitoringSummary() {
  return useQuery({
    queryKey: motherMonitoringKeys.summary(),
    queryFn: () => motherMonitoringApi.getMonitoringSummary(),
    retry: 1,
    staleTime: 30_000,
  });
}

export function useMotherMonitoringList(query?: MonitoringQuery) {
  return useQuery({
    queryKey: motherMonitoringKeys.list(query),
    queryFn: () => motherMonitoringApi.getMonitoringList(query),
    retry: 1,
    staleTime: 30_000,
  });
}

export function useMotherMonitoringDetail(publicId: string | null | undefined) {
  return useQuery({
    queryKey: motherMonitoringKeys.detail(publicId ?? ""),
    queryFn: () => motherMonitoringApi.getMonitoringDetail(publicId!),
    enabled: Boolean(publicId),
  });
}

export function useCreateMotherMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MonitoringCreateInput) =>
      motherMonitoringApi.createMonitoring(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: motherMonitoringKeys.all(),
      });
    },
  });
}

export function useUpdateMotherMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      publicId,
      input,
    }: {
      publicId: string;
      input: MonitoringUpdateInput;
    }) => motherMonitoringApi.updateMonitoring(publicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: motherMonitoringKeys.all(),
      });
    },
  });
}

export function useArchiveMotherMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) =>
      motherMonitoringApi.archiveMonitoring(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: motherMonitoringKeys.all(),
      });
    },
  });
}

export function useMotherMonitoringChartData(
  filter: MonitoringPeriodFilter,
  pregnancy?: PregnancySummary | null,
) {
  const query = useMemo(
    () => buildMonitoringQueryForPeriod(filter, pregnancy?.publicId),
    [filter, pregnancy?.publicId],
  );

  const listQuery = useMotherMonitoringList(query);

  const weightPoints = useMemo(
    () => mapToWeightChartPoints(listQuery.data?.items ?? [], pregnancy),
    [listQuery.data?.items, pregnancy],
  );

  const bpPoints = useMemo(
    () => mapToBloodPressureChartPoints(listQuery.data?.items ?? [], pregnancy),
    [listQuery.data?.items, pregnancy],
  );

  return {
    ...listQuery,
    query,
    weightPoints,
    bpPoints,
    totalItems: listQuery.data?.total ?? 0,
  };
}
