import { soundFx } from '@wespace/ui';

export interface MatchFoundNotificationParams {
  partnerUsername: string;
  game: string;
  karmaScore: number;
  rank: string;
  matchScoreDelta?: number;
}

/**
 * Requests operating system notification permission for the application.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (err) {
        console.warn('Notification permission request error:', err);
      }
    }
  }
  return false;
}

/**
 * Triggers acoustic audio fanfare and OS-level system tray toast notification
 * when a compatible duo is matched via the weighted in-memory queue.
 */
export async function notifyDuoMatchFound(params: MatchFoundNotificationParams): Promise<void> {
  const deltaStr = params.matchScoreDelta !== undefined 
    ? ` • Proximidade Δ: ${params.matchScoreDelta.toFixed(1)} pts` 
    : '';

  const title = `🎮 Dupla Encontrada! [${params.game}]`;
  const body = `Duo Compatível: ${params.partnerUsername} (${params.rank}) • Karma: ${params.karmaScore.toFixed(0)}${deltaStr}`;

  // 1. Play high-impact tactical fanfare audio
  soundFx.playMatchFound();

  // 2. Invoke Tauri native OS / Windows System Tray notification if running inside Tauri
  let handledByTauri = false;
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('notify_match_found', { title, body });
      handledByTauri = true;
    }
  } catch (err) {
    console.debug('Tauri native notification not invoked, using Web API fallback:', err);
  }

  // 3. Fallback: Standard Web Notification API for browsers & WebViews
  if (!handledByTauri && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/icons/icon.png',
          badge: '/icons/32x32.png',
          tag: 'wespace-duo-matched',
          requireInteraction: true,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn('Web Notification error:', err);
      }
    } else if (Notification.permission !== 'denied') {
      // Auto request on first match
      requestNotificationPermission().then(granted => {
        if (granted) {
          try {
            new Notification(title, { body, icon: '/icons/icon.png' });
          } catch {}
        }
      });
    }
  }
}
