import test from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// 1. UNIT TEST SUITE: Algoritmo de Score Ponderado & Fila Redis Sorted Sets
// ============================================================================

function calculateWeightedScore(rankTier, karmaScore) {
  const rankComponent = rankTier * 20.0;
  const karmaClamped = Math.max(0.0, Math.min(150.0, karmaScore));
  return rankComponent + karmaClamped;
}

function calculateDynamicTolerance(waitSeconds) {
  const BASE_SCORE_TOLERANCE = 15.0;
  const TOLERANCE_GROWTH_PER_SEC = 0.75;
  const MAX_SCORE_TOLERANCE = 65.0;

  const expansion = waitSeconds * TOLERANCE_GROWTH_PER_SEC;
  return Math.min(BASE_SCORE_TOLERANCE + expansion, MAX_SCORE_TOLERANCE);
}

/**
 * Simulates the Redis Sorted Set Batch Matchmaking algorithm
 */
function runBatchMatchmaker(sortedSetEntries, ticketsMap, waitSeconds = 0) {
  const dynamicTol = calculateDynamicTolerance(waitSeconds);
  const matchedDuos = [];
  const matchedUserIds = new Set();

  let i = 0;
  while (i + 1 < sortedSetEntries.length) {
    const entryA = sortedSetEntries[i];
    const entryB = sortedSetEntries[i + 1];

    if (matchedUserIds.has(entryA.userId)) {
      i += 1;
      continue;
    }

    const ticketA = ticketsMap[entryA.userId];
    const ticketB = ticketsMap[entryB.userId];

    if (ticketA && ticketB) {
      const scoreDelta = Math.abs(entryB.score - entryA.score);

      if (scoreDelta <= dynamicTol) {
        matchedUserIds.add(entryA.userId);
        matchedUserIds.add(entryB.userId);

        matchedDuos.push({
          matchId: 'match-' + Math.random().toString(36).substring(7),
          playerA: ticketA,
          playerB: ticketB,
          scoreDelta,
          dynamicTolApplied: dynamicTol,
        });

        i += 2; // skip both matched players
        continue;
      }
    }
    i += 1;
  }

  const remaining = sortedSetEntries.filter(e => !matchedUserIds.has(e.userId));

  return {
    matchedDuos,
    remainingUsers: remaining,
  };
}

test('Fila Ponderada: Cálculo do Score Ponderado (Rank 20x + Karma)', () => {
  // Player A: Rank 10 (Ouro), Karma 95 -> 200 + 95 = 295.0
  const scoreA = calculateWeightedScore(10, 95.0);
  assert.equal(scoreA, 295.0, 'Score de Rank 10 com Karma 95 deve ser exatamente 295.0');

  // Player B: Rank 10 (Ouro), Karma 98 -> 200 + 98 = 298.0
  const scoreB = calculateWeightedScore(10, 98.0);
  assert.equal(scoreB, 298.0, 'Score de Rank 10 com Karma 98 deve ser 298.0');

  // Delta entre players do mesmo elo com karma proximo é mínimo
  const delta = Math.abs(scoreB - scoreA);
  assert.equal(delta, 3.0, 'Delta entre duos com karma similar deve ser 3.0 pts');

  // Player C: Rank 20 (Imortal), Karma 95 -> 400 + 95 = 495.0
  const scoreC = calculateWeightedScore(20, 95.0);
  assert.equal(scoreC, 495.0, 'Score de Rank 20 deve separar claramente dos ranks inferiores');
  assert.ok(scoreC > scoreB, 'Ranks superiores devem ficar em faixas mais altas do Sorted Set');
});

test('Fila Ponderada: Clamping de Karma (Proteção contra anomalias)', () => {
  // Karma negativo é restrito a 0
  const scoreNegative = calculateWeightedScore(15, -100);
  assert.equal(scoreNegative, 300.0, 'Karma negativo deve ser limitado a 0.0');

  // Karma excessivo é restrito a 150
  const scoreExcess = calculateWeightedScore(15, 999);
  assert.equal(scoreExcess, 450.0, 'Karma excessivo deve ser limitado a 150.0');
});

