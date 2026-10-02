import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type {
  ConsultationAttentionFlag,
  ConsultationMessageCreateInput,
  ConsultationMessageItem,
  ConsultationThreadStatus,
  ConsultationThreadSummary,
  VideoConsultationItem,
} from "@pfram/shared-types";
import {
  formatDuration,
  formatMessageDateTime,
  formatVideoDateTime,
  fetchAttachmentBlob,
  isValidMeetingUrl,
} from "./consultation-api";
import {
  useMidwifeConsultationMessages,
  useMidwifeConsultationThread,
  useMidwifeConsultationThreads,
  useMarkMidwifeConsultationRead,
  useSendMidwifeConsultationMessage,
  useUpdateMidwifeConsultationAttention,
  useUpdateMidwifeConsultationStatus,
  useMidwifeVideoConsultations,
  useCreateVideoConsultation,
  useUpdateVideoConsultation,
  useUpdateVideoConsultationStatus,
} from "./consultation-queries";

export function MidwifeConsultationPage() {
  const { threadPublicId } = useParams<{ threadPublicId?: string }>();
  const navigate = useNavigate();

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    threadPublicId ?? null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ConsultationThreadStatus>("ALL");
  const [attentionFilter, setAttentionFilter] = useState<"ALL" | ConsultationAttentionFlag>("ALL");

  // Sync route param with state
  useEffect(() => {
    if (threadPublicId && threadPublicId !== selectedThreadId) {
      setSelectedThreadId(threadPublicId);
    }
  }, [threadPublicId, selectedThreadId]);

  // Threads list query
  const threadsQuery = useMidwifeConsultationThreads({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    attention: attentionFilter === "ALL" ? undefined : attentionFilter,
  });

  // Selected thread query
  const selectedThreadQuery = useMidwifeConsultationThread(selectedThreadId ?? "");
  const messagesQuery = useMidwifeConsultationMessages(selectedThreadId ?? "");

  // Mutations
  const markReadMutation = useMarkMidwifeConsultationRead(selectedThreadId ?? "");
  const sendMessageMutation = useSendMidwifeConsultationMessage(selectedThreadId ?? "");
  const updateAttentionMutation = useUpdateMidwifeConsultationAttention(selectedThreadId ?? "");
  const updateStatusMutation = useUpdateMidwifeConsultationStatus(selectedThreadId ?? "");

  // Auto-mark as read when thread is selected and has unread messages
  useEffect(() => {
    if (
      selectedThreadQuery.data &&
      (selectedThreadQuery.data.unreadMidwifeCount ?? selectedThreadQuery.data.unreadCount ?? 0) > 0 &&
      !markReadMutation.isPending
    ) {
      markReadMutation.mutate();
    }
  }, [selectedThreadId, selectedThreadQuery.data, markReadMutation]);

  // Filtered threads by search
  const filteredThreads = useMemo(() => {
    const list = threadsQuery.data?.items ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((t) =>
      t.mother.fullName.toLowerCase().includes(q) ||
      (t.mother.phoneNumber && t.mother.phoneNumber.includes(q)),
    );
  }, [threadsQuery.data, search]);

  const handleSelectThread = (thread: ConsultationThreadSummary) => {
    setSelectedThreadId(thread.publicId);
    navigate(`/consultations/${thread.publicId}`);
  };

  const handleToggleAttention = () => {
    if (!selectedThreadQuery.data) return;
    const current = selectedThreadQuery.data.attentionFlag;
    const next: ConsultationAttentionFlag =
      current === "NEEDS_ATTENTION" ? "NORMAL" : "NEEDS_ATTENTION";
    updateAttentionMutation.mutate({ attentionFlag: next });
  };

  const handleToggleStatus = () => {
    if (!selectedThreadQuery.data) return;
    const current = selectedThreadQuery.data.status;
    const next: ConsultationThreadStatus =
      current === "OPEN" ? "CLOSED" : "OPEN";
    updateStatusMutation.mutate({ status: next });
  };

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* LEFT PANEL: THREAD LIST */}
      <div className="flex w-80 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50 lg:w-96">
        {/* Header & Search */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Konsultasi Bidan</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {filteredThreads.length} Ibu
            </span>
          </div>

          <div className="mt-3">
            <input
              type="text"
              placeholder="Cari nama ibu hamil..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Filter Tabs */}
          <div className="mt-3 flex gap-1 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setAttentionFilter("ALL");
              }}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                statusFilter === "ALL" && attentionFilter === "ALL"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setStatusFilter("OPEN");
                setAttentionFilter("ALL");
              }}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                statusFilter === "OPEN" && attentionFilter === "ALL"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setAttentionFilter("NEEDS_ATTENTION");
              }}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                attentionFilter === "NEEDS_ATTENTION"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Perlu Perhatian
            </button>
            <button
              onClick={() => {
                setStatusFilter("CLOSED");
                setAttentionFilter("ALL");
              }}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                statusFilter === "CLOSED"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Selesai
            </button>
          </div>
        </div>

        {/* Thread List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {threadsQuery.isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">Memuat konsultasi...</div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Tidak ada percakapan konsultasi yang sesuai filter.
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = thread.publicId === selectedThreadId;
              const unreadNum = thread.unreadMidwifeCount ?? thread.unreadCount ?? 0;
              const hasUnread = unreadNum > 0;
              const isAttention = thread.attentionFlag === "NEEDS_ATTENTION";

              return (
                <button
                  key={thread.publicId}
                  onClick={() => handleSelectThread(thread)}
                  className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-emerald-50/70 border-l-4 border-emerald-600"
                      : "hover:bg-slate-100/70 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 truncate">
                      {thread.mother.fullName}
                    </span>
                    {(thread.lastMessage || thread.lastMessageAt) && (
                      <span className="text-[11px] text-slate-400 flex-shrink-0">
                        {formatMessageDateTime(thread.lastMessage?.createdAt ?? thread.lastMessageAt ?? "")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>
                      {thread.gestationalAge
                        ? `${thread.gestationalAge.weeks} mgg`
                        : thread.pregnancy?.gestationalAgeWeeks
                        ? `${thread.pregnancy.gestationalAgeWeeks} mgg`
                        : "Hamil"}
                    </span>
                    <span>•</span>
                    <span>Trimester {thread.trimester ?? "-"}</span>
                    {thread.status === "CLOSED" && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                        Selesai
                      </span>
                    )}
                  </div>

                  {/* Message snippet */}
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-slate-600 truncate max-w-[200px]">
                      {thread.lastMessage?.messageType === "IMAGE" ? (
                        "📷 Foto"
                      ) : thread.lastMessage?.messageType === "VOICE" ? (
                        "🎤 Catatan Suara"
                      ) : (
                        thread.lastMessage?.text ?? thread.lastMessagePreview ?? "Belum ada pesan"
                      )}
                    </p>

                    <div className="flex items-center gap-1.5">
                      {isAttention && (
                        <span
                          title="Perlu Perhatian Khusus"
                          className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold"
                        >
                          Perhatian
                        </span>
                      )}
                      {hasUnread && (
                        <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold">
                          {unreadNum}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CHAT WINDOW */}
      <div className="flex flex-1 flex-col bg-slate-50">
        {!selectedThreadId || !selectedThreadQuery.data ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold mb-4">
              💬
            </div>
            <h3 className="text-lg font-bold text-slate-700">Ruang Telekonsultasi Bidan</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Pilih salah satu ibu hamil di sebelah kiri untuk melihat riwayat percakapan dan membalas konsultasi.
            </p>
          </div>
        ) : (
          <ChatWindow
            thread={selectedThreadQuery.data}
            messages={messagesQuery.data?.items ?? []}
            isLoadingMessages={messagesQuery.isLoading}
            onToggleAttention={handleToggleAttention}
            isTogglingAttention={updateAttentionMutation.isPending}
            onToggleStatus={handleToggleStatus}
            isTogglingStatus={updateStatusMutation.isPending}
            onSendMessage={async (input) => {
              await sendMessageMutation.mutateAsync(input);
            }}
            isSendingMessage={sendMessageMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// CHAT WINDOW SUB-COMPONENT
// ----------------------------------------------------------------------

interface ChatWindowProps {
  thread: ConsultationThreadSummary;
  messages: ConsultationMessageItem[];
  isLoadingMessages: boolean;
  onToggleAttention: () => void;
  isTogglingAttention: boolean;
  onToggleStatus: () => void;
  isTogglingStatus: boolean;
  onSendMessage: (input: ConsultationMessageCreateInput) => Promise<void>;
  isSendingMessage: boolean;
}

function ChatWindow({
  thread,
  messages,
  isLoadingMessages,
  onToggleAttention,
  isTogglingAttention,
  onToggleStatus,
  isTogglingStatus,
  onSendMessage,
  isSendingMessage,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSubmitError("Hanya file gambar (JPG, PNG, WebP) yang diizinkan");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Ukuran gambar maksimal 5MB");
      return;
    }

    setSubmitError("");
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(",")[1];
      const previewUrl = URL.createObjectURL(file);
      setSelectedFile({
        file,
        previewUrl,
        base64: base64Data ?? "",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    setSubmitError("");
    try {
      if (selectedFile) {
        await onSendMessage({
          messageType: "IMAGE",
          body: inputText.trim() || undefined,
          attachment: {
            originalFilename: selectedFile.file.name,
            mimeType: selectedFile.file.type,
            fileData: selectedFile.base64,
          },
        });
        setSelectedFile(null);
        setInputText("");
      } else {
        await onSendMessage({
          messageType: "TEXT",
          body: inputText.trim(),
        });
        setInputText("");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengirim pesan");
    }
  };

  const isClosed = thread.status === "CLOSED";

  // Video Consultations (Stage 10)
  const videoQuery = useMidwifeVideoConsultations({
    threadPublicId: thread.publicId,
  });

  const upcomingVideo = useMemo(() => {
    const list = videoQuery.data?.items ?? [];
    return (
      list.find(
        (v) => v.status === "ACTIVE" || v.status === "SCHEDULED",
      ) ?? null
    );
  }, [videoQuery.data]);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoConsultationItem | null>(null);

  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [formMeetingUrl, setFormMeetingUrl] = useState("");
  const [formTitle, setFormTitle] = useState("Konsultasi Video Ibu Hamil");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  const createVideoMutation = useCreateVideoConsultation();
  const updateVideoMutation = useUpdateVideoConsultation(editingVideo?.publicId ?? "");
  const updateVideoStatusMutation = useUpdateVideoConsultationStatus(upcomingVideo?.publicId ?? "");

  const handleOpenScheduleModal = (videoToEdit?: VideoConsultationItem | null) => {
    if (videoToEdit) {
      setEditingVideo(videoToEdit);
      try {
        const d = new Date(videoToEdit.scheduledAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        setFormScheduledAt(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
      } catch {
        setFormScheduledAt("");
      }
      setFormMeetingUrl(videoToEdit.meetingUrl);
      setFormTitle(videoToEdit.title);
      setFormNotes(videoToEdit.notes ?? "");
    } else {
      setEditingVideo(null);
      const nextHour = new Date(Date.now() + 3600000);
      const yyyy = nextHour.getFullYear();
      const mm = String(nextHour.getMonth() + 1).padStart(2, "0");
      const dd = String(nextHour.getDate()).padStart(2, "0");
      const hh = String(nextHour.getHours()).padStart(2, "0");
      const min = String(nextHour.getMinutes()).padStart(2, "0");
      setFormScheduledAt(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
      setFormMeetingUrl("");
      setFormTitle("Konsultasi Video Ibu Hamil");
      setFormNotes("");
    }
    setFormError("");
    setIsScheduleModalOpen(true);
  };

  const handleSaveVideoSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formScheduledAt) {
      setFormError("Tanggal dan waktu jadwal video call wajib diisi");
      return;
    }

    if (!isValidMeetingUrl(formMeetingUrl)) {
      setFormError("URL meeting harus berupa tautan HTTPS yang valid (misal: Google Meet, Jitsi, Teams)");
      return;
    }

    const scheduledIso = new Date(formScheduledAt).toISOString();

    try {
      if (editingVideo) {
        await updateVideoMutation.mutateAsync({
          scheduledAt: scheduledIso,
          meetingUrl: formMeetingUrl.trim(),
          title: formTitle.trim() || "Konsultasi Video Ibu Hamil",
          notes: formNotes.trim() || null,
        });
      } else {
        await createVideoMutation.mutateAsync({
          motherPublicId: thread.mother.publicId,
          threadPublicId: thread.publicId,
          scheduledAt: scheduledIso,
          meetingUrl: formMeetingUrl.trim(),
          title: formTitle.trim() || "Konsultasi Video Ibu Hamil",
          notes: formNotes.trim() || null,
        });
      }
      setIsScheduleModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan jadwal video call");
    }
  };

  const handleUpdateStatus = async (status: "COMPLETED" | "CANCELLED") => {
    if (!upcomingVideo) return;
    const confirmText =
      status === "COMPLETED"
        ? "Tandai konsultasi video ini telah selesai?"
        : "Apakah Anda yakin ingin membatalkan jadwal video call ini?";
    if (!window.confirm(confirmText)) return;

    try {
      await updateVideoStatusMutation.mutateAsync({ status });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui status video call");
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Top Header: Mother Info & Actions */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">{thread.mother.fullName}</h2>
            {thread.attentionFlag === "NEEDS_ATTENTION" && (
              <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold">
                ⚠️ Perlu Perhatian
              </span>
            )}
            {isClosed && (
              <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-medium">
                Selesai
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Usia Kehamilan:{" "}
            <span className="font-semibold text-slate-700">
              {thread.gestationalAge
                ? `${thread.gestationalAge.weeks} minggu ${thread.gestationalAge.days} hari`
                : thread.pregnancy?.gestationalAgeWeeks
                ? `${thread.pregnancy.gestationalAgeWeeks} minggu`
                : "Belum tercatat"}
            </span>{" "}
            • Trimester {thread.trimester ?? "-"} • HPL:{" "}
            <span className="font-semibold text-slate-700">
              {thread.estimatedDueDate ?? "Belum diisi"}
            </span>
          </p>
        </div>

        {/* Quick Contact & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenScheduleModal(upcomingVideo)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
          >
            <span>📹 {upcomingVideo ? "Kelola Video Call" : "Jadwalkan Video Call"}</span>
          </button>

          {thread.mother.phoneNumber && (
            <>
              <a
                href={`https://wa.me/${thread.mother.phoneNumber.replace(/^0/, "62")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <span>WhatsApp</span>
              </a>
              <a
                href={`tel:${thread.mother.phoneNumber}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <span>Telepon</span>
              </a>
            </>
          )}

          <button
            onClick={onToggleAttention}
            disabled={isTogglingAttention}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              thread.attentionFlag === "NEEDS_ATTENTION"
                ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
            }`}
          >
            {thread.attentionFlag === "NEEDS_ATTENTION"
              ? "Hapus Tanda Perhatian"
              : "Tandai Perlu Perhatian"}
          </button>

          <button
            onClick={onToggleStatus}
            disabled={isTogglingStatus}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              isClosed
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {isClosed ? "Buka Kembali Konsultasi" : "Tutup Konsultasi"}
          </button>
        </div>
      </div>

      {/* MANDATORY CLINICAL SAFETY WARNING BANNER */}
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <span>
            <strong>Peringatan Keselamatan Medis:</strong> Layanan pesan ini adalah sarana telekonsultasi
            suportif non-diagnostik. Jika ibu mengalami tanda bahaya kehamilan atau kondisi darurat medis,
            segera arahkan ke Puskesmas/IGD terdekat atau hubungi <strong>119</strong>.
          </span>
        </div>
      </div>

      {/* VIDEO CONSULTATION BANNER (STAGE 10) */}
      {upcomingVideo ? (
        <div className="border-b border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500 text-white flex items-center justify-center text-lg flex-shrink-0">
              📹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">
                  {upcomingVideo.title}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    upcomingVideo.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {upcomingVideo.status === "ACTIVE" ? "SEDANG AKTIF" : "TERJADWAL"}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Waktu:{" "}
                <span className="font-semibold text-slate-800">
                  {formatVideoDateTime(upcomingVideo.scheduledAt)}
                </span>
                {upcomingVideo.notes && ` • Catatan: ${upcomingVideo.notes}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={upcomingVideo.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 shadow-sm transition-colors"
            >
              <span>Buka Link Video Call</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <button
              onClick={() => handleOpenScheduleModal(upcomingVideo)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Ubah Jadwal
            </button>

            <button
              onClick={() => handleUpdateStatus("COMPLETED")}
              disabled={updateVideoStatusMutation.isPending}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              Tandai Selesai
            </button>

            <button
              onClick={() => handleUpdateStatus("CANCELLED")}
              disabled={updateVideoStatusMutation.isPending}
              className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Batalkan
            </button>
          </div>
        </div>
      ) : (
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-2 flex items-center justify-between text-xs text-slate-500">
          <span>Belum ada jadwal video call dengan ibu ini.</span>
          <button
            onClick={() => handleOpenScheduleModal(null)}
            className="text-sky-600 font-semibold hover:underline"
          >
            + Jadwalkan Video Call
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="text-center text-sm text-slate-500 py-8">Memuat pesan...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-8">
            Belum ada pesan dalam sesi konsultasi ini.
          </div>
        ) : (
          messages.map((msg) => {
            const isMidwife = msg.senderRole === "MIDWIFE";

            return (
              <div
                key={msg.publicId}
                className={`flex flex-col ${isMidwife ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl p-3.5 shadow-sm text-sm ${
                    isMidwife
                      ? "bg-emerald-700 text-white rounded-br-none"
                      : "bg-white text-slate-900 border border-slate-200 rounded-bl-none"
                  }`}
                >
                  {/* Sender Tag */}
                  <div
                    className={`text-[11px] font-bold mb-1 ${
                      isMidwife ? "text-emerald-200" : "text-emerald-700"
                    }`}
                  >
                    {isMidwife ? "Anda (Bidan)" : thread.mother.fullName}
                  </div>

                  {/* Attachment Rendering */}
                  {(() => {
                    const att = msg.attachments?.[0] || msg.attachment;
                    if (!att) return null;
                    return (
                      <div className="mb-2">
                        {att.fileType === "IMAGE" ? (
                          <ConsultationImageAttachment
                            attachmentPublicId={att.publicId}
                            filename={att.originalFilename}
                          />
                        ) : att.fileType === "VOICE" ? (
                          <ConsultationVoiceAttachment
                            attachmentPublicId={att.publicId}
                            durationSeconds={att.durationSeconds}
                            isMidwifeSender={isMidwife}
                          />
                        ) : null}
                      </div>
                    );
                  })()}

                  {/* Text Body */}
                  {(msg.body || msg.text) && (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.body || msg.text}
                    </p>
                  )}

                  {/* Message Meta */}
                  <div
                    className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                      isMidwife ? "text-emerald-200" : "text-slate-400"
                    }`}
                  >
                    <span>{formatMessageDateTime(msg.createdAt)}</span>
                    {isMidwife && (
                      <span title={msg.readAt ? "Dibaca ibu" : "Terkirim"}>
                        {msg.readAt ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Composer Bar */}
      <div className="border-t border-slate-200 bg-white p-4">
        {isClosed ? (
          <div className="rounded-xl bg-slate-100 p-3 text-center text-xs text-slate-600 font-medium">
            Konsultasi ini telah ditutup. Klik tombol{" "}
            <span className="font-semibold text-emerald-700">"Buka Kembali Konsultasi"</span> di atas
            untuk membalas percakapan.
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-2">
            {submitError && (
              <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700 font-medium">
                {submitError}
              </div>
            )}

            {/* Selected Image Preview */}
            {selectedFile && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img
                  src={selectedFile.previewUrl}
                  alt="Preview"
                  className="h-14 w-14 rounded-lg object-cover border border-slate-300"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {selectedFile.file.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Batal
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Photo Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Kirim Foto"
                className="rounded-xl border border-slate-300 p-2.5 text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition-colors"
              >
                📷
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder="Ketik balasan untuk ibu hamil..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSendingMessage}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSendingMessage || (!inputText.trim() && !selectedFile)}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isSendingMessage ? "Mengirim..." : "Kirim"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* SCHEDULE MODAL (STAGE 10) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingVideo ? "Ubah Jadwal Video Call" : "Jadwalkan Video Call"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ibu: <strong>{thread.mother.fullName}</strong>. Pastikan link meeting menggunakan HTTPS yang aman.
            </p>

            {formError && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveVideoSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal & Waktu Pertemuan <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formScheduledAt}
                  onChange={(e) => setFormScheduledAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Link Meeting URL (HTTPS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://meet.google.com/... atau Jitsi / Teams"
                  value={formMeetingUrl}
                  onChange={(e) => setFormMeetingUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-sky-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Dapat menggunakan Google Meet, Jitsi Meet, MS Teams, atau penyedia lainnya berbasis tautan web.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Judul Pertemuan
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan untuk Ibu (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Siapkan buku KIA dan catatan keluhan bila ada..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createVideoMutation.isPending || updateVideoMutation.isPending}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {createVideoMutation.isPending || updateVideoMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MEDIA ATTACHMENT VIEWERS
// ----------------------------------------------------------------------

function ConsultationImageAttachment({
  attachmentPublicId,
  filename,
}: {
  attachmentPublicId: string;
  filename: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    fetchAttachmentBlob(attachmentPublicId)
      .then((blob) => {
        if (active) {
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachmentPublicId]);

  if (loading) {
    return (
      <div className="h-44 w-56 animate-pulse rounded-xl bg-slate-200 flex items-center justify-center text-xs text-slate-500">
        Memuat gambar...
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="rounded-xl border border-slate-300 p-3 text-xs text-red-500 bg-white">
        Gagal memuat gambar
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 hover:opacity-95 transition-opacity"
      >
        <img
          src={blobUrl}
          alt={filename}
          className="max-h-56 w-auto rounded-xl object-cover"
        />
      </div>

      {isModalOpen && (
        <div
          role="dialog"
          aria-label="Tampilan Gambar Penuh"
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white p-2"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-3 top-3 rounded-full bg-slate-900/70 text-white px-2.5 py-1 text-sm font-bold"
            >
              ✕
            </button>
            <img
              src={blobUrl}
              alt={filename}
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

function ConsultationVoiceAttachment({
  attachmentPublicId,
  durationSeconds,
  isMidwifeSender,
}: {
  attachmentPublicId: string;
  durationSeconds?: number | null | undefined;
  isMidwifeSender: boolean;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    fetchAttachmentBlob(attachmentPublicId)
      .then((blob) => {
        if (active) {
          url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachmentPublicId]);

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl p-2.5 ${
        isMidwifeSender ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-800"
      }`}
    >
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1">
          <span>🎤 Catatan Suara</span>
        </span>
        <span>{formatDuration(durationSeconds)}</span>
      </div>

      {loading ? (
        <span className="text-[11px] opacity-75">Memuat audio...</span>
      ) : audioUrl ? (
        <audio
          controls
          src={audioUrl}
          preload="metadata"
          className="h-8 w-60 mt-1"
        />
      ) : (
        <span className="text-[11px] text-red-300">Gagal memuat audio</span>
      )}
    </div>
  );
}
