import {
  AudioModule,
  createAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  type AudioPlayer,
  type AudioRecorder,
  type AudioStatus,
  type RecordingOptions,
  type RecorderState,
} from "expo-audio";

export const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: ".m4a",
  android: {
    extension: ".m4a",
    outputFormat: "mpeg4",
    audioEncoder: "aac",
  },
};

export function getVoiceMetadata(uri: string, durationSeconds: number) {
  const is3gp = uri.toLowerCase().endsWith(".3gp");
  const extension = is3gp ? "3gp" : "m4a";
  const mimeType = is3gp ? "audio/3gpp" : "audio/m4a";
  return {
    originalFilename: `voice_${Date.now()}.${extension}`,
    mimeType,
    durationSeconds: Math.max(1, durationSeconds),
  };
}

export async function configureAudioForVoiceRecording(): Promise<void> {
  try {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsBackgroundRecording: false,
    });
  } catch (error) {
    console.warn("Failed to set audio mode for recording:", error);
  }
}

export function isAudioAvailable(): boolean {
  try {
    return typeof AudioModule !== "undefined" && AudioModule !== null;
  } catch {
    return false;
  }
}

export {
  AudioModule,
  createAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  type AudioPlayer,
  type AudioRecorder,
  type AudioStatus,
  type RecordingOptions,
  type RecorderState,
};
