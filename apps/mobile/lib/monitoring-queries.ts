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
  archiveMonitoring,
  buildMonitoringQueryForPeriod,
  createMonitoring,
  getMonitoringDetail,
  getMonitoringList,
  getMonitoringSummary,
  mapToBloodPressureChartPoints,
  mapToWeightChartPoints,
  updateMonitoring,
} from "./monitoring-api";

export const monitoringKeys = {
  all: ["monitoring"] as const,
  summary: () => ["monitoring", "summary"] as const,
  lists: () => ["monitoring", "list"] as const,
  list: (query?: MonitoringQuery) => ["monitoring", "list", query ?? {}] as const,
  details: () => ["monitoring", "detail"] as const,
  detail: (publicId: string) => ["monitoring", "detail", publicId] as const,
};

export function useMonitoringSummary() {
  return useQuery({
    queryKey: monitoringKeys.summary(),
    queryFn: () => getMonitoringSummary(),
    retry: 1,
  });
}

export function useMonitoringList(query?: MonitoringQuery) {
  return useQuery({
    queryKey: monitoringKeys.list(query),
    queryFn: () => getMonitoringList(query),
    retry: 1,
  });
}

export function useMonitoringDetail(publicId: string | undefined | null) {
  return useQuery({
    queryKey: monitoringKeys.detail(publicId ?? ""),
    queryFn: () => getMonitoringDetail(publicId!),
    enabled: Boolean(publicId),
    retry: 1,
  });
}

export function useCreateMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MonitoringCreateInput) => createMonitoring(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.summary() });
      queryClient.invalidateQueries({ queryKey: monitoringKeys.lists() });
    },
  });
}

export function useUpdateMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      publicId,
      input,
    }: {
      publicId: string;
      input: MonitoringUpdateInput;
    }) => updateMonitoring(publicId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.summary() });
      queryClient.invalidateQueries({ queryKey: monitoringKeys.lists() });
      if (data?.publicId) {
        queryClient.invalidateQueries({
          queryKey: monitoringKeys.detail(data.publicId),
        });
      }
    },
  });
}

export function useArchiveMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) => archiveMonitoring(publicId),
    onSuccess: (_data, publicId) => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.summary() });
      queryClient.invalidateQueries({ queryKey: monitoringKeys.lists() });
      if (publicId) {
        queryClient.invalidateQueries({
          queryKey: monitoringKeys.detail(publicId),
        });
      }
    },
  });
}

export function useMonitoringChartData(
  filter: MonitoringPeriodFilter,
  pregnancy?: PregnancySummary | null,
) {
  const query = useMemo(
    () => buildMonitoringQueryForPeriod(filter, pregnancy?.publicId),
    [filter, pregnancy?.publicId],
  );

  const listQuery = useMonitoringList(query);

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
