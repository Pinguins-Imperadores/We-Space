import { Clip } from '../types';

const CLIPS_METADATA_KEY = 'wespace_saved_clips_v1';
const DB_NAME = 'wespace_clips_db';
const DB_STORE = 'videos';
const DB_VERSION = 1;

interface TauriWindow {
  __TAURI_INTERNALS__?: unknown;
}

function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in (window as TauriWindow);
}

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

async function putVideoBlob(clipId: string, blob: Blob): Promise<void> {
  try {
    const db = await openVideoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(blob, clipId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore IndexedDB quota/unavailable errors when Tauri disk storage is used
  }
}

async function getVideoBlob(clipId: string): Promise<Blob | null> {
  try {
    const db = await openVideoDb();
    const result = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(clipId);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

async function removeVideoBlob(clipId: string): Promise<void> {
  try {
    const db = await openVideoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(clipId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed reading blob'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function readStoredClipMetadata(): Clip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLIPS_METADATA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredClipMetadata(list: Clip[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLIPS_METADATA_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}

export async function savePersistedClip(clip: Clip, videoBlob?: Blob): Promise<Clip> {
  let localFilePath = clip.localFilePath;
  const videoMimeType = videoBlob?.type || clip.videoMimeType || 'video/webm';

  if (videoBlob) {
    await putVideoBlob(clip.id, videoBlob);

    if (isTauriEnv() && !localFilePath) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const base64 = await blobToBase64(videoBlob);
        localFilePath = await invoke<string>('save_permanent_clip', {
          clipId: clip.id,
          mimeType: videoMimeType,
          dataBase64: base64,
        });
      } catch {
        // IndexedDB fallback remains active
      }
    }
  }

  const persistedClip: Clip = {
    ...clip,
    localFilePath,
    videoMimeType,
    isLocalPersisted: true,
  };

  // Never store ephemeral blob: URL strings inside localStorage
  const serializableClip: Clip = {
    ...persistedClip,
    videoUrl: persistedClip.videoType === 'video' ? '' : persistedClip.videoUrl,
  };

  const existing = readStoredClipMetadata().filter((c) => c.id !== serializableClip.id);
  writeStoredClipMetadata([serializableClip, ...existing]);

  return persistedClip;
}

export async function loadPersistedClips(): Promise<Clip[]> {
  const stored = readStoredClipMetadata();
  if (stored.length === 0) return [];

  const hydrated: Clip[] = [];
  const inTauri = isTauriEnv();

  for (const item of stored) {
    if (item.videoType === 'simulated') {
      hydrated.push({ ...item, isLocalPersisted: true });
      continue;
    }

    let playableUrl: string | null = null;

    if (inTauri && item.localFilePath) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const loaded = await invoke<{ mime_type: string; data_base64: string }>('load_clip_data', {
          filePath: item.localFilePath,
        });
        const blob = base64ToBlob(loaded.data_base64, loaded.mime_type);
        playableUrl = URL.createObjectURL(blob);
      } catch {
        // Fallback to IndexedDB below
      }
    }

    if (!playableUrl) {
      const idbBlob = await getVideoBlob(item.id);
      if (idbBlob) {
        playableUrl = URL.createObjectURL(idbBlob);
      }
    }

    if (playableUrl) {
      hydrated.push({
        ...item,
        videoUrl: playableUrl,
        isLocalPersisted: true,
      });
    }
  }

  return hydrated;
}

export async function deletePersistedClip(clipId: string, localFilePath?: string): Promise<void> {
  const remaining = readStoredClipMetadata().filter((c) => c.id !== clipId);
  writeStoredClipMetadata(remaining);
  await removeVideoBlob(clipId);

  if (isTauriEnv() && localFilePath) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_permanent_clip', { filePath: localFilePath });
    } catch {
      // Ignore
    }
  }
}
