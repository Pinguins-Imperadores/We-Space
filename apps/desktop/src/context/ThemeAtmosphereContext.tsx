import React, { createContext, useContext, useState, useEffect } from 'react';
import { soundFx } from '../utils/soundEngine';

export interface ThemeConfig {
  name: string;
  label: string;
  accentHex: string;
  glowHex: string;
  subtleHex: string;
  borderHex: string;
  badgeStyle: string;
  borderGlow: string;
  buttonClass: string;
  tagClass: string;
  textAccent: string;
}

export interface PresetPalette {
  id: string;
  name: string;
  label: string;
  hex: string;
  category: 'tactical' | 'neon' | 'tournament' | 'custom';
}

export const PRESET_PALETTES: PresetPalette[] = [
  { id: 'emerald', name: 'Tactical Phosphor', label: 'Verde Tático', hex: '#10b981', category: 'tactical' },
  { id: 'cyber', name: 'Cyber Horizon', label: 'Ciano Gélido', hex: '#06b6d4', category: 'neon' },
  { id: 'amber', name: 'Vanguard Amber', label: 'Dourado Torneio', hex: '#f59e0b', category: 'tournament' },
  { id: 'crimson', name: 'Crimson Protocol', label: 'Vermelho Operação', hex: '#ef4444', category: 'tactical' },
  { id: 'violet', name: 'Neon Phantom', label: 'Roxo Cibernético', hex: '#8b5cf6', category: 'neon' },
  { id: 'sakura', name: 'Sakura Blast', label: 'Rosa Neon', hex: '#ec4899', category: 'neon' },
  { id: 'orange', name: 'Solar Blaze', label: 'Laranja Incandescente', hex: '#f97316', category: 'tournament' },
  { id: 'lime', name: 'Toxic Acid', label: 'Verde Ácido', hex: '#84cc16', category: 'tactical' },
  { id: 'indigo', name: 'Quantum Core', label: 'Índigo Profundo', hex: '#6366f1', category: 'tournament' },
  { id: 'sky', name: 'Aero Drift', label: 'Azul Céu', hex: '#38bdf8', category: 'neon' }
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function getRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  // ITU-R BT.709 relative luminance
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6;
}

export function buildThemeConfig(hex: string, name = 'custom', label = 'Paleta Personalizada'): ThemeConfig {
  const normalizedHex = hex.startsWith('#') ? hex : `#${hex}`;
  const isLight = isLightColor(normalizedHex);
  const textColor = isLight ? '#09090b' : '#ffffff';

  return {
    name,
    label,
    accentHex: normalizedHex,
    glowHex: getRgba(normalizedHex, 0.25),
    subtleHex: getRgba(normalizedHex, 0.12),
    borderHex: getRgba(normalizedHex, 0.35),
    badgeStyle: `text-white border font-mono`,
    borderGlow: `hover:shadow-[0_0_20px_${getRgba(normalizedHex, 0.15)}]`,
    buttonClass: `${isLight ? 'text-zinc-950' : 'text-zinc-950'} font-bold shadow-lg`,
    tagClass: `text-zinc-200 border font-mono`,
    textAccent: 'font-semibold'
  };
}

interface ThemeAtmosphereContextType {
  customColor: string;
  setCustomColor: (hex: string, name?: string, label?: string) => void;
  activePresetId: string | null;
  selectPreset: (presetId: string) => void;
  resetToDefault: () => void;
  isScanlinesActive: boolean;
  toggleScanlines: () => void;
  isAudioMuted: boolean;
  toggleAudioMute: () => boolean;
  themeConfig: ThemeConfig;
  isPaletteModalOpen: boolean;
  setIsPaletteModalOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'wespace_custom_theme_color';
const DEFAULT_HEX = '#10b981'; // Emerald

const ThemeAtmosphereContext = createContext<ThemeAtmosphereContextType | undefined>(undefined);

export const ThemeAtmosphereProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customColor, setCustomColorState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && /^#[0-9A-Fa-f]{6}$/.test(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return DEFAULT_HEX;
  });

  const [activePresetId, setActivePresetId] = useState<string | null>(() => {
    const matching = PRESET_PALETTES.find(p => p.hex.toLowerCase() === DEFAULT_HEX.toLowerCase());
    return matching ? matching.id : null;
  });

  const [isScanlinesActive, setIsScanlinesActive] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);

  // Apply CSS variables to root
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.style.setProperty('--accent-color', customColor);
      root.style.setProperty('--accent-glow', getRgba(customColor, 0.35));
      root.style.setProperty('--accent-subtle', getRgba(customColor, 0.12));
      root.style.setProperty('--accent-border', getRgba(customColor, 0.4));
      root.style.setProperty('--accent-rgb', `${hexToRgb(customColor).r}, ${hexToRgb(customColor).g}, ${hexToRgb(customColor).b}`);
      localStorage.setItem(STORAGE_KEY, customColor);
    } catch {
      // ignore
    }
  }, [customColor]);

  const setCustomColor = (hex: string, name?: string, label?: string) => {
    if (!hex) return;
    const formattedHex = hex.startsWith('#') ? hex : `#${hex}`;
    setCustomColorState(formattedHex);
    
    // Check if it matches a preset
    const match = PRESET_PALETTES.find(p => p.hex.toLowerCase() === formattedHex.toLowerCase());
    setActivePresetId(match ? match.id : null);
  };

  const selectPreset = (presetId: string) => {
    const found = PRESET_PALETTES.find(p => p.id === presetId);
    if (found) {
      soundFx.playTactileClick();
      setCustomColor(found.hex, found.name, found.label);
      setActivePresetId(found.id);
    }
  };

  const resetToDefault = () => {
    soundFx.playTactileClick();
    setCustomColor(DEFAULT_HEX, 'Tactical Phosphor', 'Verde Tático');
    setActivePresetId('emerald');
  };

  const toggleScanlines = () => {
    soundFx.playTactileClick();
    setIsScanlinesActive((prev) => !prev);
  };

  const toggleAudioMute = () => {
    const next = soundFx.toggleMute();
    setIsAudioMuted(next);
    if (!next) {
      soundFx.playRadarPing();
    }
    return next;
  };

  const currentPreset = PRESET_PALETTES.find(p => p.hex.toLowerCase() === customColor.toLowerCase());
  const themeConfig = buildThemeConfig(
    customColor,
    currentPreset ? currentPreset.name : 'Personalizado',
    currentPreset ? currentPreset.label : `Hex ${customColor.toUpperCase()}`
  );

  return (
    <ThemeAtmosphereContext.Provider
      value={{
        customColor,
        setCustomColor,
        activePresetId,
        selectPreset,
        resetToDefault,
        isScanlinesActive,
        toggleScanlines,
        isAudioMuted,
        toggleAudioMute,
        themeConfig,
        isPaletteModalOpen,
        setIsPaletteModalOpen
      }}
    >
      {children}
    </ThemeAtmosphereContext.Provider>
  );
};

export const useAtmosphere = () => {
  const context = useContext(ThemeAtmosphereContext);
  if (!context) {
    throw new Error('useAtmosphere must be used within a ThemeAtmosphereProvider');
  }
  return context;
};
