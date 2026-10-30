export type WebSocketMessageHandler = (data: Record<string, unknown>) => void;

export class WeSpaceWebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private handlers: Map<string, WebSocketMessageHandler[]> = new Map();
  private isExplicitlyClosed: boolean = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.isExplicitlyClosed = false;
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connected', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const eventType = parsed.type || 'message';
          this.emit(eventType, parsed);
        } catch {
          this.emit('raw', { data: event.data });
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
        this.emit('disconnected', { status: 'disconnected' });
      };

      this.ws.onerror = (err) => {
        this.emit('error', { error: err });
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
      return;
    }

    const backoffMs = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;

    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, backoffMs);
  }

  on(event: string, handler: WebSocketMessageHandler) {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  off(event: string, handler: WebSocketMessageHandler) {
    const list = this.handlers.get(event) || [];
    this.handlers.set(
      event,
      list.filter((h) => h !== handler)
    );
  }

  private emit(event: string, data: Record<string, unknown>) {
    const list = this.handlers.get(event) || [];
    list.forEach((h) => h(data));
  }

  send(type: string, payload: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
