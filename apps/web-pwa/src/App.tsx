import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Video, 
  Users, 
  Download, 
  Play, 
  Flame, 
  CheckCircle2, 
  X, 
  Bell, 
  Check, 
  Radio, 
  Sparkles,
  Award,
  ExternalLink
} from 'lucide-react';

interface VerifiedClip {
  id: string;
  title: string;
  game: 'Valorant' | 'CS2';
  author: string;
  avatar: string;
  rank: string;
  triggerScore: number;
  duration: string;
  fileSha256: string;
  thumbnailUrl: string;
}

interface LfgInvite {
  id: string;
  hostName: string;
  hostAvatar: string;
  game: 'Valorant' | 'CS2';
  title: string;
  roleNeeded: string;
  karma: number;
  mode: string;
  serverPing: string;
  accepted?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'clips' | 'radar' | 'invites'>('clips');
  const [selectedClip, setSelectedClip] = useState<VerifiedClip | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [invites, setInvites] = useState<LfgInvite[]>([
    {
      id: 'inv-1',
      hostName: 'valkyrie_fps',
      hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      game: 'Valorant',
      title: 'Rush Radiant sem Tilt • Falta 1 Iniciador',
      roleNeeded: 'Iniciador / Sova ou Fade',
      karma: 142.5,
      mode: 'Ranqueado 5-Stack',
      serverPing: '11ms (SP-01)'
    },
    {
      id: 'inv-2',
      hostName: 's1mple_mind',
      hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      game: 'CS2',
      title: 'Faceit Level 10 Grind • Call Limpa',
      roleNeeded: 'Rifler / Suporte',
      karma: 138.0,
      mode: 'Duo Ranqueado',
      serverPing: '14ms (SP-02)'
    }
  ]);

  const verifiedClipes: VerifiedClip[] = [
    {
      id: 'c-1',
      title: '1v4 Retake B Site • Clutch Limpo no Overtime',
      game: 'Valorant',
      author: 'valkyrie_fps',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      rank: 'Radiant #34',
      triggerScore: 96.4,
      duration: '0:42',
      fileSha256: 'e3b0c442...7852b855',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'
    },
    {
      id: 'c-2',
      title: 'Inferno Banana AWP 4K Entry sem Perder HP',
      game: 'CS2',
      author: 's1mple_mind',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      rank: 'Faceit Lvl 10',
      triggerScore: 98.8,
      duration: '0:35',
      fileSha256: 'f4c6e7a2...2c3d4e5f',
      thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800'
    },
    {
      id: 'c-3',
      title: 'Ascent Mid Retake • Smokes Perfeitas & Call Limpa',
      game: 'Valorant',
      author: 'astra_god',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      rank: 'Imortal 3',
      triggerScore: 91.2,
      duration: '0:38',
      fileSha256: 'a1b2c3d4...8e9f0a1b',
      thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'
    }
  ];

