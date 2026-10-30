import {
  AuthResponse,
  ClipResponse,
  LfgPlayerProfile,
  PresignedUploadResponse,
  ReviewOutcomeResponse,
} from './schemas';

export class WeSpaceApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(baseUrl: string = 'http://127.0.0.1:8080/api/v1') {
    this.baseUrl = baseUrl;
    // Attempt to load cached token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('wespace_access_token');
      this.refreshToken = localStorage.getItem('wespace_refresh_token');
    }
  }

  setToken(token: string, refreshToken?: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('wespace_access_token', token);
      if (refreshToken) {
        this.refreshToken = refreshToken;
        localStorage.setItem('wespace_refresh_token', refreshToken);
      }
    }
  }

  clearToken() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wespace_access_token');
      localStorage.removeItem('wespace_refresh_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private async trySilentRefresh(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!res.ok) {
        this.clearToken();
        return null;
      }

      const data: AuthResponse = await res.json();
      this.setToken(data.access_token);
      return data.access_token;
    } catch {
      return null;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for fast offline fallback

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Silent refresh interceptor on 401 Unauthorized
      if (res.status === 401 && this.refreshToken && !endpoint.includes('/auth/')) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          const newToken = await this.trySilentRefresh();
          this.isRefreshing = false;

          if (newToken) {
            this.onTokenRefreshed(newToken);
            headers.set('Authorization', `Bearer ${newToken}`);
            const retryRes = await fetch(`${this.baseUrl}${endpoint}`, {
              ...options,
              headers,
            });
            if (retryRes.ok) {
              return retryRes.json();
            }
          }
        } else {
          // Queue request until refresh finishes
          return new Promise<T>((resolve, reject) => {
            this.addRefreshSubscriber(async (newToken) => {
              headers.set('Authorization', `Bearer ${newToken}`);
              try {
                const retryRes = await fetch(`${this.baseUrl}${endpoint}`, {
                  ...options,
                  headers,
                });
                if (retryRes.ok) {
                  resolve(await retryRes.json());
                } else {
                  reject(new Error('Retry failed after token refresh'));
                }
              } catch (err) {
                reject(err);
              }
            });
          });
        }
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `API error ${res.status}`);
      }

      return res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await this.request<{ status: string }>('/healthcheck');
      return res.status === 'healthy';
    } catch {
      return false;
    }
  }

  // --- Auth APIs ---
  async login(usernameOrEmail: string, password: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  // --- Feed & Clips APIs ---
  async getFeed(game?: string, limit: number = 20): Promise<ClipResponse[]> {
    const params = new URLSearchParams();
    if (game) params.set('game', game);
    params.set('limit', limit.toString());
    return this.request<ClipResponse[]>(`/clips/feed?${params.toString()}`);
  }

  async createClipIntent(payload: {
    game: string;
    title: string;
    file_sha256: string;
    stego_watermark_hash: string;
    gpu_encoder_fingerprint: string;
    trigger_telemetry: Record<string, unknown>;
    duration_ms: number;
  }): Promise<PresignedUploadResponse> {
    return this.request<PresignedUploadResponse>('/clips/intent', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Matchmaking & Lobbies APIs ---
  async searchDuos(game: string = 'VALORANT'): Promise<LfgPlayerProfile[]> {
    return this.request<LfgPlayerProfile[]>(`/lfg/search?game=${game}`);
  }

  async getLobbyRtcConfig(lobbyId: string): Promise<{ ice_servers: { urls: string[]; username?: string; credential?: string }[] }> {
    return this.request(`/lfg/lobbies/${lobbyId}/rtc-config`);
  }

  // --- Reputation Reviews API ---
  async submitReview(payload: {
    lobby_id: string;
    target_id: string;
    is_positive: boolean;
    badges: string[];
  }): Promise<ReviewOutcomeResponse> {
    return this.request<ReviewOutcomeResponse>('/reputation/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new WeSpaceApiClient();
