import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MotherAppShell } from "../MotherAppShell";
import { Card, Button, LoadingSkeleton } from "../../components";
import {
  useMotherEducationArticles,
  useMotherFeaturedArticles,
  useMotherArticleDetail,
} from "../../education-queries";
import {
  CATEGORY_LABELS,
  CATEGORY_BADGES,
  TRIMESTER_LABELS,
  TRIMESTER_BADGES,
  formatReadingTime,
} from "../../education-api";
import type {
  EducationCategory,
  EducationTrimester,
} from "@pfram/shared-types";

const ALL_CATEGORIES: Array<{ key: EducationCategory | "ALL"; label: string }> = [
  { key: "ALL", label: "Semua Kategori" },
  { key: "NUTRITION", label: CATEGORY_LABELS.NUTRITION },
  { key: "BODY_CHANGES", label: CATEGORY_LABELS.BODY_CHANGES },
  { key: "IRON_TABLET", label: CATEGORY_LABELS.IRON_TABLET },
  { key: "NAUSEA", label: CATEGORY_LABELS.NAUSEA },
  { key: "ANEMIA_KEK", label: CATEGORY_LABELS.ANEMIA_KEK },
  { key: "PREPARATION", label: CATEGORY_LABELS.PREPARATION },
  { key: "PREGNANCY", label: CATEGORY_LABELS.PREGNANCY },
  { key: "OTHER", label: CATEGORY_LABELS.OTHER },
];

const TRIMESTER_OPTIONS: Array<{ key: EducationTrimester; label: string }> = [
  { key: "ALL", label: "Semua Trimester" },
  { key: "TRIMESTER_1", label: "Trimester 1" },
  { key: "TRIMESTER_2", label: "Trimester 2" },
  { key: "TRIMESTER_3", label: "Trimester 3" },
];

/* =========================================================================
   ARTICLE CONTENT FORMATTER (Markdown-like parser)
   ========================================================================= */

