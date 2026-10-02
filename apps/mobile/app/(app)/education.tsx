import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { colors, radius, spacing, minimumTouchTarget } from "@pfram/design-tokens";
import type { EducationCategory, EducationTrimester } from "@pfram/shared-types";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  formatReadingTime,
  TRIMESTER_LABELS,
} from "../../lib/education-api";
import {
  useMotherEducationArticles,
  useMotherFeaturedArticles,
} from "../../lib/education-queries";

const ALL_CATEGORIES: Array<{ key: EducationCategory | "ALL"; label: string }> = [
  { key: "ALL", label: "Semua Kategori" },
  { key: "NUTRITION", label: CATEGORY_LABELS.NUTRITION },
  { key: "BODY_CHANGES", label: CATEGORY_LABELS.BODY_CHANGES },
  { key: "IRON_TABLET", label: CATEGORY_LABELS.IRON_TABLET },
  { key: "NAUSEA", label: CATEGORY_LABELS.NAUSEA },
  { key: "ANEMIA_KEK", label: CATEGORY_LABELS.ANEMIA_KEK },
  { key: "PREPARATION", label: CATEGORY_LABELS.PREPARATION },
  { key: "PREGNANCY", label: CATEGORY_LABELS.PREGNANCY },
];

const TRIMESTER_OPTIONS: Array<{ key: EducationTrimester; label: string }> = [
  { key: "ALL", label: "Semua Trimester" },
  { key: "TRIMESTER_1", label: "Trimester 1" },
  { key: "TRIMESTER_2", label: "Trimester 2" },
  { key: "TRIMESTER_3", label: "Trimester 3" },
];

