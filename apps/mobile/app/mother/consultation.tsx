import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Audio,
  isAudioSupported,
  type AudioRecording,
  type AudioSound,
} from "../../lib/audio-helper";
import { colors, radius, spacing, minimumTouchTarget } from "@pfram/design-tokens";
import type {
  ConsultationAttachmentInput,
  ConsultationAttachmentItem,
} from "@pfram/shared-types";
import {
  formatDuration,
  formatMeetingDateTime,
  formatMessageTime,
  isValidMeetingUrl,
} from "../../lib/consultation-api";
import {
  useMarkMotherConsultationRead,
  useMotherConsultationMessages,
  useMotherConsultationThread,
  useMotherUpcomingVideoConsultation,
  useSendMotherConsultationMessage,
} from "../../lib/consultation-queries";

export default function MotherConsultationScreen() {
  const router = useRouter();

  // Queries & Mutations
  const {
    data: thread,
    isLoading: threadLoading,
    error: threadError,
  } = useMotherConsultationThread();

  const { data: upcomingVideo } = useMotherUpcomingVideoConsultation();

  const { data: messagesData } = useMotherConsultationMessages();

  const sendMessageMutation = useSendMotherConsultationMessage();
  const markReadMutation = useMarkMotherConsultationRead();

  // Composer states
  const [inputText, setInputText] = useState("");
  const [pendingImage, setPendingImage] = useState<ConsultationAttachmentInput | null>(null);
  const [pendingAudio, setPendingAudio] = useState<ConsultationAttachmentInput | null>(null);

  // Audio Recording states
  const [recording, setRecording] = useState<AudioRecording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Playback states
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const soundRef = useRef<AudioSound | null>(null);

  // Image viewer modal
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);

  // Auto scroll
  const flatListRef = useRef<FlatList>(null);

  const messages = messagesData?.items ?? [];

  // Mark read on new midwife messages
  useEffect(() => {
    if (thread && thread.unreadCount > 0) {
      markReadMutation.mutate();
    }
  }, [thread, markReadMutation, messages.length]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Pick Image
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Izin Ditolak", "Aplikasi memerlukan izin galeri untuk mengirim foto.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const asset = result.assets[0];
        const filename = asset.fileName || `foto_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || "image/jpeg";

        setPendingImage({
          originalFilename: filename,
          mimeType,
          fileData: asset.base64 ?? "",
        });
        setPendingAudio(null);
      }
    } catch {
      Alert.alert("Error", "Gagal memilih foto dari perangkat.");
    }
  };

  // Start Voice Recording
  const handleStartRecording = async () => {
    if (!Audio || !isAudioSupported) {
      Alert.alert(
        "Modul Audio Tidak Tersedia",
        "Perekaman suara memerlukan Expo Development Build (APK PFRAM). Modul native audio tidak tersedia di lingkungan Expo Go standar.",
      );
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Izin Ditolak", "Aplikasi memerlukan izin mikrofon untuk merekam suara.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY,
      );

      setRecording(newRecording);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      Alert.alert("Error", "Gagal memulai perekaman suara.");
    }
  };

  // Stop Voice Recording
  const handleStopRecording = async () => {
    if (!recording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        // Read audio as base64
        // In Expo React Native, fetch local file as blob or base64
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string)?.split(",")[1];
          if (base64Data) {
            setPendingAudio({
              originalFilename: `voice_${Date.now()}.m4a`,
              mimeType: "audio/m4a",
              fileData: base64Data,
              durationSeconds: Math.max(1, recordingDuration),
            });
            setPendingImage(null);
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch {
      Alert.alert("Error", "Gagal menyelesaikan rekaman suara.");
    }
  };

  // Play Audio
  const handleTogglePlayAudio = async (url: string) => {
    if (!Audio || !isAudioSupported) {
      Alert.alert(
        "Modul Audio Tidak Tersedia",
        "Pemutaran audio memerlukan Expo Development Build (APK PFRAM). Modul native audio tidak tersedia di lingkungan Expo Go standar.",
      );
      return;
    }
    try {
      if (playingUri === url && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingUri(null);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setPlayingUri(url);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingUri(null);
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch {
      Alert.alert("Pemutaran Gagal", "Gagal memutar rekaman suara.");
      setPlayingUri(null);
    }
  };

  // Send Message
  const handleSendMessage = () => {
    if (pendingImage) {
      sendMessageMutation.mutate(
        {
          messageType: "IMAGE",
          body: inputText.trim() || undefined,
          attachment: pendingImage,
        },
        {
          onSuccess: () => {
            setInputText("");
            setPendingImage(null);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
          },
          onError: (err: Error) => {
            Alert.alert("Pengiriman Gagal", err.message || "Gagal mengirim foto.");
          },
        },
      );
      return;
    }

    if (pendingAudio) {
      sendMessageMutation.mutate(
        {
          messageType: "VOICE",
          body: inputText.trim() || undefined,
          attachment: pendingAudio,
        },
        {
          onSuccess: () => {
            setInputText("");
            setPendingAudio(null);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
          },
          onError: (err: Error) => {
            Alert.alert("Pengiriman Gagal", err.message || "Gagal mengirim rekaman suara.");
          },
        },
      );
      return;
    }

    if (!inputText.trim()) return;

    sendMessageMutation.mutate(
      {
        messageType: "TEXT",
        body: inputText.trim(),
      },
      {
        onSuccess: () => {
          setInputText("");
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
        },
        onError: (err: Error) => {
          Alert.alert("Pengiriman Gagal", err.message || "Gagal mengirim pesan.");
        },
      },
    );
  };

  // Deep links
  const handleCallMidwife = () => {
    if (!thread?.midwife?.phoneNumber) return;
    Linking.openURL(`tel:${thread.midwife.phoneNumber}`);
  };

  const handleWhatsAppMidwife = () => {
    const num = thread?.midwife?.whatsappNumber || thread?.midwife?.phoneNumber;
    if (!num) return;
    const cleanNum = num.replace(/^0/, "62").replace(/[^0-9]/g, "");
    Linking.openURL(`https://wa.me/${cleanNum}?text=Halo%20Bidan%2C%20saya%20ibu%20binaan%20PFRAM`);
  };

  const handleCallEmergency = () => {
    Linking.openURL("tel:119");
  };

  const handleJoinVideoCall = async (url: string) => {
    if (!isValidMeetingUrl(url)) {
      Alert.alert(
        "Tautan Tidak Valid",
        "Tautan pertemuan video call tidak aman atau tidak valid. Silakan hubungi bidan.",
      );
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Gagal Membuka Tautan",
        "Tidak dapat membuka aplikasi pertemuan virtual. Hubungi bidan melalui saluran alternatif:",
        [
          { text: "WhatsApp", onPress: handleWhatsAppMidwife },
          { text: "Telepon", onPress: handleCallMidwife },
          { text: "Tutup", style: "cancel" },
        ],
      );
    }
  };

  if (threadLoading) {
    return (
      <SafeAreaView style={s.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Memuat ruang konsultasi...</Text>
      </SafeAreaView>
    );
  }

  if (threadError || !thread) {
    return (
      <SafeAreaView style={s.centerContainer}>
        <Text style={s.errorTitle}>Belum Ada Bidan Pendamping</Text>
        <Text style={s.errorSubtitle}>
          Anda belum ditugaskan bidan pendamping aktif untuk kehamilan ini. Silakan hubungi faskes atau tunggu penugasan dari bidan/admin.
        </Text>
        <Pressable style={s.secondaryBtn} onPress={() => router.back()}>
          <Text style={s.secondaryBtnText}>Kembali ke Beranda</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const midwife = thread.midwife;
  const isThreadClosed = thread.status === "CLOSED";

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top Header */}
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>‹</Text>
          </Pressable>
          <View style={s.headerInfo}>
            <Text style={s.midwifeName} numberOfLines={1}>
              {midwife?.fullName ?? "Bidan Pendamping"}
            </Text>
            <View style={s.headerSubRow}>
              <View
                style={[
                  s.statusDot,
                  { backgroundColor: isThreadClosed ? "#94A3B8" : "#10B981" },
                ]}
              />
              <Text style={s.statusText}>
                {isThreadClosed ? "Konsultasi Selesai" : "Bidan Pendamping Aktif"}
              </Text>
            </View>
          </View>
          <View style={s.headerActions}>
            <Pressable
              style={s.iconBtn}
              onPress={handleCallMidwife}
              accessibilityLabel="Telepon Bidan"
            >
              <Text style={s.iconBtnText}>📞</Text>
            </Pressable>
            <Pressable
              style={[s.iconBtn, { backgroundColor: "#DCFCE7" }]}
              onPress={handleWhatsAppMidwife}
              accessibilityLabel="WhatsApp Bidan"
            >
              <Text style={s.iconBtnText}>💬</Text>
            </Pressable>
          </View>
        </View>

        {/* Service Hours & SLA Info Strip */}
        <View style={s.slaBar}>
          <Text style={s.slaText}>
            ⏱ Jam Layanan: {midwife?.serviceStartTime ?? "08:00"}–{midwife?.serviceEndTime ?? "16:00"} • Estimasi Respons: ~{midwife?.estimatedResponseMinutes ?? 60} mnt
          </Text>
        </View>

        {/* Mandatory Clinical Safety Warning Banner */}
        <View style={s.emergencyBanner}>
          <Text style={s.emergencyTitle}>🚨 PERHATIAN MEDIS DARURAT</Text>
          <Text style={s.emergencyText}>
            Telekonsultasi bukan untuk kegawatdaruratan. Bila mengalami perdarahan, kejang, nyeri perut hebat, atau demam tinggi, JANGAN menunggu balasan chat.
          </Text>
          <View style={s.emergencyActions}>
            <Pressable style={s.emergencyBtn} onPress={handleCallEmergency}>
              <Text style={s.emergencyBtnText}>🚑 Hubungi 119 / IGD</Text>
            </Pressable>
            <Pressable style={s.emergencyWaBtn} onPress={handleWhatsAppMidwife}>
              <Text style={s.emergencyWaBtnText}>WhatsApp Bidan</Text>
            </Pressable>
          </View>
        </View>

        {/* Stage 10 — Video Call Schedule Card */}
        {upcomingVideo ? (
          <View style={s.videoCard}>
            <View style={s.videoHeaderRow}>
              <View style={s.videoHeaderTitleRow}>
                <Text style={s.videoHeaderIcon}>📹</Text>
                <Text style={s.videoHeaderTitle}>Video Call Bidan</Text>
              </View>
              <View
                style={[
                  s.videoBadge,
                  upcomingVideo.status === "ACTIVE"
                    ? s.videoBadgeActive
                    : s.videoBadgeScheduled,
                ]}
              >
                <Text style={s.videoBadgeText}>
                  {upcomingVideo.status === "ACTIVE"
                    ? "SEDANG AKTIF"
                    : "DIJADWALKAN"}
                </Text>
              </View>
            </View>
            <Text style={s.videoTitleText}>{upcomingVideo.title}</Text>
            <Text style={s.videoTimeText}>
              🗓 {formatMeetingDateTime(upcomingVideo.scheduledAt)}
            </Text>
            {Boolean(upcomingVideo.notes) && (
              <Text style={s.videoNotesText}>{upcomingVideo.notes}</Text>
            )}
            <Pressable
              style={s.videoJoinBtn}
              onPress={() => handleJoinVideoCall(upcomingVideo.meetingUrl)}
              accessibilityLabel="Gabung Video Call"
            >
              <Text style={s.videoJoinBtnText}>▶ Gabung Video Call</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.videoEmptyCard}>
            <Text style={s.videoEmptyText}>
              📹 Belum ada jadwal video call.
            </Text>
          </View>
        )}

        {/* Message Stream */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.publicId}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <Text style={s.emptyChatTitle}>Mulai Konsultasi</Text>
              <Text style={s.emptyChatSubtitle}>
                Kirimkan pertanyaan, keluhan, atau foto kondisi kehamilan Anda ke Bidan {midwife?.fullName}.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMother = item.senderRole === "MOTHER";
            return (
              <View
                style={[
                  s.messageRow,
                  isMother ? s.messageRowRight : s.messageRowLeft,
                ]}
              >
                {!isMother && (
                  <View style={s.midwifeAvatar}>
                    <Text style={s.avatarText}>Bd</Text>
                  </View>
                )}
                <View
                  style={[
                    s.bubble,
                    isMother ? s.motherBubble : s.midwifeBubble,
                  ]}
                >
                  {!isMother && (
                    <Text style={s.senderLabel}>{midwife?.fullName ?? "Bidan"}</Text>
                  )}

                  {/* Text Body */}
                  {Boolean(item.body) && (
                    <Text
                      style={[
                        s.messageText,
                        isMother ? s.motherMessageText : s.midwifeMessageText,
                      ]}
                    >
                      {item.body}
                    </Text>
                  )}

                  {/* Attachments */}
                  {(item.attachments ?? []).map((att: ConsultationAttachmentItem) => (
                    <View key={att.publicId} style={s.attachmentContainer}>
                      {att.fileType === "IMAGE" ? (
                        <Pressable onPress={() => setViewingImageUri(att.downloadUrl)}>
                          <Image
                            source={{ uri: att.downloadUrl }}
                            style={s.attachmentImage}
                            resizeMode="cover"
                          />
                          <Text style={s.tapToViewText}>Ketuk untuk perbesar</Text>
                        </Pressable>
                      ) : (
                        <View style={s.voicePlayer}>
                          <Pressable
                            style={s.playBtn}
                            onPress={() => handleTogglePlayAudio(att.downloadUrl)}
                          >
                            <Text style={s.playBtnText}>
                              {playingUri === att.downloadUrl ? "⏸" : "▶"}
                            </Text>
                          </Pressable>
                          <View style={s.voiceMeta}>
                            <Text style={s.voiceTitle}>Pesan Suara</Text>
                            <Text style={s.voiceDuration}>
                              {formatDuration(att.durationSeconds)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Message Footer (Time & Read receipt) */}
                  <View style={s.metaRow}>
                    <Text
                      style={[
                        s.timeText,
                        isMother ? s.motherTimeText : s.midwifeTimeText,
                      ]}
                    >
                      {formatMessageTime(item.createdAt)}
                    </Text>
                    {isMother && (
                      <Text style={s.readReceipt}>
                        {item.readAt ? "✓✓" : "✓"}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* Pending Attachment Preview Bar */}
        {pendingImage && (
          <View style={s.previewBar}>
            <Image
              source={{ uri: `data:${pendingImage.mimeType};base64,${pendingImage.fileData}` }}
              style={s.previewThumb}
            />
            <View style={s.previewInfo}>
              <Text style={s.previewTitle} numberOfLines={1}>
                {pendingImage.originalFilename}
              </Text>
              <Text style={s.previewSub}>Foto siap dikirim</Text>
            </View>
            <Pressable
              style={s.cancelPreviewBtn}
              onPress={() => setPendingImage(null)}
            >
              <Text style={s.cancelPreviewBtnText}>✕</Text>
            </Pressable>
          </View>
        )}

        {pendingAudio && (
          <View style={s.previewBar}>
            <View style={s.previewAudioIcon}>
              <Text style={s.previewAudioText}>🎤</Text>
            </View>
            <View style={s.previewInfo}>
              <Text style={s.previewTitle}>Rekaman Suara</Text>
              <Text style={s.previewSub}>
                Durasi: {formatDuration(pendingAudio.durationSeconds)}
              </Text>
            </View>
            <Pressable
              style={s.cancelPreviewBtn}
              onPress={() => setPendingAudio(null)}
            >
              <Text style={s.cancelPreviewBtnText}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Recording active bar */}
        {recording && (
          <View style={s.recordingBar}>
            <View style={s.recordingDot} />
            <Text style={s.recordingTimeText}>
              Merekam suara: {formatDuration(recordingDuration)}
            </Text>
            <Pressable style={s.stopRecordingBtn} onPress={handleStopRecording}>
              <Text style={s.stopRecordingBtnText}>Selesai ⏹</Text>
            </Pressable>
          </View>
        )}

        {/* Composer Bottom Bar */}
        <View style={s.composerContainer}>
          <Pressable
            style={s.attachBtn}
            onPress={handlePickImage}
            accessibilityLabel="Kirim Foto"
          >
            <Text style={s.attachBtnText}>📷</Text>
          </Pressable>

          <Pressable
            style={[s.attachBtn, recording ? s.micActive : null]}
            onPress={recording ? handleStopRecording : handleStartRecording}
            accessibilityLabel="Kirim Pesan Suara"
          >
            <Text style={s.attachBtnText}>🎤</Text>
          </Pressable>

          <TextInput
            style={s.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              pendingImage
                ? "Beri keterangan foto (opsional)..."
                : pendingAudio
                  ? "Beri catatan suara (opsional)..."
                  : "Tulis pesan ke bidan..."
            }
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={1000}
          />

          <Pressable
            style={[
              s.sendBtn,
              (!inputText.trim() && !pendingImage && !pendingAudio) ||
              sendMessageMutation.isPending
                ? s.sendBtnDisabled
                : null,
            ]}
            onPress={handleSendMessage}
            disabled={
              (!inputText.trim() && !pendingImage && !pendingAudio) ||
              sendMessageMutation.isPending
            }
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.sendBtnText}>➤</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Full Image Modal */}
      <Modal visible={Boolean(viewingImageUri)} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable
            style={s.modalCloseBtn}
            onPress={() => setViewingImageUri(null)}
          >
            <Text style={s.modalCloseText}>✕ Tutup</Text>
          </Pressable>
          {viewingImageUri && (
            <Image
              source={{ uri: viewingImageUri }}
              style={s.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  flex1: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.neutral[600],
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.neutral[900],
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.neutral[600],
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  secondaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    minHeight: minimumTouchTarget,
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.xs,
  },
  backBtnText: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: "300",
  },
  headerInfo: {
    flex: 1,
  },
  midwifeName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.neutral[900],
  },
  headerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.neutral[600],
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnText: {
    fontSize: 16,
  },
  slaBar: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  slaText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
    textAlign: "center",
  },
  emergencyBanner: {
    backgroundColor: "#FFF1F2",
    borderLeftWidth: 4,
    borderLeftColor: "#E11D48",
    padding: spacing.sm,
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radius.sm,
  },
  emergencyTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#BE123C",
    marginBottom: 2,
  },
  emergencyText: {
    fontSize: 11,
    color: "#9F1239",
    lineHeight: 15,
  },
  emergencyActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 6,
  },
  emergencyBtn: {
    backgroundColor: "#E11D48",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  emergencyBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  emergencyWaBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  emergencyWaBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  emptyChat: {
    padding: spacing.xl,
    alignItems: "center",
    marginTop: 40,
  },
  emptyChatTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.neutral[800],
    marginBottom: 4,
  },
  emptyChatSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    textAlign: "center",
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },
  midwifeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    alignSelf: "flex-end",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  motherBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  midwifeBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  motherMessageText: {
    color: "#FFFFFF",
  },
  midwifeMessageText: {
    color: colors.neutral[900],
  },
  attachmentContainer: {
    marginTop: 6,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  tapToViewText: {
    fontSize: 10,
    color: "#CBD5E1",
    marginTop: 2,
    textAlign: "center",
  },
  voicePlayer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 8,
    borderRadius: 8,
    minWidth: 160,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  playBtnText: {
    fontSize: 14,
    color: colors.primary,
  },
  voiceMeta: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  voiceDuration: {
    fontSize: 10,
    color: "#64748B",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
  },
  motherTimeText: {
    color: "#E2E8F0",
  },
  midwifeTimeText: {
    color: "#94A3B8",
  },
  readReceipt: {
    fontSize: 10,
    color: "#E2E8F0",
    fontWeight: "700",
  },
  previewBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  previewThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  previewAudioIcon: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  previewAudioText: {
    fontSize: 20,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.neutral[900],
  },
  previewSub: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  cancelPreviewBtn: {
    padding: 8,
  },
  cancelPreviewBtnText: {
    fontSize: 16,
    color: colors.neutral[400],
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#FECDD3",
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    marginRight: 8,
  },
  recordingTimeText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "600",
  },
  stopRecordingBtn: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stopRecordingBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  composerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    minHeight: 52,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  micActive: {
    backgroundColor: "#FEE2E2",
  },
  attachBtnText: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: colors.neutral[900],
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  sendBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  fullImage: {
    width: "90%",
    height: "80%",
  },
  videoCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  videoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  videoHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  videoHeaderIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  videoHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3730A3",
  },
  videoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoBadgeScheduled: {
    backgroundColor: "#E0E7FF",
  },
  videoBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3730A3",
  },
  videoTitleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E1B4B",
    marginBottom: 2,
  },
  videoTimeText: {
    fontSize: 12,
    color: "#4338CA",
    marginBottom: 4,
  },
  videoNotesText: {
    fontSize: 11,
    color: "#475569",
    fontStyle: "italic",
    marginBottom: 8,
  },
  videoJoinBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  videoJoinBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  videoEmptyCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  videoEmptyText: {
    fontSize: 11,
    color: "#64748B",
  },
});
