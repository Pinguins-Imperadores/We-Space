import React, { useState } from 'react';
import { X, UploadCloud, Video, Sparkles, Check, FileCheck, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Clip, GameType } from '../../types';

interface CreateClipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClip: (clip: Clip) => void;
  currentUser: {
    id: string;
    username: string;
    handle: string;
    avatar: string;
    rank: string;
    reputationScore: number;
  };
}

export const CreateClipModal: React.FC<CreateClipModalProps> = ({
  isOpen,
  onClose,
  onAddClip,
  currentUser
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [game, setGame] = useState<GameType>('Valorant');
  const [map, setMap] = useState('Haven');
  const [agentOrHero, setAgentOrHero] = useState('Omen');
  const [situation, setSituation] = useState('Clutch 1v2 no Pós-Plante');
  const [roundScore, setRoundScore] = useState('11 x 11');
  const [voiceTranscript, setVoiceTranscript] = useState('"Passei call limpa no Bomb, cuidei do céu e garanti a vitória."');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399']
    });

    const newClip: Clip = {
      id: `user-clip-${Date.now()}`,
      title,
      description: description || 'Jogada verificada pela We Space Telemetry Engine.',
      game,
      map,
      agentOrHero,
      videoType: 'simulated',
      videoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      previewColor: '#09090b',
      durationSeconds: 24,
      author: {
        id: currentUser.id,
        username: currentUser.username,
        handle: currentUser.handle,
        avatar: currentUser.avatar,
        rank: currentUser.rank,
        reputationScore: currentUser.reputationScore,
        badge: 'Jogada Verificada',
        isPro: false,
      },
      telemetry: {
        matchId: `VAL-BR-${Math.floor(10000 + Math.random() * 90000)}`,
        game,
        date: 'Hoje, há poucos minutos',
        mode: 'Competitivo Ranqueado',
        map,
        agentOrHero,
        roundScore,
        roundContext: 'Decisão em Round de Pressão',
        situation,
        impactScore: 96,
        headshotPercentage: 80,
        hpLeft: 34,
        weapons: ['Vandal Prime', 'Ghost'],
        utilityUsed: ['Smoke', 'Flash'],
        serverPing: '12ms',
        verifiedAt: new Date().toISOString(),
        verifiedEngineVersion: 'WeSpace-Engine v4.2.1 [User-Upload]'
      },
      voiceComms: {
        hasAudio: true,
        transcript: voiceTranscript,
        callClarityScore: 97,
        tiltLevel: 'Zero Tilt',
        speakerName: currentUser.username.split(' ')[0],
        waveform: [20, 35, 50, 75, 90, 100, 85, 60, 40, 70, 95, 80, 60, 40, 20, 10]
      },
      tags: [game, map, 'Comunicação Limpa', 'Clutch'],
      endorsements: 0,
      recruitsCount: 0,
      sharesCount: 0,
      commentsCount: 0,
      createdAt: 'Agora mesmo'
    };

    onAddClip(newClip);

    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Publicar Novo Highlight com Log</h3>
              <p className="text-xs text-zinc-400">Vincule os dados oficiais da partida para certificar seu clipe</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Título da Jogada</label>
            <input
              type="text"
              required
              placeholder="Ex: Clutch 1v3 no Round Decisivo (12x11)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Jogo</label>
              <select
                value={game}
                onChange={(e) => setGame(e.target.value as GameType)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="Valorant">Valorant</option>
                <option value="CS2">CS2</option>
                <option value="League of Legends">League of Legends</option>
                <option value="Apex Legends">Apex Legends</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Mapa</label>
              <input
                type="text"
                value={map}
                onChange={(e) => setMap(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-zinc-300">Agente / Personagem</label>
              <input
                type="text"
                value={agentOrHero}
                onChange={(e) => setAgentOrHero(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Placar no Momento</label>
              <input
                type="text"
                value={roundScore}
                onChange={(e) => setRoundScore(e.target.value)}
                placeholder="Ex: 11 x 12"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Situação Chave</label>
              <input
                type="text"
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Ex: Clutch 1v2 Defuse"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Transcrição da Call de Voz</label>
            <textarea
              rows={2}
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Descrição Tática</label>
            <textarea
              rows={2}
              placeholder="Explique sua tomada de decisão..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
            >
              <FileCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Verificando...' : 'Publicar com Selo de Telemetria'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