export default function EducationScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<EducationCategory | "ALL">("ALL");
  const [selectedTrimester, setSelectedTrimester] = useState<EducationTrimester | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const queryParams = useMemo(() => {
    return {
      category: selectedCategory === "ALL" ? undefined : selectedCategory,
      trimester: selectedTrimester === "ALL" ? undefined : selectedTrimester,
      search: searchQuery.trim().length > 0 ? searchQuery.trim() : undefined,
    };
  }, [selectedCategory, selectedTrimester, searchQuery]);

  const {
    data: articlesData,
    isLoading,
    isRefetching,
    refetch,
  } = useMotherEducationArticles(queryParams);

  const { data: featuredArticles } = useMotherFeaturedArticles();

  const recommendation = articlesData?.trimesterRecommendation;
  const articles = articlesData?.items ?? [];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Edukasi Kehamilan</Text>
        <Text style={s.headerSubtitle}>
          Gizi, perubahan tubuh, dan panduan resmi Buku KIA Kemenkes RI
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
        }
      >
        {/* Recommendation Banner */}
        {recommendation && (
          <View style={s.recommendationCard}>
            <View style={s.recommendationHeader}>
              <View style={s.recommendationBadge}>
                <Text style={s.recommendationBadgeText}>
                  {TRIMESTER_LABELS[recommendation] || "Trimester Anda"}
                </Text>
              </View>
              <Text style={s.recommendationTitle}>Untuk Ibu Minggu Ini</Text>
            </View>
            <Text style={s.recommendationText}>
              Artikel di bawah telah disesuaikan dengan usia kehamilan Anda saat ini.
            </Text>
          </View>
        )}

        {/* Search Input */}
        <View style={s.searchContainer}>
          <TextInput
            style={s.searchInput}
            placeholder="Cari artikel (contoh: gizi, mual, kelor, TTD)..."
            placeholderTextColor="#8C9B95"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {ALL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                style={[s.chip, isSelected && s.chipSelected]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Text style={[s.chipText, isSelected && s.chipTextSelected]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Trimester Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.trimesterRow}
        >
          {TRIMESTER_OPTIONS.map((tri) => {
            const isSelected = (selectedTrimester || "ALL") === tri.key;
            return (
              <Pressable
                key={tri.key}
                style={[s.triButton, isSelected && s.triButtonSelected]}
                onPress={() => setSelectedTrimester(tri.key === "ALL" ? undefined : tri.key)}
              >
                <Text style={[s.triButtonText, isSelected && s.triButtonTextSelected]}>
                  {tri.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Featured Section (show only when no active search & all categories) */}
        {!searchQuery && selectedCategory === "ALL" && !selectedTrimester && featuredArticles && featuredArticles.length > 0 && (
          <View style={s.featuredSection}>
            <Text style={s.sectionTitle}>⭐ Topik Pilihan Utama</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featuredScroll}>
              {featuredArticles.map((fa) => {
                const color = CATEGORY_COLORS[fa.category] || CATEGORY_COLORS.OTHER;
                return (
                  <Pressable
                    key={fa.publicId}
                    style={s.featuredCard}
                    onPress={() => router.push(`/mother/education/${fa.slug}` as Href)}
                  >
                    <View style={[s.badge, { backgroundColor: color.bg }]}>
                      <Text style={[s.badgeText, { color: color.text }]}>
                        {CATEGORY_LABELS[fa.category]}
                      </Text>
                    </View>
                    <Text style={s.featuredCardTitle} numberOfLines={2}>
                      {fa.title}
                    </Text>
                    <Text style={s.featuredCardSummary} numberOfLines={2}>
                      {fa.summary}
                    </Text>
                    <Text style={s.readingTime}>
                      ⏱ {formatReadingTime(fa.content)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Articles List */}
        <View style={s.articlesSection}>
          <Text style={s.sectionTitle}>
            {selectedCategory !== "ALL"
              ? `Artikel: ${CATEGORY_LABELS[selectedCategory as EducationCategory]}`
              : "Semua Artikel Edukasi"}
            {` (${articles.length})`}
          </Text>

          {isLoading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.loadingText}>Memuat artikel edukasi...</Text>
            </View>
          ) : articles.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>Tidak ada artikel yang cocok</Text>
              <Text style={s.emptySubtitle}>
                Coba sesuaikan kata kunci atau pilih filter kategori lainnya.
              </Text>
            </View>
          ) : (
            articles.map((item) => {
              const color = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.OTHER;
              return (
                <Pressable
                  key={item.publicId}
                  style={s.articleCard}
                  onPress={() => router.push(`/mother/education/${item.slug}` as Href)}
                >
                  <View style={s.cardTopRow}>
                    <View style={[s.badge, { backgroundColor: color.bg }]}>
                      <Text style={[s.badgeText, { color: color.text }]}>
                        {CATEGORY_LABELS[item.category]}
                      </Text>
                    </View>
                    {item.trimester !== "ALL" && (
                      <View style={s.trimesterBadge}>
                        <Text style={s.trimesterBadgeText}>
                          {item.trimester.replace("TRIMESTER_", "T")}
                        </Text>
                      </View>
                    )}
                    <Text style={s.cardReadingTime}>
                      {formatReadingTime(item.content)}
                    </Text>
                  </View>

                  <Text style={s.articleTitle}>{item.title}</Text>
                  <Text style={s.articleSummary} numberOfLines={2}>
                    {item.summary}
                  </Text>

                  <View style={s.cardFooter}>
                    <Text style={s.sourceLabel}>
                      Sumber: {item.sourceName}
                    </Text>
                    <Text style={s.readMoreText}>Baca &rarr;</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    backgroundColor: colors.white,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.neutral,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  recommendationCard: {
    margin: spacing.md,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  recommendationBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  recommendationBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  recommendationText: {
    fontSize: 12,
    color: "#15803D",
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  searchInput: {
    minHeight: minimumTouchTarget,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.text,
  },
  chipsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
  trimesterRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  triButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
  },
  triButtonSelected: {
    backgroundColor: "#1E293B",
  },
  triButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  triButtonTextSelected: {
    color: colors.white,
  },
  featuredSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  featuredScroll: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  featuredCard: {
    width: 240,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    justifyContent: "space-between",
  },
  featuredCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
    lineHeight: 18,
  },
  featuredCardSummary: {
    fontSize: 12,
    color: colors.neutral,
    marginTop: 4,
    lineHeight: 16,
  },
  readingTime: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 8,
  },
  articlesSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    gap: 10,
  },
  articleCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  trimesterBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  trimesterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  cardReadingTime: {
    marginLeft: "auto",
    fontSize: 10,
    color: "#94A3B8",
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
    lineHeight: 20,
  },
  articleSummary: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
    lineHeight: 17,
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sourceLabel: {
    fontSize: 10,
    color: "#94A3B8",
    flex: 1,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.neutral,
  },
  emptyState: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.neutral,
    textAlign: "center",
    marginTop: 4,
  },
});
