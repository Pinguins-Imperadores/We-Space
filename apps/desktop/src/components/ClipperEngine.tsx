import React, { useState } from 'react';
import { 
  Video, 
  Sparkles, 
  Activity, 
  ShieldCheck, 
  Radio, 
  Play, 
  Pause, 
  Check, 
  Clock, 
  Crosshair, 
  Volume2, 
  Layers, 
  Share2, 
  UploadCloud,
  FileCheck2,
  RefreshCw,
  Sliders,
  Flame,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { OngoingMatchLog, GameType, MatchEvent, Clip } from '../types';
import { useAtmosphere, getRgba, isLightColor } from '../context/ThemeAtmosphereContext';
import { soundFx } from '../utils/soundEngine';

interface ClipperEngineProps {
  matchLogs: OngoingMatchLog[];
  onPublishClip: (newClip: Clip) => void;
  currentUser: {
    id: string;
    username: string;
    handle: string;
    avatar: string;
    rank: string;
    reputationScore: number;
  };
}

export const ClipperEngine: React.FC<ClipperEngineProps> = ({
  matchLogs,
  onPublishClip,
  currentUser
}) => {
  const { customColor } = useAtmosphere();
  const [selectedGame, setSelectedGame] = useState<GameType>('Valorant');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string>('evt-2');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clipTitle, setClipTitle] = useState('Clutch 1v2 no Round 12 com Desarme em 0.3s');
  const [clipDescription, setClipDescription] = useState('Situação pós-plant no Bomb A da Lotus. Fake defuse coordenado e mira afiada no retake.');
  const [includeVoiceComms, setIncludeVoiceComms] = useState(true);
  const [voiceClarityRating, setVoiceClarityRating] = useState(98);
  const [voiceSpeakerTranscript, setVoiceSpeakerTranscript] = useState('"Um na árvore e outro na quebra. Fakei defuse... matei o primeiro. O segundo abriu e caiu também. Spikando!"');
  const [leadTimeSec, setLeadTimeSec] = useState(8);
  const [tailTimeSec, setTailTimeSec] = useState(4);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const currentMatch = matchLogs[activeMatchIndex] || matchLogs[0];
  const selectedEvent = currentMatch.events.find(e => e.id === selectedEventId) || currentMatch.events[0];

  const handleSelectEvent = (event: MatchEvent) => {
    soundFx.playTactileClick();
    setSelectedEventId(event.id);
    setClipTitle(`${event.title} - Round ${event.round}`);
    setClipDescription(event.description);
    setPublishedSuccess(false);
  };

  const handlePublishHighlight = () => {
    soundFx.playTactileClick();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setPublishedSuccess(true);
      soundFx.playClutchFanfare();

      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: [customColor, '#3b82f6', '#fbbf24']
      });

      const newClip: Clip = {
        id: `clip-generated-${Date.now()}`,
        title: clipTitle,
        description: clipDescription,
        game: currentMatch.game,
        map: currentMatch.map,
        agentOrHero: selectedGame === 'Valorant' ? 'Omen' : selectedGame === 'CS2' ? 'Entry Fragger' : 'Lee Sin',
        videoType: 'simulated',
        videoUrl: selectedEvent?.videoSnippet || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        previewColor: '#09090b',
        durationSeconds: leadTimeSec + tailTimeSec + 12,
        author: {
          id: currentUser.id,
          username: currentUser.username,
          handle: currentUser.handle,
          avatar: currentUser.avatar,
          rank: currentUser.rank,
          reputationScore: currentUser.reputationScore,
          badge: 'Clipper Verificado',
          isPro: false,
        },
        telemetry: {
          matchId: currentMatch.matchId,
          game: currentMatch.game,
          date: currentMatch.date,
          mode: currentMatch.gameMode,
          map: currentMatch.map,
          agentOrHero: selectedGame === 'Valorant' ? 'Omen' : 'Rifler',
          roundScore: `Round ${selectedEvent?.round || 12}`,
          roundContext: selectedEvent?.title || 'Jogada Decisiva',
          situation: selectedEvent?.description || 'Duelo Verificado',
          impactScore: selectedEvent?.impactScore || 95,
          headshotPercentage: 85,
          hpLeft: selectedEvent?.hpLeft || 24,
          weapons: selectedEvent?.weapons || ['Vandal'],
          utilityUsed: ['Flash Tática', 'Smoke de Cobertura'],
          serverPing: '12ms (São Paulo)',
          verifiedAt: new Date().toISOString(),
          verifiedEngineVersion: 'WeSpace-Engine v4.2.1 [Auto-Clipped]'
        },
        voiceComms: {
          hasAudio: includeVoiceComms,
          transcript: voiceSpeakerTranscript,
          callClarityScore: voiceClarityRating,
          tiltLevel: 'Zero Tilt',
          speakerName: currentUser.username.split(' ')[0],
          waveform: [30, 50, 75, 90, 100, 85, 60, 45, 70, 95, 80, 60, 40, 65, 85, 95, 70, 40, 20, 10]
        },
        tags: [currentMatch.game, currentMatch.map, selectedEvent?.eventType || 'Clutch', 'Telemetria Verificada'],
        endorsements: 1,
        recruitsCount: 0,
        sharesCount: 0,
        commentsCount: 0,
        createdAt: 'Agora mesmo',
        isFeatured: true
      };

      onPublishClip(newClip);
    }, 1200);
  };

  const isLight = isLightColor(customColor);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="rounded-2xl border border-zinc-800/90 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-950 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div 
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono"
              style={{ color: customColor }}
            >
              <Sparkles className="h-4 w-4" />
              <span>We Space Clipper Engine • Telemetria em Tempo Real</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Clipper Alimentado por Eventos da Partida
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              O We Space captura automaticamente os momentos de alto impacto diretamente dos logs oficiais do jogo. 
              Ao publicar, seu clipe recebe o selo de autenticidade criptografado com o contexto exato do round e análise de comunicação.
            </p>
          </div>

          {/* Game Integration Status Card */}
          <div 
            className="flex flex-col gap-2 rounded-xl bg-zinc-950 border p-4 shrink-0 font-mono text-xs"
            style={{ borderColor: getRgba(customColor, 0.3) }}
          >
            <div className="flex items-center justify-between text-zinc-400 gap-4">
              <span>Status do Hook:</span>
              <span className="flex items-center gap-1.5 font-bold" style={{ color: customColor }}>
                <span 
                  className="h-2 w-2 rounded-full animate-ping"
                  style={{ backgroundColor: customColor }}
                />
                CONECTADO & MONITORANDO
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400 gap-4">
              <span>Taxa de Polling:</span>
              <span className="text-zinc-200">120 Hz (Event Hook API)</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400 gap-4">
              <span>Buffer de Replay:</span>
              <span style={{ color: customColor }}>Ativo (Últimos 120s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Clipper Workspace: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Match selection & Timeline Events (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Match Log Header */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4" style={{ color: customColor }} />
                Partidas Recentes com Telemetria
              </h2>
              <span className="text-[11px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                2 Partidas Prontas
              </span>
            </div>

            {/* Match selector cards */}
            <div className="space-y-2">
              {matchLogs.map((m, idx) => {
                const isSelected = activeMatchIndex === idx;
                return (
                  <div
                    key={m.matchId}
                    onClick={() => {
                      soundFx.playTactileClick();
                      setActiveMatchIndex(idx);
                      setSelectedEventId(m.events[0]?.id || '');
                      setPublishedSuccess(false);
                    }}
                    className={`cursor-pointer rounded-lg border p-3 transition-all ${
                      isSelected
                        ? 'text-white'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                    style={{
                      backgroundColor: isSelected ? getRgba(customColor, 0.12) : undefined,
                      borderColor: isSelected ? getRgba(customColor, 0.5) : undefined
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color: customColor }}>{m.game}</span>
                        <span>•</span>
                        <span>{m.map}</span>
                      </div>
                      <span className="font-mono text-[11px] bg-zinc-800/80 px-1.5 py-0.2 rounded text-zinc-300">
                        {m.finalScore} ({m.result})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1 font-mono">
                      <span>ID: {m.matchId}</span>
                      <span>{m.events.length} Eventos Detectados</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline of Key Events in this Match */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  Momentos Detectados na Partida
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Selecione um evento para recortar e autenticar com telemetria
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {currentMatch.events.map((evt) => {
                const isSelected = selectedEventId === evt.id;
                return (
                  <div
                    key={evt.id}
                    onClick={() => handleSelectEvent(evt)}
                    className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                      isSelected
                        ? 'bg-zinc-950 text-white'
                        : 'border-zinc-800/80 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                    style={{
                      borderColor: isSelected ? customColor : undefined,
                      boxShadow: isSelected ? `0 0 12px ${getRgba(customColor, 0.2)}` : undefined
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          evt.eventType === 'Clutch' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                          evt.eventType === 'Eco Ace' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}>
                          {evt.eventType}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">Round {evt.round} ({evt.timestamp})</span>
                      </div>

                      <span className="text-xs font-mono font-bold flex items-center gap-1" style={{ color: customColor }}>
                        <Zap className="h-3 w-3" />
                        Impact: {evt.impactScore}/100
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-zinc-100 mt-2">{evt.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">{evt.description}</p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-2 pt-2 border-t border-zinc-800/60">
                      <span>HP: {evt.hpLeft} • Armas: {evt.weapons.join(', ')}</span>
                      <span className="font-semibold flex items-center gap-1" style={{ color: customColor }}>
                        <FileCheck2 className="h-3 w-3" />
                        Log Sincronizado
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Clip Editor, Voice Comms & Verification Engine (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Video Preview & Verification Overlay */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-2">
                <span 
                  className="h-2.5 w-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: customColor }}
                />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Editor de Telemetria e Highlight
                </span>
              </div>
              <span 
                className="text-xs font-mono border px-2 py-0.5 rounded"
                style={{
                  backgroundColor: getRgba(customColor, 0.12),
                  borderColor: getRgba(customColor, 0.3),
                  color: customColor
                }}
              >
                Selo WeSpace #{currentMatch.matchId.slice(-6)}
              </span>
            </div>

            {/* Video Preview Frame */}
            <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
              <img
                src={selectedEvent?.videoSnippet || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'}
                alt="Event Preview"
                className="h-full w-full object-cover opacity-85"
              />

              {/* Watermark & Telemetry Overlay Preview */}
              <div 
                className="absolute top-3 left-3 bg-zinc-950/90 backdrop-blur-md px-2.5 py-1 rounded border text-xs font-mono flex items-center gap-2"
                style={{
                  borderColor: getRgba(customColor, 0.4),
                  color: customColor
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Log Verificado: Round {selectedEvent?.round} ({selectedEvent?.title})</span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 bg-zinc-950/90 backdrop-blur-md p-3 rounded-lg border border-zinc-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="font-semibold flex items-center gap-1.5" style={{ color: customColor }}>
                    <Radio className="h-3.5 w-3.5 animate-pulse" />
                    Comunicação Gravada no Momento da Jogada:
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">Score de Clareza: {voiceClarityRating}%</span>
                </div>
                <p className="text-zinc-200 italic font-medium">
                  {voiceSpeakerTranscript}
                </p>
              </div>
            </div>

            {/* Clip Customization Form */}
            <div className="p-5 space-y-4 bg-zinc-950/40">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Título do Highlight Verificado</label>
                <input
                  type="text"
                  value={clipTitle}
                  onChange={(e) => setClipTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Descrição Tática & Contexto</label>
                <textarea
                  rows={2}
                  value={clipDescription}
                  onChange={(e) => setClipDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {/* Trimmer Sliders */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Buffer Pré-Jogada:</span>
                    <span className="font-bold" style={{ color: customColor }}>-{leadTimeSec}s</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={leadTimeSec}
                    onChange={(e) => setLeadTimeSec(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: customColor }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Buffer Pós-Jogada:</span>
                    <span className="font-bold" style={{ color: customColor }}>+{tailTimeSec}s</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={tailTimeSec}
                    onChange={(e) => setTailTimeSec(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: customColor }}
                  />
                </div>
              </div>

              {/* Voice Comms Toggle & Verification Setting */}
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="h-4 w-4" style={{ color: customColor }} />
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">Análise de Comunicação em Jogo</span>
                    <span className="text-[11px] text-zinc-400">Prova que você passa call limpa sem poluição sonora e sem toxicidade</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeVoiceComms}
                  onChange={(e) => setIncludeVoiceComms(e.target.checked)}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: customColor }}
                />
              </div>

              {/* Publish Action Button */}
              <div className="pt-2">
                <button
                  onClick={handlePublishHighlight}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition-all shadow-md active:scale-98"
                  style={{
                    backgroundColor: customColor,
                    color: isLight ? '#09090b' : '#09090b',
                    boxShadow: `0 4px 16px ${getRgba(customColor, 0.3)}`
                  }}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Gerando Certificado & Vinculando ao Log Oficial...</span>
                    </>
                  ) : publishedSuccess ? (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>Highlight Publicado no Feed com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="h-4 w-4" />
                      <span>Autenticar Jogada & Publicar no Feed do We Space</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
