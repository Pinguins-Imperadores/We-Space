import React, { useState, useRef, useEffect } from 'react';
import { 
  Flame, 
  Video, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Plus, 
  Gamepad2,
  Volume2,
  VolumeX,
  Palette,
  SlidersHorizontal,
  ChevronDown,
  Radio,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { 
  useAtmosphere, 
  PRESET_PALETTES, 
  getRgba, 
  isLightColor 
} from '../context/ThemeAtmosphereContext';
import { soundFx } from '../utils/soundEngine';

interface NavbarProps {
  activeTab: 'feed' | 'clipper' | 'duos' | 'profiles' | 'trust';
  setActiveTab: (tab: 'feed' | 'clipper' | 'duos' | 'profiles' | 'trust') => void;
  onOpenCreateModal: () => void;
  onSelectPlayer: (playerId: string) => void;
  currentUser: {
    id: string;
    username: string;
    avatar: string;
    reputationScore: number;
  };
}

interface NavItem {
  id: 'feed' | 'clipper' | 'duos' | 'profiles' | 'trust';
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onSelectPlayer,
  currentUser
}) => {
  const { 
    customColor, 
    selectPreset, 
    isAudioMuted, 
    toggleAudioMute, 
    themeConfig,
    setIsPaletteModalOpen
  } = useAtmosphere();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: NavItem[] = [
    { id: 'feed', label: 'Feed de Clipes', shortLabel: 'Feed', icon: Flame },
    { id: 'clipper', label: 'Engine Clipper', shortLabel: 'Clipper', icon: Video, badge: 'F9' },
    { id: 'duos', label: 'Lobbies & Duos', shortLabel: 'Lobbies', icon: Users },
    { id: 'profiles', label: 'Perfil & DNA', shortLabel: 'Perfil', icon: UserCheck },
    { id: 'trust', label: 'Reputação', shortLabel: 'Karma', icon: ShieldCheck },
  ];

  const handleNavClick = (tabId: NavItem['id']) => {
    soundFx.playTactileClick();
    setActiveTab(tabId);
  };

  const isLight = isLightColor(customColor);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        
        {/* LEFT: Brand Identity + Live Engine Status Pill */}
        <div className="flex items-center gap-4 shrink-0">
          <div 
            onClick={() => handleNavClick('feed')}
            className="flex cursor-pointer items-center gap-3 group transition-transform active:scale-95"
          >
            <div 
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border transition-all duration-300 group-hover:scale-105"
              style={{
                borderColor: getRgba(customColor, 0.45),
                color: customColor,
                boxShadow: `0 0 18px ${getRgba(customColor, 0.18)}`
              }}
            >
              <Gamepad2 className="h-5 w-5" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white font-display leading-none">
                  WE SPACE
                </span>
                <span 
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono border leading-none"
                  style={{
                    backgroundColor: getRgba(customColor, 0.12),
                    color: customColor,
                    borderColor: getRgba(customColor, 0.3)
                  }}
                >
                  v4.2
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono tracking-tight mt-0.5 hidden sm:inline">
                REPUTATION & CLIPPER HUB
              </span>
            </div>
          </div>

          {/* Subtle Divider & Background Engine Telemetry Indicator */}
          <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-zinc-800/80">
            <button
              onClick={() => handleNavClick('clipper')}
              className="flex items-center gap-2 rounded-full bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/90 px-2.5 py-1 text-[11px] font-mono text-zinc-300 transition-colors cursor-pointer"
              title="Buffer Circular de 60s em Memória Ativo"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-zinc-400">Buffer:</span>
              <span className="text-emerald-400 font-semibold">60s Ativo</span>
            </button>
          </div>
        </div>

        {/* CENTER: Unified Segmented Navigation Dock */}
        <nav className="hidden md:flex items-center bg-zinc-900/70 p-1 rounded-xl border border-zinc-800/90 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white bg-zinc-950 shadow-sm border border-zinc-700/80'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                }`}
              >
                <Icon 
                  className="h-3.5 w-3.5 transition-colors" 
                  style={{ color: isActive ? customColor : undefined }}
                />
                <span className="hidden lg:inline">{item.label}</span>
                <span className="lg:hidden">{item.shortLabel}</span>
                {item.badge && (
                  <span 
                    className="text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold leading-tight"
                    style={{
                      backgroundColor: getRgba(customColor, 0.14),
                      color: customColor,
                      borderColor: getRgba(customColor, 0.35)
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span 
                    className="absolute -bottom-1 left-3 right-3 h-[2px] rounded-full"
                    style={{ backgroundColor: customColor }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* RIGHT: Clean Actions & Consolidated Studio Preferences */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Consolidated Interface & Audio Settings Popover */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                soundFx.playTactileClick();
                setIsSettingsOpen(!isSettingsOpen);
              }}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-mono transition-all cursor-pointer ${
                isSettingsOpen
                  ? 'bg-zinc-900 border-zinc-700 text-white'
                  : 'bg-zinc-900/70 border-zinc-800/90 text-zinc-300 hover:border-zinc-700 hover:text-white'
              }`}
              title="Preferências Visuais & Áudio Tático"
            >
              <span 
                className="h-3 w-3 rounded-full border border-white/30 shrink-0"
                style={{ backgroundColor: customColor }}
              />
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
              <span className="hidden xl:inline text-[11px] font-medium">Aparência</span>
              <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isSettingsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-4 shadow-2xl space-y-4 z-50 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: customColor }} />
                    Preferências da Interface
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">{themeConfig.label}</span>
                </div>

                {/* Quick Color Swatches */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-zinc-400 block">
                    Cor de Destaque (HUD & Telemetria)
                  </label>
                  <div className="flex items-center justify-between gap-1.5 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800/80">
                    {PRESET_PALETTES.map((preset) => {
                      const isSelected = customColor.toLowerCase() === preset.hex.toLowerCase();
                      return (
                        <button
                          key={preset.id}
                          onClick={() => selectPreset(preset.id)}
                          className={`h-6 w-6 rounded-lg transition-all cursor-pointer ${
                            isSelected ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.label}
                        />
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      soundFx.playTactileClick();
                      setIsSettingsOpen(false);
                      setIsPaletteModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Palette className="h-3.5 w-3.5" style={{ color: customColor }} />
                    <span>Abrir Seletor RGB Completo</span>
                  </button>
                </div>

                {/* Audio FX Switch */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-semibold text-zinc-200">Sons Táticos (UI FX)</p>
                    <p className="text-[10px] text-zinc-500 font-mono">Feedback sonoro de cliques e radar</p>
                  </div>
                  <button
                    onClick={toggleAudioMute}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      !isAudioMuted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    {!isAudioMuted ? (
                      <>
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>ON</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-3.5 w-3.5" />
                        <span>OFF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary CTA: Publish Highlight */}
          <button
            onClick={() => {
              soundFx.playTactileClick();
              onOpenCreateModal();
            }}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer"
            style={{
              backgroundColor: customColor,
              color: isLight ? '#09090b' : '#09090b',
              boxShadow: `0 4px 16px ${getRgba(customColor, 0.25)}`
            }}
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Publicar Clipe</span>
            <span className="sm:hidden">Clipe</span>
          </button>

          {/* User Profile Pill */}
          <button
            onClick={() => {
              soundFx.playTactileClick();
              onSelectPlayer(currentUser.id);
              setActiveTab('profiles');
            }}
            className="flex items-center gap-2.5 rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-1 pr-3 hover:border-zinc-700 hover:bg-zinc-900 transition-all cursor-pointer"
            title="Abrir Meu Perfil & DNA Competitivo"
          >
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="h-7 w-7 rounded-lg object-cover border border-zinc-700"
              />
              <span 
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950"
                style={{ backgroundColor: customColor }}
              />
            </div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-zinc-100 truncate max-w-[110px]">
                {currentUser.username.split(' ')[1]?.replace(/"/g, '') || currentUser.username}
              </span>
              <span 
                className="text-[10px] font-mono font-semibold"
                style={{ color: customColor }}
              >
                {currentUser.reputationScore}% Karma
              </span>
            </div>
          </button>

        </div>

      </div>

      {/* Mobile Submenu Bar */}
      <div className="flex md:hidden overflow-x-auto border-t border-zinc-800/80 bg-zinc-950 px-3 py-2 gap-1.5 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'text-white bg-zinc-900 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/40'
              }`}
            >
              <Icon 
                className="h-3.5 w-3.5" 
                style={{ color: isActive ? customColor : undefined }}
              />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