test('Fila Ponderada: Expansão Dinâmica da Janela de Tolerância Temporal', () => {
  // Instante 0s: tolerância estrita base
  assert.equal(calculateDynamicTolerance(0), 15.0, 'Tolerância no instante 0s deve ser 15.0');

  // Aos 10s: 15.0 + 10 * 0.75 = 22.5
  assert.equal(calculateDynamicTolerance(10), 22.5, 'Tolerância aos 10s deve ser 22.5');

  // Aos 20s: 15.0 + 20 * 0.75 = 30.0
  assert.equal(calculateDynamicTolerance(20), 30.0, 'Tolerância aos 20s deve ser 30.0');

  // Aos 120s: deve atingir o teto de 65.0
  assert.equal(calculateDynamicTolerance(120), 65.0, 'Tolerância máxima deve ser travada em 65.0');
});

test('Fila Ponderada: Batch Duo Matchmaking em lote por proximidade comportamental', () => {
  // Simula 4 jogadores ordenados no Redis Sorted Set
  const players = [
    { userId: 'u1', username: 'Aspas', rank: 25, karma: 98 },
    { userId: 'u2', username: 'Less', rank: 25, karma: 96 },
    { userId: 'u3', username: 'Fallen', rank: 18, karma: 92 },
    { userId: 'u4', username: 'Coldzera', rank: 18, karma: 94 },
  ];

  const sortedSetEntries = players.map(p => ({
    userId: p.userId,
    score: calculateWeightedScore(p.rank, p.karma),
  })).sort((a, b) => a.score - b.score);

  const ticketsMap = Object.fromEntries(players.map(p => [p.userId, p]));

  // Executa o pareamento em lote
  const result = runBatchMatchmaker(sortedSetEntries, ticketsMap, 0);

  assert.equal(result.matchedDuos.length, 2, 'Deve ter pareado exatamente 2 duos no lote');
  assert.equal(result.remainingUsers.length, 0, 'Todos os 4 jogadores compatíveis devem ser pareados');

  // Verifica o primeiro par (Fallen & Coldzera no rank 18)
  const duoRank18 = result.matchedDuos.find(d => d.playerA.rank === 18);
  assert.ok(duoRank18, 'Duo de Rank 18 deve ser formado');
  assert.equal(duoRank18.scoreDelta, 2.0, 'Delta entre Fallen e Coldzera deve ser 2.0');

  // Verifica o segundo par (Aspas & Less no rank 25)
  const duoRank25 = result.matchedDuos.find(d => d.playerA.rank === 25);
  assert.ok(duoRank25, 'Duo de Rank 25 deve ser formado');
  assert.equal(duoRank25.scoreDelta, 2.0, 'Delta entre Aspas e Less deve ser 2.0');
});

test('Fila Ponderada: Rejeição de duos incompatíveis fora da tolerância', () => {
  // Jogadores com ranks muito distantes
  const players = [
    { userId: 'iron_player', username: 'Noob1', rank: 2, karma: 90 },    // Score 130
    { userId: 'radiant_player', username: 'Pro1', rank: 28, karma: 95 }, // Score 655
  ];

  const sortedSetEntries = players.map(p => ({
    userId: p.userId,
    score: calculateWeightedScore(p.rank, p.karma),
  }));

  const ticketsMap = Object.fromEntries(players.map(p => [p.userId, p]));

  // Mesmo após 300 segundos, a tolerância máxima é 65.0. O delta é 525.0.
  const result = runBatchMatchmaker(sortedSetEntries, ticketsMap, 300);

  assert.equal(result.matchedDuos.length, 0, 'Jogadores com elos divergentes nunca devem ser pareados');
  assert.equal(result.remainingUsers.length, 2, 'Jogadores incompatíveis devem continuar na fila');
});

