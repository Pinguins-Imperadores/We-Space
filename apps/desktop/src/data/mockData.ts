import { Player, Clip, OngoingMatchLog } from '../types';

export const INITIAL_CLIPS: Clip[] = [
  {
    id: 'clip-1',
    title: 'Clutch 1v3 no Round Decisivo (11x12) + Call de Foco Fria',
    description: 'Round do match point. Mantive a calma com 14 de vida, gastei a smoke para isolar o CT e fiz a troca de mira perfeita enquanto orientava a equipe no defuse.',
    game: 'Valorant',
    map: 'Ascent',
    agentOrHero: 'Omen',
    videoType: 'simulated',
    videoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    previewColor: '#1e1b4b',
    durationSeconds: 28,
    author: {
      id: 'player-1',
      username: 'Vitor "Kailo" Silva',
      handle: 'kailofps',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=250&q=80',
      rank: 'Radiant #340',
      reputationScore: 98,
      badge: 'Zero Tilt & IGL',
      isPro: true,
    },
    telemetry: {
      matchId: 'VAL-BR-2026-89421',
      game: 'Valorant',
      date: 'Hoje, 15:42',
      mode: 'Competitivo Ranqueado (Top 500)',
      map: 'Ascent',
      agentOrHero: 'Omen',
      roundScore: '11 x 12 (Match Point)',
      roundContext: 'Situação 1v3 Pós-Plante Bomb A',
      situation: 'Clutch 1v3 com 14 HP restantes',
      impactScore: 99,
      headshotPercentage: 100,
      hpLeft: 14,
      weapons: ['Vandal Prime', 'Ghost'],
      utilityUsed: ['Paranoia (Cegou 2)', 'Dark Cover (Isolou CT)'],
      serverPing: '11ms (SP-01)',
      verifiedAt: '2026-08-21 15:43:10 BRT',
      verifiedEngineVersion: 'WeSpace-Engine v4.2.1 [CRC-Verified]'
    },
    voiceComms: {
      hasAudio: true,
      transcript: '"Fica em silêncio rapaziada, escutei passo no CT. Joguei flash na árvore... pegou um. Sobraram dois no céu e bomb. Um caiu, vou fake defuse. Ganhamo, ganhamo!"',
      callClarityScore: 98,
      tiltLevel: 'Zero Tilt',
      speakerName: 'Kailo (IGL)',
      waveform: [20, 35, 45, 80, 65, 40, 90, 100, 85, 45, 30, 70, 95, 60, 25, 40, 50, 75, 90, 30]
    },
    tags: ['Clutch 1v3', 'Radiant', 'Call Fria', 'Omen', 'Ascent'],
    endorsements: 142,
    recruitsCount: 19,
    sharesCount: 38,
    commentsCount: 24,
    createdAt: 'Há 2 horas',
    isFeatured: true,
  },
  {
    id: 'clip-2',
    title: 'Entrada T com Retake Rápido e Flash Perfeita na Mirage',
    description: 'Execução tática coordenada no Bomb A. Duas kills de entrada limpas sem poluição sonora no voice.',
    game: 'CS2',
    map: 'Mirage',
    agentOrHero: 'Entry Fragger',
    videoType: 'simulated',
    videoUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    previewColor: '#1c1917',
    durationSeconds: 22,
    author: {
      id: 'player-2',
      username: 'Camila "Valkyria"',
      handle: 'valk_cs',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      rank: 'Faceit Level 10 (2480 ELO)',
      reputationScore: 96,
      badge: 'Entry Consistente',
      isPro: false,
    },
    telemetry: {
      matchId: 'CS2-FACEIT-77391',
      game: 'CS2',
      date: 'Ontem, 21:15',
      mode: 'Faceit Premium 5v5',
      map: 'Mirage',
      agentOrHero: 'Entry / Rifler',
      roundScore: '14 x 13',
      roundContext: 'Execução Bomb A Contra 3 AWPs',
      situation: 'First Blood + Trade Instantâneo',
      impactScore: 94,
      headshotPercentage: 88,
      hpLeft: 68,
      weapons: ['AK-47 Asiimov', 'Smoke Granade'],
      utilityUsed: ['Flashbang Palácio', 'Molotov Cabana'],
      serverPing: '14ms',
      verifiedAt: '2026-08-20 21:16:04 BRT',
      verifiedEngineVersion: 'WeSpace-Engine v4.2.1 [CRC-Verified]'
    },
    voiceComms: {
      hasAudio: true,
      transcript: '"Smoke cabana caíndo em 3... 2... 1. Abri no sanduíche, matei um. Outro no ninja no chão. Bomb livre, pode plantar default."',
      callClarityScore: 96,
      tiltLevel: 'Calmo',
      speakerName: 'Valkyria',
      waveform: [15, 40, 60, 75, 85, 90, 70, 45, 60, 85, 95, 70, 30, 20, 50, 80, 60, 40, 20, 10]
    },
    tags: ['CS2', 'Faceit Lvl 10', 'Entry Fragger', 'Mirage', 'AK-47'],
    endorsements: 98,
    recruitsCount: 14,
    sharesCount: 22,
    commentsCount: 18,
    createdAt: 'Há 18 horas',
    isFeatured: true,
  },
  {
    id: 'clip-3',
    title: 'Roubo de Barão 1v4 + Teamfight Decisiva no Grandmaster',
    description: 'Entrei no pit sem smite de vantagem, stunei o jungler inimigo no milissegundo certo e virei a partida na call de avanço pela mid lane.',
    game: 'League of Legends',
    map: 'Summoner\'s Rift',
    agentOrHero: 'Lee Sin',
    videoType: 'simulated',
    videoUrl: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=80',
    previewColor: '#1e3a8a',
    durationSeconds: 32,
    author: {
      id: 'player-3',
      username: 'Lucas "Phantom"',
      handle: 'phantom_jg',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      rank: 'Grão-Mestre 480 LP',
      reputationScore: 95,
      badge: 'Visão de Jogo & Macro',
      isPro: true,
    },
    telemetry: {
      matchId: 'LOL-BR-994102',
      game: 'League of Legends',
      date: 'Hoje, 11:20',
      mode: 'Ranqueada Solo/Duo',
      map: 'Summoner\'s Rift',
      agentOrHero: 'Lee Sin (Jungle)',
      roundScore: '32m 14s (Desvantagem 4k Ouro)',
      roundContext: 'Contestação de Barão Nashor 50/50',
      situation: 'Baron Steal + Insec no ADC adversário',
      impactScore: 97,
      hpLeft: 120,
      weapons: ['Eclipse', 'Cutelo Negro'],
      utilityUsed: ['Flash', 'Smite (1200 Dano)', 'Ward Jump'],
      serverPing: '9ms',
      verifiedAt: '2026-08-21 11:54:12 BRT',
      verifiedEngineVersion: 'WeSpace-Engine v4.2.1 [CRC-Verified]'
    },
    voiceComms: {
      hasAudio: true,
      transcript: '"Eles tão com dano rápido no Barão! Segura a entrada mid, eu vou entrar com Q Ward-jump. Smitei! É nosso! Vira no Ezreal que tá sem Flash agora!"',
      callClarityScore: 94,
      tiltLevel: 'Focado',
      speakerName: 'Phantom',
      waveform: [30, 50, 70, 85, 95, 100, 95, 80, 60, 85, 100, 90, 75, 60, 45, 70, 85, 60, 30, 15]
    },
    tags: ['League of Legends', 'Baron Steal', 'Lee Sin', 'Macro Play', 'Grão-Mestre'],
    endorsements: 167,
    recruitsCount: 28,
    sharesCount: 45,
    commentsCount: 31,
    createdAt: 'Há 5 horas',
    isFeatured: true,
  },
  {
    id: 'clip-4',
    title: 'Defesa de Ponto 2v4 com Sova Dart e Wallbang Perfeito',
    description: 'Lineup milimétrico no pós-plant. Comunicação limpa com o duo enquanto o spike apitava no limite.',
    game: 'Valorant',
    map: 'Haven',
    agentOrHero: 'Sova',
    videoType: 'simulated',
    videoUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    previewColor: '#064e3b',
    durationSeconds: 26,
    author: {
      id: 'player-4',
      username: 'Rafaela "Nyx"',
      handle: 'nyx_sova',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
      rank: 'Imortal 3 (310 RR)',
      reputationScore: 99,
      badge: 'Lineup Queen & Calm Comms',
      isPro: false,
    },
    telemetry: {
      matchId: 'VAL-BR-2026-44109',
      game: 'Valorant',
      date: 'Hoje, 13:10',
      mode: 'Competitivo 5v5',
      map: 'Haven',
      agentOrHero: 'Sova',
      roundScore: '12 x 12 (Prorrogação)',
      roundContext: 'Pós-plante no Bomb C Haven',
      situation: '2v4 Retake Defense',
      impactScore: 96,
      headshotPercentage: 75,
      hpLeft: 85,
      weapons: ['Odin', 'Shock Darts'],
      utilityUsed: ['Recon Bolt Garagem', 'Hunter\'s Fury Ult (2 Kills)'],
      serverPing: '15ms',
      verifiedAt: '2026-08-21 13:42:00 BRT',
      verifiedEngineVersion: 'WeSpace-Engine v4.2.1 [CRC-Verified]'
    },
    voiceComms: {
      hasAudio: true,
      transcript: '"Recon caindo na janela C agora... 2 marcados. Soltando ult... um pegou... segundo eliminado. Fica no cover que eu tenho choque pro defuse."',
      callClarityScore: 99,
      tiltLevel: 'Zero Tilt',
      speakerName: 'Nyx',
      waveform: [20, 30, 45, 60, 75, 80, 95, 100, 80, 65, 50, 45, 70, 85, 90, 60, 40, 30, 20, 10]
    },
    tags: ['Valorant', 'Sova', 'Lineup', 'Overtime', 'Imortal 3'],
    endorsements: 89,
    recruitsCount: 11,
    sharesCount: 16,
    commentsCount: 12,
    createdAt: 'Há 3 horas',
    isFeatured: false,
  }
];

