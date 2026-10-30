import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Radio, 
  Users, 
  Award,
  Video,
  CheckCircle2,
  Eye,
  Cpu,
  HardDrive,
  Mic,
  UserPlus,
  ChevronRight,
  Sparkles,
  Clock,
  Terminal,
  Play,
  Layers
} from 'lucide-react';
import { Clip, Player, OngoingMatchLog } from '../types';
import { ClipCard } from './ClipCard';
import { useAtmosphere, getRgba, isLightColor } from '../context/ThemeAtmosphereContext';
import { soundFx } from '../utils/soundEngine';

interface FeedViewProps {
  clips: Clip[];
  players: Player[];
  matchLogs: OngoingMatchLog[];
  currentUser: {
    id: string;
    username: string;
    handle: string;
    avatar: string;
    rank: string;
    reputationScore: number;
  };
  onSelectPlayer: (playerId: string) => void;
  onOpenDuoModal: (clip?: Clip, player?: Player) => void;
  onToggleEndorse: (clipId: string) => void;
  endorsedClips: Set<string>;
  onOpenMatchLog: (clip: Clip) => void;
  onOpenCreateModal: () => void;
  onOpenClipper: () => void;
  onOpenDuos: () => void;
  onOpenArenaTheater: (clip: Clip) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  clips,
  players,
  matchLogs,
  currentUser,
  onSelectPlayer,
  onOpenDuoModal,
  onToggleEndorse,
  endorsedClips,
  onOpenMatchLog,
  onOpenCreateModal,
  onOpenClipper,
  onOpenDuos,
  onOpenArenaTheater
}) => {
  const { customColor } = useAtmosphere();
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'clutches' | 'igl_calls' | 'high_rep'>('all');
  const [dislikedClips, setDislikedClips] = useState<Set<string>>(new Set());
  const [lobbyGameFilter, setLobbyGameFilter] = useState<string>('all');
  
  // Simulated live telemetry metrics for the Auto-Clipper sidebar
  const [ramUsage, setRamUsage] = useState(142);
  const [bufferSeconds, setBufferSeconds] = useState(60);
  const [hotkeySavedToast, setHotkeySavedToast] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRamUsage(138 + Math.floor(Math.random() * 11));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerHotkeyClip = () => {
    soundFx.playClutchFanfare();
    setHotkeySavedToast(true);
    setTimeout(() => setHotkeySavedToast(false), 3500);
  };

  const handleToggleDislike = (clipId: string) => {
    setDislikedClips((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) next.delete(clipId);
      else next.add(clipId);
      return next;
    });
  };

  const filteredClips = clips.filter((clip) => {
    if (selectedGameFilter !== 'all' && clip.game !== selectedGameFilter) {
      return false;
    }
    if (selectedCategory === 'clutches' && !clip.tags.some(t => t.toLowerCase().includes('clutch'))) {
      return false;
    }
    if (selectedCategory === 'igl_calls' && clip.voiceComms.callClarityScore < 95) {
      return false;
    }
    if (selectedCategory === 'high_rep' && clip.author.reputationScore < 96) {
      return false;
    }
    return true;
  });

  const filteredLobbies = players.filter((p) => {
    if (lobbyGameFilter !== 'all' && p.primaryGame !== lobbyGameFilter) return false;
    return true;
  });

  const handleFilterGame = (gameId: string) => {
    soundFx.playTactileClick();
    setSelectedGameFilter(gameId);
  };

  const handleCategoryFilter = (cat: 'all' | 'clutches' | 'igl_calls' | 'high_rep') => {
    soundFx.playTactileClick();
    setSelectedCategory(cat);
  };

  const isLight = isLightColor(customColor);
  const recentEvents = matchLogs.flatMap(log => 
    log.events.map(evt => ({ ...evt, game: log.game, map: log.map, matchId: log.matchId }))
  ).slice(0, 3);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      
      {/* Compact & Tactical Hero Stage */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-black p-6 md:p-8 shadow-2xl">
        <div 
          className="absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: customColor }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div 
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest font-mono"
              style={{ color: customColor }}
            >
              <span 
                className="h-2 w-2 rounded-full animate-ping"
                style={{ backgroundColor: customColor }}
              />
              <span>We Space • Hub de Reputação Visual & Auto-Clipper</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight font-sans">
              "Jogue com quem presta, mostre como você joga."
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl">
              Plataforma integrada de formação de grupos (LFG) por compatibilidade comportamental e motor leve de recorte automático de jogadas em segundo plano.
            </p>

            <div className="pt-1 flex flex-wrap gap-2 text-xs text-zinc-300 font-mono">
              <span className="flex items-center gap-1.5 bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-zinc-800/80">
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: customColor }} />
                Buffer Circular 60s (&lt;200MB RAM)
              </span>
              <span className="flex items-center gap-1.5 bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-zinc-800/80">
                <Radio className="h-3.5 w-3.5" style={{ color: customColor }} />
                Comms em Áudio Verificado
              </span>
              <span className="flex items-center gap-1.5 bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-zinc-800/80">
                <ShieldCheck className="h-3.5 w-3.5" style={{ color: customColor }} />
                99.4% Partidas Sem Tilt
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            {clips[0] && (
              <button
                onClick={() => {
                  soundFx.playRadarPing();
                  onOpenArenaTheater(clips[0]);
                }}
                className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-lg font-mono cursor-pointer"
                style={{
                  backgroundColor: customColor,
                  color: isLight ? '#09090b' : '#09090b',
                  boxShadow: `0 4px 20px ${getRgba(customColor, 0.3)}`
                }}
              >
                <Eye className="h-4 w-4" />
                <span>Abrir Destaque no Modo Arena</span>
              </button>
            )}

            <button
              onClick={() => {
                soundFx.playTactileClick();
                onOpenClipper();
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all font-mono cursor-pointer"
            >
              <Video className="h-4 w-4" style={{ color: customColor }} />
              <span>Abrir Engine Clipper (Auto-Log)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Categorization Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-4">
        
        {/* Game Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0 font-mono">
          {[
            { id: 'all', label: 'Todos os Jogos' },
            { id: 'Valorant', label: 'Valorant' },
            { id: 'CS2', label: 'CS2' },
            { id: 'League of Legends', label: 'League of Legends' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleFilterGame(item.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedGameFilter === item.id
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono">
          <button
            onClick={() => handleCategoryFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap border cursor-pointer ${
              selectedCategory === 'all'
                ? 'shadow-sm font-semibold'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            style={{
              backgroundColor: selectedCategory === 'all' ? getRgba(customColor, 0.15) : undefined,
              borderColor: selectedCategory === 'all' ? getRgba(customColor, 0.4) : undefined,
              color: selectedCategory === 'all' ? customColor : undefined
            }}
          >
            <Flame className="h-3 w-3" />
            <span>Mais Recentes</span>
          </button>

          <button
            onClick={() => handleCategoryFilter('clutches')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap border cursor-pointer ${
              selectedCategory === 'clutches'
                ? 'shadow-sm font-semibold'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            style={{
              backgroundColor: selectedCategory === 'clutches' ? getRgba(customColor, 0.15) : undefined,
              borderColor: selectedCategory === 'clutches' ? getRgba(customColor, 0.4) : undefined,
              color: selectedCategory === 'clutches' ? customColor : undefined
            }}
          >
            <Zap className="h-3 w-3" />
            <span>Clutches Decisivos</span>
          </button>

          <button
            onClick={() => handleCategoryFilter('igl_calls')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap border cursor-pointer ${
              selectedCategory === 'igl_calls'
                ? 'shadow-sm font-semibold'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            style={{
              backgroundColor: selectedCategory === 'igl_calls' ? getRgba(customColor, 0.15) : undefined,
              borderColor: selectedCategory === 'igl_calls' ? getRgba(customColor, 0.4) : undefined,
              color: selectedCategory === 'igl_calls' ? customColor : undefined
            }}
          >
            <Radio className="h-3 w-3" />
            <span>Call Limpa / IGL</span>
          </button>

          <button
            onClick={() => handleCategoryFilter('high_rep')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap border cursor-pointer ${
              selectedCategory === 'high_rep'
                ? 'shadow-sm font-semibold'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            style={{
              backgroundColor: selectedCategory === 'high_rep' ? getRgba(customColor, 0.15) : undefined,
              borderColor: selectedCategory === 'high_rep' ? getRgba(customColor, 0.4) : undefined,
              color: selectedCategory === 'high_rep' ? customColor : undefined
            }}
          >
            <ShieldCheck className="h-3 w-3" />
            <span>Reputação 96%+</span>
          </button>
        </div>

      </div>

      {/* 3-Column Pro Esports Command Dashboard (Eliminates Empty Side Margins) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT SIDEBAR: Auto-Clipper Status (PB-02 / PB-06) + Player DNA Card (PB-01 / PB-03) */}
        <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-22">
          
          {/* Widget 1: Engine Auto-Clipper Local Buffer Status */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded-lg border"
                  style={{
                    backgroundColor: getRgba(customColor, 0.12),
                    borderColor: getRgba(customColor, 0.3),
                    color: customColor
                  }}
                >
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Engine Clipper
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Buffer Circular Local</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                ATIVO
              </span>
            </div>

            {/* Hardware & Memory Telemetry */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  Buffer em Memória:
                </span>
                <span className="font-bold text-white">{bufferSeconds}s (1080p 60fps)</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-zinc-400" />
                    Consumo de RAM:
                  </span>
                  <span style={{ color: customColor }} className="font-bold">
                    {ramUsage} MB <span className="text-zinc-500 font-normal">/ 200 MB máx</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(ramUsage / 200) * 100}%`,
                      backgroundColor: customColor 
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-zinc-500">Aceleração GPU:</span>
                <span className="text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  NVENC / FFmpeg
                </span>
              </div>
            </div>

            {/* Hotkey F9 Quick Trigger Simulation */}
            <div className="rounded-xl bg-zinc-900/80 border border-zinc-800/90 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-400">Atalho de Captura:</span>
                <kbd 
                  className="px-2 py-0.5 rounded text-[11px] font-bold border shadow-sm"
                  style={{
                    backgroundColor: getRgba(customColor, 0.15),
                    borderColor: getRgba(customColor, 0.4),
                    color: customColor
                  }}
                >
                  Hotkey [F9]
                </kbd>
              </div>

              <button
                onClick={handleTriggerHotkeyClip}
                className="w-full py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: getRgba(customColor, 0.12),
                  borderColor: getRgba(customColor, 0.35),
                  color: customColor
                }}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Simular Disparo [F9] (60s)</span>
              </button>

              {hotkeySavedToast && (
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 rounded-lg p-2 flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Clipe MP4 salvo localmente sem queda de FPS!</span>
                </div>
              )}
            </div>

            {/* Recent Auto-Detected Game Events (PB-06) */}
            <div className="space-y-2 pt-1 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase">
                  Game Events Detectados
                </span>
                <button 
                  onClick={onOpenClipper}
                  className="text-[11px] font-mono hover:underline cursor-pointer"
                  style={{ color: customColor }}
                >
                  Ver todos
                </button>
              </div>

              <div className="space-y-2">
                {recentEvents.map((evt) => (
                  <div 
                    key={evt.id}
                    onClick={onOpenClipper}
                    className="group/evt flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 transition-all cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded"
                          style={{
                            backgroundColor: getRgba(customColor, 0.15),
                            color: customColor
                          }}
                        >
                          {evt.eventType}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono truncate">
                          {evt.game} • {evt.map}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-zinc-200 truncate mt-1 group-hover/evt:text-white">
                        {evt.title}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500 group-hover/evt:text-zinc-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Widget 2: Current Player Quick Profile & Showcase Limit (PB-01 / PB-03) */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-4 shadow-xl space-y-4">
            <div 
              onClick={() => onSelectPlayer(currentUser.id)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <img 
                src={currentUser.avatar} 
                alt={currentUser.username} 
                className="h-12 w-12 rounded-xl object-cover border border-zinc-700"
                style={{ borderColor: getRgba(customColor, 0.5) }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white truncate group-hover:underline">
                    {currentUser.username}
                  </h4>
                </div>
                <p className="text-xs font-mono" style={{ color: customColor }}>
                  {currentUser.rank}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                    Karma: {currentUser.reputationScore}% Impecável
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" style={{ color: customColor }} />
                  Vitrine do Perfil:
                </span>
                <span className="text-zinc-200 font-bold">1 / 3 Clipes</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-1.5 rounded-full" style={{ backgroundColor: customColor }} />
                <div className="h-1.5 rounded-full bg-zinc-800" />
                <div className="h-1.5 rounded-full bg-zinc-800" />
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Destaque até 3 clipes no seu perfil para comprovar sua mira e comunicação limpa.
              </p>
            </div>

            <button
              onClick={onOpenCreateModal}
              className="w-full py-2 px-3 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono font-semibold text-zinc-200 transition-colors cursor-pointer"
            >
              + Adicionar Clipe à Vitrine
            </button>
          </div>

        </aside>

        {/* CENTER COLUMN: Verified Gameplay Highlights Feed */}
        <section className="lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4" style={{ color: customColor }} />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 font-mono">
                Feed de Evidências Táticas ({filteredClips.length})
              </h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
              Autenticado via Telemetria Oficial
            </span>
          </div>

          {filteredClips.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-12 text-center space-y-3">
              <Video className="h-8 w-8 mx-auto text-zinc-600" />
              <p className="text-sm text-zinc-400">Nenhum clipe encontrado para este filtro.</p>
              <button
                onClick={() => {
                  setSelectedGameFilter('all');
                  setSelectedCategory('all');
                }}
                className="text-xs font-mono underline cursor-pointer"
                style={{ color: customColor }}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredClips.map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  onSelectPlayer={onSelectPlayer}
                  onOpenDuoModal={(c) => onOpenDuoModal(c)}
                  onToggleEndorse={onToggleEndorse}
                  hasEndorsed={endorsedClips.has(clip.id)}
                  onToggleDislike={handleToggleDislike}
                  hasDisliked={dislikedClips.has(clip.id)}
                  onOpenMatchLog={onOpenMatchLog}
                  onOpenArenaTheater={onOpenArenaTheater}
                />
              ))}
            </div>
          )}
        </section>

        {/* RIGHT SIDEBAR: Live LFG Lobbies (PB-04) & Top Karma Ranking (PB-05) */}
        <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-22">
          
          {/* Widget 1: Live LFG Lobbies */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded-lg border"
                  style={{
                    backgroundColor: getRgba(customColor, 0.12),
                    borderColor: getRgba(customColor, 0.3),
                    color: customColor
                  }}
                >
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Lobbies LFG ao Vivo
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Compatibilidade & Call Limpa</p>
                </div>
              </div>
              <span 
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: getRgba(customColor, 0.12),
                  borderColor: getRgba(customColor, 0.3),
                  color: customColor
                }}
              >
                {filteredLobbies.length} salas
              </span>
            </div>

            {/* Mini Game Filter for LFG */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar font-mono">
              {['all', 'Valorant', 'CS2', 'League of Legends'].map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    soundFx.playTactileClick();
                    setLobbyGameFilter(g);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    lobbyGameFilter === g
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900/50'
                  }`}
                >
                  {g === 'all' ? 'Todos' : g === 'League of Legends' ? 'LoL' : g}
                </button>
              ))}
            </div>

            {/* Active Lobbies List */}
            <div className="space-y-3">
              {filteredLobbies.map((player) => (
                <div 
                  key={player.id}
                  className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 p-3 space-y-2.5 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div 
                      onClick={() => onSelectPlayer(player.id)}
                      className="flex items-center gap-2.5 cursor-pointer group/p min-w-0"
                    >
                      <img 
                        src={player.avatar} 
                        alt={player.username} 
                        className="h-9 w-9 rounded-lg object-cover border border-zinc-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100 group-hover/p:text-white truncate">
                            {player.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          <span style={{ color: customColor }} className="font-semibold truncate">
                            {player.ranks[0]?.rankName}
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400">{player.primaryGame === 'League of Legends' ? 'LoL' : player.primaryGame}</span>
                        </div>
                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {player.reputationScore}% Rep
                    </span>
                  </div>

                  {/* Role & Comms Requirement Pills */}
                  <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                    <span className="bg-zinc-950 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                      {player.mainRoles[0]}
                    </span>
                    <span className="bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
                      <Mic className="h-2.5 w-2.5 text-emerald-400" />
                      Call Limpa
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                    <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {player.availability.status}
                    </span>

                    <button
                      onClick={() => onOpenDuoModal(undefined, player)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all active:scale-95 cursor-pointer"
                      style={{
                        backgroundColor: customColor,
                        color: isLight ? '#09090b' : '#09090b'
                      }}
                    >
                      <UserPlus className="h-3 w-3" />
                      <span>Solicitar Vaga</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onOpenDuos}
              className="w-full py-2 px-3 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 text-xs font-mono font-semibold text-zinc-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Explorar Todos os Lobbies LFG</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Widget 2: Post-Match Karma & Zero-Tilt Leaderboard (PB-05) */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" style={{ color: customColor }} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  Destaques de Reputação
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Pós-Jogo</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Jogadores com maior índice de <span className="text-zinc-200 font-medium">Comunicação Clara</span>, <span className="text-zinc-200 font-medium">Paciência</span> e <span className="text-zinc-200 font-medium">Pontualidade</span> nesta semana:
            </p>

            <div className="space-y-2 pt-1">
              {[...players]
                .sort((a, b) => b.reputationScore - a.reputationScore)
                .slice(0, 3)
                .map((p, idx) => (
                  <div 
                    key={p.id}
                    onClick={() => onSelectPlayer(p.id)}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span 
                        className="text-xs font-mono font-bold w-4 text-center"
                        style={{ color: idx === 0 ? customColor : '#a1a1aa' }}
                      >
                        #{idx + 1}
                      </span>
                      <img src={p.avatar} alt={p.username} className="h-7 w-7 rounded-md object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{p.username}</p>
                        <p className="text-[10px] text-zinc-500 font-mono truncate">{p.verifiedBadges[0]}</p>
                      </div>
                    </div>
                    <span 
                      className="text-xs font-mono font-bold shrink-0"
                      style={{ color: customColor }}
                    >
                      {p.reputationScore}%
                    </span>
                  </div>
                ))}
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
};