function FormattedArticleContent({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-slate-700">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading 2
        if (trimmed.startsWith("## ")) {
          return (
            <h2
              key={idx}
              className="mt-6 text-base font-bold text-slate-900 first:mt-0"
            >
              {trimmed.replace(/^##\s+/, "")}
            </h2>
          );
        }

        // Heading 3
        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="mt-4 text-sm font-bold text-slate-800 first:mt-0"
            >
              {trimmed.replace(/^###\s+/, "")}
            </h3>
          );
        }

        // Blockquote
        if (trimmed.startsWith("> ")) {
          const quoteLines = trimmed
            .split("\n")
            .map((line) => line.replace(/^>\s?/, ""))
            .join("\n");
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-teal-500 bg-teal-50/70 p-3.5 rounded-r-lg text-xs italic text-teal-900 leading-normal"
            >
              {quoteLines}
            </blockquote>
          );
        }

        // Bullet / Numbered lists
        if (
          trimmed.includes("\n- ") ||
          trimmed.startsWith("- ") ||
          /^\d+\.\s/.test(trimmed)
        ) {
          const lines = trimmed.split("\n");
          return (
            <ul key={idx} className="space-y-1.5 pl-1">
              {lines.map((line, lIdx) => {
                const clean = line.replace(/^(-\s+|\d+\.\s+)/, "").trim();
                if (!clean) return null;
                return (
                  <li key={lIdx} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-pfram-primary font-bold leading-tight select-none">
                      •
                    </span>
                    <span className="flex-1">{clean}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-xs leading-relaxed text-slate-700">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

/* =========================================================================
   ARTICLE READER VIEW
   ========================================================================= */

function ArticleReaderView({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { data: article, isLoading, isError, refetch } = useMotherArticleDetail(slug);

  if (isLoading) {
    return (
      <MotherAppShell
        title="Edukasi Kehamilan"
        subtitle="Memuat materi…"
        showBack
        onBack={() => navigate("/m/education")}
      >
        <div className="space-y-4">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </MotherAppShell>
    );
  }

  if (isError || !article) {
    return (
      <MotherAppShell
        title="Edukasi Kehamilan"
        subtitle="Materi tidak ditemukan"
        showBack
        onBack={() => navigate("/m/education")}
      >
        <Card className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Artikel Tidak Ditemukan
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Artikel edukasi yang Anda tuju mungkin telah dipindahkan atau dinonaktifkan.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => refetch()}
              className="w-full text-xs font-semibold"
            >
              Coba Muat Ulang
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/m/education")}
              className="w-full text-xs font-semibold"
            >
              ← Kembali ke Daftar Artikel
            </Button>
          </div>
        </Card>
      </MotherAppShell>
    );
  }

  const categoryBadge = CATEGORY_BADGES[article.category] || {
    label: CATEGORY_LABELS[article.category] || "Edukasi",
    className: "bg-slate-100 text-slate-700",
  };

  const trimesterBadge = TRIMESTER_BADGES[article.trimester] || {
    label: TRIMESTER_LABELS[article.trimester] || "Semua",
    className: "bg-slate-100 text-slate-700",
  };

  return (
    <MotherAppShell
      title="Edukasi Kehamilan"
      subtitle={categoryBadge.label}
      showBack
      onBack={() => navigate("/m/education")}
    >
      <article className="space-y-4">
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${categoryBadge.className}`}
              >
                {categoryBadge.label}
              </span>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${trimesterBadge.className}`}
              >
                {trimesterBadge.label}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              ⏱ {formatReadingTime(article.content)}
            </span>
          </div>

          {/* Article Title */}
          <h1 className="text-lg font-bold leading-snug text-slate-900">
            {article.title}
          </h1>

          {/* Source Reference Badge */}
          <div className="rounded-lg bg-slate-50 border-l-4 border-pfram-primary p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">
              📚 Sumber Resmi: {article.sourceName}
            </p>
            {article.sourceReference && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                {article.sourceReference}
              </p>
            )}
          </div>

          {/* Article Summary Lead */}
          <div className="rounded-xl border border-slate-100 bg-[#FFF8F2]/60 p-3.5">
            <p className="text-xs italic leading-relaxed text-slate-700">
              {article.summary}
            </p>
          </div>

          {/* Formatted Content */}
          <div className="pt-2">
            <FormattedArticleContent content={article.content} />
          </div>
        </Card>

        {/* Clinical Safety & Non-Diagnostic Notice */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-base">🛡️</span>
            <h3 className="text-xs font-bold text-amber-900">
              Informasi Kesehatan Edukatif
            </h3>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800">
            Artikel ini disusun berdasarkan Buku KIA dan pedoman resmi Kementerian Kesehatan RI untuk tujuan edukasi. Artikel ini tidak menggantikan diagnosis medis langsung. Bila ibu merasakan keluhan tidak wajar atau tanda bahaya, segera hubungi bidan atau kunjungi fasilitas kesehatan terdekat.
          </p>
        </div>

        {/* Quick Actions Footer */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/m/education")}
            className="w-full text-xs font-semibold"
          >
            ← Daftar Artikel Lain
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate("/m/danger-screening")}
            className="w-full text-xs font-semibold bg-pfram-primary hover:bg-pfram-text text-white"
          >
            Skrining Tanda Bahaya →
          </Button>
        </div>
      </article>
    </MotherAppShell>
  );
}

/* =========================================================================
   ARTICLE LIST & SEARCH VIEW
   ========================================================================= */

export function MotherEducationPage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

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
    isError,
    refetch,
  } = useMotherEducationArticles(queryParams);

  const { data: featuredArticles } = useMotherFeaturedArticles();

  // If a slug is specified in the route, render the article reader
  if (slug) {
    return <ArticleReaderView slug={slug} />;
  }

  const articles = articlesData?.items ?? [];
  const recommendation =
    articlesData?.trimesterRecommendation || articlesData?.recommendedTrimester;

  const showFeatured =
    !searchQuery.trim() &&
    selectedCategory === "ALL" &&
    (!selectedTrimester || selectedTrimester === "ALL") &&
    featuredArticles &&
    featuredArticles.length > 0;

  return (
    <MotherAppShell
      title="Edukasi Kehamilan"
      subtitle="Panduan Resmi Buku KIA Kemenkes RI"
    >
      <div className="space-y-4">
        {/* Personalized Trimester Recommendation Banner */}
        {recommendation && recommendation !== "ALL" && (
          <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-pfram-primary px-2.5 py-0.5 text-[10px] font-bold text-white uppercase shadow-2xs">
                {TRIMESTER_LABELS[recommendation] || "Trimester Anda"}
              </span>
              <h2 className="text-xs font-bold text-emerald-950">
                Rekomendasi Minggu Ini
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
              Materi edukasi di bawah telah disesuaikan dengan perkiraan usia kehamilan ibu saat ini.
            </p>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari artikel (contoh: gizi, mual, kelor, TTD)..."
            aria-label="Cari artikel edukasi"
            className="w-full min-h-[44px] rounded-xl border border-slate-300/90 bg-white px-3.5 py-2 pl-9 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-pfram-primary focus:outline-none focus:ring-1 focus:ring-pfram-primary"
          />
          <svg
            className="absolute left-3 top-3 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
              aria-label="Hapus pencarian"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Horizontal Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {ALL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all min-h-[38px] ${
                  isSelected
                    ? "bg-pfram-primary text-white shadow-xs font-bold"
                    : "bg-white text-slate-600 border border-slate-200/90 hover:border-slate-300 font-medium"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Trimester Filter Tabs */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70 shadow-2xs gap-1 overflow-x-auto no-scrollbar">
          {TRIMESTER_OPTIONS.map((tri) => {
            const isSelected =
              (selectedTrimester || "ALL") === tri.key;
            return (
              <button
                key={tri.key}
                type="button"
                onClick={() =>
                  setSelectedTrimester(tri.key === "ALL" ? undefined : tri.key)
                }
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all min-h-[32px] ${
                  isSelected
                    ? "bg-slate-800 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                {tri.label}
              </button>
            );
          })}
        </div>

        {/* Featured Articles Section */}
        {showFeatured && (
          <section aria-labelledby="featured-title" className="space-y-2">
            <h2
              id="featured-title"
              className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>⭐</span>
              <span>Topik Pilihan Utama</span>
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
              {featuredArticles.map((fa) => {
                const badge = CATEGORY_BADGES[fa.category] || {
                  label: CATEGORY_LABELS[fa.category] || "Edukasi",
                  className: "bg-slate-100 text-slate-700",
                };
                return (
                  <div
                    key={fa.publicId}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/m/education/${fa.slug}`)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        navigate(`/m/education/${fa.slug}`);
                      }
                    }}
                    className="w-64 shrink-0 rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ⏱ {formatReadingTime(fa.content)}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {fa.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {fa.summary}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 truncate max-w-[140px]">
                        {fa.sourceName}
                      </span>
                      <span className="font-semibold text-pfram-primary">
                        Baca →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Articles List Section */}
        <section aria-labelledby="articles-title" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2
              id="articles-title"
              className="text-xs font-bold text-slate-900 uppercase tracking-wider"
            >
              {selectedCategory !== "ALL"
                ? `Materi: ${CATEGORY_LABELS[selectedCategory]}`
                : "Semua Artikel Edukasi"}
              <span className="ml-1 text-slate-400 font-normal">
                ({articles.length})
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </div>
          ) : isError ? (
            <Card className="p-6 text-center">
              <p className="text-xs text-rose-600 font-semibold">
                Gagal memuat artikel edukasi.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
                className="mt-3 text-xs"
              >
                Coba Lagi
              </Button>
            </Card>
          ) : articles.length === 0 ? (
            <Card className="p-8 text-center bg-white border border-slate-200">
              <div className="mx-auto mb-2 text-2xl">📖</div>
              <h3 className="text-xs font-bold text-slate-800">
                Tidak ada artikel yang cocok
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Coba sesuaikan kata kunci pencarian atau pilih filter kategori lain.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {articles.map((item) => {
                const badge = CATEGORY_BADGES[item.category] || {
                  label: CATEGORY_LABELS[item.category] || "Edukasi",
                  className: "bg-slate-100 text-slate-700",
                };
                const triBadge = TRIMESTER_BADGES[item.trimester] || {
                  label: TRIMESTER_LABELS[item.trimester] || "Semua",
                  className: "bg-slate-100 text-slate-700",
                };

                return (
                  <div
                    key={item.publicId}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/m/education/${item.slug}`)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        navigate(`/m/education/${item.slug}`);
                      }
                    }}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-emerald-300/80 hover:shadow-sm transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {item.trimester !== "ALL" && (
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${triBadge.className}`}
                          >
                            {triBadge.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ⏱ {formatReadingTime(item.content)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold leading-snug text-slate-900">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <span className="text-slate-400 truncate max-w-[200px]">
                        Sumber: {item.sourceName}
                      </span>
                      <span className="font-semibold text-pfram-primary">
                        Baca →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Clinical Disclaimer in footer */}
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3.5 text-[11px] text-slate-500 leading-normal">
          <p className="font-semibold text-slate-700 mb-0.5">
            🛡️ Standar Edukasi Maternal Kemenkes RI
          </p>
          Seluruh artikel disusun berdasarkan Buku KIA resmi untuk mendampingi kesehatan ibu hamil.
        </div>
      </div>
    </MotherAppShell>
  );
}

export default MotherEducationPage;
