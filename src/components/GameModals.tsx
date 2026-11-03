import React from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Calendar,
  HelpCircle,
  Trophy,
  Share2,
  RotateCcw,
  Home,
  Zap,
  ShieldAlert,
  Sparkles,
  Clock,
  ChevronRight,
  Check,
  Award,
  Sliders,
  Smartphone,
  Keyboard,
} from 'lucide-react';
import {
  ChallengeModifier,
  DailyChallengeConfig,
  DailyLeaderboardEntry,
  RunTelemetry,
  ScreenState,
  ShipPreset,
} from '../types/game';
import { SHIP_PRESETS } from '../services/storage';
import { AdBannerSlot } from './AdBannerSlot';

export function formatScore(val: number): string {
  return Math.floor(val).toLocaleString('en-US');
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface HomeModalProps {
  bestScore: number;
  dailyBestScore: number;
  dailyConfig: DailyChallengeConfig;
  dailyCountdown: string;
  activeModifier: ChallengeModifier;
  onCycleModifier: () => void;
  selectedShipId: string;
  onSelectShip: (id: string) => void;
  muted: boolean;
  onToggleMute: () => void;
  showTouchButtons: boolean;
  onToggleTouchButtons: () => void;
  onStartEndless: () => void;
  onOpenDaily: () => void;
  onOpenHowToPlay: () => void;
}

export const HomeModal: React.FC<HomeModalProps> = ({
  bestScore,
  dailyBestScore,
  dailyConfig,
  dailyCountdown,
  activeModifier,
  onCycleModifier,
  selectedShipId,
  onSelectShip,
  muted,
  onToggleMute,
  showTouchButtons,
  onToggleTouchButtons,
  onStartEndless,
  onOpenDaily,
  onOpenHowToPlay,
}) => {
  const highestScoreOverall = Math.max(bestScore, dailyBestScore);

  return (
    <div className="pointer-events-auto w-full max-w-xl mx-auto px-4 py-3 flex flex-col items-center justify-center z-20">
      <div className="telemetry-glass w-full rounded-2xl p-5 sm:p-7 border border-[#00F5D4]/30 relative overflow-hidden">
        {/* Subtle top neon accent bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#00F5D4] via-[#FF2A85] to-[#FEE440]" />

        {/* Header Top Telemetry Bar */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#06070E]/80 border border-slate-800 text-[11px] font-mono-telemetry text-[#00F5D4]">
            <span className="h-2 w-2 rounded-full bg-[#00F5D4] animate-ping" />
            <span>SYS.ONLINE // 60FPS</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTouchButtons}
              title="Toggle On-Screen Touch Buttons"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono-telemetry flex items-center gap-1.5 transition cursor-pointer ${
                showTouchButtons
                  ? 'bg-[#00F5D4]/15 border-[#00F5D4]/50 text-[#00F5D4]'
                  : 'bg-[#06070E]/70 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TOUCH PAD:</span>
              <span>{showTouchButtons ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
              className="px-3 py-1.5 rounded-lg bg-[#06070E]/80 border border-slate-700/80 hover:border-[#00F5D4] text-slate-200 flex items-center gap-1.5 text-xs font-mono-telemetry transition cursor-pointer"
            >
              {muted ? (
                <>
                  <VolumeX className="w-4 h-4 text-[#FF2A85]" />
                  <span>MUTED</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-[#00F5D4]" />
                  <span>SOUND ON</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* NEON RUSH Hero Logo */}
        <div className="text-center my-2 sm:my-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FF2A85]/15 border border-[#FF2A85]/40 text-[#FF2A85] text-[10px] font-mono-telemetry tracking-widest uppercase mb-2">
            <Zap className="w-3 h-3" />
            <span>HIGH-VELOCITY SYNTHWAVE TELEMETRY</span>
          </div>
          <h1 className="font-display italic font-bold tracking-wider text-4xl sm:text-6xl text-white uppercase leading-none">
            <span className="text-[#00F5D4] neon-text-cyan">NEON</span>{' '}
            <span className="text-[#FF2A85] neon-text-magenta">RUSH</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
            Steer left &amp; right at breakneck speed. Graze obstacles for near-miss bonuses and chain golden energy orbs up to <span className="text-[#FEE440] font-semibold">8x Overdrive</span>.
          </p>
        </div>

        {/* High Score & Active Run Modifier Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
          <div className="rounded-xl bg-[#06070E]/85 border border-slate-800/90 px-3.5 py-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono-telemetry uppercase tracking-wider text-slate-400">
                ALL-TIME BEST SCORE
              </div>
              <div className="text-xl sm:text-2xl font-mono-telemetry font-extrabold text-[#FEE440]">
                {formatScore(bestScore)}
              </div>
            </div>
            <Trophy className="w-7 h-7 text-[#FEE440]/80" />
          </div>

          <button
            type="button"
            onClick={onCycleModifier}
            className="rounded-xl bg-[#06070E]/85 border border-slate-800/90 hover:border-[#00F5D4]/60 px-3.5 py-2.5 flex items-center justify-between text-left transition group cursor-pointer"
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono-telemetry uppercase tracking-wider text-slate-400">
                <Sliders className="w-3 h-3 text-[#00F5D4]" />
                <span>RUN MODIFIER (TAP TO CYCLE)</span>
              </div>
              <div
                className="text-xs sm:text-sm font-display font-bold truncate mt-0.5"
                style={{ color: activeModifier.accentColor }}
              >
                {activeModifier.name}
              </div>
              <div className="text-[10px] font-mono-telemetry text-slate-400 truncate">
                {activeModifier.shortTag}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#00F5D4] group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        </div>

        {/* Ship Hull Selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] font-mono-telemetry uppercase tracking-wider text-slate-400 mb-1.5">
            <span>INTERCEPTOR CHASSIS</span>
            <span>UNLOCK MORE BY SCORING HIGH</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SHIP_PRESETS.map((ship: ShipPreset) => {
              const unlocked = highestScoreOverall >= ship.unlockScore;
              const selected = selectedShipId === ship.id;
              return (
                <button
                  key={ship.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && onSelectShip(ship.id)}
                  className={`rounded-lg px-2.5 py-2 border text-left transition relative overflow-hidden ${
                    selected
                      ? 'bg-[#00F5D4]/15 border-[#00F5D4] text-white'
                      : unlocked
                      ? 'bg-[#06070E]/75 border-slate-800 hover:border-slate-600 text-slate-300 cursor-pointer'
                      : 'bg-[#06070E]/40 border-slate-900 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: ship.primaryColor,
                        boxShadow: `0 0 8px ${ship.primaryColor}`,
                      }}
                    />
                    {selected && <Check className="w-3.5 h-3.5 text-[#00F5D4]" />}
                  </div>
                  <div className="font-display font-bold text-[11px] truncate">{ship.name}</div>
                  <div className="font-mono-telemetry text-[9px] text-slate-400">
                    {unlocked ? 'READY' : `REQ ${formatScore(ship.unlockScore)}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Action CTAs */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onStartEndless}
            className="neon-btn-primary w-full py-3.5 sm:py-4 rounded-xl font-display font-bold text-lg sm:text-xl tracking-wider uppercase flex items-center justify-center gap-3 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>PLAY NEON RUSH</span>
            <span className="text-xs font-mono-telemetry bg-[#06070E]/20 px-2 py-0.5 rounded hidden sm:inline">
              [SPACE]
            </span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenDaily}
              className="neon-btn-magenta w-full py-3 px-4 rounded-xl font-display font-bold text-sm sm:text-base tracking-wide uppercase flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>DAILY CHALLENGE</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono-telemetry font-bold rounded bg-[#FEE440] text-[#06070E]">
                TODAY
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenHowToPlay}
              className="w-full py-3 px-4 rounded-xl bg-[#06070E]/90 hover:bg-slate-900 border border-slate-700 hover:border-[#00F5D4] font-display font-bold text-sm sm:text-base tracking-wide uppercase text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#00F5D4]" />
              <span>HOW TO PLAY</span>
            </button>
          </div>
        </div>

        {/* Footer Daily Preview Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-telemetry text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-[#FF2A85] font-bold">{dailyConfig.codeName}:</span>
            <span className="text-slate-300 truncate max-w-[180px] sm:max-w-none">
              {dailyConfig.sectorTitle}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#00F5D4]">
            <Clock className="w-3.5 h-3.5" />
            <span>NEXT IN {dailyCountdown}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DailyChallengeModalProps {
  config: DailyChallengeConfig;
  bestScore: number;
  countdown: string;
  leaderboard: DailyLeaderboardEntry[];
  onStartDaily: () => void;
  onBack: () => void;
}

export const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({
  config,
  bestScore,
  countdown,
  leaderboard,
  onStartDaily,
  onBack,
}) => {
  return (
    <div className="pointer-events-auto w-full max-w-2xl mx-auto px-4 py-3 flex flex-col items-center justify-center z-20">
      <div className="telemetry-glass-magenta w-full rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#FF2A85] via-[#FEE440] to-[#00F5D4]" />

        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#FEE440] text-[#06070E] font-mono-telemetry font-extrabold text-xs uppercase">
              TODAY
            </span>
            <span className="font-mono-telemetry text-xs text-[#00F5D4]">{config.codeName}</span>
            <span className="text-xs font-mono-telemetry text-slate-400">({config.dateKey})</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#06070E]/80 border border-slate-800 text-xs font-mono-telemetry text-[#FEE440]">
            <Clock className="w-3.5 h-3.5" />
            <span>NEXT TRACK IN {countdown}</span>
          </div>
        </div>

        <h2 className="font-display italic font-bold text-2xl sm:text-3xl text-white uppercase tracking-wide">
          {config.sectorTitle}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Fixed deterministic seed (<span className="font-mono-telemetry text-[#00F5D4]">#{config.seed.toString(16).toUpperCase()}</span>). Every attempt today spawns the exact same obstacle sequence.
        </p>

        {/* Challenge Parameters & Best Score */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-4">
          <div className="rounded-xl bg-[#06070E]/80 border border-slate-800 p-3">
            <div className="text-[10px] font-mono-telemetry uppercase text-slate-400">
              TODAY&apos;S BEST SCORE
            </div>
            <div className="text-2xl font-mono-telemetry font-extrabold text-[#FEE440] mt-0.5">
              {formatScore(bestScore)}
            </div>
          </div>

          <div className="rounded-xl bg-[#06070E]/80 border border-slate-800 p-3">
            <div className="text-[10px] font-mono-telemetry uppercase text-slate-400">
              SECTOR DIFFICULTY
            </div>
            <div className="text-base font-display font-bold text-[#FF2A85] mt-0.5 flex items-center gap-1.5">
              <span>{config.difficultyLabel}</span>
              <span className="text-[#FEE440] text-xs">
                {'★'.repeat(config.difficultyStars)}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-[#06070E]/80 border border-slate-800 p-3">
            <div className="text-[10px] font-mono-telemetry uppercase text-slate-400">
              ACTIVE MODIFIER
            </div>
            <div
              className="text-sm font-display font-bold truncate mt-0.5"
              style={{ color: config.primaryModifier.accentColor }}
            >
              {config.primaryModifier.name}
            </div>
            <div className="text-[10px] font-mono-telemetry text-slate-400 truncate">
              {config.primaryModifier.shortTag}
            </div>
          </div>
        </div>

        {/* Medal Targets Strip */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'BRONZE', score: config.targetMedals.bronze, color: '#CD7F32' },
            { label: 'SILVER', score: config.targetMedals.silver, color: '#94A3B8' },
            { label: 'GOLD', score: config.targetMedals.gold, color: '#FEE440' },
            { label: 'APEX', score: config.targetMedals.apex, color: '#00F5D4' },
          ].map((m) => {
            const achieved = bestScore >= m.score;
            return (
              <div
                key={m.label}
                className={`rounded-lg px-2.5 py-1.5 border text-center ${
                  achieved
                    ? 'bg-[#00F5D4]/15 border-[#00F5D4]/60'
                    : 'bg-[#06070E]/60 border-slate-800/80'
                }`}
              >
                <div
                  className="text-[10px] font-mono-telemetry font-bold flex items-center justify-center gap-1"
                  style={{ color: m.color }}
                >
                  <Award className="w-3 h-3" />
                  <span>{m.label}</span>
                </div>
                <div className="text-xs font-mono-telemetry text-slate-200">
                  {formatScore(m.score)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Daily Leaderboard Table */}
        <div className="rounded-xl bg-[#06070E]/90 border border-slate-800 overflow-hidden mb-4">
          <div className="px-3.5 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[10px] font-mono-telemetry uppercase tracking-wider text-slate-400">
            <span>DAILY SECTOR STANDINGS (LOCAL + PACE BENCHMARKS)</span>
            <span>SCORE // DIST</span>
          </div>
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/60">
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.id}
                className={`px-3.5 py-2 flex items-center justify-between text-xs font-mono-telemetry ${
                  entry.isPlayer
                    ? 'bg-[#00F5D4]/12 text-[#00F5D4] font-bold'
                    : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 text-slate-500">#{idx + 1}</span>
                  <span className="truncate">{entry.pilotTag}</span>
                  {entry.isPlayer && (
                    <span className="px-1.5 py-0.2 rounded bg-[#00F5D4]/20 text-[#00F5D4] text-[9px]">
                      YOU
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-slate-400 text-[11px]">{entry.distance}m</span>
                  <span className="text-white font-bold w-16 text-right">
                    {formatScore(entry.score)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onStartDaily}
            className="neon-btn-primary flex-1 py-3.5 rounded-xl font-display font-bold text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>LAUNCH DAILY TRACK</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3.5 rounded-xl bg-[#06070E] hover:bg-slate-900 border border-slate-700 font-display font-bold text-sm uppercase tracking-wider text-slate-300 cursor-pointer"
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    </div>
  );
};

interface HowToPlayModalProps {
  onClose: () => void;
  onStartPlay: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose, onStartPlay }) => {
  return (
    <div className="pointer-events-auto w-full max-w-xl mx-auto px-4 py-3 flex flex-col items-center justify-center z-20">
      <div className="telemetry-glass w-full rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#00F5D4] to-[#00BBF9]" />

        <h2 className="font-display italic font-bold text-2xl sm:text-3xl text-white uppercase mb-1">
          PILOT BRIEFING // HOW TO PLAY
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-4">
          Master the 5-lane synthwave corridor in seconds.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-[#06070E]/85 border border-slate-800 p-3.5">
            <div className="flex items-center gap-2 text-[#00F5D4] font-display font-bold text-sm mb-1.5">
              <Keyboard className="w-4 h-4" />
              <span>DESKTOP CONTROLS</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[#00F5D4] font-mono-telemetry">A</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[#00F5D4] font-mono-telemetry">←</kbd> to steer Left, and <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[#00F5D4] font-mono-telemetry">D</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[#00F5D4] font-mono-telemetry">→</kbd> to steer Right. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-telemetry">P</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-telemetry">ESC</kbd> to pause.
            </p>
          </div>

          <div className="rounded-xl bg-[#06070E]/85 border border-slate-800 p-3.5">
            <div className="flex items-center gap-2 text-[#FF2A85] font-display font-bold text-sm mb-1.5">
              <Smartphone className="w-4 h-4" />
              <span>MOBILE &amp; TOUCH</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Swipe left or right anywhere on the screen, or tap the large ergonomic left/right steering zones at the bottom corners.
            </p>
          </div>

          <div className="rounded-xl bg-[#06070E]/85 border border-slate-800 p-3.5">
            <div className="flex items-center gap-2 text-[#FEE440] font-display font-bold text-sm mb-1.5">
              <Sparkles className="w-4 h-4" />
              <span>ENERGY ORBS &amp; 8X COMBO</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Collect golden plasma orbs in a row to build your multiplier from <span className="text-[#FEE440] font-mono-telemetry">1x</span> up to <span className="text-[#FEE440] font-mono-telemetry">8x</span>. Keep collecting or grazing to prevent the combo gauge from decaying!
            </p>
          </div>

          <div className="rounded-xl bg-[#06070E]/85 border border-slate-800 p-3.5">
            <div className="flex items-center gap-2 text-[#00F5D4] font-display font-bold text-sm mb-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>NEAR-MISS TELEMETRY</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Skim past red/magenta laser barriers in an adjacent lane at high speed to trigger a <span className="text-[#00F5D4] font-mono-telemetry">+150× NEAR MISS</span> bonus and recharge your combo timer.
            </p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onStartPlay}
            className="neon-btn-primary flex-1 py-3 rounded-xl font-display font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>LAUNCH NOW</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-[#06070E] border border-slate-700 font-display font-bold text-sm uppercase text-slate-300 cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  telemetry: RunTelemetry;
  autoPausedByVisibility: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  telemetry,
  autoPausedByVisibility,
  onResume,
  onRestart,
  onHome,
}) => {
  return (
    <div className="pointer-events-auto w-full max-w-md mx-auto px-4 z-20">
      <div className="telemetry-glass w-full rounded-2xl p-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#00F5D4]/15 border border-[#00F5D4]/40 text-[#00F5D4] text-[10px] font-mono-telemetry uppercase mb-2">
          {autoPausedByVisibility ? 'AUTO-PAUSED // TAB INACTIVE' : 'TELEMETRY HOLD'}
        </div>
        <h2 className="font-display italic font-bold text-3xl text-white uppercase mb-1">
          SYSTEM PAUSED
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Your interceptor is holding position safely in the slipstream.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-lg bg-[#06070E]/80 border border-slate-800 p-2.5">
            <div className="text-[10px] font-mono-telemetry text-slate-400">SCORE</div>
            <div className="text-base font-mono-telemetry font-bold text-white">
              {formatScore(telemetry.score)}
            </div>
          </div>
          <div className="rounded-lg bg-[#06070E]/80 border border-slate-800 p-2.5">
            <div className="text-[10px] font-mono-telemetry text-slate-400">COMBO</div>
            <div className="text-base font-mono-telemetry font-bold text-[#FEE440]">
              {telemetry.currentCombo}x
            </div>
          </div>
          <div className="rounded-lg bg-[#06070E]/80 border border-slate-800 p-2.5">
            <div className="text-[10px] font-mono-telemetry text-slate-400">DISTANCE</div>
            <div className="text-base font-mono-telemetry font-bold text-[#00F5D4]">
              {Math.floor(telemetry.distanceMeters)}m
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="neon-btn-primary w-full py-3.5 rounded-xl font-display font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>RESUME RUN [SPACE]</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="py-3 rounded-xl bg-[#06070E] hover:bg-slate-900 border border-slate-700 font-display font-bold text-xs uppercase text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#00F5D4]" />
              <span>RESTART</span>
            </button>

            <button
              type="button"
              onClick={onHome}
              className="py-3 rounded-xl bg-[#06070E] hover:bg-slate-900 border border-slate-700 font-display font-bold text-xs uppercase text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4 text-[#FF2A85]" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  telemetry: RunTelemetry;
  canRewardedContinue: boolean;
  onRewardedContinue: () => void;
  onPlayAgain: () => void;
  onShareScore: () => void;
  shareFeedback: string | null;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  telemetry,
  canRewardedContinue,
  onRewardedContinue,
  onPlayAgain,
  onShareScore,
  shareFeedback,
  onHome,
}) => {
  return (
    <div className="pointer-events-auto w-full max-w-2xl mx-auto px-4 py-2 flex flex-col items-center justify-center z-20">
      <div className="telemetry-glass-magenta w-full rounded-2xl p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#FF1E42] via-[#FF2A85] to-[#FEE440]" />

        <div className="flex flex-col md:flex-row gap-5 items-center">
          {/* Left Column: Run Telemetry Summary & Viral Loop Controls */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded bg-[#FF1E42]/20 border border-[#FF1E42]/50 text-[#FF1E42] font-mono-telemetry text-[10px] uppercase tracking-widest">
                HULL BREACH // {telemetry.mode === 'DAILY' ? 'DAILY CHALLENGE' : 'ENDLESS RUN'}
              </span>
              {telemetry.isNewBest && (
                <span className="px-2.5 py-0.5 rounded bg-[#FEE440] text-[#06070E] font-mono-telemetry font-extrabold text-[10px] uppercase animate-bounce">
                  ★ NEW RECORD!
                </span>
              )}
            </div>

            <h2 className="font-display italic font-bold text-2xl sm:text-3xl text-white uppercase">
              RUN TERMINATED
            </h2>

            {/* Final Score & Best Score */}
            <div className="grid grid-cols-2 gap-2.5 my-3">
              <div className="rounded-xl bg-[#06070E]/90 border border-[#00F5D4]/40 p-3">
                <div className="text-[10px] font-mono-telemetry uppercase text-slate-400">
                  FINAL SCORE
                </div>
                <div className="text-2xl sm:text-3xl font-mono-telemetry font-extrabold text-[#00F5D4]">
                  {formatScore(telemetry.score)}
                </div>
              </div>

              <div className="rounded-xl bg-[#06070E]/90 border border-slate-800 p-3">
                <div className="text-[10px] font-mono-telemetry uppercase text-slate-400">
                  BEST SCORE
                </div>
                <div className="text-2xl sm:text-3xl font-mono-telemetry font-extrabold text-[#FEE440]">
                  {formatScore(telemetry.bestScore)}
                </div>
              </div>
            </div>

            {/* 4-Stat Telemetry Matrix */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="rounded-lg bg-[#06070E]/75 border border-slate-800/90 p-2 text-center">
                <div className="text-[9px] font-mono-telemetry text-slate-400">SURVIVED</div>
                <div className="text-xs sm:text-sm font-mono-telemetry font-bold text-white">
                  {formatDuration(telemetry.survivalTimeSeconds)}
                </div>
              </div>
              <div className="rounded-lg bg-[#06070E]/75 border border-slate-800/90 p-2 text-center">
                <div className="text-[9px] font-mono-telemetry text-slate-400">DISTANCE</div>
                <div className="text-xs sm:text-sm font-mono-telemetry font-bold text-[#00F5D4]">
                  {Math.floor(telemetry.distanceMeters)}m
                </div>
              </div>
              <div className="rounded-lg bg-[#06070E]/75 border border-slate-800/90 p-2 text-center">
                <div className="text-[9px] font-mono-telemetry text-slate-400">MAX COMBO</div>
                <div className="text-xs sm:text-sm font-mono-telemetry font-bold text-[#FEE440]">
                  {telemetry.maxCombo}x
                </div>
              </div>
              <div className="rounded-lg bg-[#06070E]/75 border border-slate-800/90 p-2 text-center">
                <div className="text-[9px] font-mono-telemetry text-slate-400">NEAR MISS</div>
                <div className="text-xs sm:text-sm font-mono-telemetry font-bold text-[#FF2A85]">
                  {telemetry.nearMissCount}
                </div>
              </div>
            </div>

            {/* Optional Rewarded Ad Continue (Hidden automatically if no real ad provider is configured) */}
            {canRewardedContinue && (
              <button
                type="button"
                onClick={onRewardedContinue}
                className="w-full mb-2.5 py-2.5 px-4 rounded-xl bg-[#FEE440]/15 hover:bg-[#FEE440]/25 border border-[#FEE440] text-[#FEE440] font-display font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Watch an optional ad to continue once?</span>
              </button>
            )}

            {/* Primary Viral Loop Buttons: PLAY AGAIN + SHARE SCORE */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={onPlayAgain}
                className="neon-btn-primary w-full py-3.5 rounded-xl font-display font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>PLAY AGAIN</span>
                <span className="text-xs font-mono-telemetry bg-[#06070E]/20 px-2 py-0.5 rounded hidden sm:inline">
                  [SPACE]
                </span>
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={onShareScore}
                  className="col-span-2 py-2.5 px-3 rounded-xl bg-[#FF2A85]/20 hover:bg-[#FF2A85]/30 border border-[#FF2A85]/60 text-white font-display font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-[#FF2A85]" />
                  <span>{shareFeedback || 'SHARE SCORE'}</span>
                </button>

                <button
                  type="button"
                  onClick={onHome}
                  className="py-2.5 px-3 rounded-xl bg-[#06070E] hover:bg-slate-900 border border-slate-700 text-slate-300 font-display font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>MENU</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Reserved 300x250 Medium Rectangle Ad Slot (strictly separated from gameplay & buttons) */}
          <div className="shrink-0 hidden sm:flex flex-col items-center justify-center border-l border-slate-800/80 pl-5">
            <AdBannerSlot slot="gameover-rectangle" className="w-[260px] h-[210px]" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface CountdownOverlayProps {
  count: number; // 3, 2, 1, 0 ("GO!")
  mode: 'ENDLESS' | 'DAILY';
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count, mode }) => {
  const label = count > 0 ? String(count) : 'GO!';
  const isGo = count === 0;

  return (
    <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center z-20 select-none">
      <div className="text-xs font-mono-telemetry uppercase tracking-widest text-[#00F5D4] mb-2 px-3 py-1 rounded-full bg-[#06070E]/80 border border-[#00F5D4]/30">
        {mode === 'DAILY' ? 'DAILY SEEDED CHALLENGE // LOCKED IN' : 'THRUSTERS ENGAGED // GET READY'}
      </div>
      <div
        key={count}
        className={`animate-countdown font-display italic font-extrabold text-7xl sm:text-9xl tracking-tight ${
          isGo
            ? 'text-[#00F5D4] neon-text-cyan'
            : count === 1
            ? 'text-[#FEE440] neon-text-amber'
            : 'text-white neon-text-magenta'
        }`}
      >
        {label}
      </div>
    </div>
  );
};

export interface GameModalRouterProps {
  screen: ScreenState;
  bestScore: number;
  dailyBestScore: number;
  dailyConfig: DailyChallengeConfig;
  dailyCountdown: string;
  dailyLeaderboard: DailyLeaderboardEntry[];
  activeModifier: ChallengeModifier;
  onCycleModifier: () => void;
  selectedShipId: string;
  onSelectShip: (id: string) => void;
  muted: boolean;
  onToggleMute: () => void;
  showTouchButtons: boolean;
  onToggleTouchButtons: () => void;
  telemetry: RunTelemetry;
  countdownValue: number;
  autoPausedByVisibility: boolean;
  canRewardedContinue: boolean;
  shareFeedback: string | null;
  onStartEndless: () => void;
  onStartDaily: () => void;
  onOpenDaily: () => void;
  onOpenHowToPlay: () => void;
  onBackToHome: () => void;
  onResume: () => void;
  onRestart: () => void;
  onRewardedContinue: () => void;
  onShareScore: () => void;
}
