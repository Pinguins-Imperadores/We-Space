import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FeedView } from './components/FeedView';
const ClipperEngine = lazy(() => import('./components/ClipperEngine').then(m => ({ default: m.ClipperEngine })));
const PlayerProfileView = lazy(() => import('./components/PlayerProfileView').then(m => ({ default: m.PlayerProfileView })));
const MatchmakingDuoFinder = lazy(() => import('./components/MatchmakingDuoFinder').then(m => ({ default: m.MatchmakingDuoFinder })));
const TrustSystemView = lazy(() => import('./components/TrustSystemView').then(m => ({ default: m.TrustSystemView })));
import { ArenaTheaterModal } from './components/ArenaTheaterModal';
import { PaletteCustomizerModal } from './components/modals/PaletteCustomizerModal';
import { InviteDuoModal } from './components/modals/InviteDuoModal';
import { PostMatchReviewModal } from './components/modals/PostMatchReviewModal';
import { CreateClipModal } from './components/modals/CreateClipModal';
import { MatchLogModal } from './components/modals/MatchLogModal';
import { INITIAL_CLIPS, PLAYERS_DIRECTORY, ONGOING_MATCH_LOGS } from './data/mockData';
import { Clip, Player, PlayerReview } from './types';
import { ThemeAtmosphereProvider, useAtmosphere, getRgba } from './context/ThemeAtmosphereContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AutoClipperProvider, useAutoClipper } from './context/AutoClipperContext';
import { AuthModal } from './components/modals/AuthModal';
import { soundFx } from '@wespace/ui';
import { loadPersistedClips, savePersistedClip, deletePersistedClip } from './utils/clipStorage';