// ============================================================================
// 2. UNIT TEST SUITE: Notificações de Sistema & Aviso Sonoro
// ============================================================================

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
    this.createdNodes = [];
  }
  createOscillator() {
    const node = {
      type: 'sine',
      frequency: {
        setValueAtTime: (val, time) => { node.freqVal = val; node.freqTime = time; },
        exponentialRampToValueAtTime: (val, time) => { node.rampVal = val; node.rampTime = time; },
      },
      connect: () => {},
      start: (time) => { node.started = time ?? true; },
      stop: (time) => { node.stopped = time ?? true; },
    };
    this.createdNodes.push(node);
    return node;
  }
  createGain() {
    const node = {
      gain: {
        setValueAtTime: (val, time) => { node.gainVal = val; },
        exponentialRampToValueAtTime: (val, time) => { node.rampVal = val; },
      },
      connect: () => {},
    };
    this.createdNodes.push(node);
    return node;
  }
  createBiquadFilter() {
    const node = {
      type: 'lowpass',
      frequency: {
        setValueAtTime: (val, time) => { node.filterFreq = val; },
      },
      connect: () => {},
    };
    this.createdNodes.push(node);
    return node;
  }
}

class SoundEngineForTest {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }
  initCtx() {
    if (!this.ctx) {
      this.ctx = new MockAudioContext();
    }
  }
  setMuted(m) { this.isMuted = m; }
  getMuted() { return this.isMuted; }
  toggleMute() { this.isMuted = !this.isMuted; return this.isMuted; }

  playMatchFound() {
    if (this.isMuted) return false;
    this.initCtx();
    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.connect(subGain);
    subOsc.start(0);

    // Chords (5 rising notes)
    const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, idx * 0.09);
      osc.connect(filter);
      filter.connect(gain);
      osc.start(idx * 0.09);
    });
    return true;
  }

  playQueueJoined() {
    if (this.isMuted) return false;
    this.initCtx();
    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.start(idx * 0.05);
    });
    return true;
  }
}

test('Aviso Sonoro: SoundEngine executa síntese tática ao encontrar dupla', () => {
  const engine = new SoundEngineForTest();
  assert.equal(engine.getMuted(), false, 'Engine inicia desmutado');

  const played = engine.playMatchFound();
  assert.equal(played, true, 'playMatchFound() deve disparar com sucesso');
  assert.ok(engine.ctx, 'AudioContext deve ser inicializado');
  // Deve criar 1 sub-bass + 5 notas táticas + nós de ganho/filtro
  assert.ok(engine.ctx.createdNodes.length >= 6, 'Deve criar os nós de oscilador e ganho da fanfarra');
});

test('Aviso Sonoro: Respeita o estado de Mute do usuário', () => {
  const engine = new SoundEngineForTest();
  engine.setMuted(true);
  assert.equal(engine.getMuted(), true, 'Engine deve estar mutado');

  const played = engine.playMatchFound();
  assert.equal(played, false, 'playMatchFound() não deve sintetizar se estiver mutado');
  assert.equal(engine.ctx, null, 'Nenhum AudioContext deve ser criado quando mutado');

  // Toggle mute
  engine.toggleMute();
  assert.equal(engine.getMuted(), false, 'toggleMute() deve desmutar');
});

test('Notificações de Sistema: Formatação e Telemetria para OS Tray', () => {
  const params = {
    partnerUsername: 'Coldzera',
    game: 'CS2',
    karmaScore: 98.4,
    rank: 'Level 10 GC',
    matchScoreDelta: 1.8,
  };

  const deltaStr = params.matchScoreDelta !== undefined
    ? ` • Proximidade Δ: ${params.matchScoreDelta.toFixed(1)} pts`
    : '';

  const title = `🎮 Dupla Encontrada! [${params.game}]`;
  const body = `Duo Compatível: ${params.partnerUsername} (${params.rank}) • Karma: ${params.karmaScore.toFixed(0)}${deltaStr}`;

  assert.equal(title, '🎮 Dupla Encontrada! [CS2]', 'Título da notificação deve conter ícone e jogo');
  assert.ok(body.includes('Coldzera'), 'Corpo deve conter o nome do parceiro');
  assert.ok(body.includes('Level 10 GC'), 'Corpo deve conter o rank do parceiro');
  assert.ok(body.includes('Karma: 98'), 'Corpo deve conter a pontuação comportamental');
  assert.ok(body.includes('1.8 pts'), 'Corpo deve reportar o delta de proximidade comportamental');
});
