import { useState, useEffect, useCallback, useRef } from 'react';

interface TauriWindow {
  __TAURI_INTERNALS__?: unknown;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'string' && err.trim().length > 0) return err;
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const maybe = (err as { message?: unknown }).message;
    if (typeof maybe === 'string' && maybe.trim().length > 0) return maybe;
  }
  return fallback;
}

function checkIsTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in (window as TauriWindow);
}

export interface MonitorInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  is_primary: boolean;
}

export interface NativeCaptureDetails {
  is_active: boolean;
  gstreamer_available: boolean;
  encoder: string;
  capture_source: string;
  active_monitor: string;
  container_format: string;
  ring_buffer_seconds: number;
  buffered_seconds: number;
  memory_usage_mb: number;
  last_error: string | null;
}

export interface FlushedNativeClip {
  file_path: string;
  mime_type: string;
  sha256: string;
  duration_seconds: number;
  size_bytes: number;
  encoder: string;
  data_base64: string;
}

export interface NativeCaptureStatus {
  isSupported: boolean;
  backendMode: 'tauri-gstreamer' | 'browser-mediarecorder' | 'idle';
  isCapturing: boolean;
  gstreamerAvailable: boolean;
  captureSource: string;
  activeMonitor: string;
  ringBufferSeconds: number;
  bufferedSeconds: number;
  memoryUsageMb: number;
  gpuEncoder: string;
  lastError: string | null;
}

