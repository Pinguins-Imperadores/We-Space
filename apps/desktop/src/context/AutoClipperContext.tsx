import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Clip, GameType } from '../types';
import {
  useNativeClipper,
  NativeCaptureStatus,
  RecordedClipPayload,
  MonitorInfo,
} from '../hooks/useNativeClipper';
import { apiClient } from '@wespace/api-client';
import { soundFx } from '@wespace/ui';
import confetti from 'canvas-confetti';
import { savePersistedClip } from '../utils/clipStorage';

export type StartTriggerMode =
  | 'manual_hotkey'
  | 'on_app_start'
  | 'on_game_detected'
  | 'scheduled_timer';

export interface AutoClipperSettings {
  clipDurationSeconds: number;
  preEventSeconds: number;
  postEventSeconds: number;
  startTriggerMode: StartTriggerMode;
  countdownSeconds: number;
  scheduledStartTime: string; // HH:MM
  hotkey: 'F9' | 'F10' | 'F8';
  autoPostToFeed: boolean;
  defaultGame: GameType;
  fps: 30 | 60;
  quality: '720p' | '1080p';
  includeMicAudio: boolean;
  selectedMonitorId: string;
  monitorPromptConfirmed: boolean;
}

const DEFAULT_SETTINGS: AutoClipperSettings = {
  clipDurationSeconds: 15,
  preEventSeconds: 10,
  postEventSeconds: 5,
  startTriggerMode: 'manual_hotkey',
  countdownSeconds: 3,
  scheduledStartTime: '20:00',
  hotkey: 'F9',
  autoPostToFeed: true,
  defaultGame: 'Valorant',
  fps: 60,
  quality: '1080p',
  includeMicAudio: true,
  selectedMonitorId: 'primary',
  monitorPromptConfirmed: false,
};

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string' && err.trim().length > 0) return err;
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return fallback;
}

const STORAGE_KEY = 'wespace_autoclipper_settings_v1';

interface CurrentUserSummary {
  id: string;
  username: string;
  handle: string;
  avatar: string;
  rank: string;
  reputationScore: number;
}

interface AutoClipperContextValue {
  settings: AutoClipperSettings;
  updateSettings: (patch: Partial<AutoClipperSettings>) => void;
  resetSettings: () => void;
  status: NativeCaptureStatus;
  monitors: MonitorInfo[];
  refreshMonitors: () => Promise<MonitorInfo[]>;
  isMonitorPromptOpen: boolean;
  openMonitorPrompt: () => Promise<void>;
  closeMonitorPrompt: () => void;
  confirmMonitorSelection: (monitorId: string, remember?: boolean) => Promise<void>;
  isTauriEnvironment: boolean;
  isRecordingQuickClip: boolean;
  quickClipProgressSec: number;
  countdownRemaining: number | null;
  lastPublishedClip: Clip | null;
  toastMessage: string | null;
  startBackgroundCapture: (monitorOverride?: string) => Promise<void>;
  stopBackgroundCapture: () => Promise<void>;
  triggerQuickClipAndPost: (customTitle?: string) => Promise<Clip | null>;
  stopQuickRecordingAndPost: (customTitle?: string) => Promise<Clip | null>;
  cancelCountdown: () => void;
}

const AutoClipperContext = createContext<AutoClipperContextValue | null>(null);

