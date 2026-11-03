import React from 'react';
import {
  ChevronUp,
  Gamepad2,
  Zap,
  ShieldCheck,
  Calendar,
  HelpCircle,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { AnalyticsEventPayload } from '../types/game';

interface SeoDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onScrollToPlay: () => void;
  recentEvents: AnalyticsEventPayload[];
  demoAdProviderEnabled: boolean;
  onToggleDemoAdProvider: () => void;
}

export const SeoDrawer: React.FC<SeoDrawerProps> = ({
  isOpen,
  onToggle,
  onScrollToPlay,
  recentEvents,
  demoAdProviderEnabled,
  onToggleDemoAdProvider,
}) => {
  return (
    <main className="relative z-20 w-full bg-[#06070E] border-t border-slate-800/80 text-slate-300">
      {/* Sticky Drawer Handle Bar */}
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono-telemetry text-slate-400">
          <Gamepad2 className="w-4 h-4 text-[#00F5D4]" />
          <span className="font-bold text-slate-200">NEON RUSH</span>
          <span className="hidden sm:inline">— Free Online Endless Racing Game</span>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="px-3.5 py-1 rounded-full bg-[#0D1021] hover:bg-slate-900 border border-[#00F5D4]/40 text-[#00F5D4] text-xs font-mono-telemetry flex items-center gap-1.5 transition cursor-pointer"
        >
          <span>{isOpen ? 'HIDE GAME GUIDE & FAQ' : 'GAME GUIDE & FAQ'}</span>
          <ChevronUp
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Semantic HTML Landing Page Content */}
      <div
        className={`max-w-5xl mx-auto px-4 sm:px-6 transition-all duration-300 ${
          isOpen ? 'py-8 opacity-100' : 'py-6 opacity-95'
        }`}
      >
        <article className="space-y-10">
          {/* Play NEON RUSH Online Section */}
          <section aria-labelledby="play-neon-rush-online" className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#00F5D4]/10 border border-[#00F5D4]/30 text-[#00F5D4] text-[11px] font-mono-telemetry uppercase">
                INSTANT BROWSER ARCADE
              </div>
              <h2
                id="play-neon-rush-online"
                className="font-display italic font-bold text-2xl sm:text-3xl text-white uppercase"
              >
                Play NEON RUSH Online – Free Endless Synthwave Racing Game
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                <strong>NEON RUSH</strong> is a fast-paced, futuristic endless arcade runner built
                for instant browser play on desktop and mobile devices. Pilot a high-velocity
                vector interceptor along a 5-lane procedural synthwave grid, dodge laser barriers
                and sweeping sentinel drones, and chain energy orbs to push your score multiplier to
                the limit.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Designed around crisp 60 FPS telemetry feedback, every run lasts between 30 seconds
                and 3 minutes—making it easy to learn in your first 5 seconds while offering deep
                high-score mastery through razor-close near-misses and daily seeded tracks.
              </p>
            </div>

            <div className="telemetry-glass rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white uppercase mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FEE440]" />
                  <span>KEY FEATURES</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-300 font-mono-telemetry">
                  <li>• 60 FPS Pseudo-3D Neon Vector Engine</li>
                  <li>• 5-Lane Spring-Damped Steering</li>
                  <li>• Up to 8x Energy Orb Combo Multiplier</li>
                  <li>• Near-Miss Doppler Grazing Bonuses</li>
                  <li>• Seeded Daily Challenge &amp; Modifiers</li>
                  <li>• No Installation or Account Required</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onScrollToPlay}
                className="neon-btn-primary mt-4 w-full py-2.5 rounded-xl font-display font-bold text-sm uppercase tracking-wider cursor-pointer"
              >
                JUMP BACK TO COCKPIT
              </button>
            </div>
          </section>

          {/* How to Play & Scoring Breakdown */}
          <section
            aria-labelledby="how-to-play-heading"
            className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80"
          >
            <div className="rounded-xl bg-[#0D1021]/90 border border-slate-800 p-5">
              <div className="flex items-center gap-2 text-[#00F5D4] font-display font-bold text-base uppercase mb-2">
                <Zap className="w-4 h-4" />
                <h3 id="how-to-play-heading">1. Responsive Controls</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Your futuristic vehicle accelerates forward automatically. On desktop, use{' '}
                <strong>A / D</strong> or the <strong>Left / Right Arrow keys</strong> to shift
                lanes. On mobile phones and tablets, <strong>swipe left or right</strong> anywhere
                on the screen or use the ergonomic corner touch buttons.
              </p>
            </div>

            <div className="rounded-xl bg-[#0D1021]/90 border border-slate-800 p-5">
              <div className="flex items-center gap-2 text-[#FEE440] font-display font-bold text-base uppercase mb-2">
                <ShieldCheck className="w-4 h-4" />
                <h3>2. Near-Misses &amp; Combos</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Collect golden energy orbs consecutively to raise your combo multiplier from{' '}
                <strong>1x up to 8x</strong>. Passing an obstacle in an adjacent lane without
                crashing triggers a <strong>NEAR MISS (+150× bonus)</strong> and recharges your
                combo decay gauge.
              </p>
            </div>

            <div className="rounded-xl bg-[#0D1021]/90 border border-slate-800 p-5">
              <div className="flex items-center gap-2 text-[#FF2A85] font-display font-bold text-base uppercase mb-2">
                <Calendar className="w-4 h-4" />
                <h3>3. Daily Seeded Challenge</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Every 24 hours at midnight, NEON RUSH generates a deterministic{' '}
                <strong>Daily Challenge</strong> seeded by the calendar date. Every attempt on that
                day spawns the exact same sequence of obstacles, orbs, and modifiers so you can
                perfect your route and chase the Apex medal.
              </p>
            </div>
          </section>

          {/* Frequently Asked Questions (FAQ) */}
          <section aria-labelledby="faq-heading" className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-[#00F5D4]" />
              <h2
                id="faq-heading"
                className="font-display italic font-bold text-xl sm:text-2xl text-white uppercase"
              >
                Frequently Asked Questions (FAQ)
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <details className="group rounded-xl bg-[#0D1021]/80 border border-slate-800 p-4 open:border-[#00F5D4]/50">
                <summary className="font-display font-bold text-sm sm:text-base text-white cursor-pointer list-none flex items-center justify-between">
                  <span>How do I score higher in NEON RUSH?</span>
                  <span className="text-[#00F5D4] font-mono-telemetry text-xs group-open:rotate-45 transition">
                    +
                  </span>
                </summary>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Focus on maintaining your 8x combo streak by collecting energy orbs along safe
                  corridors. When orbs are scarce, deliberately skim one lane away from obstacles to
                  trigger a Near-Miss bonus—this both awards multiplied points and extends your
                  active combo timer.
                </p>
              </details>

              <details className="group rounded-xl bg-[#0D1021]/80 border border-slate-800 p-4 open:border-[#00F5D4]/50">
                <summary className="font-display font-bold text-sm sm:text-base text-white cursor-pointer list-none flex items-center justify-between">
                  <span>How does the Daily Challenge work without an account?</span>
                  <span className="text-[#00F5D4] font-mono-telemetry text-xs group-open:rotate-45 transition">
                    +
                  </span>
                </summary>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  The Daily Challenge uses a deterministic Mulberry32 pseudo-random number generator
                  seeded with today&apos;s date (YYYY-MM-DD). Because the seed is identical for
                  everyone on the same day, the obstacle patterns and modifiers are 100% consistent
                  without requiring any login or server account.
                </p>
              </details>

              <details className="group rounded-xl bg-[#0D1021]/80 border border-slate-800 p-4 open:border-[#00F5D4]/50">
                <summary className="font-display font-bold text-sm sm:text-base text-white cursor-pointer list-none flex items-center justify-between">
                  <span>Is my high score saved automatically?</span>
                  <span className="text-[#00F5D4] font-mono-telemetry text-xs group-open:rotate-45 transition">
                    +
                  </span>
                </summary>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Yes. Your all-time Endless Best Score, Daily Challenge records, unlocked ship
                  chassis presets, and audio preferences are saved automatically in your
                  browser&apos;s localStorage, with an automatic in-memory fallback if private
                  browsing restricts storage.
                </p>
              </details>

              <details className="group rounded-xl bg-[#0D1021]/80 border border-slate-800 p-4 open:border-[#00F5D4]/50">
                <summary className="font-display font-bold text-sm sm:text-base text-white cursor-pointer list-none flex items-center justify-between">
                  <span>Does the game pause if I switch browser tabs?</span>
                  <span className="text-[#00F5D4] font-mono-telemetry text-xs group-open:rotate-45 transition">
                    +
                  </span>
                </summary>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Yes! NEON RUSH listens for browser tab visibility changes and window blur events.
                  If you switch tabs or minimize the browser during a run, the game pauses
                  immediately and waits for you to safely resume.
                </p>
              </details>
            </div>
          </section>

          {/* Portal SDK Telemetry & AdManager Architecture Inspector */}
          <section
            aria-labelledby="telemetry-inspector-heading"
            className="pt-4 border-t border-slate-800/80"
          >
            <div className="rounded-xl bg-[#090B16] border border-slate-800/90 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00F5D4]" />
                  <h3
                    id="telemetry-inspector-heading"
                    className="font-mono-telemetry text-xs font-bold uppercase tracking-wider text-slate-200"
                  >
                    PORTAL SDK TELEMETRY &amp; ADMANAGER STATUS
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={onToggleDemoAdProvider}
                  className={`px-3 py-1 rounded-md text-[11px] font-mono-telemetry border transition cursor-pointer ${
                    demoAdProviderEnabled
                      ? 'bg-[#FEE440]/15 border-[#FEE440] text-[#FEE440]'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {demoAdProviderEnabled
                    ? 'REWARDED AD SDK ADAPTER: CONNECTED'
                    : 'CONNECT OPTIONAL REWARDED AD SDK ADAPTER'}
                </button>
              </div>

              <div className="text-[11px] font-mono-telemetry text-slate-400 mb-2">
                Recent anonymous analytics events dispatched (Zero PII):
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {recentEvents.length === 0 ? (
                  <span className="text-[11px] font-mono-telemetry text-slate-600">
                    No events recorded yet. Press PLAY to emit game_started.
                  </span>
                ) : (
                  recentEvents.slice(0, 10).map((ev, i) => (
                    <span
                      key={`${ev.timestamp}-${i}`}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono-telemetry text-[#00F5D4]"
                    >
                      {ev.event}
                      {ev.properties?.score !== undefined ? ` (${ev.properties.score})` : ''}
                    </span>
                  ))
                )}
              </div>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
};
