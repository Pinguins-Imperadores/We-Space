import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Activity, 
  Radio, 
  Sparkles, 
  UserPlus, 
  Maximize2, 
  Compass, 
  Zap, 
  Target, 
  Eye, 
  Sliders, 
  Layers, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Flame,
  Palette
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Clip } from '../types';
import { useAtmosphere, getRgba, isLightColor } from '../context/ThemeAtmosphereContext';
import { soundFx } from '../utils/soundEngine';

interface ArenaTheaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: Clip | null;
  onOpenDuoModal: (clip: Clip) => void;
  onToggleEndorse: (clipId: string) => void;
  hasEndorsed: boolean;
}

// Tactical keyframe events for the synchronized interactive replay scrubber
interface TacticalKeyframe {
  second: number;
  label: string;
  eventType: 'utility' | 'kill' | 'comms' | 'clutch' | 'defuse';
  playerPos: { x: number; y: number };
  enemyPos: { x: number; y: number }[];
  hpRemaining: number;
  commsSub: string;
}

export const ArenaTheaterModal: React.FC<ArenaTheaterModalProps> = ({
  isOpen,
  onClose,
  clip,
  onOpenDuoModal,
  onToggleEndorse,
  hasEndorsed
}) => {
  const { 
    themeConfig, 
    customColor, 
    isScanlinesActive, 
    toggleScanlines, 
    setIsPaletteModalOpen 
  } = useAtmosphere();
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeAudioChannel, setActiveAudioChannel] = useState<'comms' | 'team' | 'all'>('comms');
  const [isMuted, setIsMuted] = useState(false);
  const [showMinimapVision, setShowMinimapVision] = useState(true);
  const [activeTab, setActiveTab] = useState<'minimap' | 'breakdown' | 'comms'>('minimap');

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const oscilloscopeRef = useRef<HTMLCanvasElement | null>(null);

  // Keyframes generator based on clip
  const keyframes: TacticalKeyframe[] = [
    {
      second: 2,
      label: 'Utilitário & Posicionamento',
      eventType: 'utility',
      playerPos: { x: 35, y: 70 },
      enemyPos: [{ x: 65, y: 35 }, { x: 75, y: 40 }],
      hpRemaining: clip?.telemetry.hpLeft || 100,
      commsSub: '"Fica em silêncio rapaziada, escutei passo no CT..."'
    },
    {
      second: 8,
      label: 'Flash Bang & Isolamento',
      eventType: 'utility',
      playerPos: { x: 45, y: 55 },
      enemyPos: [{ x: 60, y: 30 }, { x: 70, y: 42 }],
      hpRemaining: Math.min(100, (clip?.telemetry.hpLeft || 50) + 20),
      commsSub: '"Joguei flash na árvore... pegou um no céu."'
    },
    {
      second: 14,
      label: 'First Elimination (Headshot)',
      eventType: 'kill',
      playerPos: { x: 55, y: 45 },
      enemyPos: [{ x: 70, y: 40 }],
      hpRemaining: (clip?.telemetry.hpLeft || 30) + 10,
      commsSub: '"Um caiu no céu! Sobrou um no bomb."'
    },
    {
      second: 20,
      label: 'Fake Defuse / Trade IQ',
      eventType: 'defuse',
      playerPos: { x: 60, y: 42 },
      enemyPos: [{ x: 72, y: 38 }],
      hpRemaining: clip?.telemetry.hpLeft || 14,
      commsSub: '"Vou fingir o defuse pra forçar ele a abrir..."'
    },
    {
      second: 26,
      label: 'Clutch Finalizado (Vitória)',
      eventType: 'clutch',
      playerPos: { x: 62, y: 40 },
      enemyPos: [],
      hpRemaining: clip?.telemetry.hpLeft || 14,
      commsSub: '"Ganhamo! Call limpa, boa time!"'
    }
  ];

  const totalDuration = clip?.durationSeconds || 28;

  // Playback timer ticker
  useEffect(() => {
    let interval: any;
    if (isOpen && isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isOpen, isPlaying, playbackSpeed, totalDuration]);

  // Audio trigger on voice/keyframe
  useEffect(() => {
    if (isPlaying && (currentTime === 2 || currentTime === 14 || currentTime === 26)) {
      soundFx.playVoiceSquelch();
    }
  }, [currentTime, isPlaying]);

  // Main Video Canvas Animation: dynamic reticle, hitmarkers, bullet tracers
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        // Ambient Tactical Grid Overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Tactical Reticle
        const cx = canvas.width / 2 + Math.sin(frame * 0.05) * 6;
        const cy = canvas.height / 2 + Math.cos(frame * 0.04) * 4;

        ctx.strokeStyle = customColor;
        ctx.lineWidth = 1.5;

        // Outer Reticle Ring
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy);
        ctx.lineTo(cx - 5, cy);
        ctx.moveTo(cx + 5, cy);
        ctx.lineTo(cx + 16, cy);
        ctx.moveTo(cx, cy - 16);
        ctx.lineTo(cx, cy - 5);
        ctx.moveTo(cx, cy + 5);
        ctx.lineTo(cx, cy + 16);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Recoil simulation on kill moments
        if (currentTime >= 13 && currentTime <= 16) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 32 + Math.sin(frame * 0.3) * 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, customColor]);

  // 2D Tactical Minimap Canvas Engine
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const renderMinimap = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // Map Blueprint background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      // Map geometry outline
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      // Bomb sites (A & B markers)
      ctx.fillStyle = 'rgba(39, 39, 42, 0.6)';
      ctx.fillRect(w * 0.55, h * 0.25, 45, 45); // Bomb A
      ctx.fillRect(w * 0.20, h * 0.25, 45, 45); // Bomb B

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText('BOMB A', w * 0.58, h * 0.38);
      ctx.fillText('BOMB B', w * 0.23, h * 0.38);

      // Corridor walls
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.45, 10);
      ctx.lineTo(w * 0.45, h * 0.7);
      ctx.lineTo(w * 0.65, h * 0.7);
      ctx.stroke();

      // Find current keyframe state
      const currentKeyframe = keyframes.slice().reverse().find(k => currentTime >= k.second) || keyframes[0];
      
      const px = (currentKeyframe.playerPos.x / 100) * w;
      const py = (currentKeyframe.playerPos.y / 100) * h;

      // Vision cone of player
      if (showMinimapVision) {
        const coneAngle = -Math.PI / 3;
        ctx.fillStyle = getRgba(customColor, 0.2);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, 65, coneAngle - 0.4, coneAngle + 0.4);
        ctx.closePath();
        ctx.fill();
      }

      // Player Blip
      ctx.fillStyle = customColor;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Enemy Blips
      currentKeyframe.enemyPos.forEach((ep) => {
        const ex = (ep.x / 100) * w;
        const ey = (ep.y / 100) * h;

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ex, ey, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing radar ping around enemies
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ex, ey, 9 + Math.sin(frame * 0.1) * 3, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Spike status
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(w * 0.62, h * 0.40, 4, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(renderMinimap);
    };

    renderMinimap();
    return () => cancelAnimationFrame(animId);
  }, [currentTime, showMinimapVision, customColor]);

  // Audio Oscilloscope Waveform Animation
  useEffect(() => {
    const canvas = oscilloscopeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const renderWave = () => {
      phase += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;

      ctx.strokeStyle = customColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();

      for (let x = 0; x < w; x++) {
        const amp = isPlaying ? (currentTime >= 2 && currentTime <= 24 ? 12 : 3) : 1;
        const y = mid + Math.sin(x * 0.05 + phase) * Math.cos(x * 0.02) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      animId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTime, customColor]);

  if (!isOpen || !clip) return null;

  const handleKeyframeClick = (second: number) => {
    soundFx.playTactileClick();
    setCurrentTime(second);
  };

  const handleEndorse = () => {
    soundFx.playClutchFanfare();
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.5 },
      colors: [customColor, '#ffffff']
    });
    onToggleEndorse(clip.id);
  };

  const activeKeyframe = keyframes.slice().reverse().find(k => currentTime >= k.second) || keyframes[0];
  const isLight = isLightColor(customColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-4 md:p-6 animate-fadeIn overflow-y-auto">
      
      {/* Container with Artistic Cyber & Tactical Frame */}
      <div className="relative w-full max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Top Arena Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-900/90 select-none">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
              style={{
                backgroundColor: getRgba(customColor, 0.12),
                borderColor: getRgba(customColor, 0.35),
                color: customColor
              }}
            >
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Arena Theater • Auditoria Tática ao Vivo
                </span>
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 font-mono border"
                  style={{
                    color: customColor,
                    borderColor: getRgba(customColor, 0.3)
                  }}
                >
                  {clip.game} • {clip.map}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate max-w-md">{clip.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Quick Palette Opener from Arena */}
            <button
              onClick={() => {
                soundFx.playTactileClick();
                setIsPaletteModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Personalizar Cores do HUD & Retícula"
            >
              <div 
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: customColor }}
              />
              <Palette className="h-3 w-3" />
              <span>Cor do HUD</span>
            </button>

            <button
              onClick={toggleScanlines}
              className={`hidden sm:flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md border transition-colors ${
                isScanlinesActive 
                  ? 'bg-zinc-800 text-white border-zinc-500' 
                  : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
              style={{
                borderColor: isScanlinesActive ? customColor : undefined,
                color: isScanlinesActive ? customColor : undefined
              }}
            >
              <Sliders className="h-3 w-3" />
              <span>Filtro CRT {isScanlinesActive ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Theater Stage & Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden flex-1">
          
          {/* Left Column (8/12): Main Video Replay & Reticle */}
          <div className="lg:col-span-8 flex flex-col bg-black border-r border-zinc-800/80">
            
            {/* Cinematic Player Window */}
            <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden flex items-center justify-center select-none">
              <img
                src={clip.videoUrl}
                alt={clip.title}
                className="h-full w-full object-cover opacity-85"
              />

              {/* Dynamic HUD Reticle Canvas */}
              <canvas
                ref={mainCanvasRef}
                width={800}
                height={450}
                className="absolute inset-0 h-full w-full pointer-events-none"
              />

              {/* Optional CRT Scanlines Shader */}
              {isScanlinesActive && (
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-75" />
              )}

              {/* Top HUD Telemetry Elements */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none text-xs font-mono">
                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded border border-zinc-800 text-zinc-200">
                  <span className="font-bold" style={{ color: customColor }}>MATCH:</span>
                  <span>{clip.telemetry.matchId}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded border border-zinc-800 text-zinc-200">
                  <span className="text-zinc-400">ROUND SCORE:</span>
                  <span className="text-white font-bold">{clip.telemetry.roundScore}</span>
                </div>
              </div>

              {/* Live Subtitle & Voice Bar on Video */}
              <div 
                className="absolute bottom-4 left-4 right-4 bg-zinc-950/90 backdrop-blur-md border rounded-xl p-3 shadow-2xl"
                style={{
                  borderColor: getRgba(customColor, 0.35)
                }}
              >
                <div className="flex items-center justify-between text-xs mb-1 font-mono">
                  <span 
                    className="font-bold flex items-center gap-1.5"
                    style={{ color: customColor }}
                  >
                    <Radio className="h-3.5 w-3.5 animate-pulse" />
                    Áudio de Chamada ({clip.voiceComms.speakerName})
                  </span>
                  <span className="text-zinc-400">Clareza: {clip.voiceComms.callClarityScore}% • Zero Tilt</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-white italic">
                  {activeKeyframe.commsSub}
                </p>
              </div>

              {/* Play / Pause Toggle Button Overlay */}
              <div 
                onClick={() => {
                  soundFx.playTactileClick();
                  setIsPlaying(!isPlaying);
                }}
                className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity ${
                  isPlaying ? 'opacity-0 hover:opacity-100 bg-black/30' : 'opacity-100 bg-black/50'
                }`}
              >
                <div 
                  className="flex h-16 w-16 items-center justify-center rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all"
                  style={{
                    backgroundColor: customColor,
                    color: isLight ? '#09090b' : '#09090b',
                    boxShadow: `0 0 25px ${getRgba(customColor, 0.4)}`
                  }}
                >
                  {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-0.5 fill-current" />}
                </div>
              </div>
            </div>

            {/* Synchronized Timeline & Event Keyframe Scrubber */}
            <div className="p-4 bg-zinc-900/70 border-t border-zinc-800 space-y-3">
              
              {/* Progress Slider */}
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  value={currentTime}
                  onChange={(e) => setCurrentTime(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: customColor }}
                />

                {/* Keyframe Markers on Timeline */}
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 pt-1">
                  <span>00:{String(currentTime).padStart(2, '0')}</span>
                  <span>00:{String(totalDuration).padStart(2, '0')}</span>
                </div>
              </div>

              {/* Clickable Tactical Keyframe Cards */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {keyframes.map((kf, idx) => {
                  const isActive = currentTime >= kf.second && (idx === keyframes.length - 1 || currentTime < keyframes[idx + 1].second);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleKeyframeClick(kf.second)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all border ${
                        isActive
                          ? 'shadow-sm'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                      style={{
                        backgroundColor: isActive ? getRgba(customColor, 0.15) : undefined,
                        borderColor: isActive ? getRgba(customColor, 0.5) : undefined,
                        color: isActive ? customColor : undefined
                      }}
                    >
                      <Target className="h-3 w-3" />
                      <span>{kf.second}s: {kf.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Playback Controls & Speed Selector */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      soundFx.playTactileClick();
                      setIsPlaying(!isPlaying);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    <span>{isPlaying ? 'Pausar' : 'Reproduzir'}</span>
                  </button>

                  <div className="flex items-center gap-1 text-xs font-mono bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500">Velocidade:</span>
                    {[0.5, 1.0, 2.0].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => {
                          soundFx.playTactileClick();
                          setPlaybackSpeed(spd);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                          playbackSpeed === spd ? 'shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        style={{
                          backgroundColor: playbackSpeed === spd ? customColor : undefined,
                          color: playbackSpeed === spd ? '#09090b' : undefined
                        }}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Oscilloscope Frequency Wave Mini */}
                <div className="hidden sm:flex items-center gap-2 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
                  <span className="text-[10px] font-mono text-zinc-400">Espectro:</span>
                  <canvas ref={oscilloscopeRef} width={80} height={20} className="w-20 h-5" />
                </div>
              </div>

            </div>

          </div>

          {/* Right Column (4/12): 2D Tactical Minimap & Squad Decision Hub */}
          <div className="lg:col-span-4 flex flex-col bg-zinc-950 border-t lg:border-t-0 p-4 space-y-4 overflow-y-auto">
            
            {/* Tab selection */}
            <div className="flex rounded-lg bg-zinc-900 p-1 text-xs font-semibold border border-zinc-800">
              <button
                onClick={() => {
                  soundFx.playTactileClick();
                  setActiveTab('minimap');
                }}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  activeTab === 'minimap' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Radar 2D & Minimap
              </button>
              <button
                onClick={() => {
                  soundFx.playTactileClick();
                  setActiveTab('breakdown');
                }}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  activeTab === 'breakdown' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Auditoria de Decisão
              </button>
            </div>

            {/* Radar 2D View */}
            {activeTab === 'minimap' && (
              <div className="space-y-3">
                <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-2 flex flex-col items-center">
                  <canvas
                    ref={minimapCanvasRef}
                    width={280}
                    height={220}
                    className="w-full max-w-[280px] h-[220px] rounded-lg"
                  />
                  <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-2 px-1 border-t border-zinc-800/80 mt-2">
                    <span className="flex items-center gap-1">
                      <span 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: customColor }}
                      />
                      {clip.author.username.split(' ')[0]} (Posição Real)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Inimigos Rastreados
                    </span>
                  </div>
                </div>

                {/* Tactical Status Pill Matrix */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px]">HP no Momento:</span>
                    <span 
                      className="font-bold"
                      style={{ color: customColor }}
                    >
                      {activeKeyframe.hpRemaining} HP
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px]">Impact Rating:</span>
                    <span 
                      className="font-bold"
                      style={{ color: customColor }}
                    >
                      {clip.telemetry.impactScore}/100
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Decision Breakdown View */}
            {activeTab === 'breakdown' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-zinc-300 font-semibold">
                    <span 
                      className="flex items-center gap-1 font-bold"
                      style={{ color: customColor }}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Por que esta jogada é Nota 99:
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-zinc-300 text-[11px] leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 
                        className="h-3.5 w-3.5 shrink-0 mt-0.5" 
                        style={{ color: customColor }}
                      />
                      <span><strong>Isolamento de Duelos:</strong> Focou na troca 1v1 individual sem expor ângulo duplo.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 
                        className="h-3.5 w-3.5 shrink-0 mt-0.5" 
                        style={{ color: customColor }}
                      />
                      <span><strong>Gestão de Economia de Call:</strong> Zero poluição no microfone durante o clutch.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 
                        className="h-3.5 w-3.5 shrink-0 mt-0.5" 
                        style={{ color: customColor }}
                      />
                      <span><strong>Fake Defuse com Timing:</strong> Forçou o erro de timing do adversário.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1 text-xs">
                  <span className="text-zinc-400 font-mono text-[10px] uppercase block">Assinatura Digital de Partida</span>
                  <div className="font-mono text-zinc-300 text-[11px] break-all">
                    SHA256-WE-{clip.telemetry.matchId}-CRC32
                  </div>
                </div>
              </div>
            )}

            {/* Player Profile Snapshot & Call to Action */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-3 mt-auto">
              <div className="flex items-center gap-3">
                <img
                  src={clip.author.avatar}
                  alt={clip.author.username}
                  className="h-11 w-11 rounded-xl object-cover border border-zinc-700"
                />
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    {clip.author.username}
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded border font-mono"
                      style={{
                        backgroundColor: getRgba(customColor, 0.12),
                        borderColor: getRgba(customColor, 0.35),
                        color: customColor
                      }}
                    >
                      {clip.author.reputationScore}% Rep
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">{clip.author.rank}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleEndorse}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    hasEndorsed
                      ? 'shadow-sm'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border-transparent'
                  }`}
                  style={{
                    backgroundColor: hasEndorsed ? getRgba(customColor, 0.15) : undefined,
                    borderColor: hasEndorsed ? getRgba(customColor, 0.5) : undefined,
                    color: hasEndorsed ? customColor : undefined
                  }}
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>{hasEndorsed ? 'Jogada Endossada' : 'Endossar Jogada'}</span>
                </button>

                <button
                  onClick={() => {
                    soundFx.playTactileClick();
                    onOpenDuoModal(clip);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: customColor,
                    color: isLight ? '#09090b' : '#09090b',
                    boxShadow: `0 2px 12px ${getRgba(customColor, 0.25)}`
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Recrutar Duo</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
