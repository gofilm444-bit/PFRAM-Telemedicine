import type { Audio as AudioType, AVPlaybackStatus } from "expo-av";

let resolvedAudio: typeof AudioType | null = null;
let audioAvailable = false;

try {
  // Safe dynamic require to guard against missing ExponentAV native module in standard Expo Go.
  // In Expo Development Build (id.pfram.telemedicine APK), ExponentAV is compiled and works seamlessly.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const expoAv = require("expo-av") as { Audio?: typeof AudioType };
  if (expoAv?.Audio) {
    resolvedAudio = expoAv.Audio;
    audioAvailable = true;
  }
} catch {
  resolvedAudio = null;
  audioAvailable = false;
}

export const Audio = resolvedAudio;
export const isAudioSupported = audioAvailable;
export type AudioRecording = AudioType.Recording;
export type AudioSound = AudioType.Sound;
export type { AVPlaybackStatus };
