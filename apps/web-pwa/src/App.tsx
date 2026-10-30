import React from 'react';
import { ShieldCheck, Video, Users, Download } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <header className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-slate-900/60 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20">
            W
          </div>
          <span className="font-extrabold tracking-wider text-xl bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
            WE SPACE
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Web & PWA
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/Pinguins-Imperadores/We-Space"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/30"
          >
            <Download className="w-4 h-4" />
            Baixar Cliente Desktop
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          Clipes Verificados por Telemetria & Anti-Tilt
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight max-w-3xl leading-tight">
          Jogue com quem presta.{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Comprove como você joga.
          </span>
        </h1>
        
        <p className="mt-6 text-slate-400 text-lg max-w-2xl">
          Plataforma gamer híbrida de recrutamento competitivo com gravação automática local (Auto-Clipper) e pontuação comportamental real (Karma Engine).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 transition-colors">
            <Video className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">Auto-Clipper In-Process</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Captura nativa via Windows Graphics Capture e Ring Buffer de GOPs na VRAM. Zero queda de FPS e 100% indetectável por anti-cheats.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/40 transition-colors">
            <Users className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">Matchmaking LFG Inteligente</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Encontre duplas e times 5-stack por compatibilidade de elo, horários e estilo de comunicação: call limpa, foco e zero tilt.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="font-bold text-lg mb-2">Reputação e Karma</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sistema anti-brigading com decaimento exponencial de reincidência de par e validação esteganográfica nos clipes gerados.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/60 py-6 px-6 text-center text-xs text-slate-500">
        We Space © 2026 — Projeto Integrador SENAC InnovaDay.
      </footer>
    </div>
  );
}
