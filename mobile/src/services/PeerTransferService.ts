import * as DocumentPicker from 'expo-document-picker';
import * as Network from 'expo-network';
import type { PeerTransferSession, PeerTransferProgress } from '../types';

const CHUNK_SIZE = 256_000;

export async function getCurrentNetworkLabelAsync(): Promise<string> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      return 'Offline';
    }
    return state.type === 'wifi' ? 'Wi-Fi network' : 'Cellular network';
  } catch {
    return 'Unknown network';
  }
}

export async function selectPeerFileAsync(): Promise<PeerTransferSession | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
  if (result.type !== 'success') {
    return null;
  }

  const size = typeof result.size === 'number' ? result.size : 0;
  const totalChunks = Math.max(1, Math.ceil(size / CHUNK_SIZE));

  return {
    id: `${Date.now()}-${result.name}`,
    fileName: result.name,
    uri: result.uri,
    mimeType: result.mimeType ?? 'application/octet-stream',
    size,
    totalChunks,
    transferredChunks: 0,
    progress: 0,
    state: 'ready',
    connectedDevice: 'Nearby device',
    startedAt: Date.now(),
  };
}

export async function simulatePeerTransferAsync(
  session: PeerTransferSession,
  onProgress: (progress: PeerTransferProgress) => void,
): Promise<PeerTransferSession> {
  const chunkCount = session.totalChunks;
  let currentSession = { ...session, state: 'transferring', transferredChunks: 0, progress: 0 };

  for (let index = 1; index <= chunkCount; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 260));
    currentSession = {
      ...currentSession,
      transferredChunks: index,
      progress: Math.round((index / chunkCount) * 100),
    };
    onProgress({
      transferredChunks: currentSession.transferredChunks,
      totalChunks: chunkCount,
      progress: currentSession.progress,
      currentChunkSize: Math.min(CHUNK_SIZE, session.size - (index - 1) * CHUNK_SIZE),
    });
  }

  return { ...currentSession, state: 'completed' };
}
