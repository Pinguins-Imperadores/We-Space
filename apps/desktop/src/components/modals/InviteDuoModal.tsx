import React, { useState } from 'react';
import { X, UserPlus, Check, MessageSquare, Gamepad2, Send, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Clip, Player } from '../../types';
import { useAtmosphere, getRgba, isLightColor } from '../../context/ThemeAtmosphereContext';
import { soundFx } from '../../utils/soundEngine';

interface InviteDuoModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClip?: Clip;
  targetPlayer?: Player;
}

export const InviteDuoModal: React.FC<InviteDuoModalProps> = ({
  isOpen,
  onClose,
  targetClip,
  targetPlayer
}) => {
  const { customColor } = useAtmosphere();
  const [selectedGameMode, setSelectedGameMode] = useState('Ranqueada Competitiva');
  const [customMessage, setCustomMessage] = useState(
    'Vi seus highlights no We Space e gostei muito da sua comunicação e frieza nos clutches! Bora jogar duo hoje?'
  );
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const targetName = targetPlayer?.username || targetClip?.author.username || 'Jogador';
  const targetAvatar = targetPlayer?.avatar || targetClip?.author.avatar || '';
  const targetRank = targetPlayer?.ranks[0]?.rankName || targetClip?.author.rank || '';
  const targetRep = targetPlayer?.reputationScore || targetClip?.author.reputationScore || 98;

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playTactileClick();
    setIsSent(true);
    soundFx.playClutchFanfare();

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: [customColor, '#3b82f6', '#ffffff']
    });

    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1800);
  };

  const isLight = isLightColor(customColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <img
              src={targetAvatar}
              alt={targetName}
              className="h-11 w-11 rounded-xl object-cover border border-zinc-700"
            />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Convidar {targetName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="font-semibold" style={{ color: customColor }}>{targetRank}</span>
                <span>•</span>
                <span className="font-mono text-zinc-300">{targetRep}% Reputação</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSent ? (
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
            <h4 className="text-lg font-bold text-white">Convite Enviado com Sucesso!</h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              {targetName} recebeu seu convite com o selo de perfil verificado do We Space.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Modo de Jogo / Objetivo</label>
              <select
                value={selectedGameMode}
                onChange={(e) => setSelectedGameMode(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:outline-none"
              >
                <option value="Ranqueada Competitiva">Ranqueada Competitiva (Grind de ELO)</option>
                <option value="Torneio / Seletiva de Time">Torneio / Seletiva de Time</option>
                <option value="Partida Treino / Scrim">Partida Treino / Scrim</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Mensagem Direta com seus IDs</label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:outline-none"
                placeholder="Escreva sua mensagem..."
              />
            </div>

            <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 p-3 text-xs text-zinc-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0" style={{ color: customColor }} />
              <span>Seus dados de telemetria e score de reputação serão exibidos no convite.</span>
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md"
                style={{
                  backgroundColor: customColor,
                  color: isLight ? '#09090b' : '#09090b',
                  boxShadow: `0 4px 14px ${getRgba(customColor, 0.3)}`
                }}
              >
                <Send className="h-4 w-4" />
                <span>Enviar Convite de Duo</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
