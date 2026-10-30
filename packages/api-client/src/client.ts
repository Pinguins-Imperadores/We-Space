import { AuthResponse, ClipResponse, LfgPlayerProfile, PresignedUploadResponse } from './schemas';

export class WeSpaceApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'http://127.0.0.1:8080/api/v1') {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.message || `API error ${res.status}`);
    }

    return res.json();
  }

  async getHealth() {
    return this.request<{ status: string }>('/healthcheck');
  }

  async getFeed(game?: string, limit: number = 20): Promise<ClipResponse[]> {
    const params = new URLSearchParams();
    if (game) params.set('game', game);
    params.set('limit', limit.toString());
    return this.request<ClipResponse[]>(`/clips/feed?${params.toString()}`);
  }

  async searchDuos(game: string): Promise<LfgPlayerProfile[]> {
    return this.request<LfgPlayerProfile[]>(`/lfg/search?game=${game}`);
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
}