function MainApp() {
  const { isPaletteModalOpen, setIsPaletteModalOpen, customColor, themeConfig } = useAtmosphere();
  const [activeTab, setActiveTab] = useState<'feed' | 'clipper' | 'duos' | 'profiles' | 'trust'>('feed');
  const [clips, setClips] = useState<Clip[]>(INITIAL_CLIPS);
  const [players, setPlayers] = useState<Player[]>(PLAYERS_DIRECTORY);
  const [matchLogs, setMatchLogs] = useState(ONGOING_MATCH_LOGS);
  
  // Current active user
  const [currentUser] = useState({
    id: 'player-1',
    username: 'Vitor "Kailo" Silva',
    handle: 'kailofps',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=250&q=80',
    rank: 'Radiant #340',
    reputationScore: 98,
  });

  // Selected player for profile view
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('player-1');
  const [profileInitialTab, setProfileInitialTab] = useState<'overview' | 'radar' | 'voice' | 'reviews' | 'settings'>('overview');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isMatchLogModalOpen, setIsMatchLogModalOpen] = useState(false);
  const [isArenaTheaterOpen, setIsArenaTheaterOpen] = useState(false);

  // Active items for modals
  const [modalClip, setModalClip] = useState<Clip | undefined>(undefined);
  const [modalPlayer, setModalPlayer] = useState<Player | undefined>(undefined);

  // Endorsed clips tracking
  const [endorsedClips, setEndorsedClips] = useState<Set<string>>(new Set(['clip-1']));

  const handleSelectPlayer = (playerId: string) => {
    soundFx.playTactileClick();
    setSelectedPlayerId(playerId);
    setProfileInitialTab('overview');
    setActiveTab('profiles');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenClipperSettings = () => {
    soundFx.playTactileClick();
    setSelectedPlayerId(currentUser.id);
    setProfileInitialTab('settings');
    setActiveTab('profiles');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleEndorse = (clipId: string) => {
    setEndorsedClips((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) {
        next.delete(clipId);
      } else {
        next.add(clipId);
      }
      return next;
    });

    // Update clip count
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === clipId) {
          const isCurrently = endorsedClips.has(clipId);
          return {
            ...c,
            endorsements: isCurrently ? c.endorsements - 1 : c.endorsements + 1
          };
        }
        return c;
      })
    );
  };

  const handleOpenDuoModal = (clip?: Clip, player?: Player) => {
    soundFx.playTactileClick();
    setModalClip(clip);
    setModalPlayer(player);
    setIsInviteModalOpen(true);
  };

  const handleOpenMatchLog = (clip: Clip) => {
    soundFx.playTactileClick();
    setModalClip(clip);
    setIsMatchLogModalOpen(true);
  };

  const handleOpenArenaTheater = (clip: Clip) => {
    soundFx.playRadarPing();
    setModalClip(clip);
    setIsArenaTheaterOpen(true);
  };

  const handleOpenReviewModal = (player: Player) => {
    soundFx.playTactileClick();
    setModalPlayer(player);
    setIsReviewModalOpen(true);
  };

  const handleAddReview = (newReview: PlayerReview, playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            reviews: [newReview, ...p.reviews],
            stats: {
              ...p.stats,
              endorsementsReceived: p.stats.endorsementsReceived + 1
            }
          };
        }
        return p;
      })
    );
  };

  // Hydrate permanently stored clips (Tauri disk + IndexedDB) on app startup
  useEffect(() => {
    let active = true;
    loadPersistedClips().then((savedClips) => {
      if (!active || savedClips.length === 0) return;
      const savedIds = new Set(savedClips.map((c) => c.id));
      setClips((prev) => [...savedClips, ...prev.filter((c) => !savedIds.has(c.id))]);
      setPlayers((prev) =>
        prev.map((p) => {
          const ownSaved = savedClips.filter((c) => c.author.id === p.id);
          if (ownSaved.length === 0) return p;
          const ownIds = new Set(ownSaved.map((c) => c.id));
          return {
            ...p,
            clips: [...ownSaved, ...p.clips.filter((c) => !ownIds.has(c.id))],
          };
        })
      );
    });
    return () => {
      active = false;
    };
  }, []);

  const handlePublishClip = (newClip: Clip) => {
    if (!newClip.isLocalPersisted) {
      void savePersistedClip(newClip);
    }

    setClips((prev) => [newClip, ...prev.filter((c) => c.id !== newClip.id)]);

    // Also link clip to player's profile if it's the current user
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === currentUser.id) {
          return {
            ...p,
            clips: [newClip, ...p.clips.filter((c) => c.id !== newClip.id)]
          };
        }
        return p;
      })
    );

    setActiveTab('feed');
  };

  const handleDeleteClip = (clipId: string) => {
    const target = clips.find((c) => c.id === clipId);
    void deletePersistedClip(clipId, target?.localFilePath);
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        clips: p.clips.filter((c) => c.id !== clipId),
      }))
    );
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p))
    );
  };

  const activePlayer = players.find((p) => p.id === selectedPlayerId) || players[0];

  return (
    <AutoClipperProvider currentUser={currentUser} onPublishClip={handlePublishClip}>
    <div className="min-h-screen bg-zinc-950 bg-tactical-grid text-zinc-100 flex flex-col font-sans">
      
      <a href="#main-content" className="sr-only focus:not-sr-only focus:p-3 focus:bg-zinc-800">Pular para o conteúdo</a>
      {/* Top Navbar with Palette Picker Control */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onSelectPlayer={handleSelectPlayer}
        currentUser={currentUser}
      />

      {/* Main View Router */}
      <main id="main-content" tabIndex={-1} className="flex-1">
        <section aria-label="Guia de demonstração" className="mx-auto max-w-7xl p-4 text-sm">
          <p className="text-amber-300">Protótipo demonstrativo • Feed e perfis utilizam dados de exemplo.</p>
          <p className="text-zinc-400 mt-1">Explore clipes, encontre uma dupla e consulte a reputação. Captura real exige o aplicativo Windows e validação no jogo.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button className="rounded-lg bg-zinc-800 px-4 py-2" onClick={() => setActiveTab('clipper')}>1. Explorar captura</button>
            <button className="rounded-lg bg-zinc-800 px-4 py-2" onClick={() => setActiveTab('duos')}>2. Encontrar dupla</button>
            <button className="rounded-lg bg-zinc-800 px-4 py-2" onClick={() => setActiveTab('trust')}>3. Entender reputação</button>
          </div>
        </section>
        <Suspense fallback={<p role="status" className="p-8 text-center">Carregando tela…</p>}>
        {activeTab === 'feed' && (
          <FeedView
            clips={clips}
            players={players}
            matchLogs={matchLogs}
            currentUser={currentUser}
            onSelectPlayer={handleSelectPlayer}
            onOpenDuoModal={handleOpenDuoModal}
            onToggleEndorse={handleToggleEndorse}
            endorsedClips={endorsedClips}
            onOpenMatchLog={handleOpenMatchLog}
            onDeleteClip={handleDeleteClip}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenClipper={() => setActiveTab('clipper')}
            onOpenClipperSettings={handleOpenClipperSettings}
            onOpenDuos={() => setActiveTab('duos')}
            onOpenArenaTheater={handleOpenArenaTheater}
          />
        )}

        {activeTab === 'clipper' && (
          <ClipperEngine
            matchLogs={matchLogs}
            onPublishClip={handlePublishClip}
            onOpenClipperSettings={handleOpenClipperSettings}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'duos' && (
          <MatchmakingDuoFinder
            players={players}
            currentUser={currentUser}
            onSelectPlayer={handleSelectPlayer}
            onOpenDuoModal={handleOpenDuoModal}
            onOpenArenaTheater={handleOpenArenaTheater}
          />
        )}

        {activeTab === 'profiles' && (
          <PlayerProfileView
            player={activePlayer}
            allPlayers={players}
            currentUserId={currentUser.id}
            initialTab={profileInitialTab}
            onUpdatePlayer={handleUpdatePlayer}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenClipper={() => setActiveTab('clipper')}
            onOpenDuoModal={handleOpenDuoModal}
            onSelectPlayer={handleSelectPlayer}
            onToggleEndorse={handleToggleEndorse}
            endorsedClips={endorsedClips}
            onOpenMatchLog={handleOpenMatchLog}
            onDeleteClip={handleDeleteClip}
            onOpenReviewModal={handleOpenReviewModal}
            onOpenArenaTheater={handleOpenArenaTheater}
          />
        )}

        {activeTab === 'trust' && <TrustSystemView />}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">We Space</span>
            <span>•</span>
            <span>"Jogue com quem presta, mostre como você joga."</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <button
              onClick={() => {
                soundFx.playTactileClick();
                setIsPaletteModalOpen(true);
              }}
              className="flex items-center gap-1.5 hover:underline cursor-pointer transition-colors"
              style={{ color: customColor }}
            >
              <span 
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ backgroundColor: customColor }}
              />
              <span>Paleta: {themeConfig.label}</span>
            </button>
            <span className="text-zinc-600">|</span>
            <span>Ambiente de demonstração</span>
          </div>
        </div>
      </footer>

      {/* Color Palette Customizer Modal */}
      <PaletteCustomizerModal
        isOpen={isPaletteModalOpen}
        onClose={() => setIsPaletteModalOpen(false)}
      />

      {/* Arena Theater Fullscreen Modal */}
      <ArenaTheaterModal
        isOpen={isArenaTheaterOpen}
        onClose={() => setIsArenaTheaterOpen(false)}
        clip={modalClip || null}
        onOpenDuoModal={(clip) => {
          setIsArenaTheaterOpen(false);
          handleOpenDuoModal(clip);
        }}
        onToggleEndorse={handleToggleEndorse}
        hasEndorsed={modalClip ? endorsedClips.has(modalClip.id) : false}
      />

      {/* Other Modals */}
      <InviteDuoModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        targetClip={modalClip}
        targetPlayer={modalPlayer}
      />

      <PostMatchReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        targetPlayer={modalPlayer || null}
        onAddReview={handleAddReview}
      />

      <CreateClipModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAddClip={handlePublishClip}
        currentUser={currentUser}
      />

      <MatchLogModal
        isOpen={isMatchLogModalOpen}
        onClose={() => setIsMatchLogModalOpen(false)}
        clip={modalClip || null}
      />

      <AuthModal />
      <MonitorSelectModal />
      <AutoClipperFloatingHud />

    </div>
    </AutoClipperProvider>
  );
}

