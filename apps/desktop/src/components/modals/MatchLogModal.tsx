import React from 'react';
import { X, ShieldCheck, Activity, Radio, FileText, CheckCircle2, Server, Cpu, Database } from 'lucide-react';
import { Clip } from '../../types';
import { useAtmosphere, getRgba } from '../../context/ThemeAtmosphereContext';

interface MatchLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: Clip | null;
}

export const MatchLogModal: React.FC<MatchLogModalProps> = ({
  isOpen,
  onClose,
  clip
}) => {
  const { customColor } = useAtmosphere();
  if (!isOpen || !clip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div 
              className="flex h-9 w-9 items-center justify-center rounded-lg border"
              style={{
                backgroundColor: getRgba(customColor, 0.12),
                borderColor: getRgba(customColor, 0.35),
                color: customColor
              }}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Auditoria de Telemetria & Match Log
              </h3>
              <span className="text-xs font-mono" style={{ color: customColor }}>
                Match ID: {clip.telemetry.matchId}
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

        {/* Audit Report Container */}
        <div className="space-y-4 text-xs font-mono">
          
          {/* Status Badge */}
          <div 
            className="rounded-lg border p-3 flex items-center justify-between"
            style={{
              backgroundColor: getRgba(customColor, 0.08),
              borderColor: getRgba(customColor, 0.3)
            }}
          >
            <div className="flex items-center gap-2 font-bold" style={{ color: customColor }}>
              <CheckCircle2 className="h-4 w-4" />
              <span>Log de Partida Oficial Autenticado</span>
            </div>
            <span className="text-[11px] text-zinc-400">{clip.telemetry.verifiedAt}</span>
          </div>

          {/* Telemetry Matrix */}
          <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <div>
              <span className="text-zinc-500 block">Jogo & Mapa:</span>
              <span className="text-zinc-200 font-semibold">{clip.game} ({clip.map})</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Modo:</span>
              <span className="text-zinc-200 font-semibold">{clip.telemetry.mode}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Contexto de Round:</span>
              <span className="text-zinc-200 font-semibold">{clip.telemetry.roundScore}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Impact Score:</span>
              <span className="font-bold" style={{ color: customColor }}>{clip.telemetry.impactScore}/100</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Vida / HP Final:</span>
              <span className="text-zinc-200 font-semibold">{clip.telemetry.hpLeft} HP</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Latência / Servidor:</span>
              <span className="text-zinc-200 font-semibold">{clip.telemetry.serverPing}</span>
            </div>
          </div>

          {/* Engine & Cryptographic Signature */}
          <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2 text-zinc-400">
              <Cpu className="h-3.5 w-3.5" style={{ color: customColor }} />
              <span>Engine de Validação: {clip.telemetry.verifiedEngineVersion}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Database className="h-3.5 w-3.5" style={{ color: customColor }} />
              <span className="truncate">Hash de Assinatura: SHA256-WE-{clip.id}-VAL-PROVED</span>
            </div>
          </div>

          {/* Voice Comms Analysis */}
          <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="font-semibold flex items-center gap-1.5" style={{ color: customColor }}>
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Áudio de Chamada ({clip.voiceComms.speakerName})
              </span>
              <span className="text-zinc-400">Índice: {clip.voiceComms.callClarityScore}%</span>
            </div>
            <p className="text-zinc-300 italic">
              "{clip.voiceComms.transcript}"
            </p>
          </div>

        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Fechar Auditoria
          </button>
        </div>

      </div>
    </div>
  );
};
