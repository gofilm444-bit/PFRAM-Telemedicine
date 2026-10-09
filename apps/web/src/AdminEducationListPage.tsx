import React, { useState, useMemo } from "react";
import type {
  EducationArticle,
  EducationArticleCreateInput,
  EducationArticleUpdateInput,
  EducationCategory,
  EducationTrimester,
} from "@pfram/shared-types";
import {
  CATEGORY_BADGES,
  CATEGORY_LABELS,
  TRIMESTER_BADGES,
} from "./education-api";
import {
  useAdminEducationList,
  useArchiveEducationArticle,
  useCreateEducationArticle,
  useUpdateEducationArticle,
} from "./education-queries";
import { extractAndMapError } from "./error-mapping";

export function AdminEducationListPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [trimesterFilter, setTrimesterFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<EducationArticle | null>(null);

  const {
    data: articlesData,
    isLoading,
    isError,
    refetch,
  } = useAdminEducationList({ includeUnpublished: true });

  const updateMutation = useUpdateEducationArticle();
  const archiveMutation = useArchiveEducationArticle();

  const articles = useMemo(() => {
    let list = articlesData?.items ?? [];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q),
      );
    }

    if (categoryFilter !== "ALL") {
      list = list.filter((a) => a.category === categoryFilter);
    }

    if (trimesterFilter !== "ALL") {
      list = list.filter((a) => a.trimester === trimesterFilter);
    }

    if (statusFilter === "PUBLISHED") {
      list = list.filter((a) => a.published);
    } else if (statusFilter === "UNPUBLISHED") {
      list = list.filter((a) => !a.published);
    }

    return list;
  }, [articlesData?.items, search, categoryFilter, trimesterFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingArticle(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (article: EducationArticle) => {
    setEditingArticle(article);
    setIsModalOpen(true);
  };

  const handleTogglePublish = async (article: EducationArticle) => {
    try {
      await updateMutation.mutateAsync({
        publicId: article.publicId,
        input: { published: !article.published },
      });
    } catch {
      alert("Gagal memperbarui status publikasi artikel.");
    }
  };

  const handleArchive = async (article: EducationArticle) => {
    const confirmed = window.confirm(
      `Yakin ingin mengarsipkan artikel "${article.title}"? Artikel tidak akan muncul lagi pada dashboard ibu.`,
    );
    if (!confirmed) return;

    try {
      await archiveMutation.mutateAsync(article.publicId);
    } catch {
      alert("Gagal mengarsipkan artikel.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Kelola Edukasi & Gizi Kehamilan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manajemen artikel resmi Buku KIA Kemenkes RI yang ditampilkan pada aplikasi ibu.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          + Buat Artikel Baru
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pencarian
            </label>
            <input
              type="text"
              placeholder="Cari judul, slug, atau ringkasan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Kategori
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Kategori</option>
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Trimester */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Trimester
            </label>
            <select
              value={trimesterFilter}
              onChange={(e) => setTrimesterFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Trimester</option>
              <option value="TRIMESTER_1">Trimester 1</option>
              <option value="TRIMESTER_2">Trimester 2</option>
              <option value="TRIMESTER_3">Trimester 3</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Status Publikasi
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="PUBLISHED">Tayang (Published)</option>
              <option value="UNPUBLISHED">Draf (Unpublished)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Memuat daftar artikel edukasi...
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-500 text-sm">
            Gagal memuat artikel edukasi. Silakan refresh halaman.
          </div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Tidak ada artikel yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Artikel & Slug</th>
                  <th className="px-4 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5">Trimester</th>
                  <th className="px-4 py-3.5">Unggulan</th>
                  <th className="px-4 py-3.5">Sumber Resmi</th>
                  <th className="px-4 py-3.5 text-center">Urutan</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((item) => {
                  const catBadge = CATEGORY_BADGES[item.category] || CATEGORY_BADGES.OTHER;
                  const triBadge = TRIMESTER_BADGES[item.trimester] || TRIMESTER_BADGES.ALL;
                  return (
                    <tr key={item.publicId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          /{item.slug}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${catBadge.className}`}
                        >
                          {catBadge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${triBadge.className}`}
                        >
                          {triBadge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.featured ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            ⭐ Pilihan
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 max-w-xs text-xs text-slate-500">
                        <div className="line-clamp-1 font-medium text-slate-700">
                          {item.sourceName}
                        </div>
                        {item.sourceReference && (
                          <div className="line-clamp-1 text-slate-400">
                            {item.sourceReference}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center font-mono text-xs text-slate-600">
                        {item.sortOrder}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePublish(item)}
                          disabled={updateMutation.isPending}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            item.published
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          title="Klik untuk beralih status"
                        >
                          {item.published ? "✓ Tayang" : "○ Draf"}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleArchive(item)}
                          disabled={archiveMutation.isPending}
                          className="px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors"
                        >
                          Arsipkan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <ArticleFormModal
          article={editingArticle}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function ArticleFormModal({
  article,
  onClose,
  onSuccess,
}: {
  article: EducationArticle | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(article);

  const [slug, setSlug] = useState(article?.slug ?? "");
  const [title, setTitle] = useState(article?.title ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [category, setCategory] = useState<EducationCategory>(
    article?.category ?? "NUTRITION",
  );
  const [trimester, setTrimester] = useState<EducationTrimester>(
    article?.trimester ?? "ALL",
  );
  const [featured, setFeatured] = useState<boolean>(article?.featured ?? false);
  const [sourceName, setSourceName] = useState(
    article?.sourceName ?? "Buku KIA Kemenkes RI Edisi 2024",
  );
  const [sourceReference, setSourceReference] = useState(
    article?.sourceReference ?? "",
  );
  const [sortOrder, setSortOrder] = useState<number>(article?.sortOrder ?? 0);
  const [published, setPublished] = useState<boolean>(
    article?.published ?? true,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateEducationArticle();
  const updateMutation = useUpdateEducationArticle();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      if (isEdit && article) {
        const input: EducationArticleUpdateInput = {
          title,
          summary,
          content,
          category,
          trimester,
          featured,
          sourceName,
          sourceReference: sourceReference.trim() ? sourceReference.trim() : null,
          sortOrder,
          published,
        };
        await updateMutation.mutateAsync({ publicId: article.publicId, input });
      } else {
        const input: EducationArticleCreateInput = {
          slug: slug.trim().toLowerCase(),
          title,
          summary,
          content,
          category,
          trimester,
          featured,
          sourceName,
          sourceReference: sourceReference.trim() ? sourceReference.trim() : null,
          sortOrder,
          published,
        };
        await createMutation.mutateAsync(input);
      }
      onSuccess();
    } catch (err: unknown) {
      const mapped = extractAndMapError(err);
      setErrorMessage(mapped.message || "Gagal menyimpan artikel");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col my-8">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? "Edit Artikel Edukasi" : "Buat Artikel Edukasi Baru"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Title & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul Artikel *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Kebutuhan Gizi Trimester Pertama"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Slug (URL Unik) *
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="kebutuhan-gizi-trimester-1"
                className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono ${
                  isEdit ? "bg-slate-100 text-slate-500" : ""
                }`}
              />
            </div>
          </div>

          {/* Category, Trimester, Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EducationCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Trimester *
              </label>
              <select
                value={trimester}
                onChange={(e) => setTrimester(e.target.value as EducationTrimester)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="ALL">Semua Trimester</option>
                <option value="TRIMESTER_1">Trimester 1</option>
                <option value="TRIMESTER_2">Trimester 2</option>
                <option value="TRIMESTER_3">Trimester 3</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Urutan (Sort Order)
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Source name & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sumber Resmi *
              </label>
              <input
                type="text"
                required
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Buku KIA Kemenkes RI Edisi 2024"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Referensi Halaman / Dokumen (Opsional)
              </label>
              <input
                type="text"
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                placeholder="Bagian Ibu Hamil Halaman 12-14"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Checkboxes: Featured & Published */}
          <div className="flex items-center gap-6 py-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              Tandai sebagai Artikel Unggulan (⭐ Featured)
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              Langsung Publikasikan (Tayang)
            </label>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ringkasan Singkat (Lead Summary) *
            </label>
            <textarea
              required
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ringkasan 1-2 kalimat pengantar artikel..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Content (Markdown) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Isi Konten Lengkap (Format Markdown) *
            </label>
            <textarea
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan isi artikel dalam format Markdown (## Subjudul, - Poin, dsb)..."
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : isEdit ? "Perbarui Artikel" : "Simpan Artikel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
