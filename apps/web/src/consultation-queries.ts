import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ConsultationAttentionFlag,
  ConsultationAttentionUpdateInput,
  ConsultationMessageCreateInput,
  ConsultationQuery,
  ConsultationStatusUpdateInput,
  ConsultationThreadStatus,
  VideoConsultationCreateInput,
  VideoConsultationQuery,
  VideoConsultationStatusUpdateInput,
  VideoConsultationUpdateInput,
} from "@pfram/shared-types";
import {
  getMidwifeConsultationMessages,
  getMidwifeConsultationThread,
  getMidwifeConsultationThreads,
  markMidwifeConsultationRead,
  sendMidwifeConsultationMessage,
  updateMidwifeConsultationAttention,
  updateMidwifeConsultationStatus,
  getMidwifeVideoConsultations,
  createMidwifeVideoConsultation,
  updateMidwifeVideoConsultation,
  updateMidwifeVideoConsultationStatus,
} from "./consultation-api";

export const midwifeConsultationKeys = {
  all: ["midwife-consultation"] as const,
  threads: (query?: {
    status?: ConsultationThreadStatus | undefined;
    attention?: ConsultationAttentionFlag | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }) => ["midwife-consultation", "threads", query ?? "all"] as const,
  thread: (threadPublicId: string) =>
    ["midwife-consultation", "thread", threadPublicId] as const,
  messages: (threadPublicId: string, query?: ConsultationQuery) =>
    ["midwife-consultation", "messages", threadPublicId, query ?? "default"] as const,
};

export function useMidwifeConsultationThreads(query?: {
  status?: ConsultationThreadStatus | undefined;
  attention?: ConsultationAttentionFlag | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}) {
  return useQuery({
    queryKey: midwifeConsultationKeys.threads(query),
    queryFn: () => getMidwifeConsultationThreads(query),
    refetchInterval: 10000, // 10s polling for threads list
    retry: 1,
  });
}

export function useMidwifeConsultationThread(threadPublicId: string) {
  return useQuery({
    queryKey: midwifeConsultationKeys.thread(threadPublicId),
    queryFn: () => getMidwifeConsultationThread(threadPublicId),
    enabled: Boolean(threadPublicId),
    retry: 1,
  });
}

export function useMidwifeConsultationMessages(
  threadPublicId: string,
  query?: ConsultationQuery,
) {
  return useQuery({
    queryKey: midwifeConsultationKeys.messages(threadPublicId, query),
    queryFn: () => getMidwifeConsultationMessages(threadPublicId, query),
    enabled: Boolean(threadPublicId),
    refetchInterval: 5000, // 5s active polling for chat
    retry: 1,
  });
}

export function useSendMidwifeConsultationMessage(threadPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsultationMessageCreateInput) =>
      sendMidwifeConsultationMessage(threadPublicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeConsultationKeys.messages(threadPublicId),
      });
      queryClient.invalidateQueries({
        queryKey: midwifeConsultationKeys.threads(),
      });
      queryClient.invalidateQueries({
        queryKey: midwifeConsultationKeys.thread(threadPublicId),
      });
    },
  });
}

export function useUpdateMidwifeConsultationAttention(threadPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsultationAttentionUpdateInput) =>
      updateMidwifeConsultationAttention(threadPublicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeConsultationKeys.all,
      });
    },
  });
}

export function useUpdateMidwifeConsultationStatus(threadPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsultationStatusUpdateInput) =>
      updateMidwifeConsultationStatus(threadPublicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeConsultationKeys.all,
      });
    },
  });
}

export function useMarkMidwifeConsultationRead(threadPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markMidwifeConsultationRead(threadPublicId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeConsultationKeys.threads(),
      });
      queryClient.invalidateQueries({
        queryKey: midwifeConsultationKeys.thread(threadPublicId),
      });
    },
  });
}

// ==========================================
// TAHAP 10 — VIDEO CALL QUERIES (WEB MIDWIFE)
// ==========================================

export const midwifeVideoConsultationKeys = {
  all: ["midwife-video-consultation"] as const,
  list: (query?: VideoConsultationQuery) =>
    ["midwife-video-consultation", "list", query ?? "all"] as const,
};

export function useMidwifeVideoConsultations(query?: VideoConsultationQuery) {
  return useQuery({
    queryKey: midwifeVideoConsultationKeys.list(query),
    queryFn: () => getMidwifeVideoConsultations(query),
    refetchInterval: 10000,
    retry: 1,
  });
}

export function useCreateVideoConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VideoConsultationCreateInput) =>
      createMidwifeVideoConsultation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeVideoConsultationKeys.all,
      });
    },
  });
}

export function useUpdateVideoConsultation(publicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VideoConsultationUpdateInput) =>
      updateMidwifeVideoConsultation(publicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeVideoConsultationKeys.all,
      });
    },
  });
}

export function useUpdateVideoConsultationStatus(publicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VideoConsultationStatusUpdateInput) =>
      updateMidwifeVideoConsultationStatus(publicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: midwifeVideoConsultationKeys.all,
      });
    },
  });
}
