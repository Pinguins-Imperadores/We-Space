import React, { useState } from 'react';
import { useAtmosphere, getRgba } from '../context/ThemeAtmosphereContext';
import { soundFx } from '../utils/soundEngine';

interface RadarChartProps {
  data: {
    mental: number;
    communication: number;
    tacticalIQ: number;
    clutch: number;
    teamwork: number;
  };
  benchmarkData?: {
    mental: number;
    communication: number;
    tacticalIQ: number;
    clutch: number;
    teamwork: number;
  };
  size?: number;
  showComparison?: boolean;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  benchmarkData = {
    mental: 75,
    communication: 72,
    tacticalIQ: 78,
    clutch: 70,
    teamwork: 74
  },
  size = 280,
  showComparison = true
}) => {
  const { customColor } = useAtmosphere();
  const [activeStat, setActiveStat] = useState<string | null>(null);

  const attributes = [
    { key: 'mental', label: 'Resiliência / Zero Tilt', val: data.mental, bench: benchmarkData.mental },
    { key: 'communication', label: 'Call Limpa / IGL', val: data.communication, bench: benchmarkData.communication },
    { key: 'tacticalIQ', label: 'QI Tático / Macro', val: data.tacticalIQ, bench: benchmarkData.tacticalIQ },
    { key: 'clutch', label: 'Clutch / Frieza', val: data.clutch, bench: benchmarkData.clutch },
    { key: 'teamwork', label: 'Trabalho em Equipe', val: data.teamwork, bench: benchmarkData.teamwork }
  ];

  const totalPoints = attributes.length;
  const radius = (size / 2) - 40;
  const center = size / 2;

  // Calculate polygon coordinate for a given value (0 - 100) and index
  const getCoordinates = (value: number, index: number) => {
    const angle = (Math.PI * 2 / totalPoints) * index - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Generate path string for values
  const playerPoints = attributes.map((attr, i) => getCoordinates(attr.val, i));
  const playerPath = playerPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const benchPoints = attributes.map((attr, i) => getCoordinates(attr.bench, i));
  const benchPath = benchPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md">
      
      {/* Header telemetry badge */}
      <div className="w-full flex items-center justify-between px-2 pb-2 border-b border-zinc-800/60 text-[11px] font-mono">
        <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
          <span 
            className="h-2 w-2 rounded-full animate-ping"
            style={{ backgroundColor: customColor }}
          />
          Tactical DNA Radar
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-zinc-300">
            <span 
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: customColor }}
            />
            Jogador
          </span>
          {showComparison && (
            <span className="flex items-center gap-1 text-zinc-500">
              <span className="h-2 w-2 rounded-sm bg-zinc-600" />
              Média Top Tier
            </span>
          )}
        </div>
      </div>

      <div className="relative my-2">
        <svg width={size} height={size} className="overflow-visible select-none">
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={customColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={customColor} stopOpacity="0.05" />
            </radialGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Concentric grid rings */}
          {gridLevels.map((lvl, idx) => {
            const ringPts = attributes.map((_, i) => getCoordinates(lvl * 100, i));
            const ringPath = ringPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
            return (
              <g key={idx}>
                <path
                  d={ringPath}
                  fill="none"
                  stroke="#27272a"
                  strokeWidth={idx === gridLevels.length - 1 ? "1.5" : "0.75"}
                  strokeDasharray={idx === gridLevels.length - 1 ? undefined : "2 2"}
                />
                <text
                  x={center + 4}
                  y={center - (lvl * radius) + 10}
                  fill="#71717a"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {Math.round(lvl * 100)}%
                </text>
              </g>
            );
          })}

          {/* Radial Spokes */}
          {attributes.map((_, i) => {
            const outer = getCoordinates(100, i);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="#27272a"
                strokeWidth="1"
              />
            );
          })}

          {/* Benchmark comparison polygon */}
          {showComparison && (
            <path
              d={benchPath}
              fill="rgba(113, 113, 122, 0.1)"
              stroke="#52525b"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          )}

          {/* Player Active Polygon with Glow */}
          <path
            d={playerPath}
            fill="url(#radarGlow)"
            stroke={customColor}
            strokeWidth="2.5"
            filter="url(#glowFilter)"
          />

          {/* Interactive Vertex Nodes */}
          {playerPoints.map((pt, i) => {
            const attr = attributes[i];
            const isHovered = activeStat === attr.key;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => {
                  soundFx.playHoverHum();
                  setActiveStat(attr.key);
                }}
                onMouseLeave={() => setActiveStat(null)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 7 : 4.5}
                  fill={isHovered ? '#ffffff' : customColor}
                  stroke="#09090b"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="12"
                    fill="none"
                    stroke={customColor}
                    strokeWidth="1.5"
                    className="animate-ping"
                  />
                )}
              </g>
            );
          })}

          {/* Axis Labels */}
          {attributes.map((attr, i) => {
            const angle = (Math.PI * 2 / totalPoints) * i - Math.PI / 2;
            const labelRadius = radius + 24;
            const lx = center + labelRadius * Math.cos(angle);
            const ly = center + labelRadius * Math.sin(angle);
            const isHovered = activeStat === attr.key;

            let textAnchor = 'middle';
            if (Math.cos(angle) > 0.3) textAnchor = 'start';
            else if (Math.cos(angle) < -0.3) textAnchor = 'end';

            return (
              <text
                key={i}
                x={lx}
                y={ly}
                textAnchor={textAnchor}
                fontSize="10"
                fontWeight={isHovered ? "bold" : "600"}
                fill={isHovered ? customColor : '#a1a1aa'}
                className="transition-colors cursor-pointer select-none font-mono"
                onMouseEnter={() => {
                  soundFx.playHoverHum();
                  setActiveStat(attr.key);
                }}
                onMouseLeave={() => setActiveStat(null)}
              >
                {attr.label.split('/')[0]} ({attr.val}%)
              </text>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Inspector Footer */}
      <div className="w-full bg-zinc-900/90 rounded-lg p-2.5 border border-zinc-800 text-xs flex items-center justify-between">
        {activeStat ? (
          (() => {
            const current = attributes.find(a => a.key === activeStat);
            return (
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-zinc-200">{current?.label}:</span>
                <span 
                  className="font-mono font-bold"
                  style={{ color: customColor }}
                >
                  {current?.val}% <span className="text-zinc-500 text-[10px] font-normal">(Top Tier Avg: {current?.bench}%)</span>
                </span>
              </div>
            );
          })()
        ) : (
          <div className="text-zinc-500 text-[11px] font-mono text-center w-full">
            Passe o cursor sobre os vértices para auditar atributos táticos
          </div>
        )}
      </div>

    </div>
  );
};
