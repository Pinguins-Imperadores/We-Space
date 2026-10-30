import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { FeedView } from './components/FeedView';
import { ClipperEngine } from './components/ClipperEngine';
import { PlayerProfileView } from './components/PlayerProfileView';
import { MatchmakingDuoFinder } from './components/MatchmakingDuoFinder';
import { TrustSystemView } from './components/TrustSystemView';
import { ArenaTheaterModal } from './components/ArenaTheaterModal';
import { PaletteCustomizerModal } from './components/modals/PaletteCustomizerModal';
import { InviteDuoModal } from './components/modals/InviteDuoModal';
import { PostMatchReviewModal } from './components/modals/PostMatchReviewModal';
import { CreateClipModal } from './components/modals/CreateClipModal';
import { MatchLogModal } from './components/modals/MatchLogModal';
import { INITIAL_CLIPS, PLAYERS_DIRECTORY, ONGOING_MATCH_LOGS } from './data/mockData';
import { Clip, Player, PlayerReview } from './types';
import { ThemeAtmosphereProvider, useAtmosphere, getRgba } from './context/ThemeAtmosphereContext';
import { soundFx } from './utils/soundEngine';

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

  const handlePublishClip = (newClip: Clip) => {
    setClips((prev) => [newClip, ...prev]);

    // Also link clip to player's profile if it's the current user
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === currentUser.id) {
          return {
            ...p,
            clips: [newClip, ...p.clips]
          };
        }
        return p;
      })
    );

    setActiveTab('feed');
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p))
    );
  };

  const activePlayer = players.find((p) => p.id === selectedPlayerId) || players[0];

  return (
    <div className="min-h-screen bg-zinc-950 bg-tactical-grid text-zinc-100 flex flex-col font-sans">
      
      {/* Top Navbar with Palette Picker Control */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onSelectPlayer={handleSelectPlayer}
        currentUser={currentUser}
      />

      {/* Main View Router */}
      <main className="flex-1">
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
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenClipper={() => setActiveTab('clipper')}
            onOpenDuos={() => setActiveTab('duos')}
            onOpenArenaTheater={handleOpenArenaTheater}
          />
        )}

        {activeTab === 'clipper' && (
          <ClipperEngine
            matchLogs={matchLogs}
            onPublishClip={handlePublishClip}
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
            onUpdatePlayer={handleUpdatePlayer}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenClipper={() => setActiveTab('clipper')}
            onOpenDuoModal={handleOpenDuoModal}
            onSelectPlayer={handleSelectPlayer}
            onToggleEndorse={handleToggleEndorse}
            endorsedClips={endorsedClips}
            onOpenMatchLog={handleOpenMatchLog}
            onOpenReviewModal={handleOpenReviewModal}
            onOpenArenaTheater={handleOpenArenaTheater}
          />
        )}

        {activeTab === 'trust' && <TrustSystemView />}
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
            <span>Telemetry Engine v4.2 Online</span>
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

    </div>
  );
}

export default function App() {
  return (
    <ThemeAtmosphereProvider>
      <MainApp />
    </ThemeAtmosphereProvider>
  );
}
