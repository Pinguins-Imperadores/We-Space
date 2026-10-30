import React, { useState } from 'react';
import { 
  X, 
  Palette, 
  Check, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Eye, 
  Zap, 
  Radio, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2,
  Dice5
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  useAtmosphere, 
  PRESET_PALETTES, 
  PresetPalette, 
  getRgba, 
  isLightColor 
} from '../../context/ThemeAtmosphereContext';
import { soundFx } from '../../utils/soundEngine';

interface PaletteCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaletteCustomizerModal: React.FC<PaletteCustomizerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    customColor, 
    setCustomColor, 
    activePresetId, 
    selectPreset, 
    resetToDefault, 
    themeConfig,
    isScanlinesActive,
    toggleScanlines
  } = useAtmosphere();

  const [hexInput, setHexInput] = useState(customColor);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'tactical' | 'neon' | 'tournament'>('all');

  // Keep input in sync when customColor changes from presets
  React.useEffect(() => {
    setHexInput(customColor);
  }, [customColor]);

  if (!isOpen) return null;

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setCustomColor(val);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    setCustomColor(val);
  };

  const handlePresetClick = (preset: PresetPalette) => {
    selectPreset(preset.id);
  };

  const handleRandomColor = () => {
    soundFx.playTactileClick();
    const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    setHexInput(randomHex);
    setCustomColor(randomHex, 'Personalizado', 'Cor Aleatória');
    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.6 },
      colors: [randomHex, '#ffffff']
    });
  };

  const handleCopyHex = () => {
    soundFx.playTactileClick();
    navigator.clipboard.writeText(customColor.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredPresets = PRESET_PALETTES.filter(p => {
    if (activeCategory === 'all') return true;
    return p.category === activeCategory;
  });

  const isLight = isLightColor(customColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fadeIn overflow-y-auto">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors shadow-sm"
              style={{
                backgroundColor: getRgba(customColor, 0.15),
                borderColor: getRgba(customColor, 0.4),
                color: customColor
              }}
            >
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Personalização de Cores & Atmosfera
              </h2>
              <p className="text-xs text-zinc-400">
                Escolha qualquer cor do espectro ou selecione temas táticos calibrados.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playTactileClick();
              onClose();
            }}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          
          {/* Section 1: Color Picker Engine & Hex Input */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" style={{ color: customColor }} />
                Seletor de Cor Livre (Qualquer Tom)
              </span>

              <button
                onClick={handleRandomColor}
                className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-colors"
                title="Sortear uma cor aleatória"
              >
                <Dice5 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Cor Aleatória</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              
              {/* Native Color Picker Circle / Well */}
              <div className="sm:col-span-4 flex items-center gap-3">
                <div className="relative group/picker">
                  <input
                    type="color"
                    value={customColor}
                    onChange={handleColorPickerChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    title="Clique para abrir a roda de cores completa"
                  />
                  <div 
                    className="h-12 w-12 rounded-xl border-2 shadow-inner transition-transform group-hover/picker:scale-105 flex items-center justify-center cursor-pointer"
                    style={{
                      backgroundColor: customColor,
                      borderColor: '#3f3f46',
                      boxShadow: `0 0 15px ${getRgba(customColor, 0.4)}`
                    }}
                  >
                    <Palette className={`h-5 w-5 ${isLight ? 'text-zinc-950' : 'text-white'} opacity-75`} />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">Roda de Cores</span>
                  <span className="text-[10px] text-zinc-400">Clique para abrir</span>
                </div>
              </div>

              {/* Direct Hex Input */}
              <div className="sm:col-span-8 flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 font-mono text-xs">
                    HEX
                  </div>
                  <input
                    type="text"
                    value={hexInput}
                    onChange={handleHexChange}
                    placeholder="#10B981"
                    maxLength={7}
                    className="w-full pl-12 pr-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none uppercase"
                    style={{
                      borderColor: getRgba(customColor, 0.5)
                    }}
                  />
                </div>

                <button
                  onClick={handleCopyHex}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-zinc-700 transition-colors shrink-0"
                  title="Copiar código HEX"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Section 2: Preset Palettes Grid */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400">
                Paletas Táticas Recomendadas
              </span>

              {/* Category Filter */}
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'tactical', label: 'Tático' },
                  { id: 'neon', label: 'Cyber' },
                  { id: 'tournament', label: 'Major' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      soundFx.playTactileClick();
                      setActiveCategory(cat.id as any);
                    }}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      activeCategory === cat.id
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {filteredPresets.map((preset) => {
                const isSelected = activePresetId === preset.id || customColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-500 shadow-md ring-1 ring-white/20'
                        : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className="h-6 w-6 rounded-lg shrink-0 flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && (
                        <Check className={`h-3.5 w-3.5 ${isLightColor(preset.hex) ? 'text-zinc-950' : 'text-white'}`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-zinc-200 block truncate leading-tight">
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono block uppercase">
                        {preset.hex}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Live Real-Time Interactive Sandbox Preview */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 block">
              Pré-Visualização em Tempo Real na Interface
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Preview 1: Action Button */}
              <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between space-y-2">
                <span className="text-[10px] font-mono text-zinc-500">Botão de Ação Primária:</span>
                <button
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: customColor,
                    color: isLight ? '#09090b' : '#09090b',
                    boxShadow: `0 4px 14px ${getRgba(customColor, 0.35)}`
                  }}
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>Convidar Duo</span>
                </button>
              </div>

              {/* Preview 2: Telemetry Pill & Tag */}
              <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between space-y-2">
                <span className="text-[10px] font-mono text-zinc-500">Selo de Telemetria:</span>
                <div 
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-bold border"
                  style={{
                    backgroundColor: getRgba(customColor, 0.12),
                    borderColor: getRgba(customColor, 0.4),
                    color: customColor
                  }}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>99.4% Reputação</span>
                </div>
              </div>

              {/* Preview 3: Live Waveform & Call Badge */}
              <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between space-y-2">
                <span className="text-[10px] font-mono text-zinc-500">Onda de Áudio & Radar:</span>
                <div className="flex items-center gap-1 h-6 px-2 bg-zinc-950 rounded border border-zinc-800">
                  {[20, 60, 100, 75, 40, 90, 80, 50, 95, 30].map((h, idx) => (
                    <div
                      key={idx}
                      className="w-full rounded-full transition-all"
                      style={{
                        height: `${h}%`,
                        backgroundColor: customColor
                      }}
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/90">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Verde Padrão</span>
          </button>

          <button
            onClick={() => {
              soundFx.playTactileClick();
              confetti({
                particleCount: 40,
                spread: 60,
                origin: { y: 0.7 },
                colors: [customColor, '#ffffff']
              });
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
            style={{
              backgroundColor: customColor,
              color: isLight ? '#09090b' : '#09090b',
              boxShadow: `0 2px 10px ${getRgba(customColor, 0.3)}`
            }}
          >
            Aplicar & Salvar
          </button>
        </div>

      </div>

    </div>
  );
};
