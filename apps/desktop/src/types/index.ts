export type GameType = 'Valorant' | 'CS2' | 'League of Legends' | 'Apex Legends' | 'Rainbow Six';

export interface MatchTelemetry {
  matchId: string;
  game: GameType;
  date: string;
  mode: string;
  map: string;
  agentOrHero: string;
  roundScore: string;
  roundContext: string;
  situation: string;
  impactScore: number; // 0 to 100
  headshotPercentage?: number;
  hpLeft: number;
  weapons: string[];
  utilityUsed: string[];
  serverPing: string;
  verifiedAt: string;
  verifiedEngineVersion: string;
}

export interface VoiceCommsData {
  hasAudio: boolean;
  transcript: string;
  callClarityScore: number; // 0-100
  tiltLevel: 'Zero Tilt' | 'Calmo' | 'Focado';
  speakerName: string;
  waveform: number[];
}

export interface Clip {
  id: string;
  title: string;
  description: string;
  game: GameType;
  map: string;
  agentOrHero: string;
  videoType: 'simulated' | 'video';
  videoUrl: string;
  previewColor: string;
  durationSeconds: number;
  author: {
    id: string;
    username: string;
    handle: string;
    avatar: string;
    rank: string;
    reputationScore: number;
    badge: string;
    isPro: boolean;
  };
  telemetry: MatchTelemetry;
  voiceComms: VoiceCommsData;
  tags: string[];
  endorsements: number; // "Jogou Muito / Verificado"
  recruitsCount: number;
  sharesCount: number;
  commentsCount: number;
  createdAt: string;
  isFeatured?: boolean;
}

export interface PlayerReview {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRank: string;
  matchContext: string;
  date: string;
  rating: number; // 1 to 5
  tags: string[];
  comment: string;
  verifiedMatchId: string;
}

export interface Player {
  id: string;
  username: string;
  handle: string;
  avatar: string;
  banner: string;
  primaryGame: GameType;
  secondaryGame?: GameType;
  ranks: {
    game: GameType;
    rankName: string;
    tierIcon: string;
    eloOrLevel: string;
  }[];
  mainRoles: string[];
  mainAgentsOrHeroes: string[];
  bio: string;
  location: string;
  languages: string[];
  reputationScore: number; // 0 - 100
  reputationTier: 'Impecável' | 'Exemplar' | 'Confiável' | 'Em Análise';
  verifiedBadges: string[];
  stats: {
    kd: number;
    winRate: number;
    hsRate: number;
    matchesLogged: number;
    endorsementsReceived: number;
    tiltFreeMatches: number;
  };
  radarScores: {
    mental: number;
    communication: number;
    tacticalIQ: number;
    clutch: number;
    teamwork: number;
  };
  voiceCommsSnippet: {
    title: string;
    duration: string;
    clarityScore: number;
    transcript: string;
  };
  clips: Clip[];
  reviews: PlayerReview[];
  availability: {
    status: 'Buscando Duo' | 'Buscando Time' | 'Aberto a Convites' | 'Ocupado';
    schedule: string;
    playstyle: string;
    micRequirement: 'Mic Obrigatório (Call Limpa)' | 'Opcional';
  };
  socials: {
    discord: string;
    riotOrSteam: string;
    twitch?: string;
  };
}

export interface MatchEvent {
  id: string;
  timestamp: string;
  round: number;
  eventType: 'Clutch' | 'Multi-Kill' | 'Eco Ace' | 'Entry Frag' | 'Retake Defuse' | 'Clean Callout';
  title: string;
  description: string;
  impactScore: number;
  hpLeft: number;
  weapons: string[];
  isCaptured: boolean;
  videoSnippet: string;
}

export interface OngoingMatchLog {
  matchId: string;
  game: GameType;
  map: string;
  gameMode: string;
  date: string;
  finalScore: string;
  result: 'Vitória' | 'Derrota';
  events: MatchEvent[];
}
