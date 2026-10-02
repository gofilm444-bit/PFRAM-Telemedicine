import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, radius, spacing, minimumTouchTarget } from "@pfram/design-tokens";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  formatReadingTime,
  TRIMESTER_LABELS,
} from "../../../lib/education-api";
import { useMotherArticleDetail } from "../../../lib/education-queries";

export default function ArticleDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data: article, isLoading, isError } = useMotherArticleDetail(slug);

  if (isLoading) {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Memuat artikel edukasi...</Text>
      </View>
    );
  }

  if (isError || !article) {
    return (
      <View style={s.centerContainer}>
        <Text style={s.errorTitle}>Artikel Tidak Ditemukan</Text>
        <Text style={s.errorSubtitle}>
          Artikel yang Anda tuju mungkin telah dipindahkan atau dinonaktifkan.
        </Text>
        <Pressable style={s.backButton} onPress={() => router.back()}>
          <Text style={s.backButtonText}>&larr; Kembali ke Edukasi</Text>
        </Pressable>
      </View>
    );
  }

  const categoryColor = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.OTHER;

  return (
    <View style={s.container}>
      {/* Top Navbar */}
      <View style={s.navbar}>
        <Pressable
          style={s.navBack}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Text style={s.navBackText}>&larr; Kembali</Text>
        </Pressable>
        <Text style={s.navbarTitle} numberOfLines={1}>
          {CATEGORY_LABELS[article.category]}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.contentContainer}>
        {/* Badges Row */}
        <View style={s.metaRow}>
          <View style={[s.badge, { backgroundColor: categoryColor.bg }]}>
            <Text style={[s.badgeText, { color: categoryColor.text }]}>
              {CATEGORY_LABELS[article.category]}
            </Text>
          </View>

          <View style={s.trimesterBadge}>
            <Text style={s.trimesterBadgeText}>
              {TRIMESTER_LABELS[article.trimester]}
            </Text>
          </View>

          <Text style={s.readingTime}>
            ⏱ {formatReadingTime(article.content)}
          </Text>
        </View>

        {/* Title */}
        <Text style={s.title}>{article.title}</Text>

        {/* Source info */}
        <View style={s.sourceBox}>
          <Text style={s.sourceText}>
            📚 <Text style={s.sourceBold}>Sumber Resmi:</Text> {article.sourceName}
          </Text>
          {article.sourceReference && (
            <Text style={s.sourceRefText}>{article.sourceReference}</Text>
          )}
        </View>

        {/* Summary Lead */}
        <View style={s.leadBox}>
          <Text style={s.leadText}>{article.summary}</Text>
        </View>

        {/* Markdown-like Content Renderer */}
        <View style={s.bodyContent}>
          {renderFormattedContent(article.content)}
        </View>

        {/* Non-diagnostic Disclaimer */}
        <View style={s.disclaimerCard}>
          <Text style={s.disclaimerTitle}>🛡️ Informasi Kesehatan Edukatif</Text>
          <Text style={s.disclaimerText}>
            Artikel ini disusun berdasarkan Buku KIA dan pedoman resmi Kementerian Kesehatan RI untuk tujuan edukasi. Artikel ini tidak menggantikan diagnosis medis langsung. Bila ibu merasakan keluhan tidak wajar atau tanda bahaya, segera hubungi bidan atau kunjungi fasilitas kesehatan terdekat.
          </Text>
        </View>

        {/* Bottom CTA */}
        <View style={s.ctaRow}>
          <Pressable style={s.secondaryBtn} onPress={() => router.back()}>
            <Text style={s.secondaryBtnText}>Daftar Artikel Lain</Text>
          </Pressable>
          <Pressable
            style={s.primaryBtn}
            onPress={() => router.push("/(app)/history")}
          >
            <Text style={s.primaryBtnText}>Skrining Tanda Bahaya</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function renderFormattedContent(content: string) {
  const blocks = content.split(/\n\n+/);

  return blocks.map((block, idx) => {
    const trimmed = block.trim();

    // H2 header
    if (trimmed.startsWith("## ")) {
      return (
        <Text key={idx} style={s.heading2}>
          {trimmed.replace("## ", "")}
        </Text>
      );
    }

    // H3 header
    if (trimmed.startsWith("### ")) {
      return (
        <Text key={idx} style={s.heading3}>
          {trimmed.replace("### ", "")}
        </Text>
      );
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      const quoteText = trimmed
        .split("\n")
        .map((line) => line.replace(/^>\s?/, ""))
        .join("\n");
      return (
        <View key={idx} style={s.blockquote}>
          <Text style={s.blockquoteText}>{quoteText}</Text>
        </View>
      );
    }

    // Bullet points / numbered lists
    if (trimmed.includes("\n- ") || trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
      const lines = trimmed.split("\n");
      return (
        <View key={idx} style={s.listContainer}>
          {lines.map((line, lIdx) => {
            const clean = line.replace(/^(-\s+|\d+\.\s+)/, "").trim();
            if (!clean) return null;
            return (
              <View key={lIdx} style={s.listItem}>
                <Text style={s.bulletPoint}>•</Text>
                <Text style={s.listText}>{clean}</Text>
              </View>
            );
          })}
        </View>
      );
    }

    // Regular paragraph
    return (
      <Text key={idx} style={s.paragraph}>
        {trimmed}
      </Text>
    );
  });
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral,
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.neutral,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  backButton: {
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  navbar: {
    backgroundColor: colors.white,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  navBack: {
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    paddingRight: 12,
  },
  navBackText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  navbarTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  trimesterBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  trimesterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  readingTime: {
    marginLeft: "auto",
    fontSize: 11,
    color: "#64748B",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 30,
    marginBottom: 12,
  },
  sourceBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: 16,
  },
  sourceText: {
    fontSize: 11,
    color: "#334155",
  },
  sourceBold: {
    fontWeight: "700",
  },
  sourceRefText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  leadBox: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  leadText: {
    fontSize: 14,
    color: "#1E293B",
    lineHeight: 22,
    fontStyle: "italic",
  },
  bodyContent: {
    gap: 14,
  },
  heading2: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 24,
  },
  heading3: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 6,
    marginBottom: 2,
    lineHeight: 20,
  },
  paragraph: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  blockquote: {
    backgroundColor: "#EFF6FF",
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    borderRadius: radius.sm,
    padding: spacing.md,
    marginVertical: 6,
  },
  blockquoteText: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 20,
  },
  listContainer: {
    gap: 8,
    marginVertical: 4,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletPoint: {
    fontSize: 16,
    color: colors.primary,
    lineHeight: 20,
  },
  listText: {
    fontSize: 14,
    color: "#334155",
    flex: 1,
    lineHeight: 20,
  },
  disclaimerCard: {
    marginTop: 24,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 18,
  },
  ctaRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: minimumTouchTarget,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  primaryBtn: {
    flex: 1,
    minHeight: minimumTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
});
