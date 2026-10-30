import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Shield, 
  Heart, 
  UserPlus, 
  Share2, 
  MessageSquare, 
  Activity, 
  Clock, 
  Crosshair, 
  Radio, 
  Sparkles,
  Maximize2,
  FileText,
  Zap,
  Tag,
  Eye,
  ThumbsDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Clip } from '../types';
import { useAtmosphere, getRgba, isLightColor } from '../context/ThemeAtmosphereContext';
import { soundFx } from '../utils/soundEngine';

interface ClipCardProps {
  clip: Clip;
  onSelectPlayer: (playerId: string) => void;
  onOpenDuoModal: (clip: Clip) => void;
  onToggleEndorse: (clipId: string) => void;
  hasEndorsed: boolean;
  onToggleDislike: (clipId: string) => void;
  hasDisliked: boolean;
  onOpenMatchLog: (clip: Clip) => void;
  onOpenArenaTheater: (clip: Clip) => void;
}

export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  onSelectPlayer,
  onOpenDuoModal,
  onToggleEndorse,
  hasEndorsed,
  onToggleDislike,
  hasDisliked,
  onOpenMatchLog,
  onOpenArenaTheater
}) => {
  const { themeConfig, customColor, isScanlinesActive } = useAtmosphere();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [voiceActive, setVoiceActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback timer & simulated gameplay rendering
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= clip.durationSeconds) {
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, clip.durationSeconds]);

  // Voice communication activation cycle
  useEffect(() => {
    if (isPlaying && clip.voiceComms.hasAudio) {
      const active = currentTime >= 2 && currentTime <= 18;
      setVoiceActive(active);
      if (active && currentTime === 2) {
        soundFx.playVoiceSquelch();
      }
    } else {
      setVoiceActive(false);
    }
  }, [isPlaying, currentTime, clip.voiceComms.hasAudio]);

  // Canvas visual effect for simulated gameplay action & crosshair
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        // Dynamic scanlines and radar sweeps
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, getRgba(customColor, 0.04));
        gradient.addColorStop(1, getRgba(customColor, 0.12));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Simulated crosshair & recoil reticle
        const cx = canvas.width / 2 + Math.sin(frame * 0.08) * 8;
        const cy = canvas.height / 2 + Math.cos(frame * 0.06) * 4;

        ctx.strokeStyle = customColor;
        ctx.lineWidth = 1.5;

        // Crosshair lines
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy);
        ctx.lineTo(cx - 4, cy);
        ctx.moveTo(cx + 4, cy);
        ctx.lineTo(cx + 14, cy);
        ctx.moveTo(cx, cy - 14);
        ctx.lineTo(cx, cy - 4);
        ctx.moveTo(cx, cy + 4);
        ctx.lineTo(cx, cy + 14);
        ctx.stroke();

        // Target dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();

        // Hit indicator pulses on clutch moments
        if (currentTime > 4 && currentTime < 10) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.beginPath();
          ctx.arc(cx, cy, 24 + Math.sin(frame * 0.2) * 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, customColor]);

  const handleEndorseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playTactileClick();
    if (!hasEndorsed) {
      soundFx.playClutchFanfare();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: [customColor, '#ffffff']
      });
    }
    onToggleEndorse(clip.id);
  };

  const getGameBadgeColor = (game: string) => {
    switch (game) {
      case 'Valorant':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'CS2':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'League of Legends':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const isLight = isLightColor(customColor);

  return (
    <div 
      className="group w-full flex flex-col bg-zinc-950/90 rounded-2xl border border-zinc-800/80 hover:border-zinc-700/80 overflow-hidden relative transition-all duration-300"
      style={{
        boxShadow: `0 8px 30px -10px rgba(0,0,0,0.6), 0 0 20px ${getRgba(customColor, 0.04)}`
      }}
    >
      
      {/* Header: Player info & Reputation score */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800/60 bg-zinc-950/80">
        <div 
          onClick={() => {
            soundFx.playTactileClick();
            onSelectPlayer(clip.author.id);
          }}
          className="flex items-center gap-3 cursor-pointer group/author"
        >
          <div className="relative">
            <img
              src={clip.author.avatar}
              alt={clip.author.username}
              className="h-10 w-10 rounded-lg object-cover border border-zinc-700 transition-colors"
              style={{
                borderColor: getRgba(customColor, 0.4)
              }}
            />
            <div 
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-zinc-950 shadow-sm"
              style={{ backgroundColor: customColor }}
              title="Verificado por We Space"
            >
              <CheckCircle2 className="h-3 w-3" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-100 group-hover/author:text-white transition-colors">
                {clip.author.username}
              </span>
              <span className="text-xs text-zinc-500 font-mono">@{clip.author.handle}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span className="font-medium" style={{ color: customColor }}>{clip.author.rank}</span>
              <span>•</span>
              <span className="text-[11px] bg-zinc-800/90 text-zinc-300 px-1.5 py-0.2 rounded border border-zinc-700/50">
                {clip.author.badge}
              </span>
            </div>
          </div>
        </div>

        {/* Reputation Badge */}
        <div className="flex flex-col items-end">
          <div 
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold font-mono border"
            style={{
              backgroundColor: getRgba(customColor, 0.12),
              borderColor: getRgba(customColor, 0.35),
              color: customColor
            }}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>{clip.author.reputationScore}% Reputação</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">{clip.createdAt}</span>
        </div>
      </div>

      {/* Video / Visualizer Frame with Telemetry HUD Overlay */}
      <div className="relative aspect-video w-full bg-black overflow-hidden select-none">
        
        {/* Background Image / Gameplay preview */}
        <img
          src={clip.videoUrl}
          alt={clip.title}
          className={`h-full w-full object-cover transition-transform duration-700 ${
            isPlaying ? 'scale-105 opacity-90' : 'opacity-70 group-hover:opacity-85'
          }`}
        />

        {/* Canvas HUD simulation overlay */}
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="absolute inset-0 h-full w-full pointer-events-none"
        />

        {/* Optional Scanlines Shader */}
        {isScanlinesActive && (
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-60" />
        )}

        {/* Top Overlay: Verification Pill & Match Context */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${getGameBadgeColor(clip.game)}`}>
              {clip.game} • {clip.map}
            </span>
            <button
              onClick={() => {
                soundFx.playTactileClick();
                onOpenMatchLog(clip);
              }}
              className="flex items-center gap-1 text-[11px] font-mono bg-zinc-950/80 backdrop-blur-md px-2 py-0.5 rounded border hover:bg-zinc-900 transition-colors"
              style={{
                borderColor: getRgba(customColor, 0.4),
                color: customColor
              }}
              title="Verificar Log de Partida"
            >
              <Zap className="h-3 w-3" />
              <span>Log #{clip.telemetry.matchId.slice(-5)}</span>
            </button>
          </div>

          {/* Quick Arena Theater Launcher */}
          <button
            onClick={() => {
              soundFx.playRadarPing();
              onOpenArenaTheater(clip);
            }}
            className="pointer-events-auto flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all active:scale-95 shadow-md border hover:bg-zinc-900"
            style={{
              borderColor: getRgba(customColor, 0.4),
              color: customColor
            }}
            title="Abrir no Modo Arena Theater com Radar 2D"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Modo Arena</span>
          </button>
        </div>

        {/* Live Subtitles & Voice Waveform HUD (when active) */}
        {voiceActive && clip.voiceComms.hasAudio && (
          <div 
            className="absolute bottom-14 left-3 right-3 bg-zinc-950/90 backdrop-blur-md border rounded-lg p-2.5 transition-all shadow-xl"
            style={{
              borderColor: getRgba(customColor, 0.4)
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1 font-mono">
              <div className="flex items-center gap-1.5" style={{ color: customColor }}>
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span>Call em Tempo Real: {clip.voiceComms.speakerName}</span>
                <span 
                  className="text-[10px] px-1 py-0.2 rounded"
                  style={{
                    backgroundColor: getRgba(customColor, 0.15),
                    color: customColor
                  }}
                >
                  {clip.voiceComms.tiltLevel}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400">Clareza: {clip.voiceComms.callClarityScore}%</span>
            </div>

            <p className="text-xs text-zinc-200 font-medium italic">
              {clip.voiceComms.transcript}
            </p>

            {/* Audio Waveform visualization */}
            <div className="flex items-center gap-0.5 h-3 mt-1.5">
              {clip.voiceComms.waveform.map((val, idx) => (
                <div
                  key={idx}
                  className="w-full rounded-full transition-all duration-150"
                  style={{
                    backgroundColor: customColor,
                    height: `${isPlaying ? Math.max(20, (val * (0.4 + Math.random() * 0.6))) : 20}%`
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* In-Game Live Telemetry Box (Bottom Left during play) */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
          <div className="bg-zinc-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono text-zinc-200 border border-zinc-800/80 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">HP:</span>
              <span 
                className="font-bold"
                style={{ color: clip.telemetry.hpLeft < 30 ? '#f87171' : customColor }}
              >
                {clip.telemetry.hpLeft}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Arma:</span>
              <span className="text-zinc-300 font-medium">{clip.telemetry.weapons[0]}</span>
            </div>
            {clip.telemetry.headshotPercentage && (
              <div className="flex items-center gap-1 hidden sm:flex">
                <span className="text-zinc-500">HS:</span>
                <span className="text-amber-400 font-bold">{clip.telemetry.headshotPercentage}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Play/Pause Overlay Click Target */}
        <div 
          onClick={() => {
            soundFx.playTactileClick();
            setIsPlaying(!isPlaying);
          }}
          className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity ${
            isPlaying ? 'opacity-0 hover:opacity-100 bg-black/30' : 'opacity-100 bg-black/40'
          }`}
        >
          <div 
            className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
            style={{
              backgroundColor: customColor,
              color: isLight ? '#09090b' : '#09090b',
              boxShadow: `0 0 20px ${getRgba(customColor, 0.4)}`
            }}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5 fill-current" />}
          </div>
        </div>

        {/* Video Controls Bar */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-800/80">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${(currentTime / clip.durationSeconds) * 100}%`,
              backgroundColor: customColor
            }}
          />
        </div>

        {/* Duration and controls button */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <span className="rounded bg-black/70 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 border border-zinc-800">
            {Math.floor(currentTime / 60)}:{String(currentTime % 60).padStart(2, '0')} / {Math.floor(clip.durationSeconds / 60)}:{String(clip.durationSeconds % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Content & Match Telemetry Verification Details */}
      <div className="p-4 sm:p-5 space-y-3.5 bg-zinc-900/70 backdrop-blur-md border-t border-zinc-800/80">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug hover:text-zinc-200 transition-colors">
            {clip.title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
            {clip.description}
          </p>
        </div>

        {/* Verified Telemetry Highlights Banner */}
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Contexto:</span>
            <span className="text-zinc-200 font-semibold">{clip.telemetry.situation}</span>
          </div>
          <button
            onClick={() => {
              soundFx.playTactileClick();
              setShowTelemetryDetails(!showTelemetryDetails);
            }}
            className="text-[11px] hover:underline flex items-center gap-1 font-mono"
            style={{ color: customColor }}
          >
            <Activity className="h-3 w-3" />
            <span>{showTelemetryDetails ? 'Ocultar Telemetria' : 'Ver Dados do Log'}</span>
          </button>
        </div>

        {/* Extended Telemetry Log Drawer */}
        {showTelemetryDetails && (
          <div 
            className="rounded-lg bg-zinc-950 border p-3 space-y-2 text-xs font-mono animate-fadeIn"
            style={{ borderColor: getRgba(customColor, 0.3) }}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 text-zinc-400">
              <span className="flex items-center gap-1" style={{ color: customColor }}>
                <Shield className="h-3.5 w-3.5" />
                {clip.telemetry.verifiedEngineVersion}
              </span>
              <span>{clip.telemetry.verifiedAt}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
              <div><span className="text-zinc-500">Modo:</span> {clip.telemetry.mode}</div>
              <div><span className="text-zinc-500">Servidor/Ping:</span> {clip.telemetry.serverPing}</div>
              <div><span className="text-zinc-500">Score no Momento:</span> {clip.telemetry.roundScore}</div>
              <div>
                <span className="text-zinc-500">Impact Rating:</span> 
                <span className="font-bold ml-1" style={{ color: customColor }}>{clip.telemetry.impactScore}/100</span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-300 pt-1 border-t border-zinc-800/60">
              <span className="text-zinc-500">Utilitários:</span> {clip.telemetry.utilityUsed.join(' • ')}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {clip.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[11px] bg-zinc-800/70 text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-700/50"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Social / Endorsement & Recruitment Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleEndorseClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                hasEndorsed
                  ? 'shadow-sm'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border-zinc-700/60'
              }`}
              style={{
                backgroundColor: hasEndorsed ? getRgba(customColor, 0.15) : undefined,
                borderColor: hasEndorsed ? getRgba(customColor, 0.4) : undefined,
                color: hasEndorsed ? customColor : undefined
              }}
              title="Endossar Jogada / Reputação +"
            >
              <Heart 
                className="h-3.5 w-3.5" 
                style={{ 
                  fill: hasEndorsed ? customColor : 'none',
                  color: hasEndorsed ? customColor : 'currentColor'
                }} 
              />
              <span>{clip.endorsements + (hasEndorsed ? 1 : 0)} Endossos</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                soundFx.playTactileClick();
                onToggleDislike(clip.id);
              }}
              className={`flex items-center justify-center p-1.5 rounded-lg transition-all border ${
                hasDisliked
                  ? 'bg-red-500/10 text-red-500 border-red-500/30'
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-white border-zinc-700/50'
              }`}
              title="Dislike / Downvote"
            >
              <ThumbsDown 
                className="h-4 w-4" 
                style={{ fill: hasDisliked ? 'currentColor' : 'none' }}
              />
            </button>

            <button
              onClick={() => {
                soundFx.playTactileClick();
                onOpenArenaTheater(clip);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700/50 transition-colors"
              title="Abrir no Modo Arena"
            >
              <Eye className="h-3.5 w-3.5" style={{ color: customColor }} />
              <span>Arena</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playTactileClick();
                onOpenDuoModal(clip);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-all shadow-sm"
              style={{
                backgroundColor: customColor,
                color: isLight ? '#09090b' : '#09090b',
                boxShadow: `0 2px 8px ${getRgba(customColor, 0.25)}`
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Chamar Duo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
