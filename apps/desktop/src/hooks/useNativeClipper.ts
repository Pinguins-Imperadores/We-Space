import { useState, useEffect, useCallback } from 'react';

// Tauri IPC interface definition
interface TauriWindow {
  __TAURI_INTERNALS__?: unknown;
}

export interface NativeCaptureStatus {
  isSupported: boolean;
  isCapturing: boolean;
  ringBufferSeconds: number;
  memoryUsageMb: number;
  gpuEncoder: string;
  lastError: string | null;
}

export function useNativeClipper() {
  const [isTauriEnvironment, setIsTauriEnvironment] = useState<boolean>(false);
  const [status, setStatus] = useState<NativeCaptureStatus>({
    isSupported: false,
    isCapturing: false,
    ringBufferSeconds: 45,
    memoryUsageMb: 67.5,
    gpuEncoder: 'NVIDIA NVENC (Direct3D11)',
    lastError: null,
  });

  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in (window as TauriWindow);
    setIsTauriEnvironment(isTauri);
    setStatus((prev) => ({
      ...prev,
      isSupported: isTauri,
    }));
  }, []);

  const invokeTauriCommand = async <T>(command: string, args: Record<string, unknown> = {}): Promise<T> => {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<T>(command, args);
      } catch (err: unknown) {
        console.warn(`[Tauri IPC fallback] Command "${command}" failed:`, err);
        throw err;
      }
    }
    throw new Error('Not running inside Tauri desktop shell');
  };

  const startCapture = useCallback(async (): Promise<string> => {
    try {
      if (isTauriEnvironment) {
        const msg = await invokeTauriCommand<string>('start_capture');
        setStatus((prev) => ({ ...prev, isCapturing: true, lastError: null }));
        return msg;
      } else {
        // Simulated capture in browser demo
        setStatus((prev) => ({ ...prev, isCapturing: true, lastError: null }));
        return 'Modo Simulado: Captura ativa (Navegador)';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao iniciar captura';
      setStatus((prev) => ({ ...prev, lastError: msg }));
      throw err;
    }
  }, [isTauriEnvironment]);

  const stopCapture = useCallback(async (): Promise<string> => {
    try {
      if (isTauriEnvironment) {
        const msg = await invokeTauriCommand<string>('stop_capture');
        setStatus((prev) => ({ ...prev, isCapturing: false, lastError: null }));
        return msg;
      } else {
        setStatus((prev) => ({ ...prev, isCapturing: false, lastError: null }));
        return 'Modo Simulado: Captura pausada';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao parar captura';
      setStatus((prev) => ({ ...prev, lastError: msg }));
      throw err;
    }
  }, [isTauriEnvironment]);

  const computeSha256 = useCallback(
    async (fileBytes: Uint8Array): Promise<string> => {
      if (isTauriEnvironment) {
        try {
          return await invokeTauriCommand<string>('compute_clip_sha256', { data: Array.from(fileBytes) });
        } catch {
          // Fallback to browser subtle crypto
        }
      }
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    },
    [isTauriEnvironment]
  );

  return {
    isTauriEnvironment,
    status,
    startCapture,
    stopCapture,
    computeSha256,
  };
}
