import React, { useState, useEffect, useRef } from "react";
import { MotherAppShell } from "../MotherAppShell";
import { Card, Button, StatusBadge, LoadingSkeleton } from "../../components";
import {
  useMotherConsultationThread,
  useMotherConsultationMessages,
  useSendMotherConsultationMessage,
  useMarkMotherConsultationRead,
  useMotherUpcomingVideoConsultation,
  useMotherVideoConsultations,
} from "../../consultation-queries";
import {
  fetchAttachmentBlob,
  formatDuration,
  formatMotherMessageTime,
  formatMotherVideoDateTime,
  isValidMeetingUrl,
} from "../../consultation-api";
import type {
  ConsultationAttachmentInput,
  ConsultationMessageItem,
} from "@pfram/shared-types";

// Maximum file sizes matching backend storage.ts
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/* =========================================================================
   ATTACHMENT COMPONENTS
   ========================================================================= */

function ImageAttachmentView({
  attachmentPublicId,
  filename,
}: {
  attachmentPublicId: string;
  filename: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachmentPublicId]);

  if (loading) {
    return (
      <div className="h-40 w-48 animate-pulse rounded-xl bg-slate-200 flex items-center justify-center text-xs text-slate-500">
        Memuat foto...
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
        Gagal memuat foto
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Lihat foto ${filename}`}
        onClick={() => setIsModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsModalOpen(true);
        }}
        className="cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 hover:opacity-95 transition-opacity"
      >
        <img
          src={blobUrl}
          alt={filename}
          className="max-h-56 max-w-full rounded-xl object-cover"
        />
      </div>

      {isModalOpen && (
        <div
          role="dialog"
          aria-label="Tampilan Foto Lengkap"
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white p-2"
          >
            <button
              type="button"
              aria-label="Tutup tampilan foto"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-3 top-3 rounded-full bg-slate-900/70 text-white px-2.5 py-1 text-sm font-bold hover:bg-slate-900"
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

function VoiceAttachmentView({
  attachmentPublicId,
  durationSeconds,
  isMotherSender,
}: {
  attachmentPublicId: string;
  durationSeconds?: number | null | undefined;
  isMotherSender: boolean;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachmentPublicId]);

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl p-2.5 min-w-[200px] ${
        isMotherSender
          ? "bg-emerald-700 text-white"
          : "bg-slate-100 text-slate-800 border border-slate-200/80"
      }`}
    >
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="flex items-center gap-1.5">
          <span>🎤</span>
          <span>Pesan Suara</span>
        </span>
        <span className="font-mono opacity-80">
          {formatDuration(durationSeconds)}
        </span>
      </div>

      {loading ? (
        <span className="text-[11px] opacity-75">Memuat rekaman suara...</span>
      ) : error || !audioUrl ? (
        <span className="text-[11px] text-red-300">Gagal memuat suara</span>
      ) : (
        <audio
          controls
          src={audioUrl}
          preload="metadata"
          className="h-8 w-full max-w-[260px] mt-1"
          aria-label="Pemutar rekaman pesan suara"
        />
      )}
    </div>
  );
}

/* =========================================================================
   MAIN COMPONENT: MotherConsultationPage
   ========================================================================= */

