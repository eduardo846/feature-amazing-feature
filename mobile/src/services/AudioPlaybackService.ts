import { Audio, PlaybackStatus } from 'expo-av';

const DEFAULT_AUDIO_MODE = {
  allowsRecordingIOS: false,
  interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
  interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
  playThroughEarpieceAndroid: false,
};

let sound: Audio.Sound | null = null;
let statusListener: ((status: PlaybackStatus) => void) | null = null;
let hasInitialized = false;

async function ensureAudioMode(): Promise<void> {
  if (!hasInitialized) {
    await Audio.setAudioModeAsync(DEFAULT_AUDIO_MODE);
    hasInitialized = true;
  }
}

export async function initializeAudioPlayerAsync(): Promise<void> {
  await ensureAudioMode();
  if (!sound) {
    sound = new Audio.Sound();
  }
}

export async function loadAudioAsync(source: Audio.Source): Promise<PlaybackStatus | null> {
  await initializeAudioPlayerAsync();
  if (!sound) {
    return null;
  }
  await sound.unloadAsync();
  const status = await sound.loadAsync(source, {
    shouldPlay: false,
    staysActiveInBackground: true,
  });
  if (statusListener) {
    sound.setOnPlaybackStatusUpdate(statusListener);
  }
  return status;
}

export async function playAudioAsync(): Promise<PlaybackStatus | null> {
  if (!sound) {
    return null;
  }
  return sound.playAsync();
}

export async function pauseAudioAsync(): Promise<PlaybackStatus | null> {
  if (!sound) {
    return null;
  }
  return sound.pauseAsync();
}

export async function stopAudioAsync(): Promise<PlaybackStatus | null> {
  if (!sound) {
    return null;
  }
  return sound.stopAsync();
}

export async function seekAudioAsync(positionMillis: number): Promise<PlaybackStatus | null> {
  if (!sound) {
    return null;
  }
  return sound.setPositionAsync(positionMillis);
}

export function setAudioPlaybackStatusListener(listener: (status: PlaybackStatus) => void): void {
  statusListener = listener;
  if (sound) {
    sound.setOnPlaybackStatusUpdate(listener);
  }
}

export async function unloadAudioAsync(): Promise<void> {
  if (sound) {
    await sound.unloadAsync();
    sound = null;
  }
}
