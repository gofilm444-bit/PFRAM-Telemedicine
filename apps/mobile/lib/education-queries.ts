import { useQuery } from "@tanstack/react-query";
import type { EducationQuery } from "@pfram/shared-types";
import {
  getMotherArticleDetail,
  getMotherEducationArticles,
  getMotherFeaturedArticles,
} from "./education-api";

export const educationKeys = {
  all: ["education"] as const,
  articles: (query?: EducationQuery) =>
    ["education", "articles", query ?? "all"] as const,
  featured: () => ["education", "featured"] as const,
  detail: (slug: string) => ["education", "detail", slug] as const,
};

export function useMotherEducationArticles(query?: EducationQuery) {
  return useQuery({
    queryKey: educationKeys.articles(query),
    queryFn: () => getMotherEducationArticles(query),
    retry: 1,
  });
}

export function useMotherFeaturedArticles() {
  return useQuery({
    queryKey: educationKeys.featured(),
    queryFn: () => getMotherFeaturedArticles(),
    retry: 1,
  });
}

export function useMotherArticleDetail(slug: string | undefined | null) {
  return useQuery({
    queryKey: educationKeys.detail(slug ?? ""),
    queryFn: () => getMotherArticleDetail(slug!),
    enabled: Boolean(slug),
    retry: 1,
  });
}
