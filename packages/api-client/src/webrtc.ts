export interface RtcIceServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface WeSpaceVoiceRoomEvents {
  onSpeakingChange?: (isSpeaking: boolean, volume: number) => void;
  onParticipantJoined?: (participantId: string) => void;
  onParticipantLeft?: (participantId: string) => void;
  onTrackReceived?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
}

export class WeSpaceVoiceRoom {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private events: WeSpaceVoiceRoomEvents;

  constructor(events: WeSpaceVoiceRoomEvents = {}) {
    this.events = events;
  }

  async joinRoom(
    iceServers: RtcIceServerConfig[],
    onLocalStreamReady?: (stream: MediaStream) => void
  ): Promise<RTCPeerConnection> {
    try {
      // 1. Acquire high-quality microphone stream with anti-noise filters
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
        video: false,
      });

      if (onLocalStreamReady) {
        onLocalStreamReady(this.localStream);
      }

      // 2. Setup speech detector / Voice Activity Detector (VAD) via AudioContext
      this.setupAudioAnalyser(this.localStream);

      // 3. Setup RTCPeerConnection with Coturn STUN/TURN servers
      const rtcConfig: RTCConfiguration = {
        iceServers: iceServers.map((s) => ({
          urls: s.urls,
          username: s.username,
          credential: s.credential,
        })),
        iceCandidatePoolSize: 2,
      };

      this.peerConnection = new RTCPeerConnection(rtcConfig);

      // Add local audio tracks to peer connection
      this.localStream.getAudioTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote incoming audio tracks
      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0] && this.events.onTrackReceived) {
          this.events.onTrackReceived(event.streams[0]);
        }
      };

      return this.peerConnection;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to join voice room');
      this.events.onError?.(error);
      throw error;
    }
  }

  private setupAudioAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!this.analyser || this.isMuted) {
          this.events.onSpeakingChange?.(false, 0);
          this.animationFrameId = requestAnimationFrame(checkVolume);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalizedVolume = Math.min(100, Math.round((average / 128) * 100));
        const isSpeaking = normalizedVolume > 12; // Threshold for active speech

        this.events.onSpeakingChange?.(isSpeaking, normalizedVolume);
        this.animationFrameId = requestAnimationFrame(checkVolume);
      };

      this.animationFrameId = requestAnimationFrame(checkVolume);
    } catch {
      // AudioContext fallback
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });
    return this.isMuted;
  }

  toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    // When deafened, also auto-mute
    if (this.isDeafened && !this.isMuted) {
      this.toggleMute();
    }
    return this.isDeafened;
  }

  getMuteState(): { isMuted: boolean; isDeafened: boolean } {
    return { isMuted: this.isMuted, isDeafened: this.isDeafened };
  }

  leaveRoom() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}