export interface RecordedClipPayload {
  videoUrl: string;
  blob: Blob;
  mimeType: string;
  sha256: string;
  durationSeconds: number;
  sizeBytes: number;
  encoder: string;
  filePath?: string;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function useNativeClipper() {
  const [isTauriEnvironment, setIsTauriEnvironment] = useState<boolean>(() => checkIsTauri());
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [status, setStatus] = useState<NativeCaptureStatus>({
    isSupported: checkIsTauri(),
    backendMode: checkIsTauri() ? 'tauri-gstreamer' : 'idle',
    isCapturing: false,
    gstreamerAvailable: false,
    captureSource: 'Aguardando início',
    activeMonitor: 'Monitor Principal',
    ringBufferSeconds: 45,
    bufferedSeconds: 0,
    memoryUsageMb: 0,
    gpuEncoder: 'Auto-Detecção (NVENC / GStreamer)',
    lastError: null,
  });

  // Browser MediaRecorder rolling buffer refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const browserMimeRef = useRef<string>('video/webm');
  const captureStartTimeRef = useRef<number>(0);

  const invokeTauriCommand = useCallback(
    async <T>(command: string, args: Record<string, unknown> = {}): Promise<T> => {
      if (checkIsTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<T>(command, args);
      }
      throw new Error('Not running inside Tauri desktop shell');
    },
    []
  );

  const applyTauriDetails = useCallback((details: NativeCaptureDetails) => {
    setStatus({
      isSupported: true,
      backendMode: details.gstreamer_available ? 'tauri-gstreamer' : 'browser-mediarecorder',
      isCapturing: details.is_active,
      gstreamerAvailable: details.gstreamer_available,
      captureSource: details.capture_source,
      activeMonitor: details.active_monitor || 'Monitor Principal',
      ringBufferSeconds: details.ring_buffer_seconds,
      bufferedSeconds: details.buffered_seconds,
      memoryUsageMb: details.memory_usage_mb,
      gpuEncoder: details.encoder,
      lastError: details.last_error,
    });
  }, []);

  const refreshMonitors = useCallback(async (): Promise<MonitorInfo[]> => {
    if (!checkIsTauri()) {
      setMonitors([]);
      return [];
    }
    try {
      const detected = await invokeTauriCommand<MonitorInfo[]>('list_monitors');
      setMonitors(detected);
      return detected;
    } catch {
      return [];
    }
  }, [invokeTauriCommand]);

  useEffect(() => {
    const isTauri = checkIsTauri();
    setIsTauriEnvironment(isTauri);

    if (isTauri) {
      invokeTauriCommand<NativeCaptureDetails>('get_capture_details')
        .then(applyTauriDetails)
        .catch(() => {
          setStatus((prev) => ({ ...prev, isSupported: true }));
        });
      refreshMonitors();
    } else {
      const canDisplayCapture =
        typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
      setStatus((prev) => ({
        ...prev,
        isSupported: canDisplayCapture,
        backendMode: canDisplayCapture ? 'browser-mediarecorder' : 'idle',
        captureSource: canDisplayCapture
          ? 'Screen Capture API (Navegador)'
          : 'Captura de tela indisponível neste navegador',
        gpuEncoder: 'MediaRecorder (VP8/VP9/H264)',
      }));
    }
  }, [applyTauriDetails, invokeTauriCommand, refreshMonitors]);

  // Poll buffer stats while capturing
  useEffect(() => {
    if (!status.isCapturing) return;

    let pollInFlight = false;
    const timer = setInterval(() => {
      if (checkIsTauri()) {
        if (pollInFlight) return;
        pollInFlight = true;
        invokeTauriCommand<NativeCaptureDetails>('get_capture_details')
          .then(applyTauriDetails)
          .catch(() => {})
          .finally(() => {
            pollInFlight = false;
          });
      } else if (mediaRecorderRef.current) {
        const totalBytes = chunksRef.current.reduce((acc, c) => acc + c.size, 0);
        const elapsed = Math.min(
          status.ringBufferSeconds,
          Math.max(1, Math.floor((Date.now() - captureStartTimeRef.current) / 1000))
        );
        setStatus((prev) => ({
          ...prev,
          bufferedSeconds: elapsed,
          memoryUsageMb: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    status.isCapturing,
    status.ringBufferSeconds,
    invokeTauriCommand,
    applyTauriDetails,
  ]);

  const computeSha256 = useCallback(
    async (fileBytes: Uint8Array): Promise<string> => {
      if (isTauriEnvironment) {
        try {
          return await invokeTauriCommand<string>('compute_clip_sha256', {
            data: Array.from(fileBytes),
          });
        } catch {
          // Fallback to browser SubtleCrypto
        }
      }
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
        return Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    },
    [isTauriEnvironment, invokeTauriCommand]
  );

  const startBrowserRecorder = useCallback(
    async (stream: MediaStream, ringBufferSeconds: number) => {
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const mimeType =
        candidates.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ||
        'video/webm';

      browserMimeRef.current = mimeType;
      chunksRef.current = [];
      captureStartTimeRef.current = Date.now();

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4_500_000,
      });

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
          // Keep header chunk[0] + up to ringBufferSeconds rolling chunks
          if (chunksRef.current.length > ringBufferSeconds + 1) {
            const header = chunksRef.current[0];
            const tail = chunksRef.current.slice(-ringBufferSeconds);
            chunksRef.current = [header, ...tail];
          }
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      setStatus((prev) => ({
        ...prev,
        isSupported: true,
        backendMode: 'browser-mediarecorder',
        isCapturing: true,
        captureSource: 'Captura de Tela Ao Vivo (MediaRecorder)',
        ringBufferSeconds,
        bufferedSeconds: 0,
        lastError: null,
      }));
    },
    []
  );

  const startCapture = useCallback(
    async (options?: {
      ringBufferSeconds?: number;
      fps?: number;
      width?: number;
      height?: number;
      includeMicAudio?: boolean;
      monitorId?: string | null;
    }): Promise<string> => {
      const ringSeconds = options?.ringBufferSeconds ?? status.ringBufferSeconds;
      const fps = options?.fps ?? 60;
      const width = options?.width ?? 1920;
      const height = options?.height ?? 1080;

      try {
        if (checkIsTauri()) {
          await invokeTauriCommand<NativeCaptureDetails>('update_capture_config', {
            ringBufferSeconds: ringSeconds,
            targetFps: fps,
            width,
            height,
            bitrateKbps: height >= 1080 ? 12000 : 6000,
            selectedMonitorId: options?.monitorId ?? null,
          });
          const details = await invokeTauriCommand<NativeCaptureDetails>('start_capture');
          applyTauriDetails(details);
          return `Captura nativa ativa (${details.active_monitor} • ${details.capture_source})`;
        }

        if (
          typeof navigator === 'undefined' ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getDisplayMedia
        ) {
          throw new Error('Captura de tela (getDisplayMedia) não suportada neste ambiente.');
        }

        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: fps, width: { ideal: width }, height: { ideal: height } },
          audio: true,
        });

        let finalStream = displayStream;
        if (options?.includeMicAudio && navigator.mediaDevices.getUserMedia) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            finalStream = new MediaStream([
              ...displayStream.getVideoTracks(),
              ...displayStream.getAudioTracks(),
              ...micStream.getAudioTracks(),
            ]);
          } catch {
            // Continue with display stream only if mic permission is declined
          }
        }

        mediaStreamRef.current = finalStream;
        displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          mediaStreamRef.current = null;
          setStatus((prev) => ({ ...prev, isCapturing: false }));
        });

        await startBrowserRecorder(finalStream, ringSeconds);
        return 'Captura de tela ao vivo iniciada!';
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Falha ao iniciar captura');
        setStatus((prev) => ({ ...prev, isCapturing: false, lastError: msg }));
        throw new Error(msg);
      }
    },
    [
      isTauriEnvironment,
      status.ringBufferSeconds,
      invokeTauriCommand,
      applyTauriDetails,
      startBrowserRecorder,
    ]
  );

  const stopCapture = useCallback(async (): Promise<string> => {
    try {
      if (checkIsTauri()) {
        const details = await invokeTauriCommand<NativeCaptureDetails>('stop_capture');
        applyTauriDetails(details);
        return 'Captura nativa pausada.';
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setStatus((prev) => ({ ...prev, isCapturing: false, lastError: null }));
      return 'Captura pausada.';
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Falha ao parar captura');
      setStatus((prev) => ({ ...prev, lastError: msg }));
      throw new Error(msg);
    }
  }, [isTauriEnvironment, status.gstreamerAvailable, invokeTauriCommand, applyTauriDetails]);

  const flushAndBuildClip = useCallback(
    async (requestedSeconds: number, keepRunning: boolean = true): Promise<RecordedClipPayload> => {
      if (checkIsTauri()) {
        const flushed = await invokeTauriCommand<FlushedNativeClip>('flush_highlight_clip', {
          durationSeconds: requestedSeconds,
        });
        if (!flushed.data_base64) {
          throw new Error('Clipe gerado é muito grande para reprodução inline.');
        }
        const blob = base64ToBlob(flushed.data_base64, flushed.mime_type);
        const videoUrl = URL.createObjectURL(blob);
        if (!keepRunning) {
          await stopCapture();
        }
        return {
          videoUrl,
          blob,
          mimeType: flushed.mime_type,
          sha256: flushed.sha256,
          durationSeconds: flushed.duration_seconds,
          sizeBytes: flushed.size_bytes,
          encoder: flushed.encoder,
          filePath: flushed.file_path,
        };
      }

      const recorder = mediaRecorderRef.current;
      const stream = mediaStreamRef.current;
      if (!recorder || !stream) {
        throw new Error('Nenhuma gravação ativa. Inicie a captura antes de salvar o clipe.');
      }

      // Stop recorder cleanly to finalize container headers & timestamps
      const finalizedBlob: Blob = await new Promise((resolve, reject) => {
        const onStop = () => {
          recorder.removeEventListener('stop', onStop);
          const blob = new Blob(chunksRef.current, { type: browserMimeRef.current });
          if (blob.size === 0) {
            reject(new Error('Nenhum dado de vídeo capturado ainda. Aguarde pelo menos 1 segundo.'));
          } else {
            resolve(blob);
          }
        };
        recorder.addEventListener('stop', onStop);
        if (recorder.state === 'recording') {
          recorder.requestData();
          recorder.stop();
        } else {
          onStop();
        }
      });

      const elapsed = Math.max(
        1,
        Math.min(requestedSeconds, Math.round((Date.now() - captureStartTimeRef.current) / 1000))
      );

      if (keepRunning && stream.active) {
        await startBrowserRecorder(stream, status.ringBufferSeconds);
      } else {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setStatus((prev) => ({ ...prev, isCapturing: false }));
      }

      const arrayBuf = await finalizedBlob.arrayBuffer();
      const sha256 = await computeSha256(new Uint8Array(arrayBuf));
      const videoUrl = URL.createObjectURL(finalizedBlob);

      return {
        videoUrl,
        blob: finalizedBlob,
        mimeType: browserMimeRef.current,
        sha256,
        durationSeconds: elapsed,
        sizeBytes: finalizedBlob.size,
        encoder: 'MediaRecorder Live Capture',
      };
    },
    [
      isTauriEnvironment,
      status.gstreamerAvailable,
      status.ringBufferSeconds,
      invokeTauriCommand,
      stopCapture,
      startBrowserRecorder,
      computeSha256,
    ]
  );

  return {
    isTauriEnvironment,
    monitors,
    refreshMonitors,
    status,
    startCapture,
    stopCapture,
    flushAndBuildClip,
    computeSha256,
  };
}
