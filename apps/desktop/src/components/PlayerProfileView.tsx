import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  Flame, 
  Volume2, 
  Radio, 
  UserPlus, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  Star, 
  Zap, 
  Award,
  Activity,
  MapPin,
  Globe,
  Eye,
  Edit3,
  Plus,
  Layers,
  Clock,
  Crosshair,
  Users,
  X,
  Save,
  Sparkles,
  Video,
  ChevronRight
} from 'lucide-react';
import { Player, Clip } from '../types';
import { ClipCard } from './ClipCard';
import { RadarChart } from './RadarChart';
import { useAtmosphere, getRgba, isLightColor } from '../context/ThemeAtmosphereContext';
import { soundFx } from '../utils/soundEngine';

interface PlayerProfileViewProps {
  player: Player;
  allPlayers: Player[];
  currentUserId: string;
  onUpdatePlayer: (updatedPlayer: Player) => void;
  onOpenCreateModal: () => void;
  onOpenClipper: () => void;
  onOpenDuoModal: (clip?: Clip, player?: Player) => void;
  onSelectPlayer: (playerId: string) => void;
  onToggleEndorse: (clipId: string) => void;
  endorsedClips: Set<string>;
  onOpenMatchLog: (clip: Clip) => void;
  onOpenReviewModal: (player: Player) => void;
  onOpenArenaTheater: (clip: Clip) => void;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  player,
  allPlayers,
  currentUserId,
  onUpdatePlayer,
  onOpenCreateModal,
  onOpenClipper,
  onOpenDuoModal,
  onSelectPlayer,
  onToggleEndorse,
  endorsedClips,
  onOpenMatchLog,
  onOpenReviewModal,
  onOpenArenaTheater
}) => {
  const { customColor } = useAtmosphere();
  const [activeTab, setActiveTab] = useState<'overview' | 'radar' | 'voice' | 'reviews'>('overview');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isPlayingVoiceSample, setIsPlayingVoiceSample] = useState(false);
  const [dislikedClips, setDislikedClips] = useState<Set<string>>(new Set());

  // Edit Profile Modal State (PB-01)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState(player.bio);
  const [editSchedule, setEditSchedule] = useState(player.availability.schedule);
  const [editStatus, setEditStatus] = useState<Player['availability']['status']>(player.availability.status);
  const [editRankName, setEditRankName] = useState(player.ranks[0]?.rankName || 'Radiant');
  const [editEloLevel, setEditEloLevel] = useState(player.ranks[0]?.eloOrLevel || '#340 BR');
  const [editRiotTag, setEditRiotTag] = useState(player.socials.riotOrSteam);
  const [editDiscord, setEditDiscord] = useState(player.socials.discord);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Sync edit form whenever selected player changes
  useEffect(() => {
    setEditBio(player.bio);
    setEditSchedule(player.availability.schedule);
    setEditStatus(player.availability.status);
    setEditRankName(player.ranks[0]?.rankName || 'Radiant');
    setEditEloLevel(player.ranks[0]?.eloOrLevel || '#340 BR');
    setEditRiotTag(player.socials.riotOrSteam);
    setEditDiscord(player.socials.discord);
  }, [player]);

  const handleToggleDislike = (clipId: string) => {
    setDislikedClips((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) next.delete(clipId);
      else next.add(clipId);
      return next;
    });
  };

  const handleCopy = (text: string, label: string) => {
    soundFx.playTactileClick();
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const toggleVoicePlayback = () => {
    soundFx.playVoiceSquelch();
    setIsPlayingVoiceSample(!isPlayingVoiceSample);
  };

  const handleSaveProfileChanges = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClutchFanfare();

    const updatedRanks = [...player.ranks];
    if (updatedRanks[0]) {
      updatedRanks[0] = {
        ...updatedRanks[0],
        rankName: editRankName,
        eloOrLevel: editEloLevel
      };
    }

    const updatedPlayer: Player = {
      ...player,
      bio: editBio,
      ranks: updatedRanks,
      availability: {
        ...player.availability,
        status: editStatus,
        schedule: editSchedule
      },
      socials: {
        ...player.socials,
        riotOrSteam: editRiotTag,
        discord: editDiscord
      }
    };

    onUpdatePlayer(updatedPlayer);
    setIsEditModalOpen(false);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3500);
  };

  const isLight = isLightColor(customColor);
  const isOwnProfile = player.id === currentUserId;
  const showcaseClips = player.clips.slice(0, 3);
  const emptySlotsCount = Math.max(0, 3 - showcaseClips.length);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      
      {/* Top Player Directory Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-3 px-4 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Users className="h-4 w-4" style={{ color: customColor }} />
          <span className="font-bold text-zinc-200 uppercase">Diretório de Perfis Verificados:</span>
          <span className="hidden md:inline text-zinc-500">Alterne para inspecionar o DNA de outros jogadores</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {allPlayers.map((p) => {
            const isSelected = p.id === player.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-zinc-900 text-white font-bold shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-200'
                }`}
                style={{
                  borderColor: isSelected ? customColor : undefined,
                  backgroundColor: isSelected ? getRgba(customColor, 0.12) : undefined
                }}
              >
                <img src={p.avatar} alt={p.username} className="h-5 w-5 rounded-md object-cover" />
                <span>{p.username.split(' ')[1]?.replace(/"/g, '') || p.username}</span>
                {p.id === currentUserId && (
                  <span 
                    className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
                    style={{
                      backgroundColor: customColor,
                      color: '#09090b'
                    }}
                  >
                    Você
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Notification when Profile is Saved */}
      {saveSuccessToast && (
        <div 
          className="rounded-xl border p-3.5 px-5 flex items-center justify-between bg-zinc-950/95 shadow-xl animate-fadeIn font-mono text-xs"
          style={{
            borderColor: customColor,
            color: customColor
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-bold">Perfil Competitivo atualizado com sucesso! (PB-01: Bio, Elo/Ranking, Tag e Horários salvos)</span>
          </div>
          <span className="text-zinc-500">Sincronizado</span>
        </div>
      )}

      {/* Profile Banner & Header Card */}
      <div className="rounded-3xl border border-zinc-800/90 bg-zinc-950/90 overflow-hidden shadow-2xl">
        {/* Banner Image */}
        <div className="relative h-44 sm:h-56 w-full bg-zinc-950 overflow-hidden">
          <img
            src={player.banner}
            alt={player.username}
            className="h-full w-full object-cover opacity-35 filter blur-[0.5px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-transparent" />
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-zinc-950/85 text-zinc-300 border border-zinc-800 backdrop-blur-md">
              ID Telemetria: #{player.id.toUpperCase()}-CRC
            </span>
            <span 
              className="px-3 py-1 rounded-full text-xs font-bold border font-mono backdrop-blur-md"
              style={{
                backgroundColor: getRgba(customColor, 0.16),
                borderColor: getRgba(customColor, 0.45),
                color: customColor
              }}
            >
              Reputação: {player.reputationTier} ({player.reputationScore}/100)
            </span>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="px-6 sm:px-8 pb-8 pt-0 -mt-16 sm:-mt-20 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            
            {/* Avatar & Main Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              <div className="relative">
                <img
                  src={player.avatar}
                  alt={player.username}
                  className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover border-4 border-zinc-950 bg-zinc-900 shadow-2xl"
                />
                <div 
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg font-bold shadow-md"
                  style={{
                    backgroundColor: customColor,
                    color: '#09090b'
                  }}
                  title="Jogador Verificado por Logs de Partida"
                >
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                    {player.username}
                  </h1>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-0.5 rounded-md border border-zinc-800">
                    @{player.handle}
                  </span>
                  {isOwnProfile && (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Seu Perfil
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                  {player.ranks.map((r, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 bg-zinc-900/90 px-3 py-1 rounded-lg border border-zinc-800 font-medium font-mono">
                      <span>{r.tierIcon}</span>
                      <span className="text-zinc-300">{r.game}:</span>
                      <span className="font-bold" style={{ color: customColor }}>{r.rankName} ({r.eloOrLevel})</span>
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                    {player.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-zinc-500" />
                    {player.languages.join(' • ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions (Includes Edit Profile Button for PB-01) */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  soundFx.playTactileClick();
                  setIsEditModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 py-2.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600 transition-all font-mono cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" style={{ color: customColor }} />
                <span>Editar Perfil & DNA</span>
              </button>

              <button
                onClick={() => {
                  soundFx.playTactileClick();
                  onOpenReviewModal(player);
                }}
                className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900 hover:text-white transition-all font-mono cursor-pointer"
              >
                <Star className="h-4 w-4 text-amber-400" />
                <span>Avaliar Pós-Jogo</span>
              </button>

              <button
                onClick={() => {
                  soundFx.playTactileClick();
                  onOpenDuoModal(player.clips[0], player);
                }}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md font-mono cursor-pointer"
                style={{
                  backgroundColor: customColor,
                  color: isLight ? '#09090b' : '#09090b',
                  boxShadow: `0 4px 14px ${getRgba(customColor, 0.25)}`
                }}
              >
                <UserPlus className="h-4 w-4" />
                <span>Convidar para Duo</span>
              </button>
            </div>

          </div>

          {/* Fast KPI Telemetry Strip (Always Visible Above the Fold) */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5 border-t border-zinc-800/80">
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 block">K/D Verificado</span>
                <span className="text-xl font-extrabold text-white font-mono">{player.stats.kd}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800" style={{ color: customColor }}>
                Top 2%
              </span>
            </div>

            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 block">Taxa de Vitória</span>
                <span className="text-xl font-extrabold text-white font-mono">{player.stats.winRate}%</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {player.stats.matchesLogged} jogos
              </span>
            </div>

            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 block">Partidas Zero Tilt</span>
                <span className="text-xl font-extrabold font-mono" style={{ color: customColor }}>
                  {player.stats.tiltFreeMatches}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                0 Denúncias
              </span>
            </div>

            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 block">Clareza de Call</span>
                <span className="text-xl font-extrabold text-white font-mono">{player.voiceCommsSnippet.clarityScore}%</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                <Radio className="h-3 w-3" style={{ color: customColor }} />
                Limpa
              </span>
            </div>

            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3 flex items-center justify-between col-span-2 sm:col-span-1">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 block">Endossos de Duos</span>
                <span className="text-xl font-extrabold text-amber-400 font-mono">+{player.stats.endorsementsReceived}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Verificado
              </span>
            </div>
          </div>

          {/* Verified Badges Bar */}
          <div className="mt-4 flex flex-wrap gap-2">
            {player.verifiedBadges.map((badge, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900/80 border px-3 py-1 text-xs font-semibold font-mono"
                style={{
                  borderColor: getRgba(customColor, 0.35),
                  color: customColor
                }}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>{badge}</span>
              </div>
            ))}
          </div>

          {/* Player Bio & Playstyle */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Filosofia Competitiva & Funções no Jogo
                </span>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-[11px] font-mono hover:underline flex items-center gap-1 cursor-pointer"
                  style={{ color: customColor }}
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Editar Bio</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                "{player.bio}"
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {player.mainRoles.map((role, idx) => (
                  <span key={idx} className="text-xs bg-zinc-800 text-zinc-200 px-2.5 py-0.5 rounded-md font-medium border border-zinc-700/60">
                    {role}
                  </span>
                ))}
                {player.mainAgentsOrHeroes.map((agent, idx) => (
                  <span 
                    key={idx} 
                    className="text-xs px-2.5 py-0.5 rounded-md font-mono border"
                    style={{
                      backgroundColor: getRgba(customColor, 0.12),
                      borderColor: getRgba(customColor, 0.3),
                      color: customColor
                    }}
                  >
                    {agent}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Disponibilidade & Tags Vinculadas
                </span>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-[11px] font-mono hover:underline cursor-pointer"
                  style={{ color: customColor }}
                >
                  Alterar
                </button>
              </div>
              <div className="space-y-1.5 text-zinc-300">
                <div>
                  <span className="text-zinc-500">Status LFG:</span> 
                  <span className="font-semibold ml-1.5" style={{ color: customColor }}>{player.availability.status}</span>
                </div>
                <div><span className="text-zinc-500">Horário:</span> {player.availability.schedule}</div>
                <div><span className="text-zinc-500">Requisito:</span> <span className="text-amber-400">{player.availability.micRequirement}</span></div>
              </div>

              {/* Social IDs Copy */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  onClick={() => handleCopy(player.socials.discord, 'Discord')}
                  className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-lg text-[11px] font-mono border border-zinc-800 cursor-pointer transition-colors"
                >
                  {copiedText === 'Discord' ? <Check className="h-3 w-3" style={{ color: customColor }} /> : <Copy className="h-3 w-3 text-zinc-500" />}
                  <span>{player.socials.discord}</span>
                </button>
                <button
                  onClick={() => handleCopy(player.socials.riotOrSteam, 'Riot')}
                  className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-lg text-[11px] font-mono border border-zinc-800 cursor-pointer transition-colors"
                >
                  {copiedText === 'Riot' ? <Check className="h-3 w-3" style={{ color: customColor }} /> : <Copy className="h-3 w-3 text-zinc-500" />}
                  <span>{player.socials.riotOrSteam}</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 gap-4 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar font-mono">
          <button
            onClick={() => {
              soundFx.playTactileClick();
              setActiveTab('overview');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap border cursor-pointer ${
              activeTab === 'overview'
                ? 'shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent'
            }`}
            style={{
              backgroundColor: activeTab === 'overview' ? customColor : undefined,
              color: activeTab === 'overview' ? '#09090b' : undefined,
              borderColor: activeTab === 'overview' ? customColor : 'transparent'
            }}
          >
            <Layers className="h-4 w-4" />
            <span>Vitrine 3 Clipes & DNA ({showcaseClips.length}/3)</span>
          </button>

          <button
            onClick={() => {
              soundFx.playTactileClick();
              setActiveTab('radar');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap border cursor-pointer ${
              activeTab === 'radar'
                ? 'shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent'
            }`}
            style={{
              backgroundColor: activeTab === 'radar' ? customColor : undefined,
              color: activeTab === 'radar' ? '#09090b' : undefined,
              borderColor: activeTab === 'radar' ? customColor : 'transparent'
            }}
          >
            <Activity className="h-4 w-4" />
            <span>Análise Radar Completa</span>
          </button>

          <button
            onClick={() => {
              soundFx.playTactileClick();
              setActiveTab('voice');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap border cursor-pointer ${
              activeTab === 'voice'
                ? 'shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent'
            }`}
            style={{
              backgroundColor: activeTab === 'voice' ? customColor : undefined,
              color: activeTab === 'voice' ? '#09090b' : undefined,
              borderColor: activeTab === 'voice' ? customColor : 'transparent'
            }}
          >
            <Volume2 className="h-4 w-4" />
            <span>Comunicação em Jogo</span>
          </button>

          <button
            onClick={() => {
              soundFx.playTactileClick();
              setActiveTab('reviews');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap border cursor-pointer ${
              activeTab === 'reviews'
                ? 'shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent'
            }`}
            style={{
              backgroundColor: activeTab === 'reviews' ? customColor : undefined,
              color: activeTab === 'reviews' ? '#09090b' : undefined,
              borderColor: activeTab === 'reviews' ? customColor : 'transparent'
            }}
          >
            <Star className="h-4 w-4" />
            <span>Avaliações Pós-Jogo ({player.reviews.length})</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
            Limite da Vitrine: <strong className="text-white">{showcaseClips.length} / 3 Clipes em Destaque</strong> (PB-03)
          </span>
        </div>
      </div>

      {/* TAB CONTENT 1: Complete Overview (3-Slot Showcase + Side DNA Radar & Voice Comms) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left 8 Columns: Official 3-Clip Portfolio Showcase (PB-03) */}
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Flame className="h-5 w-5" style={{ color: customColor }} />
                  <span>Portfólio de Clipes em Destaque ({showcaseClips.length}/3)</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Até 3 clipes verificados por perfil para comprovar tomada de decisão, mira e postura sob pressão.
                </p>
              </div>

              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-mono font-bold border transition-all cursor-pointer shrink-0"
                style={{
                  backgroundColor: getRgba(customColor, 0.12),
                  borderColor: getRgba(customColor, 0.35),
                  color: customColor
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Fixar Novo Clipe ({3 - showcaseClips.length} vagas)</span>
              </button>
            </div>

            {/* Active Clips in Showcase */}
            <div className="space-y-6">
              {showcaseClips.map((clip, idx) => (
                <div key={clip.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-xs font-mono">
                    <span className="flex items-center gap-1.5 font-bold" style={{ color: customColor }}>
                      <Sparkles className="h-3.5 w-3.5" />
                      SLOT DE DESTAQUE #{idx + 1} DE 3 • FIXADO NO PERFIL
                    </span>
                    <span className="text-zinc-500">Compressão MP4 Otimizada</span>
                  </div>
                  <ClipCard
                    clip={clip}
                    onSelectPlayer={onSelectPlayer}
                    onOpenDuoModal={onOpenDuoModal}
                    onToggleEndorse={onToggleEndorse}
                    hasEndorsed={endorsedClips.has(clip.id)}
                    onToggleDislike={handleToggleDislike}
                    hasDisliked={dislikedClips.has(clip.id)}
                    onOpenMatchLog={onOpenMatchLog}
                    onOpenArenaTheater={onOpenArenaTheater}
                  />
                </div>
              ))}
            </div>

            {/* Interactive Empty Showcase Slots (Fills the Layout & Demonstrates PB-03 3-Clip Limit) */}
            {emptySlotsCount > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {Array.from({ length: emptySlotsCount }).map((_, idx) => {
                  const slotNumber = showcaseClips.length + idx + 1;
                  return (
                    <div
                      key={slotNumber}
                      className="rounded-2xl border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 p-6 flex flex-col items-center justify-center text-center space-y-3 transition-all group"
                    >
                      <div 
                        className="h-12 w-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: getRgba(customColor, 0.1),
                          borderColor: getRgba(customColor, 0.3),
                          color: customColor
                        }}
                      >
                        <Video className="h-5 w-5" />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                          Slot de Destaque #{slotNumber} de 3 Disponível
                        </span>
                        <h4 className="text-sm font-bold text-zinc-200 pt-1">
                          Adicionar Evidência de Gameplay
                        </h4>
                        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                          Importe um recorte de 60s do Buffer Local (`[F9]`) ou publique um clipe autenticado.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={onOpenCreateModal}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                          style={{
                            backgroundColor: customColor,
                            color: '#09090b'
                          }}
                        >
                          + Upload Clipe
                        </button>
                        <button
                          onClick={onOpenClipper}
                          className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
                        >
                          Abrir Buffer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 4 Columns: Behavioral DNA Radar + Voice Sample + Recent Reviews */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Card 1: Behavioral DNA Radar Summary */}
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <Activity className="h-4 w-4" style={{ color: customColor }} />
                    <span>Radar DNA Comportamental</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono">Métricas auditadas por telemetria</p>
                </div>
                <button
                  onClick={() => setActiveTab('radar')}
                  className="text-[11px] font-mono hover:underline cursor-pointer"
                  style={{ color: customColor }}
                >
                  Expandir
                </button>
              </div>

              <div className="flex justify-center py-1">
                <RadarChart data={player.radarScores} size={250} showComparison={true} />
              </div>
            </div>

            {/* Card 2: Quick Voice Comms Verification */}
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4" style={{ color: customColor }} />
                  <h3 className="text-sm font-bold text-white font-display">
                    Amostra de Call Verificada
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  {player.voiceCommsSnippet.clarityScore}% Clareza
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleVoicePlayback}
                  className="flex h-11 w-11 items-center justify-center rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: customColor,
                    color: '#09090b'
                  }}
                >
                  {isPlayingVoiceSample ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5 fill-current" />}
                </button>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-zinc-100 truncate">{player.voiceCommsSnippet.title}</h4>
                  <span className="text-[11px] font-mono text-zinc-400">Duração: {player.voiceCommsSnippet.duration} • Sem Ruído</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-xs text-zinc-300 italic leading-relaxed">
                {player.voiceCommsSnippet.transcript}
              </div>
            </div>

            {/* Card 3: Latest Verified Teammate Reviews (PB-05) */}
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white font-display">
                    Avaliações Pós-Jogo ({player.reviews.length})
                  </h3>
                </div>
                <button
                  onClick={() => onOpenReviewModal(player)}
                  className="text-[11px] font-mono hover:underline cursor-pointer"
                  style={{ color: customColor }}
                >
                  + Avaliar
                </button>
              </div>

              <div className="space-y-3">
                {player.reviews.slice(0, 2).map((rev) => (
                  <div key={rev.id} className="rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={rev.authorAvatar} alt={rev.authorName} className="h-7 w-7 rounded-lg object-cover" />
                        <div>
                          <p className="text-xs font-bold text-zinc-100">{rev.authorName}</p>
                          <p className="text-[10px] font-mono" style={{ color: customColor }}>{rev.authorRank}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">{rev.date}</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">"{rev.comment}"</p>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {rev.tags.map((t, i) => (
                        <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800" style={{ color: customColor }}>
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>

        </div>
      )}

      {/* TAB CONTENT 2: DNA & Estatísticas com RADAR SVG ARTÍSTICO */}
      {activeTab === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col items-center">
            <RadarChart data={player.radarScores} size={300} showComparison={true} />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-1">
                <span className="text-xs text-zinc-400 font-medium">K/D Verificado</span>
                <span className="text-2xl font-extrabold text-white font-mono">{player.stats.kd}</span>
                <span className="text-[11px] block font-mono" style={{ color: customColor }}>Top 2% no servidor</span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-1">
                <span className="text-xs text-zinc-400 font-medium">Taxa de Vitória</span>
                <span className="text-2xl font-extrabold text-white font-mono">{player.stats.winRate}%</span>
                <span className="text-[11px] block font-mono" style={{ color: customColor }}>Em {player.stats.matchesLogged} partidas</span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-1">
                <span className="text-xs text-zinc-400 font-medium">Partidas 100% Zero Tilt</span>
                <span className="text-2xl font-extrabold font-mono" style={{ color: customColor }}>{player.stats.tiltFreeMatches}</span>
                <span className="text-[11px] text-zinc-400 block font-mono">Zero denúncias</span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-1">
                <span className="text-xs text-zinc-400 font-medium">Endossos Recebidos</span>
                <span className="text-2xl font-extrabold text-amber-400 font-mono">{player.stats.endorsementsReceived}</span>
                <span className="text-[11px] text-zinc-400 block font-mono">Por companheiros</span>
              </div>
            </div>

            <div 
              className="rounded-2xl border p-5 space-y-2"
              style={{
                backgroundColor: getRgba(customColor, 0.08),
                borderColor: getRgba(customColor, 0.3)
              }}
            >
              <div className="flex items-center gap-2 font-bold text-sm" style={{ color: customColor }}>
                <Shield className="h-4 w-4" />
                <span>Certificado de Telemetria We Space</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Este perfil possui telemetria ativa. Cada estatística é correlacionada a identificadores de partida no servidor, garantindo ausência de smurfing nocivo, toxicidade ou dados fabricados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: Comunicação em Jogo */}
      {activeTab === 'voice' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="h-4 w-4" style={{ color: customColor }} />
              Amostra de Comunicação em Round Decisivo
            </h3>
            <p className="text-xs text-zinc-400">
              Escute como o jogador se comunica sob pressão, passando posições limpas e sem poluição na chamada.
            </p>
          </div>

          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleVoicePlayback}
                  className="flex h-12 w-12 items-center justify-center rounded-full shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: customColor,
                    color: isLight ? '#09090b' : '#09090b',
                    boxShadow: `0 4px 14px ${getRgba(customColor, 0.3)}`
                  }}
                >
                  {isPlayingVoiceSample ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5 fill-current" />}
                </button>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">{player.voiceCommsSnippet.title}</h4>
                  <span className="text-xs font-mono text-zinc-400">Duração: {player.voiceCommsSnippet.duration} • Clareza: {player.voiceCommsSnippet.clarityScore}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span 
                  className="text-xs font-mono border px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: getRgba(customColor, 0.12),
                    borderColor: getRgba(customColor, 0.3),
                    color: customColor
                  }}
                >
                  Taxa de Ruído: Baixa (Filtro Ativo)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 h-8 px-2 bg-zinc-900/60 rounded-lg">
              {[20, 45, 60, 85, 95, 70, 40, 80, 100, 90, 75, 50, 30, 60, 85, 90, 60, 35, 20, 10, 30, 60, 80, 95, 70, 40, 20, 10, 5, 2].map((h, i) => (
                <div
                  key={i}
                  className="w-full rounded-full transition-all"
                  style={{ 
                    backgroundColor: isPlayingVoiceSample ? customColor : '#3f3f46',
                    height: `${isPlayingVoiceSample ? Math.max(15, h * (0.5 + Math.random() * 0.5)) : h * 0.4}%` 
                  }}
                />
              ))}
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 italic leading-relaxed">
              {player.voiceCommsSnippet.transcript}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: Avaliações de Duos */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Avaliações Verificadas por Partidas Reais</h3>
              <p className="text-xs text-zinc-400">
                Apenas jogadores que realmente disputaram uma partida com {player.username} podem emitir avaliações.
              </p>
            </div>

            <button
              onClick={() => {
                soundFx.playTactileClick();
                onOpenReviewModal(player);
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors font-mono cursor-pointer"
              style={{
                backgroundColor: customColor,
                color: isLight ? '#09090b' : '#09090b'
              }}
            >
              <Star className="h-3.5 w-3.5" />
              <span>Avaliar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {player.reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={rev.authorAvatar}
                      alt={rev.authorName}
                      className="h-10 w-10 rounded-lg object-cover border border-zinc-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-100">{rev.authorName}</span>
                        <span className="text-xs font-mono" style={{ color: customColor }}>{rev.authorRank}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span>{rev.matchContext}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-zinc-500">Match #{rev.verifiedMatchId.slice(-5)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  "{rev.comment}"
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1 font-mono">
                  {rev.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 font-medium"
                      style={{ color: customColor }}
                    >
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE PERFIL COMPETITIVO (PB-01 Acceptance Criteria) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div 
                  className="p-2 rounded-xl border"
                  style={{
                    backgroundColor: getRgba(customColor, 0.12),
                    borderColor: getRgba(customColor, 0.35),
                    color: customColor
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Editar Perfil Competitivo & Preferências
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    PB-01: Bio, Elo/Ranking, Tag de Jogo e Horários
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileChanges} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Elo / Patente Principal ({player.primaryGame})
                  </label>
                  <input
                    type="text"
                    value={editRankName}
                    onChange={(e) => setEditRankName(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                    placeholder="Ex: Radiant / Faceit Lvl 10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Pontuação / Posição no Ranking
                  </label>
                  <input
                    type="text"
                    value={editEloLevel}
                    onChange={(e) => setEditEloLevel(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                    placeholder="Ex: #340 BR (620 RR)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Tag Oficial do Jogo (Riot ID / Steam)
                  </label>
                  <input
                    type="text"
                    value={editRiotTag}
                    onChange={(e) => setEditRiotTag(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Status de Busca (LFG)
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Player['availability']['status'])}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                  >
                    <option value="Buscando Duo">Buscando Duo</option>
                    <option value="Buscando Time">Buscando Time</option>
                    <option value="Aberto a Convites">Aberto a Convites</option>
                    <option value="Ocupado">Ocupado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono font-semibold text-zinc-300 block">
                  Preferências de Horário & Rotina Competitiva
                </label>
                <input
                  type="text"
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                  placeholder="Ex: Segunda a Sexta: 19h às 00h | Fins de Semana: Livre"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono font-semibold text-zinc-300 block">
                  Bio & Filosofia de Jogo
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3.5 text-white leading-relaxed focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white font-mono font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono font-bold shadow-lg cursor-pointer"
                  style={{
                    backgroundColor: customColor,
                    color: '#09090b'
                  }}
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