function MonitorSelectModal() {
  const {
    isMonitorPromptOpen,
    monitors,
    settings,
    closeMonitorPrompt,
    confirmMonitorSelection,
    refreshMonitors,
  } = useAutoClipper();
  const [rememberChoice, setRememberChoice] = useState(true);

  if (!isMonitorPromptOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-zinc-950 p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white font-mono">
              Qual monitor está sendo usado?
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Detectamos {monitors.length} monitores conectados. Escolha qual tela o Auto-Clipper deve gravar.
            </p>
          </div>
          <button
            type="button"
            onClick={closeMonitorPrompt}
            className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-800 cursor-pointer"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-2">
          {monitors.map((mon) => {
            const isSelected =
              settings.selectedMonitorId === mon.id ||
              (settings.selectedMonitorId === 'primary' && mon.is_primary);
            return (
              <button
                key={mon.id}
                type="button"
                onClick={() => void confirmMonitorSelection(mon.id, rememberChoice)}
                className={`w-full flex items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/15 text-white'
                    : 'border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:border-emerald-500/50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold font-mono flex items-center gap-2">
                    <span>{mon.name}</span>
                    {mon.is_primary && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/30">
                        Principal
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                    Resolução {mon.width}x{mon.height} • Posição ({mon.x}, {mon.y})
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Gravar esta tela →
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => void confirmMonitorSelection('all', rememberChoice)}
            className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-left text-zinc-300 hover:border-zinc-600 cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold font-mono">Todas as Telas (Combinado)</div>
              <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                Captura toda a área estendida do desktop
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-400">Selecionar →</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
          <label className="flex items-center gap-2 text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
            <span>Lembrar este monitor nas próximas gravações</span>
          </label>
          <button
            type="button"
            onClick={() => void refreshMonitors()}
            className="text-[11px] font-mono text-emerald-400 hover:underline cursor-pointer"
          >
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoClipperFloatingHud() {
  const {
    status,
    isRecordingQuickClip,
    quickClipProgressSec,
    countdownRemaining,
    settings,
    toastMessage,
    triggerQuickClipAndPost,
    stopQuickRecordingAndPost,
    stopBackgroundCapture,
    cancelCountdown,
  } = useAutoClipper();

  const isBufferRecording = status.isCapturing && !isRecordingQuickClip;

  if (!isRecordingQuickClip && !isBufferRecording && countdownRemaining === null && !toastMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {countdownRemaining !== null && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/50 bg-zinc-950/95 px-4 py-3 text-xs font-mono text-amber-300 shadow-2xl backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>Iniciando gravação em {countdownRemaining}s...</span>
          <button
            onClick={cancelCountdown}
            className="rounded-lg bg-zinc-800 px-2.5 py-1 text-zinc-200 hover:bg-zinc-700 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {isRecordingQuickClip && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/70 bg-zinc-950/95 px-4 py-3 text-xs font-mono text-white shadow-[0_0_24px_rgba(244,63,94,0.35)] backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          <span className="font-bold text-rose-400">REC</span>
          <span>
            {status.activeMonitor ? `${status.activeMonitor} • ` : ''}
            Gravando ({quickClipProgressSec}s / {settings.clipDurationSeconds}s)
          </span>
          <button
            onClick={() => void stopQuickRecordingAndPost()}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 font-bold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
          >
            Parar e Postar no Feed
          </button>
        </div>
      )}

      {isBufferRecording && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/50 bg-zinc-950/95 px-4 py-2.5 text-xs font-mono text-white shadow-2xl backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          <span className="font-bold text-rose-400">REC</span>
          <span className="text-zinc-200">
            {status.activeMonitor ? `${status.activeMonitor} • ` : ''}
            Buffer ({status.bufferedSeconds}s / {settings.clipDurationSeconds}s • {status.memoryUsageMb.toFixed(1)} MB)
          </span>
          <button
            onClick={() => void triggerQuickClipAndPost()}
            className="rounded-lg bg-emerald-500 px-2.5 py-1 font-bold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
          >
            Clipar [{settings.hotkey}]
          </button>
          <button
            onClick={() => void stopBackgroundCapture()}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-300 hover:text-white cursor-pointer"
          >
            Parar
          </button>
        </div>
      )}

      {toastMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-zinc-950/95 px-4 py-2.5 text-xs font-mono text-emerald-300 shadow-xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeAtmosphereProvider>
        <MainApp />
      </ThemeAtmosphereProvider>
    </AuthProvider>
  );
}
