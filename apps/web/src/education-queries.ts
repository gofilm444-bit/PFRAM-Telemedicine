import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  EducationArticleCreateInput,
  EducationArticleUpdateInput,
  EducationQuery,
} from "@pfram/shared-types";
import { adminEducationApi } from "./education-api";

export const adminEducationKeys = {
  all: ["admin", "education"] as const,
  list: (query?: EducationQuery & { includeUnpublished?: boolean }) =>
    ["admin", "education", "list", query ?? "all"] as const,
};

export function useAdminEducationList(
  query: EducationQuery & { includeUnpublished?: boolean } = { includeUnpublished: true },
) {
  return useQuery({
    queryKey: adminEducationKeys.list(query),
    queryFn: () => adminEducationApi.getArticles(query),
    retry: 1,
  });
}

export function useCreateEducationArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EducationArticleCreateInput) =>
      adminEducationApi.createArticle(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminEducationKeys.all });
    },
  });
}

export function useUpdateEducationArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      publicId,
      input,
    }: {
      publicId: string;
      input: EducationArticleUpdateInput;
    }) => adminEducationApi.updateArticle(publicId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminEducationKeys.all });
    },
  });
}

export function useArchiveEducationArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) => adminEducationApi.archiveArticle(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminEducationKeys.all });
    },
  });
}