  const handleAcceptInvite = (id: string, hostName: string) => {
    setInvites((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, accepted: true } : inv))
    );
    showToast(`Convite de ${hostName} aceito! Conectando à sala de voz WebRTC...`);
  };

  const handleDeclineInvite = (id: string) => {
    setInvites((prev) => prev.filter((inv) => inv.id !== id));
    showToast('Convite recusado.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRequestPush = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        showToast('Notificações de convite ativadas com sucesso!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-20 sm:pb-0">
      
      {/* Top Mobile Bar */}
      <header className="border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between backdrop-blur-md bg-zinc-900/80 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center font-black text-sm text-black shadow-md shadow-indigo-500/30">
            W
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider text-white font-mono">
                WE SPACE
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">
                PWA
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">Matchmaking & Highlights</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRequestPush}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
            title="Ativar Notificações Web Push"
          >
            <Bell className="w-4 h-4" />
          </button>
          <a
            href="https://github.com/Pinguins-Imperadores/We-Space"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </a>
        </div>
      </header>

      {/* Interactive Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 p-3 rounded-xl bg-indigo-950/95 border border-indigo-500/50 shadow-2xl text-xs font-mono text-indigo-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Segmented Control Tabs */}
      <nav className="border-b border-zinc-800 bg-zinc-900/40 p-2 sticky top-[53px] z-30">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('clips')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'clips'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Clipes</span>
          </button>

          <button
            onClick={() => setActiveTab('radar')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'radar'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Radar</span>
          </button>

          <button
            onClick={() => setActiveTab('invites')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all relative ${
              activeTab === 'invites'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Convites</span>
            {invites.some((i) => !i.accepted) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-1.5 right-2" />
            )}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl mx-auto w-full p-4 space-y-4">
        
        {/* TAB 1: FEED DE CLIPES */}
        {activeTab === 'clips' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Feed de Clipes Verificados</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Telemetria GPU Ativa
              </span>
            </div>

            {verifiedClipes.map((clip) => (
              <div
                key={clip.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 overflow-hidden shadow-lg space-y-3"
              >
                {/* Thumbnail / Video Preview */}
                <div 
                  onClick={() => setSelectedClip(clip)}
                  className="relative aspect-video bg-black cursor-pointer group"
                >
                  <img
                    src={clip.thumbnailUrl}
                    alt={clip.title}
                    className="w-full h-full object-cover opacity-85 group-hover:scale-102 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3 justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 border border-zinc-700 text-white">
                      {clip.duration}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Score {clip.triggerScore}%
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-3.5 pt-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                        {clip.game}
                      </span>
                      <h3 className="font-bold text-sm text-zinc-100 leading-tight">
                        {clip.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <img src={clip.avatar} alt={clip.author} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-zinc-300 font-medium">@{clip.author}</span>
                      <span className="text-zinc-500 text-[10px]">({clip.rank})</span>
                    </div>

                    <span className="text-[10px] text-zinc-500 truncate max-w-[120px]" title={clip.fileSha256}>
                      SHA: {clip.fileSha256}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: RADAR DE REPUTAÇÃO E KARMA */}
        {activeTab === 'radar' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-white">DNA Competitivo & Radar Karma</h3>
                  <p className="text-xs text-zinc-400 font-mono">Índice anti-tilt e métricas comportamentais</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400 font-mono">142.5</span>
                  <span className="block text-[10px] font-mono text-zinc-500">/ 200 Karma Max</span>
                </div>
              </div>

              {/* Pentagonal Radar Simulation via SVG */}
              <div className="flex justify-center py-4">
                <svg width="240" height="240" viewBox="0 0 240 240" className="overflow-visible">
                  {/* Background grid concentric polygons */}
                  <polygon points="120,30 205,92 173,190 67,190 35,92" fill="none" stroke="#27272a" strokeWidth="1" />
                  <polygon points="120,60 178,102 155,170 85,170 62,102" fill="none" stroke="#27272a" strokeWidth="1" />
                  <polygon points="120,90 149,111 138,145 102,145 91,111" fill="none" stroke="#27272a" strokeWidth="1" />

                  {/* Axis lines */}
                  <line x1="120" y1="120" x2="120" y2="30" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="120" y1="120" x2="205" y2="92" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="120" y1="120" x2="173" y2="190" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="120" y1="120" x2="67" y2="190" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="120" y1="120" x2="35" y2="92" stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />

                  {/* User Stats Polygon */}
                  <polygon
                    points="120,38 198,96 165,182 72,184 42,98"
                    fill="rgba(99, 102, 241, 0.25)"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                  />

                  {/* Labels */}
                  <text x="120" y="20" textAnchor="middle" fill="#e4e4e7" fontSize="10" fontFamily="monospace" fontWeight="bold">MECÂNICA (94)</text>
                  <text x="215" y="94" textAnchor="start" fill="#e4e4e7" fontSize="10" fontFamily="monospace" fontWeight="bold">COMMS (98)</text>
                  <text x="180" y="205" textAnchor="start" fill="#e4e4e7" fontSize="10" fontFamily="monospace" fontWeight="bold">RESILIÊNCIA (92)</text>
                  <text x="60" y="205" textAnchor="end" fill="#e4e4e7" fontSize="10" fontFamily="monospace" fontWeight="bold">GAMESENSE (95)</text>
                  <text x="25" y="94" textAnchor="end" fill="#e4e4e7" fontSize="10" fontFamily="monospace" fontWeight="bold">LIDERANÇA (96)</text>
                </svg>
              </div>

              {/* Badges List */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-[11px] font-mono text-zinc-400 block uppercase">Medalhas Verificadas:</span>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 font-bold">
                    <Award className="w-3.5 h-3.5" /> Call Limpa
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center gap-1.5 font-bold">
                    <Award className="w-3.5 h-3.5" /> Zero Tilt (48 Jogos)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center gap-1.5 font-bold">
                    <Award className="w-3.5 h-3.5" /> IGL Sólido
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONVITES LFG */}
        {activeTab === 'invites' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Convites de Sala Recebidos</span>
              <span className="text-emerald-400 font-bold">{invites.filter(i => !i.accepted).length} Pendentes</span>
            </div>

            {invites.map((inv) => (
              <div
                key={inv.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={inv.hostAvatar} alt={inv.hostName} className="w-10 h-10 rounded-xl object-cover border border-zinc-700" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{inv.hostName}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{inv.game}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {inv.karma}% Karma Host
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    {inv.serverPing}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-zinc-200">{inv.title}</h4>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono text-zinc-400">
                    <span>Modo: <strong className="text-zinc-200">{inv.mode}</strong></span>
                    <span>•</span>
                    <span>Vaga: <strong className="text-indigo-400">{inv.roleNeeded}</strong></span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  {inv.accepted ? (
                    <div className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center gap-2">
                      <Radio className="w-4 h-4 animate-pulse" />
                      <span>Conectado à Call de Voz WebRTC</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDeclineInvite(inv.id)}
                        className="flex-1 py-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white font-mono text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={() => handleAcceptInvite(inv.id, inv.hostName)}
                        className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aceitar Convite</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Video Preview Modal */}
      {selectedClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">
                  {selectedClip.game}
                </span>
                <span className="font-bold text-xs text-white truncate max-w-[260px]">
                  {selectedClip.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedClip(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800">
              <img
                src={selectedClip.thumbnailUrl}
                alt={selectedClip.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/40">
                  <Play className="w-8 h-8 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-1">
              <span>Autor: @{selectedClip.author}</span>
              <span className="text-emerald-400 font-bold">Trigger Score: {selectedClip.triggerScore}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Footer */}
      <footer className="border-t border-zinc-800/60 py-4 px-4 text-center text-[11px] font-mono text-zinc-500">
        We Space PWA © 2026 — Projeto Integrador SENAC InnovaDay
      </footer>
    </div>
  );
}
