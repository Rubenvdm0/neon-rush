import React from 'react';
import { Pause, Volume2, VolumeX, ChevronLeft, ChevronRight, Flame, Shield } from 'lucide-react';
import { RunTelemetry } from '../types/game';
import { formatDuration, formatScore } from './GameModals';

interface GameHudProps {
  telemetry: RunTelemetry;
  muted: boolean;
  showTouchButtons: boolean;
  invulnerableSeconds: number;
  onToggleMute: () => void;
  onPause: () => void;
  onSteerLeft: () => void;
  onSteerRight: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  telemetry,
  muted,
  showTouchButtons,
  invulnerableSeconds,
  onToggleMute,
  onPause,
  onSteerLeft,
  onSteerRight,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* Top Telemetry Bar */}
      <div className="flex items-start justify-between gap-2 w-full max-w-6xl mx-auto">
        {/* Top-Left: Score, Best, Distance */}
        <div className="telemetry-glass rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 flex items-center gap-4 sm:gap-6">
          <div>
            <div className="text-[10px] font-mono-telemetry uppercase tracking-widest text-slate-400">
              SCORE
            </div>
            <div className="text-xl sm:text-3xl font-mono-telemetry font-extrabold text-white leading-tight">
              {formatScore(telemetry.score)}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden xs:block" />

          <div>
            <div className="text-[10px] font-mono-telemetry uppercase tracking-widest text-slate-400">
              DISTANCE
            </div>
            <div className="text-sm sm:text-lg font-mono-telemetry font-bold text-[#00F5D4]">
              {Math.floor(telemetry.distanceMeters)}m
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="text-[10px] font-mono-telemetry uppercase tracking-widest text-slate-400">
              BEST
            </div>
            <div className="text-sm sm:text-lg font-mono-telemetry font-bold text-[#FEE440]">
              {formatScore(Math.max(telemetry.bestScore, Math.floor(telemetry.score)))}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="text-[10px] font-mono-telemetry uppercase tracking-widest text-slate-400">
              TIME
            </div>
            <div className="text-sm sm:text-lg font-mono-telemetry font-bold text-slate-200">
              {formatDuration(telemetry.survivalTimeSeconds)}
            </div>
          </div>
        </div>

        {/* Top-Center: Combo Multiplier Gauge & Speed Phase */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${
              telemetry.currentCombo >= 4
                ? 'telemetry-glass-magenta scale-105'
                : telemetry.currentCombo >= 2
                ? 'telemetry-glass-amber'
                : 'telemetry-glass'
            }`}
          >
            <Flame
              className={`w-4 h-4 ${
                telemetry.currentCombo >= 4
                  ? 'text-[#FF2A85] animate-pulse'
                  : telemetry.currentCombo >= 2
                  ? 'text-[#FEE440]'
                  : 'text-[#00F5D4]'
              }`}
            />
            <span className="font-display italic font-bold text-base sm:text-xl text-white">
              {telemetry.currentCombo}X COMBO
            </span>
            {telemetry.currentCombo > 1 && (
              <div className="w-12 sm:w-16 h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-[#00F5D4] via-[#FEE440] to-[#FF2A85] transition-all duration-75"
                  style={{ width: `${Math.max(4, telemetry.comboTimer * 100)}%` }}
                />
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#06070E]/80 border border-slate-800/80 text-[10px] font-mono-telemetry text-slate-300">
            <span className="text-[#00F5D4] font-bold">{telemetry.speedKmh} KM/H</span>
            <span>•</span>
            <span>{telemetry.speedPhaseName}</span>
          </div>

          {invulnerableSeconds > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#00F5D4]/20 border border-[#00F5D4] text-[#00F5D4] text-[10px] font-mono-telemetry font-bold animate-pulse">
              <Shield className="w-3 h-3" />
              <span>PHASE SHIELD: {invulnerableSeconds.toFixed(1)}s</span>
            </div>
          )}
        </div>

        {/* Top-Right: Mute & Pause */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
            className="telemetry-glass p-2.5 sm:p-3 rounded-xl hover:border-[#00F5D4] text-slate-200 transition cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-5 h-5 text-[#FF2A85]" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#00F5D4]" />
            )}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Game"
            className="telemetry-glass px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-xl hover:border-[#00F5D4] text-slate-200 flex items-center gap-1.5 font-mono-telemetry text-xs transition cursor-pointer"
          >
            <Pause className="w-5 h-5 text-[#00F5D4]" />
            <span className="hidden sm:inline">PAUSE</span>
          </button>
        </div>
      </div>

      {/* Bottom Ergonomic Touch Steering Zones (Optional & Mobile Friendly) */}
      {showTouchButtons && (
        <div className="pointer-events-auto w-full max-w-5xl mx-auto pb-12 sm:pb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onSteerLeft();
            }}
            aria-label="Steer Left"
            className="w-32 sm:w-40 h-20 sm:h-24 rounded-2xl bg-[#0D1021]/65 active:bg-[#00F5D4]/30 border-2 border-[#00F5D4]/45 active:border-[#00F5D4] backdrop-blur-md flex flex-col items-center justify-center text-[#00F5D4] shadow-lg transition active:scale-95 cursor-pointer select-none touch-manipulation"
          >
            <ChevronLeft className="w-9 h-9" />
            <span className="text-[10px] font-mono-telemetry font-bold tracking-widest uppercase">
              STEER LEFT
            </span>
          </button>

          <div className="text-center hidden xs:block pointer-events-none">
            <div className="text-[10px] font-mono-telemetry uppercase tracking-widest text-slate-400/80 bg-[#06070E]/60 px-3 py-1 rounded-full border border-slate-800/60">
              SWIPE OR TAP TO STEER
            </div>
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onSteerRight();
            }}
            aria-label="Steer Right"
            className="w-32 sm:w-40 h-20 sm:h-24 rounded-2xl bg-[#0D1021]/65 active:bg-[#00F5D4]/30 border-2 border-[#00F5D4]/45 active:border-[#00F5D4] backdrop-blur-md flex flex-col items-center justify-center text-[#00F5D4] shadow-lg transition active:scale-95 cursor-pointer select-none touch-manipulation"
          >
            <ChevronRight className="w-9 h-9" />
            <span className="text-[10px] font-mono-telemetry font-bold tracking-widest uppercase">
              STEER RIGHT
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
