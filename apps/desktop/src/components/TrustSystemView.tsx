import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Flame, 
  Activity, 
  Zap, 
  Radio, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  Users, 
  FileCode2,
  Lock,
  Star
} from 'lucide-react';

export const TrustSystemView: React.FC = () => {
  const [testMatches, setTestMatches] = useState(35);
  const [tiltReports, setTiltReports] = useState(0);
  const [cleanCommsRating, setCleanCommsRating] = useState(96);
  const [endorsements, setEndorsements] = useState(28);

  // Reputation simulator calculation
  const calculatedScore = Math.min(
    100,
    Math.max(
      20,
      Math.round(
        (testMatches * 0.8) +
        (cleanCommsRating * 0.4) +
        (endorsements * 0.8) -
        (tiltReports * 25)
      )
    )
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 md:p-8">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
            <ShieldCheck className="h-4 w-4" />
            <span>Arquitetura de Confiança We Space</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            "Jogue com quem presta, mostre como você joga."
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Eliminamos a toxicidade e as falsas promessas substituindo caixas de texto subjetivas por logs criptografados de partida, análise de áudio em tempo real e reputação construída por provas em vídeo.
          </p>
        </div>
      </div>

      {/* 3 Core Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pillar 1 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Highlights Reais & Telemetria</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Em vez de confiar em números soltos ou autodescrições ("sou calmo e jogo recuado"), o perfil do jogador exibe automaticamente clipes curtos de seus melhores momentos e sua comunicação em jogo.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Logs de Round 100% Auditados</span>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Clipper Alimentado por Eventos</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            O software captura a jogada e a vincula diretamente ao log daquela partida, comprovando o contexto do clipe (ex: clutch 1v3 no round decisivo contra o time adversário).
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Selo Imutável de Partida</span>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Reputação & Destaque Comunitário</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Jogadores bem avaliados por comportamento, call limpa e resiliência mental ganham destaque no feed interno para recrutamento prioritário de duos e times competitivos.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Zero Toxicidade & Fair Play</span>
          </div>
        </div>

      </div>

      {/* Interactive Simulator: How the Trust Score Works */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-400" />
              Simulador do Índice de Reputação We Space
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Ajuste os parâmetros para entender como o algoritmo avalia o histórico comportamental e as jogadas autenticadas.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-zinc-950 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-mono">
            <span className="text-xs text-zinc-400">Score Calculado:</span>
            <span className="text-xl font-extrabold text-emerald-400">{calculatedScore}/100</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-zinc-300">Partidas Logadas:</span>
              <span className="text-emerald-400 font-mono">{testMatches}</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={testMatches}
              onChange={(e) => setTestMatches(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <span className="text-[10px] text-zinc-500 block">Valida consistência em jogo</span>
          </div>

          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-zinc-300">Índice de Call Limpa:</span>
              <span className="text-emerald-400 font-mono">{cleanCommsRating}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="100"
              value={cleanCommsRating}
              onChange={(e) => setCleanCommsRating(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <span className="text-[10px] text-zinc-500 block">Baseado em áudios de clipes</span>
          </div>

          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-zinc-300">Endossos de Duos:</span>
              <span className="text-emerald-400 font-mono">{endorsements}</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={endorsements}
              onChange={(e) => setEndorsements(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <span className="text-[10px] text-zinc-500 block">Companheiros pós-partida</span>
          </div>

          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-zinc-300">Relatórios de Tilt / Rage:</span>
              <span className="text-red-400 font-mono">{tiltReports}</span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              value={tiltReports}
              onChange={(e) => setTiltReports(Number(e.target.value))}
              className="w-full accent-red-500"
            />
            <span className="text-[10px] text-zinc-500 block">Impacto negativo severo</span>
          </div>

        </div>
      </div>

    </div>
  );
};
