import React, { useState } from 'react';
import { X, Star, ShieldCheck, Check, Sparkles, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Player, PlayerReview } from '../../types';
import { useAtmosphere, getRgba, isLightColor } from '../../context/ThemeAtmosphereContext';
import { soundFx } from '../../utils/soundEngine';

interface PostMatchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlayer: Player | null;
  onAddReview: (review: PlayerReview, playerId: string) => void;
}

export const PostMatchReviewModal: React.FC<PostMatchReviewModalProps> = ({
  isOpen,
  onClose,
  targetPlayer,
  onAddReview
}) => {
  const { customColor } = useAtmosphere();
  const [rating, setRating] = useState(5);
  const [matchContext, setMatchContext] = useState('Lotus 13x11 (Ranqueada)');
  const [comment, setComment] = useState('Comunicação impecável, não reclamou quando o time errou e jogou pelo objetivo até o último segundo.');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Call Limpa', 'Zero Tilt', 'Excelente IGL']);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !targetPlayer) return null;

  const availableTags = [
    'Call Limpa',
    'Zero Tilt',
    'Excelente IGL',
    'Passa Info Rápido',
    'Não Culpa os Outros',
    'Dropa Arma Sem Pedir',
    'Bom Trade Kill',
    'Frio nos Clutches'
  ];

  const handleToggleTag = (tag: string) => {
    soundFx.playTactileClick();
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playTactileClick();
    setIsSubmitted(true);
    soundFx.playClutchFanfare();

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: [customColor, '#fbbf24', '#ffffff']
    });

    const newReview: PlayerReview = {
      id: `rev-${Date.now()}`,
      authorName: 'Vitor "Kailo" Silva',
      authorAvatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80',
      authorRank: 'Radiant #340',
      matchContext,
      date: 'Agora mesmo',
      rating,
      tags: selectedTags,
      comment,
      verifiedMatchId: 'VAL-BR-2026-99201'
    };

    onAddReview(newReview, targetPlayer.id);

    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1600);
  };

  const isLight = isLightColor(customColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <img
              src={targetPlayer.avatar}
              alt={targetPlayer.username}
              className="h-11 w-11 rounded-xl object-cover border border-zinc-700"
            />
            <div>
              <h3 className="text-base font-bold text-white">
                Avaliar Comportamento de {targetPlayer.username}
              </h3>
              <span className="text-xs font-mono" style={{ color: customColor }}>
                Log de Partida Vinculado: #VAL-99201
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div 
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border"
              style={{
                backgroundColor: getRgba(customColor, 0.15),
                borderColor: getRgba(customColor, 0.4),
                color: customColor
              }}
            >
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <h4 className="text-lg font-bold text-white">Avaliação Verificada Registrada!</h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              O score de reputação do jogador foi atualizado com base no seu feedback e na telemetria da partida.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Rating Stars */}
            <div className="space-y-1.5 text-center py-2 bg-zinc-950/60 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400 block">Nota de Trabalho em Equipe & Postura</span>
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      soundFx.playTactileClick();
                      setRating(star);
                    }}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Behavioral Tag Checklist */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                Selecione as qualidades observadas nesta partida:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                        isSelected
                          ? 'shadow-sm'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                      style={{
                        backgroundColor: isSelected ? getRgba(customColor, 0.15) : undefined,
                        borderColor: isSelected ? getRgba(customColor, 0.4) : undefined,
                        color: isSelected ? customColor : undefined
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Match Context and Comment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Contexto da Partida</label>
              <input
                type="text"
                value={matchContext}
                onChange={(e) => setMatchContext(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Comentário Detalhado</label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:outline-none"
                placeholder="Como foi a experiência jogando junto?"
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
                className="px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md"
                style={{
                  backgroundColor: customColor,
                  color: isLight ? '#09090b' : '#09090b',
                  boxShadow: `0 4px 14px ${getRgba(customColor, 0.3)}`
                }}
              >
                Registrar Avaliação Verificada
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
