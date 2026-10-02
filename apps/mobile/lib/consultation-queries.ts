import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConsultationMessageCreateInput,
  ConsultationQuery,
} from "@pfram/shared-types";
import {
  getMotherConsultationMessages,
  getMotherConsultationThread,
  markMotherConsultationRead,
  sendMotherConsultationMessage,
  videoConsultationApi,
} from "./consultation-api";

export const motherVideoConsultationKeys = {
  all: ["mother", "video-consultation"] as const,
  upcoming: () => ["mother", "video-consultation", "upcoming"] as const,
  list: (params?: unknown) =>
    ["mother", "video-consultation", "list", params ?? "default"] as const,
};

export function useMotherUpcomingVideoConsultation() {
  return useQuery({
    queryKey: motherVideoConsultationKeys.upcoming(),
    queryFn: () => videoConsultationApi.getUpcoming(),
    refetchInterval: 15000,
    retry: 1,
  });
}

export const motherConsultationKeys = {
  all: ["mother", "consultation"] as const,
  thread: () => ["mother", "consultation", "thread"] as const,
  messages: (query?: ConsultationQuery) =>
    ["mother", "consultation", "messages", query ?? "default"] as const,
};

export function useMotherConsultationThread() {
  return useQuery({
    queryKey: motherConsultationKeys.thread(),
    queryFn: getMotherConsultationThread,
    refetchInterval: 10000, // 10s light polling for thread updates
    retry: 1,
  });
}

export function useMotherConsultationMessages(query?: ConsultationQuery) {
  return useQuery({
    queryKey: motherConsultationKeys.messages(query),
    queryFn: () => getMotherConsultationMessages(query),
    refetchInterval: 5000, // 5s active polling for real-time chat feel without web sockets
    retry: 1,
  });
}

export function useSendMotherConsultationMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsultationMessageCreateInput) =>
      sendMotherConsultationMessage(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: motherConsultationKeys.all,
      });
    },
  });
}

export function useMarkMotherConsultationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markMotherConsultationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: motherConsultationKeys.thread(),
      });
    },
  });
}
