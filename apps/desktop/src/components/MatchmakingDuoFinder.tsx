import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Flame, 
  Radio, 
  CheckCircle2, 
  UserPlus, 
  Volume2, 
  Sparkles,
  Zap,
  Plus,
  Globe,
  Clock,
  Crosshair,
  Play,
  Check,
  X,
  Wifi,
  SlidersHorizontal,
  Eye
} from 'lucide-react';
import { Player, GameType, Clip } from '../types';
import { useAtmosphere, getRgba, isLightColor } from '../context/ThemeAtmosphereContext';
import { soundFx } from '../utils/soundEngine';

interface MatchmakingDuoFinderProps {
  players: Player[];
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
  onOpenArenaTheater?: (clip: Clip) => void;
}

interface CustomLobbyRoom {
  id: string;
  hostPlayer: Player;
  title: string;
  game: GameType;
  mode: string;
  eloRequired: string;
  roleNeeded: string;
  language: string;
  micRequired: boolean;
  slotsFilled: number;
  slotsTotal: number;
  serverPing: string;
  createdAt: string;
}

export const MatchmakingDuoFinder: React.FC<MatchmakingDuoFinderProps> = ({
  players,
  currentUser,
  onSelectPlayer,
  onOpenDuoModal,
  onOpenArenaTheater
}) => {
  const { customColor } = useAtmosphere();
  
  // PB-04 Tactical Filters: Search, Game, Role, Language, Min Reputation, Mic/Comms
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [minReputation, setMinReputation] = useState<number>(90);
  const [onlyMicRequired, setOnlyMicRequired] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Lobby Modal State (PB-04 Creation of Lobbies)
  const [isCreateLobbyOpen, setIsCreateLobbyOpen] = useState(false);
  const [newLobbyTitle, setNewLobbyTitle] = useState('Grind Imortal/Radiant • Foco em Call Limpa e Retake');
  const [newLobbyGame, setNewLobbyGame] = useState<GameType>('Valorant');
  const [newLobbyMode, setNewLobbyMode] = useState('Duo / 5-Stack Ranqueado');
  const [newLobbyElo, setNewLobbyElo] = useState('Imortal 2+ / Radiant');
  const [newLobbyRole, setNewLobbyRole] = useState('Flex / Controlador ou Sentinela');
  const [newLobbyLang, setNewLobbyLang] = useState('Português (Nativo)');
  const [newLobbySlots, setNewLobbySlots] = useState<number>(5);
  const [newLobbyMic, setNewLobbyMic] = useState<boolean>(true);
  const [lobbyCreatedToast, setLobbyCreatedToast] = useState(false);

  // Custom user-created lobbies
  const [customLobbies, setCustomLobbies] = useState<CustomLobbyRoom[]>([]);

  // 5-Stack Squad Builder state
  const [squad, setSquad] = useState<Array<{ slot: string; player: Player | null }>>([
    { slot: 'IGL / Capitão', player: players[0] || null },
    { slot: 'Entry / Duelista', player: players[1] || null },
    { slot: 'Suporte / Iniciador', player: players[3] || null },
    { slot: 'Flex / Controlador', player: null },
    { slot: 'Âncora / Sentinela', player: null }
  ]);

  // Dynamic squad reputation calculation
  const activeSquadMembers = squad.filter((s) => s.player !== null);
  const averageSquadReputation = activeSquadMembers.length > 0
    ? (activeSquadMembers.reduce((acc, curr) => acc + (curr.player?.reputationScore || 0), 0) / activeSquadMembers.length).toFixed(1)
    : '0.0';

  const isPlayerInSquad = (playerId: string) => {
    return squad.some((s) => s.player?.id === playerId);
  };

  // Filter logic for Players / Lobbies (PB-04)
  const filteredPlayers = players.filter((p) => {
    if (selectedGame !== 'all' && p.primaryGame !== selectedGame && p.secondaryGame !== selectedGame) {
      return false;
    }
    if (p.reputationScore < minReputation) {
      return false;
    }
    if (onlyMicRequired && !p.availability.micRequirement.toLowerCase().includes('obrigatório')) {
      return false;
    }
    if (roleFilter !== 'all') {
      const hasRole = p.mainRoles.some((r) => r.toLowerCase().includes(roleFilter.toLowerCase()));
      if (!hasRole) return false;
    }
    if (languageFilter !== 'all') {
      const hasLang = p.languages.some((l) => l.toLowerCase().includes(languageFilter.toLowerCase()));
      if (!hasLang) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.username.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q);
      const matchRole = p.mainRoles.some(r => r.toLowerCase().includes(q));
      const matchBio = p.bio.toLowerCase().includes(q);
      const matchElo = p.ranks.some(rk => rk.rankName.toLowerCase().includes(q) || rk.eloOrLevel.toLowerCase().includes(q));
      if (!matchName && !matchRole && !matchBio && !matchElo) return false;
    }
    return true;
  });

  const handleTogglePlayerInSquad = (player: Player) => {
    soundFx.playTactileClick();
    if (isPlayerInSquad(player.id)) {
      setSquad((prev) =>
        prev.map((s) => (s.player?.id === player.id ? { ...s, player: null } : s))
      );
      return;
    }

    setSquad((prev) => {
      const emptySlotIndex = prev.findIndex(s => s.player === null);
      if (emptySlotIndex !== -1) {
        const next = [...prev];
        next[emptySlotIndex] = { ...next[emptySlotIndex], player };
        return next;
      }
      return prev;
    });
  };

  const handleRemoveFromSquad = (index: number) => {
    soundFx.playTactileClick();
    setSquad((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], player: null };
      return next;
    });
  };

  const handleCreateLobbySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClutchFanfare();

    const host = players.find((p) => p.id === currentUser.id) || players[0];
    const newRoom: CustomLobbyRoom = {
      id: `lobby-${Date.now()}`,
      hostPlayer: host,
      title: newLobbyTitle,
      game: newLobbyGame,
      mode: newLobbyMode,
      eloRequired: newLobbyElo,
      roleNeeded: newLobbyRole,
      language: newLobbyLang,
      micRequired: newLobbyMic,
      slotsFilled: activeSquadMembers.length || 1,
      slotsTotal: newLobbySlots,
      serverPing: '11ms (SP-01)',
      createdAt: 'Agora mesmo'
    };

    setCustomLobbies((prev) => [newRoom, ...prev]);
    setIsCreateLobbyOpen(false);
    setLobbyCreatedToast(true);
    setTimeout(() => setLobbyCreatedToast(false), 4000);
  };

  const getLobbyMetaForPlayer = (player: Player, index: number) => {
    const configs = [
      { slots: '3/5 Squad', mode: 'Ranqueado 5-Stack', ping: '11ms (SP-01)', needed: 'Falta Flex & Sentinela' },
      { slots: '1/2 Duo', mode: 'Faceit Lvl 10 Grind', ping: '14ms (SP-02)', needed: 'Procuro AWP / Suporte' },
      { slots: '1/2 Duo', mode: 'Solo/Duo Grandmaster', ping: '9ms (BR-01)', needed: 'Procuro Mid / Top Laner' },
      { slots: '4/5 Fechado', mode: 'Competitivo 5v5', ping: '15ms (RJ-01)', needed: 'Última vaga: Duelista' }
    ];
    return configs[index % configs.length];
  };

  const isLight = isLightColor(customColor);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      
      {/* Header Banner with Create Lobby CTA (PB-04) */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-black p-6 md:p-8 shadow-2xl">
        <div 
          className="absolute -top-24 -right-24 h-80 w-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: customColor }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-3xl space-y-2.5">
            <div 
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest font-mono"
              style={{ color: customColor }}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Central LFG em Tempo Real • Compatibilidade & Call Limpa</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-display">
              Encontre Duos, Crie Salas e Monte seu 5-Stack sem Tilt
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Filtre salas abertas por elo, função tática, idioma e exigência de microfone. Todos os jogadores listados possuem histórico de reputação e clipes autenticados por telemetria.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 px-4 py-2.5 text-xs font-mono flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <span className="text-zinc-400 block text-[10px]">SALAS ATIVAS AGORA</span>
                <span className="text-white font-bold">{filteredPlayers.length + customLobbies.length} Lobbies Verificados</span>
              </div>
            </div>

            <button
              onClick={() => {
                soundFx.playTactileClick();
                setIsCreateLobbyOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-lg font-mono cursor-pointer"
              style={{
                backgroundColor: customColor,
                color: isLight ? '#09090b' : '#09090b',
                boxShadow: `0 4px 20px ${getRgba(customColor, 0.3)}`
              }}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Criar Sala / Lobby LFG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification when a New Lobby is Published */}
      {lobbyCreatedToast && (
        <div 
          className="rounded-xl border p-3.5 px-5 flex items-center justify-between bg-zinc-950/95 shadow-xl animate-fadeIn font-mono text-xs"
          style={{
            borderColor: customColor,
            color: customColor
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-bold">Sua Sala LFG foi publicada em tempo real no topo da listagem! (PB-04)</span>
          </div>
          <span className="text-zinc-500">Online • SP-01</span>
        </div>
      )}

      {/* Interactive 5-Stack Squad Builder */}
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: customColor }} />
              <h2 className="text-base font-bold text-white font-display">
                Montador de Squad & Simulador de Compatibilidade (5-Stack)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                {activeSquadMembers.length}/5 Preenchidos
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Adicione jogadores abaixo para testar o equilíbrio tático de funções e a média de Karma antes de fechar a sala.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span 
              className="text-xs font-mono border px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5"
              style={{
                backgroundColor: getRgba(customColor, 0.12),
                borderColor: getRgba(customColor, 0.35),
                color: customColor
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Média do Squad: {averageSquadReputation}% Karma</span>
            </span>

            {activeSquadMembers.length < 5 && (
              <button
                onClick={() => {
                  soundFx.playTactileClick();
                  setIsCreateLobbyOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono font-semibold text-zinc-200 transition-colors cursor-pointer"
              >
                Buscar +{5 - activeSquadMembers.length} Vagas no LFG
              </button>
            )}
          </div>
        </div>

        {/* Squad Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {squad.map((slotItem, index) => {
            const hasPlayer = !!slotItem.player;
            return (
              <div
                key={index}
                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all ${
                  hasPlayer
                    ? 'border-zinc-700/90 bg-zinc-900/70 text-white shadow-md'
                    : 'border-dashed border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span 
                      className="text-[10px] font-mono font-bold uppercase tracking-wider"
                      style={{ color: customColor }}
                    >
                      Slot {index + 1} • {slotItem.slot}
                    </span>
                    {hasPlayer && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" title="Pronto no Lobby" />
                    )}
                  </div>

                  {hasPlayer && slotItem.player ? (
                    <div 
                      onClick={() => onSelectPlayer(slotItem.player!.id)}
                      className="flex items-center gap-2.5 cursor-pointer group/slot"
                    >
                      <img
                        src={slotItem.player.avatar}
                        alt={slotItem.player.username}
                        className="h-10 w-10 rounded-lg object-cover border border-zinc-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-100 block truncate group-hover/slot:underline">
                          {slotItem.player.username}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono block truncate">
                          {slotItem.player.ranks[0]?.rankName}
                        </span>
                        <span className="text-[10px] font-mono font-semibold" style={{ color: customColor }}>
                          {slotItem.player.reputationScore}% Karma
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-12 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800/80 rounded-lg bg-zinc-900/20">
                      <span className="text-[11px] font-mono text-zinc-500">Vaga Aberta</span>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 mt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono">
                  {hasPlayer ? (
                    <>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Volume2 className="h-3 w-3" /> Call Limpa
                      </span>
                      <button
                        onClick={() => handleRemoveFromSquad(index)}
                        className="text-zinc-400 hover:text-red-400 transition-colors cursor-pointer font-semibold"
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-zinc-500">Aguardando</span>
                      <span style={{ color: customColor }} className="font-semibold">
                        + Selecionar abaixo
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Tactical LFG Filter Bar (PB-04: Elo, Role, Language, Mic, Reputation) */}
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-zinc-300">
            <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: customColor }} />
            <span>Filtros de Busca LFG (Elo, Função, Idioma & Microfone)</span>
          </div>
          {(selectedGame !== 'all' || roleFilter !== 'all' || languageFilter !== 'all' || searchQuery !== '' || minReputation > 90) && (
            <button
              onClick={() => {
                setSelectedGame('all');
                setRoleFilter('all');
                setLanguageFilter('all');
                setSearchQuery('');
                setMinReputation(90);
              }}
              className="text-xs font-mono hover:underline cursor-pointer"
              style={{ color: customColor }}
            >
              Resetar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-center">
          
          {/* 1. Search by Nick, Role or Elo */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nick, elo (ex: Radiant, Lvl 10) ou função..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-9 pr-3 py-2 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* 2. Game Filter */}
          <div>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs font-mono font-medium text-white focus:outline-none focus:border-zinc-600 cursor-pointer"
            >
              <option value="all">Jogo: Todos</option>
              <option value="Valorant">Valorant</option>
              <option value="CS2">Counter-Strike 2</option>
              <option value="League of Legends">League of Legends</option>
            </select>
          </div>

          {/* 3. Tactical Role Filter (PB-04 requirement) */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs font-mono font-medium text-white focus:outline-none focus:border-zinc-600 cursor-pointer"
            >
              <option value="all">Função: Todas</option>
              <option value="IGL">IGL / Capitão</option>
              <option value="Controlador">Controlador / Smoker</option>
              <option value="Entry">Entry Fragger / Duelista</option>
              <option value="Iniciador">Iniciador / Suporte</option>
              <option value="Jungler">Jungler / Shotcaller</option>
            </select>
          </div>

          {/* 4. Language Filter (PB-04 requirement) */}
          <div>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs font-mono font-medium text-white focus:outline-none focus:border-zinc-600 cursor-pointer"
            >
              <option value="all">Idioma: Todos</option>
              <option value="Português">Português (BR)</option>
              <option value="Inglês">Inglês (Call Limpa)</option>
              <option value="Espanhol">Espanhol</option>
            </select>
          </div>

          {/* 5. Voice Mic Requirement Checkbox */}
          <div 
            onClick={() => setOnlyMicRequired(!onlyMicRequired)}
            className="flex items-center justify-between rounded-xl bg-zinc-900/90 px-3 py-2 border border-zinc-800 cursor-pointer select-none"
          >
            <span className="text-xs text-zinc-200 font-mono font-medium flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5" style={{ color: customColor }} />
              Call Limpa
            </span>
            <input
              type="checkbox"
              checked={onlyMicRequired}
              onChange={(e) => setOnlyMicRequired(e.target.checked)}
              className="h-4 w-4 rounded cursor-pointer"
              style={{ accentColor: customColor }}
            />
          </div>

        </div>

        {/* Reputation Slider Bar */}
        <div className="pt-2 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="text-xs font-mono text-zinc-400 shrink-0">Reputação Mínima:</span>
            <input
              type="range"
              min="70"
              max="99"
              value={minReputation}
              onChange={(e) => setMinReputation(Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ accentColor: customColor }}
            />
            <span className="text-xs font-mono font-bold w-12 text-right" style={{ color: customColor }}>
              {minReputation}%+
            </span>
          </div>

          <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
            <span>Exibindo <strong className="text-white">{filteredPlayers.length + customLobbies.length}</strong> salas compatíveis com seu perfil</span>
          </div>
        </div>
      </div>

      {/* Custom User-Created Lobbies Section (When user creates a room) */}
      {customLobbies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5" style={{ color: customColor }} />
            Suas Salas LFG Publicadas Agora ({customLobbies.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {customLobbies.map((room) => (
              <div
                key={room.id}
                className="rounded-2xl border-2 p-5 space-y-4 bg-zinc-950/95 shadow-xl relative overflow-hidden"
                style={{ borderColor: getRgba(customColor, 0.5) }}
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      SALA ABERTA ({room.slotsFilled}/{room.slotsTotal})
                    </span>
                    <span className="text-zinc-300 font-bold">{room.game} • {room.mode}</span>
                  </div>
                  <span className="text-zinc-400">{room.serverPing}</span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white font-display">{room.title}</h4>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs font-mono">
                    <span className="bg-zinc-900 text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-800">
                      Elo: <strong style={{ color: customColor }}>{room.eloRequired}</strong>
                    </span>
                    <span className="bg-zinc-900 text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-800">
                      Buscando: <strong>{room.roleNeeded}</strong>
                    </span>
                    <span className="bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-800">
                      Idioma: {room.language}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <img src={room.hostPlayer.avatar} alt={room.hostPlayer.username} className="h-7 w-7 rounded-lg object-cover" />
                    <span className="text-xs text-zinc-300 font-medium">Host: {room.hostPlayer.username} ({room.hostPlayer.reputationScore}% Karma)</span>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: customColor }}>
                    Aguardando Candidatos...
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Lobbies & Players Directory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPlayers.map((player, index) => {
          const lobbyMeta = getLobbyMetaForPlayer(player, index);
          const inSquad = isPlayerInSquad(player.id);

          return (
            <div
              key={player.id}
              className="rounded-2xl border border-zinc-800/90 bg-zinc-950/90 hover:border-zinc-700/90 transition-all flex flex-col justify-between shadow-xl overflow-hidden group"
            >
              {/* Top Live Lobby Telemetry Bar */}
              <div className="px-5 py-2.5 bg-zinc-900/80 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {player.availability.status.toUpperCase()} ({lobbyMeta.slots})
                  </span>
                  <span className="text-zinc-300 font-semibold">{player.primaryGame}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">{lobbyMeta.mode}</span>
                </div>

                <div className="flex items-center gap-2 text-zinc-400">
                  <Wifi className="h-3 w-3 text-emerald-400" />
                  <span>{lobbyMeta.ping}</span>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* Header: Player Avatar, Name, Rank & Reputation */}
                  <div className="flex items-start justify-between gap-3">
                    <div 
                      onClick={() => {
                        soundFx.playTactileClick();
                        onSelectPlayer(player.id);
                      }}
                      className="flex items-center gap-3.5 cursor-pointer group/author"
                    >
                      <div className="relative">
                        <img
                          src={player.avatar}
                          alt={player.username}
                          className="h-14 w-14 rounded-2xl object-cover border-2 border-zinc-700 group-hover/author:border-zinc-500 transition-colors"
                        />
                        <div 
                          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md text-zinc-950 shadow-sm"
                          style={{ backgroundColor: customColor }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-white group-hover/author:underline font-display">
                            {player.username}
                          </span>
                          <span className="text-xs font-mono text-zinc-500">@{player.handle}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 mt-1 font-mono">
                          <span className="font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800" style={{ color: customColor }}>
                            {player.ranks[0]?.tierIcon} {player.ranks[0]?.rankName} ({player.ranks[0]?.eloOrLevel})
                          </span>
                          <span className="text-zinc-400 text-[11px]">
                            K/D {player.stats.kd} • {player.stats.winRate}% WR
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div 
                        className="flex items-center gap-1 border px-3 py-1 rounded-full text-xs font-bold font-mono"
                        style={{
                          backgroundColor: getRgba(customColor, 0.12),
                          borderColor: getRgba(customColor, 0.35),
                          color: customColor
                        }}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>{player.reputationScore}% Karma</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 mt-1">
                        {player.stats.tiltFreeMatches} jogos sem tilt
                      </span>
                    </div>
                  </div>

                  {/* Role, Language & Schedule Strip (PB-04 Explicit Information) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase block">Funções & Agentes:</span>
                      <span className="text-zinc-200 font-semibold block truncate">
                        {player.mainRoles.join(' / ')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase block">Idioma & Comunicação:</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 truncate">
                        <Volume2 className="h-3 w-3 shrink-0" />
                        {player.languages[0]} • Call {player.voiceCommsSnippet.clarityScore}%
                      </span>
                    </div>
                  </div>

                  {/* Bio snippet */}
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                    "{player.bio}"
                  </p>

                  {/* Verified Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {player.verifiedBadges.slice(0, 3).map((badge, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-zinc-900/90 px-2.5 py-0.5 rounded-md border font-mono font-medium"
                        style={{
                          borderColor: getRgba(customColor, 0.25),
                          color: customColor
                        }}
                      >
                        ✓ {badge}
                      </span>
                    ))}
                    <span className="text-[11px] bg-zinc-900 text-zinc-400 px-2.5 py-0.5 rounded-md border border-zinc-800 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      {player.availability.schedule.split('|')[0]}
                    </span>
                  </div>

                  {/* Visual Video Highlight Preview Strip */}
                  {player.clips[0] && (
                    <div 
                      onClick={() => {
                        soundFx.playTactileClick();
                        if (onOpenArenaTheater) {
                          onOpenArenaTheater(player.clips[0]);
                        } else {
                          onSelectPlayer(player.id);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 flex items-center justify-between gap-3 cursor-pointer hover:border-zinc-700 transition-all group/clip"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-11 w-18 rounded-lg overflow-hidden shrink-0 border border-zinc-700 bg-black">
                          <img 
                            src={player.clips[0].videoUrl} 
                            alt={player.clips[0].title} 
                            className="h-full w-full object-cover opacity-80 group-hover/clip:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="h-3.5 w-3.5 text-white fill-white" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1" style={{ color: customColor }}>
                            <Flame className="h-3 w-3" /> Evidência de Gameplay Verificada
                          </span>
                          <p className="text-xs font-semibold text-zinc-100 truncate group-hover/clip:text-white">
                            {player.clips[0].title}
                          </p>
                        </div>
                      </div>
                      <span 
                        className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 flex items-center gap-1"
                        style={{ color: customColor }}
                      >
                        <Eye className="h-3 w-3" />
                        <span>Assistir</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="pt-3.5 mt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTogglePlayerInSquad(player)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                      inSquad
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-900 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {inSquad ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>No Seu Squad</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" style={{ color: customColor }} />
                        <span>Testar no Squad</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        soundFx.playTactileClick();
                        onSelectPlayer(player.id);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                    >
                      Inspecionar DNA
                    </button>
                    <button
                      onClick={() => {
                        soundFx.playTactileClick();
                        onOpenDuoModal(player.clips[0], player);
                      }}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 shadow-md cursor-pointer"
                      style={{
                        backgroundColor: customColor,
                        color: isLight ? '#09090b' : '#09090b',
                        boxShadow: `0 2px 10px ${getRgba(customColor, 0.25)}`
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Solicitar Vaga</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CRIAÇÃO DE SALA / LOBBY LFG (PB-04 Requirement) */}
      {isCreateLobbyOpen && (
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
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Criar Sala / Publicar Lobby LFG
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    PB-04: Defina elo, função procurada, idioma e requisito de comunicação
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateLobbyOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLobbySubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-mono font-semibold text-zinc-300 block">
                  Título da Sala / Objetivo da Sessão
                </label>
                <input
                  type="text"
                  required
                  value={newLobbyTitle}
                  onChange={(e) => setNewLobbyTitle(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-zinc-600"
                  placeholder="Ex: Rush Radiant sem Tilt • Precisamos de Iniciador"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Jogo Competitivo
                  </label>
                  <select
                    value={newLobbyGame}
                    onChange={(e) => setNewLobbyGame(e.target.value as GameType)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                  >
                    <option value="Valorant">Valorant</option>
                    <option value="CS2">Counter-Strike 2</option>
                    <option value="League of Legends">League of Legends</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Formato / Tamanho da Sala
                  </label>
                  <select
                    value={newLobbySlots}
                    onChange={(e) => setNewLobbySlots(Number(e.target.value))}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                  >
                    <option value={2}>Duo Ranqueado (2 Jogadores)</option>
                    <option value={3}>Trio Tático (3 Jogadores)</option>
                    <option value={5}>5-Stack Fechado (5 Jogadores)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Elo / Ranking Exigido
                  </label>
                  <input
                    type="text"
                    value={newLobbyElo}
                    onChange={(e) => setNewLobbyElo(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Função Procurada
                  </label>
                  <input
                    type="text"
                    value={newLobbyRole}
                    onChange={(e) => setNewLobbyRole(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Idioma da Call
                  </label>
                  <select
                    value={newLobbyLang}
                    onChange={(e) => setNewLobbyLang(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-600"
                  >
                    <option value="Português (Nativo)">Português (Nativo)</option>
                    <option value="Inglês (Call Limpa)">Inglês (Call Limpa)</option>
                    <option value="Espanhol">Espanhol</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-semibold text-zinc-300 block">
                    Requisito de Voz
                  </label>
                  <div 
                    onClick={() => setNewLobbyMic(!newLobbyMic)}
                    className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 cursor-pointer"
                  >
                    <span className="text-zinc-200 font-mono">Microfone & Zero Tilt</span>
                    <input
                      type="checkbox"
                      checked={newLobbyMic}
                      onChange={(e) => setNewLobbyMic(e.target.checked)}
                      className="h-4 w-4"
                      style={{ accentColor: customColor }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateLobbyOpen(false)}
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
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Publicar Sala LFG</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