function loadStoredSettings(): AutoClipperSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const AutoClipperProvider: React.FC<{
  children: React.ReactNode;
  currentUser: CurrentUserSummary;
  onPublishClip: (clip: Clip) => void;
}> = ({ children, currentUser, onPublishClip }) => {
  const [settings, setSettings] = useState<AutoClipperSettings>(loadStoredSettings);
  const {
    isTauriEnvironment,
    monitors,
    refreshMonitors,
    status,
    startCapture,
    stopCapture,
    flushAndBuildClip,
  } = useNativeClipper();

  const [isRecordingQuickClip, setIsRecordingQuickClip] = useState(false);
  const [quickClipProgressSec, setQuickClipProgressSec] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [lastPublishedClip, setLastPublishedClip] = useState<Clip | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMonitorPromptOpen, setIsMonitorPromptOpen] = useState(false);

  const quickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScheduledTriggerDayRef = useRef<string>('');
  const pendingTitleRef = useRef<string | undefined>(undefined);
  const pendingMonitorActionRef = useRef<{
    type: 'buffer' | 'quick';
    customTitle?: string;
  } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const updateSettings = useCallback((patch: Partial<AutoClipperSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }
  }, []);

  const buildAndPublishRecordedClip = useCallback(
    async (recorded: RecordedClipPayload, customTitle?: string): Promise<Clip> => {
      const game = settings.defaultGame;
      const nowLabel = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const title =
        customTitle?.trim() ||
        `Auto-Clip ${game} (${recorded.durationSeconds}s) • ${nowLabel}`;

      const newClip: Clip = {
        id: `clip-live-${Date.now()}`,
        title,
        description: `Gravado automaticamente em ${recorded.durationSeconds}s via ${recorded.encoder}. SHA-256: ${recorded.sha256.slice(0, 12)}...`,
        game,
        map: game === 'CS2' ? 'Mirage' : game === 'League of Legends' ? 'Summoner’s Rift' : 'Ascent',
        agentOrHero: game === 'Valorant' ? 'Omen' : game === 'CS2' ? 'Rifler' : 'Flex',
        videoType: 'video',
        videoUrl: recorded.videoUrl,
        localFilePath: recorded.filePath,
        videoMimeType: recorded.mimeType,
        isLocalPersisted: true,
        previewColor: '#09090b',
        durationSeconds: recorded.durationSeconds,
        author: {
          id: currentUser.id,
          username: currentUser.username,
          handle: currentUser.handle,
          avatar: currentUser.avatar,
          rank: currentUser.rank,
          reputationScore: currentUser.reputationScore,
          badge: 'Auto-Clipper Verificado',
          isPro: false,
        },
        telemetry: {
          matchId: `WS-LIVE-${Date.now().toString().slice(-6)}`,
          game,
          date: `Hoje, ${nowLabel}`,
          mode: 'Captura Direta (Auto-Clipper)',
          map: game === 'CS2' ? 'Mirage' : 'Ascent',
          agentOrHero: game === 'Valorant' ? 'Omen' : 'Competitivo',
          roundScore: `${recorded.durationSeconds}s Gravados`,
          roundContext: `Buffer ${settings.clipDurationSeconds}s • ${settings.fps} FPS`,
          situation: `Clipe Real (${(recorded.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
          impactScore: 95,
          headshotPercentage: 80,
          hpLeft: 100,
          weapons: ['Auto-Clipper'],
          utilityUsed: [recorded.encoder, `SHA-256 ${recorded.sha256.slice(0, 8)}`],
          serverPing: 'Local Zero-Drop',
          verifiedAt: new Date().toISOString(),
          verifiedEngineVersion: `WeSpace-Native [${recorded.encoder}]`,
        },
        voiceComms: {
          hasAudio: settings.includeMicAudio,
          transcript: 'Áudio capturado diretamente junto ao vídeo da jogada.',
          callClarityScore: 98,
          tiltLevel: 'Zero Tilt',
          speakerName: currentUser.username.split(' ')[0],
          waveform: [25, 45, 70, 90, 65, 80, 95, 60, 40, 75, 85, 50, 35, 60, 80, 40],
        },
        tags: [game, 'AutoClipper', 'VideoReal', `${recorded.durationSeconds}s`],
        endorsements: 0,
        recruitsCount: 0,
        sharesCount: 0,
        commentsCount: 0,
        createdAt: 'Agora mesmo',
        isFeatured: true,
      };

      // Best-effort sync with backend clip intent API if available
      apiClient
        .createClipIntent({
          game: game === 'League of Legends' ? 'LOL' : game.toUpperCase(),
          title: newClip.title,
          file_sha256: recorded.sha256,
          stego_watermark_hash: recorded.sha256,
          gpu_encoder_fingerprint: recorded.encoder,
          trigger_telemetry: {
            durationSeconds: recorded.durationSeconds,
            sizeBytes: recorded.sizeBytes,
            mimeType: recorded.mimeType,
          },
          duration_ms: Math.max(3000, recorded.durationSeconds * 1000),
        })
        .catch(() => {
          // Offline / demo fallback keeps local feed working smoothly
        });

      const persistedClip = await savePersistedClip(newClip, recorded.blob);

      if (settings.autoPostToFeed) {
        onPublishClip(persistedClip);
        showToast('Vídeo salvo permanentemente e publicado no seu Feed!');
      } else {
        showToast('Vídeo salvo permanentemente! Ative "Postar automaticamente" ou publique pelo Editor.');
      }

      setLastPublishedClip(persistedClip);
      soundFx.playClutchFanfare();
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.6 },
      });

      return persistedClip;
    },
    [settings, currentUser, onPublishClip, showToast]
  );

  const openMonitorPrompt = useCallback(async () => {
    await refreshMonitors();
    setIsMonitorPromptOpen(true);
  }, [refreshMonitors]);

  const closeMonitorPrompt = useCallback(() => {
    pendingMonitorActionRef.current = null;
    setIsMonitorPromptOpen(false);
  }, []);

  const startCaptureForMonitor = useCallback(
    async (monitorId: string) => {
      const width = settings.quality === '1080p' ? 1920 : 1280;
      const height = settings.quality === '1080p' ? 1080 : 720;
      await startCapture({
        ringBufferSeconds: settings.clipDurationSeconds,
        fps: settings.fps,
        width,
        height,
        includeMicAudio: settings.includeMicAudio,
        monitorId,
      });
      showToast(
        `Auto-Clipper ativo (${monitorId === 'all' ? 'Todas as Telas' : monitorId} • ${settings.clipDurationSeconds}s).`
      );
    },
    [settings, startCapture, showToast]
  );

  const ensureMonitorSelected = useCallback(
    async (action: { type: 'buffer' | 'quick'; customTitle?: string }): Promise<string | null> => {
      const detected = monitors.length > 0 ? monitors : await refreshMonitors();
      if (detected.length > 1 && !settings.monitorPromptConfirmed) {
        pendingMonitorActionRef.current = action;
        setIsMonitorPromptOpen(true);
        return null;
      }
      return settings.selectedMonitorId || 'primary';
    },
    [monitors, refreshMonitors, settings.monitorPromptConfirmed, settings.selectedMonitorId]
  );

  const startBackgroundCapture = useCallback(
    async (monitorOverride?: string) => {
      const monitorId =
        monitorOverride ?? (await ensureMonitorSelected({ type: 'buffer' }));
      if (!monitorId) return;
      try {
        await startCaptureForMonitor(monitorId);
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Não foi possível iniciar a gravação.');
        showToast(msg);
        throw err;
      }
    },
    [ensureMonitorSelected, startCaptureForMonitor, showToast]
  );

  const stopBackgroundCapture = useCallback(async () => {
    if (quickTimerRef.current) {
      clearInterval(quickTimerRef.current);
      quickTimerRef.current = null;
    }
    setIsRecordingQuickClip(false);
    setQuickClipProgressSec(0);
    await stopCapture();
    showToast('Auto-Clipper pausado.');
  }, [stopCapture, showToast]);

  const stopQuickRecordingAndPost = useCallback(
    async (customTitle?: string): Promise<Clip | null> => {
      if (quickTimerRef.current) {
        clearInterval(quickTimerRef.current);
        quickTimerRef.current = null;
      }
      setIsRecordingQuickClip(false);
      setQuickClipProgressSec(0);

      try {
        const recorded = await flushAndBuildClip(
          settings.clipDurationSeconds,
          settings.startTriggerMode === 'on_app_start'
        );
        return await buildAndPublishRecordedClip(recorded, customTitle ?? pendingTitleRef.current);
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Erro ao finalizar clipe');
        showToast(msg);
        return null;
      } finally {
        pendingTitleRef.current = undefined;
      }
    },
    [
      flushAndBuildClip,
      settings.clipDurationSeconds,
      settings.startTriggerMode,
      buildAndPublishRecordedClip,
      showToast,
    ]
  );

  const executeQuickRecordOrFlush = useCallback(
    async (customTitle?: string, monitorOverride?: string): Promise<Clip | null> => {
      pendingTitleRef.current = customTitle;

      // Case 1: Continuous background buffer is already capturing -> instant 1-click flush & post!
      if (status.isCapturing && !isRecordingQuickClip) {
        try {
          const recorded = await flushAndBuildClip(settings.clipDurationSeconds, true);
          return await buildAndPublishRecordedClip(recorded, customTitle);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro ao salvar buffer';
          showToast(msg);
          return null;
        }
      }

      // Case 2: Already doing a timed quick recording -> stop early & post right now!
      if (isRecordingQuickClip) {
        return await stopQuickRecordingAndPost(customTitle);
      }

      // Case 3: Not capturing yet -> verify monitor selection if multi-monitor, then start capture!
      try {
        const monitorId =
          monitorOverride ??
          (await ensureMonitorSelected({ type: 'quick', customTitle }));
        if (!monitorId) {
          return null;
        }

        await startBackgroundCapture(monitorId);
        setIsRecordingQuickClip(true);
        setQuickClipProgressSec(0);

        const targetSec = settings.clipDurationSeconds;
        let elapsed = 0;

        quickTimerRef.current = setInterval(() => {
          elapsed += 1;
          setQuickClipProgressSec(elapsed);
          if (elapsed >= targetSec) {
            if (quickTimerRef.current) {
              clearInterval(quickTimerRef.current);
              quickTimerRef.current = null;
            }
            void stopQuickRecordingAndPost(customTitle);
          }
        }, 1000);

        return null;
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Não foi possível iniciar a gravação.');
        showToast(msg);
        setIsRecordingQuickClip(false);
        return null;
      }
    },
    [
      status.isCapturing,
      isRecordingQuickClip,
      flushAndBuildClip,
      settings.clipDurationSeconds,
      buildAndPublishRecordedClip,
      stopQuickRecordingAndPost,
      ensureMonitorSelected,
      startBackgroundCapture,
      showToast,
    ]
  );

  const confirmMonitorSelection = useCallback(
    async (monitorId: string, remember: boolean = true) => {
      updateSettings({
        selectedMonitorId: monitorId,
        monitorPromptConfirmed: remember,
      });
      setIsMonitorPromptOpen(false);
      const pending = pendingMonitorActionRef.current;
      pendingMonitorActionRef.current = null;

      if (pending?.type === 'buffer') {
        try {
          await startBackgroundCapture(monitorId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro ao iniciar captura no monitor selecionado.';
          showToast(msg);
        }
      } else if (pending?.type === 'quick') {
        await executeQuickRecordOrFlush(pending.customTitle, monitorId);
      }
    },
    [updateSettings, startBackgroundCapture, executeQuickRecordOrFlush, showToast]
  );

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownRemaining(null);
  }, []);

  const triggerQuickClipAndPost = useCallback(
    async (customTitle?: string): Promise<Clip | null> => {
      soundFx.playTactileClick();

      // If configured with scheduled countdown delay and not capturing yet, run countdown first
      if (
        !status.isCapturing &&
        !isRecordingQuickClip &&
        settings.startTriggerMode === 'scheduled_timer' &&
        settings.countdownSeconds > 0
      ) {
        cancelCountdown();
        let left = settings.countdownSeconds;
        setCountdownRemaining(left);
        countdownTimerRef.current = setInterval(() => {
          left -= 1;
          if (left <= 0) {
            cancelCountdown();
            void executeQuickRecordOrFlush(customTitle);
          } else {
            setCountdownRemaining(left);
          }
        }, 1000);
        return null;
      }

      return await executeQuickRecordOrFlush(customTitle);
    },
    [
      status.isCapturing,
      isRecordingQuickClip,
      settings.startTriggerMode,
      settings.countdownSeconds,
      cancelCountdown,
      executeQuickRecordOrFlush,
    ]
  );

  // Auto-start when running in native Tauri with "on_app_start" trigger mode
  useEffect(() => {
    if (
      isTauriEnvironment &&
      status.gstreamerAvailable &&
      settings.startTriggerMode === 'on_app_start' &&
      !status.isCapturing
    ) {
      void startBackgroundCapture().catch(() => {});
    }
  }, [
    isTauriEnvironment,
    status.gstreamerAvailable,
    status.isCapturing,
    settings.startTriggerMode,
    startBackgroundCapture,
  ]);

  // Scheduled wall-clock start trigger (HH:MM)
  useEffect(() => {
    if (settings.startTriggerMode !== 'scheduled_timer' || !settings.scheduledStartTime) {
      return;
    }

    const timer = setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dayKey = `${now.toISOString().slice(0, 10)}_${hhmm}`;

      if (
        hhmm === settings.scheduledStartTime &&
        lastScheduledTriggerDayRef.current !== dayKey &&
        !status.isCapturing &&
        !isRecordingQuickClip
      ) {
        lastScheduledTriggerDayRef.current = dayKey;
        void executeQuickRecordOrFlush();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    settings.startTriggerMode,
    settings.scheduledStartTime,
    status.isCapturing,
    isRecordingQuickClip,
    executeQuickRecordOrFlush,
  ]);

  // Global Hotkey listener (e.g. F9 / F10 / F8)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === settings.hotkey) {
        e.preventDefault();
        void triggerQuickClipAndPost();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settings.hotkey, triggerQuickClipAndPost]);

  return (
    <AutoClipperContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        status,
        monitors,
        refreshMonitors,
        isMonitorPromptOpen,
        openMonitorPrompt,
        closeMonitorPrompt,
        confirmMonitorSelection,
        isTauriEnvironment,
        isRecordingQuickClip,
        quickClipProgressSec,
        countdownRemaining,
        lastPublishedClip,
        toastMessage,
        startBackgroundCapture,
        stopBackgroundCapture,
        triggerQuickClipAndPost,
        stopQuickRecordingAndPost,
        cancelCountdown,
      }}
    >
      {children}
    </AutoClipperContext.Provider>
  );
};

export function useAutoClipper() {
  const ctx = useContext(AutoClipperContext);
  if (!ctx) {
    throw new Error('useAutoClipper must be used within AutoClipperProvider');
  }
  return ctx;
}