export function MotherConsultationPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "video">("chat");

  // Queries
  const {
    data: thread,
    isLoading: threadLoading,
    error: threadError,
    refetch: refetchThread,
  } = useMotherConsultationThread();

  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useMotherConsultationMessages();

  const { data: upcomingVideo } = useMotherUpcomingVideoConsultation();
  const { data: videoList } = useMotherVideoConsultations();

  const sendMutation = useSendMotherConsultationMessage();
  const markReadMutation = useMarkMotherConsultationRead();

  // Chat Composer State
  const [inputText, setInputText] = useState("");
  const [pendingImage, setPendingImage] = useState<ConsultationAttachmentInput | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<ConsultationAttachmentInput | null>(null);
  const [pendingAudioPreview, setPendingAudioPreview] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Audio Recording State (native browser MediaRecorder)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messages = messagesData?.items ?? [];

  // Auto scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current?.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Mark read when unread count > 0
  useEffect(() => {
    if (thread && thread.unreadCount > 0) {
      markReadMutation.mutate();
    }
  }, [thread, markReadMutation]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
      if (pendingAudioPreview) URL.revokeObjectURL(pendingAudioPreview);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [pendingImagePreview, pendingAudioPreview]);

  // Handle Photo Picker
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComposerError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
      setComposerError("Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setComposerError("Ukuran foto melebihi batas maksimal 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(",")[1] ?? "";
      if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
      setPendingImagePreview(URL.createObjectURL(file));
      setPendingImage({
        originalFilename: file.name || `foto_${Date.now()}.jpg`,
        mimeType: file.type,
        fileData: base64Data,
      });
      // Clear pending audio if image chosen
      clearPendingAudio();
    };
    reader.onerror = () => {
      setComposerError("Gagal membaca file foto.");
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be picked again if needed
    e.target.value = "";
  };

  const clearPendingImage = () => {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImage(null);
    setPendingImagePreview(null);
  };

  // Voice Recording Functions
  const startRecording = async () => {
    setComposerError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setComposerError("Izin mikrofon ditolak atau perangkat mikrofon tidak tersedia.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedMime = [
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
      ].find((type) => MediaRecorder.isTypeSupported(type)) || "";

      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = supportedMime || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const durationSec = recordingSeconds > 0 ? recordingSeconds : 1;

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64Data = dataUrl.split(",")[1] ?? "";
          if (pendingAudioPreview) URL.revokeObjectURL(pendingAudioPreview);
          setPendingAudioPreview(URL.createObjectURL(audioBlob));
          setPendingAudio({
            originalFilename: `suara_${Date.now()}.${mimeType.includes("mp4") ? "m4a" : "webm"}`,
            mimeType,
            fileData: base64Data,
            durationSeconds: durationSec,
          });
          clearPendingImage();
        };
        reader.readAsDataURL(audioBlob);

        // Stop audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setComposerError("Izin mikrofon ditolak atau perangkat mikrofon tidak tersedia.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    clearPendingAudio();
  };

  const clearPendingAudio = () => {
    if (pendingAudioPreview) URL.revokeObjectURL(pendingAudioPreview);
    setPendingAudio(null);
    setPendingAudioPreview(null);
  };

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setComposerError(null);

    const trimmed = inputText.trim();

    // Determine message type
    if (pendingImage) {
      try {
        await sendMutation.mutateAsync({
          messageType: "IMAGE",
          body: trimmed || undefined,
          attachment: pendingImage,
        });
        setInputText("");
        clearPendingImage();
      } catch (err) {
        setComposerError(
          err instanceof Error ? err.message : "Gagal mengirim foto konsultasi",
        );
      }
      return;
    }

    if (pendingAudio) {
      try {
        await sendMutation.mutateAsync({
          messageType: "VOICE",
          body: trimmed || undefined,
          attachment: pendingAudio,
        });
        setInputText("");
        clearPendingAudio();
      } catch (err) {
        setComposerError(
          err instanceof Error ? err.message : "Gagal mengirim rekaman suara",
        );
      }
      return;
    }

    if (!trimmed) {
      setComposerError("Pesan teks tidak boleh kosong");
      return;
    }

    try {
      await sendMutation.mutateAsync({
        messageType: "TEXT",
        body: trimmed,
      });
      setInputText("");
    } catch (err) {
      setComposerError(
        err instanceof Error ? err.message : "Gagal mengirim pesan teks",
      );
    }
  };

  // Check error status (e.g. MIDWIFE_NOT_ASSIGNED)
  const isNotAssigned =
    (threadError as { code?: string; status?: number })?.code ===
      "MIDWIFE_NOT_ASSIGNED" ||
    (threadError as { code?: string; status?: number })?.status === 404;

  const midwife = thread?.midwife;

  return (
    <MotherAppShell
      title="Telekonsultasi Bidan"
      subtitle="Telekonsultasi Asuhan Maternal"
    >
      <div className="space-y-4 pb-2">
        {/* =========================================================================
           1. CLINICAL SAFETY ALERT (LOCKED WORDING)
           ========================================================================= */}
        <aside
          role="note"
          aria-label="Perhatian Keselamatan Maternal"
          className="rounded-2xl border border-rose-200/90 bg-rose-50/80 p-3.5 text-xs text-rose-950 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-rose-950">
                Perhatian Keselamatan Maternal
              </p>
              <p className="mt-0.5 leading-relaxed text-rose-900">
                Konsultasi ini bukan saluran darurat medis. Jika ibu mengalami tanda bahaya kehamilan:{" "}
                <strong className="font-bold underline decoration-rose-400">
                  Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.
                </strong>
              </p>
            </div>
          </div>
        </aside>

        {/* =========================================================================
           2. NAVIGATION TABS (CHAT VS VIDEO CALL)
           ========================================================================= */}
        <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 border border-slate-200/70 shadow-2xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-white text-pfram-primary shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            💬 Pesan Konsultasi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("video")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === "video"
                ? "bg-white text-pfram-primary shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            📹 Video Konsultasi
            {upcomingVideo && (
              <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* =========================================================================
           3. MIDWIFE / CARE TEAM INFO OR NOT ASSIGNED
           ========================================================================= */}
        {threadLoading ? (
          <Card className="rounded-2xl p-4 border border-slate-200/80 bg-white">
            <LoadingSkeleton className="h-4 w-32 mb-2" />
            <LoadingSkeleton className="h-3 w-48" />
          </Card>
        ) : isNotAssigned ? (
          <Card className="rounded-2xl p-5 border border-amber-200 bg-amber-50/70 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-800">
              👩‍⚕️
            </div>
            <h2 className="mt-3 text-sm font-bold text-amber-950">
              Bidan Pendamping Belum Ditugaskan
            </h2>
            <p className="mt-1 text-xs text-amber-900 leading-relaxed max-w-sm mx-auto">
              Bidan pendamping sedang diproses oleh puskesmas.
            </p>
            <div className="mt-3.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchThread()}
                className="rounded-xl"
              >
                Coba Lagi
              </Button>
            </div>
          </Card>
        ) : midwife ? (
          <Card className="rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl ring-1 ring-emerald-200/70 text-emerald-800">
                  👩‍⚕️
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900">
                      {midwife.fullName}
                    </h2>
                    <StatusBadge variant="success" size="sm">
                      Bidan Pendamping
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    📍 {(midwife as { facilityName?: string }).facilityName || midwife.primaryFacilityName || "Puskesmas"}
                  </p>
                  {/* Working Hours & SLA */}
                  <p className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>⏰ {midwife.serviceStartTime || "08.00"}–{midwife.serviceEndTime || "16.00"} WIT</span>
                    <span>• Estimasi balasan: {midwife.estimatedResponseMinutes ? `~${midwife.estimatedResponseMinutes} menit` : "1-2 jam kerja"}</span>
                  </p>
                </div>
              </div>

              {/* Direct Fallback Actions (WhatsApp / Phone) */}
              <div className="flex flex-col gap-1 shrink-0">
                {midwife.whatsappNumber && (
                  <a
                    href={`https://wa.me/${midwife.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
                    aria-label="WhatsApp Bidan"
                    title="Buka WhatsApp Bidan"
                  >
                    <span>💬</span>
                    <span>WhatsApp</span>
                  </a>
                )}
                {midwife.phoneNumber && (
                  <a
                    href={`tel:${midwife.phoneNumber}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200 border border-slate-200/60 transition-colors"
                    aria-label="Telepon Bidan"
                    title="Telepon Bidan"
                  >
                    <span>📞</span>
                    <span>Telepon</span>
                  </a>
                )}
              </div>
            </div>
            {midwife.whatsappNumber && (
              <p className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-tight">
                Catatan: Riwayat konsultasi medis resmi tetap didokumentasikan di aplikasi PFRAM.
              </p>
            )}
          </Card>
        ) : null}

        {/* =========================================================================
           4. UPCOMING VIDEO CONSULTATION BANNER (ACTIVE/SCHEDULED)
           ========================================================================= */}
        {upcomingVideo && (
          <Card className="p-3.5 border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">📹</span>
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Konsultasi Video Terjadwal
                  </span>
                  <StatusBadge
                    variant={upcomingVideo.status === "ACTIVE" ? "success" : "info"}
                    size="sm"
                  >
                    {upcomingVideo.status === "ACTIVE" ? "Sedang Berlangsung" : "Terjadwal"}
                  </StatusBadge>
                </div>
                <h3 className="mt-1 text-sm font-bold text-slate-900">
                  Konsultasi Video Mendatang
                </h3>
                <p className="mt-0.5 text-xs text-slate-700 font-medium">
                  📅 {formatMotherVideoDateTime(upcomingVideo.scheduledAt)}
                </p>
                {upcomingVideo.notes && (
                  <p className="mt-1 text-[11px] text-slate-600 italic">
                    Catatan: {upcomingVideo.notes}
                  </p>
                )}
              </div>
              {isValidMeetingUrl(upcomingVideo.meetingUrl) && (
                <a
                  href={upcomingVideo.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Gabung Video Sekarang"
                  className="shrink-0 mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <span>Gabung Video Sekarang</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          </Card>
        )}

        {/* =========================================================================
           5. TAB CONTENT: VIDEO CONSULTATION LIST
           ========================================================================= */}
        {activeTab === "video" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Daftar Konsultasi Video
            </h2>

            {videoList?.items && videoList.items.length > 0 ? (
              <div className="space-y-2">
                {videoList.items.map((item) => (
                  <Card key={item.publicId} className="p-3.5 border border-slate-200/90 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">
                            {item.title || "Konsultasi Video"}
                          </h4>
                          <StatusBadge
                            variant={
                              item.status === "ACTIVE"
                                ? "success"
                                : item.status === "COMPLETED"
                                ? "neutral"
                                : item.status === "CANCELLED"
                                ? "danger"
                                : "info"
                            }
                            size="sm"
                          >
                            {item.status === "SCHEDULED"
                              ? "Terjadwal"
                              : item.status === "ACTIVE"
                              ? "Aktif"
                              : item.status === "COMPLETED"
                              ? "Selesai"
                              : "Dibatalkan"}
                          </StatusBadge>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          📅 {formatMotherVideoDateTime(item.scheduledAt)}
                        </p>
                        {item.midwifeName && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Bidan: {item.midwifeName}
                          </p>
                        )}
                      </div>
                      {(item.status === "SCHEDULED" || item.status === "ACTIVE") &&
                        isValidMeetingUrl(item.meetingUrl) && (
                          <a
                            href={item.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shrink-0"
                          >
                            Gabung
                          </a>
                        )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center border border-slate-200/90 bg-white">
                <span className="text-2xl">📹</span>
                <p className="text-xs font-semibold text-slate-700 mt-2">
                  Belum ada jadwal konsultasi video.
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bidan pendamping Anda dapat menjadwalkan konsultasi tatap muka online saat diperlukan.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* =========================================================================
           6. TAB CONTENT: CHAT THREAD & COMPOSER
           ========================================================================= */}
        {activeTab === "chat" && (
          <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden min-h-[460px]">
            {/* Thread Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>💬</span>
                <span>Ruang Pesan Telekonsultasi</span>
              </span>
              <button
                type="button"
                onClick={() => refetchMessages()}
                className="text-[11px] font-medium text-slate-500 hover:text-pfram-primary transition-colors"
                title="Perbarui pesan"
              >
                🔄 Segarkan
              </button>
            </div>

            {/* Message List */}
            <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-[380px] bg-slate-50/30">
              {messagesLoading ? (
                <div className="space-y-3 p-2">
                  <LoadingSkeleton className="h-12 w-3/4 rounded-2xl ml-auto" />
                  <LoadingSkeleton className="h-16 w-3/4 rounded-2xl mr-auto" />
                  <LoadingSkeleton className="h-10 w-1/2 rounded-2xl ml-auto" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-800">
                    💬
                  </div>
                  <h3 className="mt-2.5 text-xs font-bold text-slate-800">
                    Belum ada percakapan
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Sampaikan pertanyaan seputar keluhan kehamilan, nutrisi, atau jadwal kontrol kepada Bidan pendamping Anda.
                  </p>
                </div>
              ) : (
                messages.map((msg: ConsultationMessageItem) => {
                  const isMother = msg.senderRole === "MOTHER";
                  const attachment = msg.attachments?.[0];

                  return (
                    <div
                      key={msg.publicId}
                      className={`flex flex-col ${isMother ? "items-end" : "items-start"}`}
                    >
                      {/* Sender label */}
                      <span className="text-[10px] text-slate-500 mb-0.5 px-1 font-medium">
                        {isMother ? "Saya" : `Bidan ${midwife?.fullName || "Pendamping"}`}
                      </span>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs space-y-2 ${
                          isMother
                            ? "bg-gradient-to-br from-[#168C68] to-[#155E4B] text-white rounded-br-xs"
                            : "bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs"
                        }`}
                      >
                        {/* Text Content */}
                        {msg.body && (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {msg.body}
                          </p>
                        )}

                        {/* Image Attachment */}
                        {attachment && attachment.fileType === "IMAGE" && (
                          <div className="pt-1">
                            <ImageAttachmentView
                              attachmentPublicId={attachment.publicId}
                              filename={attachment.originalFilename}
                            />
                          </div>
                        )}

                        {/* Voice Attachment */}
                        {attachment && attachment.fileType === "VOICE" && (
                          <div className="pt-1">
                            <VoiceAttachmentView
                              attachmentPublicId={attachment.publicId}
                              durationSeconds={attachment.durationSeconds}
                              isMotherSender={isMother}
                            />
                          </div>
                        )}

                        {/* Timestamp */}
                        <div
                          className={`text-[10px] flex items-center justify-end gap-1 ${
                            isMother ? "text-emerald-100" : "text-slate-500"
                          }`}
                        >
                          <span>
                            {formatMotherMessageTime(
                              msg.createdAt ||
                                (msg as { sentAt?: string }).sentAt ||
                                "",
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error banner in composer */}
            {composerError && (
              <div className="bg-red-50 px-3.5 py-2 border-t border-red-200 text-xs text-red-700 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span aria-hidden="true">⚠️</span>
                  <span>{composerError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setComposerError(null)}
                  className="font-bold text-red-800 hover:text-red-950 px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Pending Attachments Preview Area */}
            {pendingImagePreview && (
              <div className="border-t border-slate-100 bg-slate-50 p-2.5 flex items-center gap-2">
                <div className="relative inline-block">
                  <img
                    src={pendingImagePreview}
                    alt="Lampiran foto"
                    className="h-16 w-16 object-cover rounded-xl border border-slate-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={clearPendingImage}
                    aria-label="Hapus lampiran foto"
                    className="absolute -top-1.5 -right-1.5 rounded-full bg-red-600 text-white h-5 w-5 flex items-center justify-center text-xs font-bold shadow hover:bg-red-700"
                  >
                    ✕
                  </button>
                </div>
                <span className="text-xs text-slate-600 truncate">
                  {pendingImage?.originalFilename}
                </span>
              </div>
            )}

            {pendingAudioPreview && (
              <div className="border-t border-slate-100 bg-slate-50 p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-base">🎤</span>
                  <audio
                    controls
                    src={pendingAudioPreview}
                    preload="metadata"
                    className="h-7 w-48"
                  />
                  <span className="text-xs font-mono text-slate-600">
                    {formatDuration(pendingAudio?.durationSeconds)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearPendingAudio}
                  aria-label="Hapus rekaman suara"
                  className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1"
                >
                  ✕ Batal
                </button>
              </div>
            )}

            {/* Active Recording State Overlay */}
            {isRecording ? (
              <div className="border-t border-rose-200 bg-rose-50/90 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
                  </span>
                  <span className="text-xs font-bold text-rose-900">
                    Merekam suara: {formatDuration(recordingSeconds)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              /* Normal Composer Area */
              <form
                onSubmit={handleSendMessage}
                className="border-t border-slate-200/90 bg-white p-2.5"
              >
                {/* Hidden File Input */}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                  aria-label="Lampirkan Foto"
                />

                <div className="flex items-end gap-2">
                  {/* Photo Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isNotAssigned || sendMutation.isPending}
                    aria-label="Tombol lampirkan foto"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors disabled:opacity-50"
                    title="Pilih foto"
                  >
                    📷
                  </button>

                  {/* Microphone Button */}
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isNotAssigned || sendMutation.isPending}
                    aria-label="Rekam Pesan Suara"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors disabled:opacity-50"
                    title="Rekam pesan suara"
                  >
                    🎤
                  </button>

                  {/* Textarea */}
                  <div className="flex-1">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      aria-label="Tulis pesan untuk bidan"
                      placeholder={
                        isNotAssigned
                          ? "Bidan pendamping belum ditugaskan..."
                          : "Tulis pesan untuk bidan…"
                      }
                      disabled={isNotAssigned || sendMutation.isPending}
                      rows={1}
                      className="w-full resize-none rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-pfram-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-pfram-primary"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={
                      isNotAssigned ||
                      sendMutation.isPending ||
                      (!inputText.trim() && !pendingImage && !pendingAudio)
                    }
                    aria-label="Kirim pesan"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pfram-primary text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {sendMutation.isPending ? (
                      <span className="text-xs">⏳</span>
                    ) : (
                      <span className="text-sm font-bold">➤</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </MotherAppShell>
  );
}