export const PLAYERS_DIRECTORY: Player[] = [
  {
    id: 'player-1',
    username: 'Vitor "Kailo" Silva',
    handle: 'kailofps',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=250&q=80',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    primaryGame: 'Valorant',
    secondaryGame: 'CS2',
    ranks: [
      { game: 'Valorant', rankName: 'Radiant', tierIcon: '👑', eloOrLevel: '#340 BR (620 RR)' },
      { game: 'CS2', rankName: 'Faceit Level 10', tierIcon: '⭐', eloOrLevel: '2350 ELO' }
    ],
    mainRoles: ['Controlador / Smoker', 'In-Game Leader (IGL)'],
    mainAgentsOrHeroes: ['Omen', 'Astra', 'Viper', 'Brimstone'],
    bio: 'Jogador focado em vitórias inteligentes. Não adianta dar tiro se o time não sabe coordenar retake e troca de mira. Nunca tilto em ranked e busco sempre manter o clima leve e focado.',
    location: 'São Paulo, SP - Brasil',
    languages: ['Português (Nativo)', 'Inglês (Fluente / Call Limpa)'],
    reputationScore: 98,
    reputationTier: 'Impecável',
    verifiedBadges: ['Zero Tilt Verificado', 'IGL Líder de Call', 'Trade Kill 94%', 'Clutch Confirmed', 'Pontualidade 100%'],
    stats: {
      kd: 1.38,
      winRate: 67,
      hsRate: 42,
      matchesLogged: 240,
      endorsementsReceived: 412,
      tiltFreeMatches: 238
    },
    radarScores: {
      mental: 98,
      communication: 99,
      tacticalIQ: 96,
      clutch: 92,
      teamwork: 97
    },
    voiceCommsSnippet: {
      title: 'Call de Retake Coordenado (Overtime)',
      duration: '0:18',
      clarityScore: 98,
      transcript: '"Segura a ansiedade rapaziada. Minha smoke fecha o céu agora. Espera o flash do Breach antes de abrir. 3, 2, 1... abre junto, troca boa!"'
    },
    clips: [INITIAL_CLIPS[0]],
    reviews: [
      {
        id: 'rev-1',
        authorName: 'Matheus "Frost"',
        authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        authorRank: 'Radiant #120',
        matchContext: 'Ascent 13x11 (Ranqueada)',
        date: 'Ontem',
        rating: 5,
        tags: ['Call Limpa', 'Zero Tilt', 'Excelente IGL'],
        comment: 'Estávamos perdendo de 3x9 na virada de lado. O Kailo organizou o time, não deixou ninguém desanimar e fez as melhores calls de ataque da minha vida. Duo dos sonhos.',
        verifiedMatchId: 'VAL-BR-2026-89421'
      },
      {
        id: 'rev-2',
        authorName: 'Beatriz "Bee"',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        authorRank: 'Imortal 3',
        matchContext: 'Split 13x8',
        date: '3 dias atrás',
        rating: 5,
        tags: ['Passa Info Rápido', 'Dropa Arma'],
        comment: 'Zero microfone aberto à toa, só info objetiva e suporte de smokes perfeito.',
        verifiedMatchId: 'VAL-BR-2026-81092'
      }
    ],
    availability: {
      status: 'Buscando Duo',
      schedule: 'Segunda a Sexta: 19h às 00h | Fins de Semana: Livre',
      playstyle: 'Competitivo Focado, sem toxicidade, foco em subida constante.',
      micRequirement: 'Mic Obrigatório (Call Limpa)'
    },
    socials: {
      discord: 'kailofps#1337',
      riotOrSteam: 'Kailo#BR1',
      twitch: 'kailofps'
    }
  },
  {
    id: 'player-2',
    username: 'Camila "Valkyria"',
    handle: 'valk_cs',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    primaryGame: 'CS2',
    secondaryGame: 'Valorant',
    ranks: [
      { game: 'CS2', rankName: 'Faceit Level 10', tierIcon: '⭐', eloOrLevel: '2480 ELO' },
      { game: 'Valorant', rankName: 'Imortal 2', tierIcon: '💎', eloOrLevel: '190 RR' }
    ],
    mainRoles: ['Entry Fragger', 'First Contact Rifler'],
    mainAgentsOrHeroes: ['AK-47 / M4A1-S', 'Jett', 'Raze'],
    bio: 'Entry agressiva que abre espaço pro time e garante a primeira troca. Comunicação direta e objetiva. Procuro time para disputar ligas amadoras e duos para grind de ELO.',
    location: 'Curitiba, PR - Brasil',
    languages: ['Português (Nativo)', 'Espanhol (Básico)'],
    reputationScore: 96,
    reputationTier: 'Exemplar',
    verifiedBadges: ['Entry Fragger Consistente', 'First Blood Rate 38%', 'Não Culpa o Time', 'Comunicação Ágil'],
    stats: {
      kd: 1.45,
      winRate: 62,
      hsRate: 64,
      matchesLogged: 198,
      endorsementsReceived: 310,
      tiltFreeMatches: 190
    },
    radarScores: {
      mental: 94,
      communication: 96,
      tacticalIQ: 91,
      clutch: 95,
      teamwork: 93
    },
    voiceCommsSnippet: {
      title: 'Call de Entrada Rápida Mirage',
      duration: '0:12',
      clarityScore: 96,
      transcript: '"Vou abrir palácio na flash. Matei 1 sanduíche. Me dá trade no ninja. Bomb limpo!"'
    },
    clips: [INITIAL_CLIPS[1]],
    reviews: [
      {
        id: 'rev-3',
        authorName: 'Gabriel "Tnk"',
        authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        authorRank: 'Faceit Level 10',
        matchContext: 'Inferno 16x12',
        date: 'Ontem',
        rating: 5,
        tags: ['Entry Absurdo', 'Call Rápida'],
        comment: 'Abre qualquer bomb site sem medo. Se você seguir a call dela o round tá ganho.',
        verifiedMatchId: 'CS2-FACEIT-77391'
      }
    ],
    availability: {
      status: 'Buscando Time',
      schedule: 'Todos os dias a partir das 20h',
      playstyle: 'Agressivo estruturado com trades pré-combinados.',
      micRequirement: 'Mic Obrigatório (Call Limpa)'
    },
    socials: {
      discord: 'valk_cs#8821',
      riotOrSteam: 'valkyria_official',
      twitch: 'valkyriacs'
    }
  },
  {
    id: 'player-3',
    username: 'Lucas "Phantom"',
    handle: 'phantom_jg',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    banner: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=80',
    primaryGame: 'League of Legends',
    ranks: [
      { game: 'League of Legends', rankName: 'Grão-Mestre', tierIcon: '🔥', eloOrLevel: '480 LP' }
    ],
    mainRoles: ['Jungler (Selva)', 'Shotcaller'],
    mainAgentsOrHeroes: ['Lee Sin', 'Viego', 'Jarvan IV', 'Sejuani'],
    bio: 'Jungler focado em controle de objetivos neutros e tracking da selva inimiga. Sei ler o mapa e nunca forço jogada sem visão. Procuro Mid/Top duo para subir Challenger.',
    location: 'Belo Horizonte, MG - Brasil',
    languages: ['Português (Nativo)'],
    reputationScore: 95,
    reputationTier: 'Exemplar',
    verifiedBadges: ['Objetivo Master', 'Macro Shotcaller', 'Zero Ragequit', 'Feedback Construtivo'],
    stats: {
      kd: 3.8,
      winRate: 66,
      hsRate: 0,
      matchesLogged: 310,
      endorsementsReceived: 490,
      tiltFreeMatches: 302
    },
    radarScores: {
      mental: 95,
      communication: 97,
      tacticalIQ: 98,
      clutch: 91,
      teamwork: 96
    },
    voiceCommsSnippet: {
      title: 'Tracking de Selva e Emboscada Bot',
      duration: '0:20',
      clarityScore: 94,
      transcript: '"O jungle deles começou red e tá descendo pro aronguejo bot. Deixa puxar a wave que eu chego por trás em 10 segundos."'
    },
    clips: [INITIAL_CLIPS[2]],
    reviews: [
      {
        id: 'rev-4',
        authorName: 'Thiago "MidKing"',
        authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
        authorRank: 'Mestre 220 LP',
        matchContext: 'SoloQ 34 min',
        date: '2 dias atrás',
        rating: 5,
        tags: ['Gank Certeiro', 'Mental de Ferro'],
        comment: 'Nosso bot morreu no level 2 e ele não desistiu, manteve o foco na win condition e roubou 2 dragões seguidos. Absurdo.',
        verifiedMatchId: 'LOL-BR-994102'
      }
    ],
    availability: {
      status: 'Buscando Duo',
      schedule: 'Tardes e Noites (14h às 22h)',
      playstyle: 'Macro play agressivo no early game com transição para lutas estruturadas.',
      micRequirement: 'Mic Obrigatório (Call Limpa)'
    },
    socials: {
      discord: 'phantom_jg#0001',
      riotOrSteam: 'Phantom#BR1'
    }
  },
  {
    id: 'player-4',
    username: 'Rafaela "Nyx"',
    handle: 'nyx_sova',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    primaryGame: 'Valorant',
    ranks: [
      { game: 'Valorant', rankName: 'Imortal 3', tierIcon: '💎', eloOrLevel: '310 RR' }
    ],
    mainRoles: ['Iniciador / Suporte Tático', 'Lineup Specialist'],
    mainAgentsOrHeroes: ['Sova', 'Fade', 'Gekko', 'Breach'],
    bio: 'Jogo pelo time. Meus dardos e utilitários sempre abrem espaço seguro pros duelistas brilharem. Prefiro dar 20 assistências e ganhar a partida com call limpa.',
    location: 'Rio de Janeiro, RJ - Brasil',
    languages: ['Português (Nativo)', 'Inglês (Intermediário)'],
    reputationScore: 99,
    reputationTier: 'Impecável',
    verifiedBadges: ['Suporte Nota 10', 'Lineup Precision', '100% Não-Tóxica', 'Comunicação Zen'],
    stats: {
      kd: 1.18,
      winRate: 70,
      hsRate: 38,
      matchesLogged: 165,
      endorsementsReceived: 380,
      tiltFreeMatches: 165
    },
    radarScores: {
      mental: 100,
      communication: 99,
      tacticalIQ: 98,
      clutch: 90,
      teamwork: 100
    },
    voiceCommsSnippet: {
      title: 'Dardo Revelador + Drone Ponto C',
      duration: '0:15',
      clarityScore: 99,
      transcript: '"Dardo caindo no fundo da C... 1 marcado perto da caixa. Dronando na frente pra você entrar seguro."'
    },
    clips: [INITIAL_CLIPS[3]],
    reviews: [
      {
        id: 'rev-5',
        authorName: 'Vitor "Kailo" Silva',
        authorAvatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80',
        authorRank: 'Radiant #340',
        matchContext: 'Haven 13x11',
        date: 'Hoje',
        rating: 5,
        tags: ['Melhor Suporte', 'Zero Tilt'],
        comment: 'A Nyx é a melhor iniciadora que já joguei junto. Dá gosto entrar no bomb site com as infos dela.',
        verifiedMatchId: 'VAL-BR-2026-44109'
      }
    ],
    availability: {
      status: 'Aberto a Convites',
      schedule: 'Segundas, Quartas e Sextas (20h às 23h30)',
      playstyle: 'Suporte tático milimétrico, utilitários sincronizados.',
      micRequirement: 'Mic Obrigatório (Call Limpa)'
    },
    socials: {
      discord: 'nyx_sova#9900',
      riotOrSteam: 'Nyx#BR1'
    }
  }
];

export const ONGOING_MATCH_LOGS: OngoingMatchLog[] = [
  {
    matchId: 'VAL-BR-2026-99201',
    game: 'Valorant',
    map: 'Lotus',
    gameMode: 'Competitivo Ranqueado (Imortal/Radiant)',
    date: 'Hoje, há 12 minutos',
    finalScore: '13 x 11',
    result: 'Vitória',
    events: [
      {
        id: 'evt-1',
        timestamp: '04:22',
        round: 4,
        eventType: 'Entry Frag',
        title: 'Double Kill Abertura Bomb C',
        description: 'Primeira troca ganha com Sheriff em eco round, abrindo o bomb para o plant.',
        impactScore: 88,
        hpLeft: 100,
        weapons: ['Sheriff'],
        isCaptured: true,
        videoSnippet: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'evt-2',
        timestamp: '14:50',
        round: 12,
        eventType: 'Clutch',
        title: 'Clutch 1v2 com Desarme em 0.3s',
        description: 'Situação crítica pós-plant no Bomb A. Fake defuse + eliminação dos dois defensores.',
        impactScore: 97,
        hpLeft: 22,
        weapons: ['Phantom', 'Ghost'],
        isCaptured: true,
        videoSnippet: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'evt-3',
        timestamp: '23:15',
        round: 23,
        eventType: 'Eco Ace',
        title: 'Quadra Kill Defendendo Retake',
        description: 'Controle de recuo na porta giratória garantindo o match point.',
        impactScore: 99,
        hpLeft: 45,
        weapons: ['Vandal'],
        isCaptured: false,
        videoSnippet: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80'
      }
    ]
  },
  {
    matchId: 'CS2-MM-44021',
    game: 'CS2',
    map: 'Inferno',
    gameMode: 'Premier Matchmaking (18.500 CS Rating)',
    date: 'Ontem, 22:30',
    finalScore: '13 x 9',
    result: 'Vitória',
    events: [
      {
        id: 'evt-4',
        timestamp: '08:12',
        round: 7,
        eventType: 'Multi-Kill',
        title: 'Triple Kill Banana com AWP',
        description: 'Segurou o rush B completo sem auxílio de suporte.',
        impactScore: 93,
        hpLeft: 84,
        weapons: ['AWP'],
        isCaptured: true,
        videoSnippet: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80'
      }
    ]
  }
];
