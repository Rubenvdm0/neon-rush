import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnalyticsEventPayload,
  ChallengeModifier,
  DailyChallengeConfig,
  DailyLeaderboardEntry,
  EnergyOrbEntity,
  FloatingTextEntity,
  GameMode,
  ObstacleEntity,
  ParticleEntity,
  RunTelemetry,
  ScreenState,
} from './types/game';
import { storage, SHIP_PRESETS } from './services/storage';
import { analytics } from './services/analytics';
import { adManager } from './services/ads';
import {
  CHALLENGE_MODIFIERS,
  getCountdownToNextDaily,
  getDailyChallengeForDate,
  getTodayDateKey,
} from './services/dailyChallenge';
import { audio } from './services/audio';
import { PlayerController } from './engine/Player';
import { TrackGenerator } from './engine/TrackGenerator';
import { ScoringSystem } from './engine/CollisionAndScoring';
import { NeonRenderer } from './engine/Renderer';
import { AdBannerSlot } from './components/AdBannerSlot';
import { GameHud } from './components/GameHud';
import {
  CountdownOverlay,
  DailyChallengeModal,
  formatDuration,
  formatScore,
  GameOverModal,
  HomeModal,
  HowToPlayModal,
  PauseModal,
} from './components/GameModals';
import { SeoDrawer } from './components/SeoDrawer';

export function App() {
  // UI Screen State Machine
  const [screen, setScreen] = useState<ScreenState>('HOME');
  const screenRef = useRef<ScreenState>('HOME');
  const updateScreen = useCallback((next: ScreenState) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  // Persistent Preferences & High Scores
  const [bestScore, setBestScore] = useState<number>(() => storage.getEndlessBestScore());
  const [dailyConfig, setDailyConfig] = useState<DailyChallengeConfig>(() =>
    getDailyChallengeForDate(getTodayDateKey())
  );
  const [dailyBestScore, setDailyBestScore] = useState<number>(() =>
    storage.getDailyBestScore(dailyConfig.dateKey)
  );
  const [dailyCountdown, setDailyCountdown] = useState<string>(() => getCountdownToNextDaily());
  const [dailyLeaderboard, setDailyLeaderboard] = useState<DailyLeaderboardEntry[]>(() =>
    storage.getDailyLeaderboard(dailyConfig.dateKey, dailyConfig.targetMedals)
  );

  const [muted, setMuted] = useState<boolean>(() => audio.isMuted());
  const [showTouchButtons, setShowTouchButtons] = useState<boolean>(() =>
    storage.getShowTouchButtons()
  );
  const [selectedShipId, setSelectedShipId] = useState<string>(() => storage.getSelectedShipId());
  const [modifierIndex, setModifierIndex] = useState<number>(0);
  const activeModifier: ChallengeModifier = CHALLENGE_MODIFIERS[modifierIndex];

  const [countdownValue, setCountdownValue] = useState<number>(3);
  const [autoPausedByVisibility, setAutoPausedByVisibility] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [seoDrawerOpen, setSeoDrawerOpen] = useState<boolean>(false);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEventPayload[]>([]);
  const [demoAdProviderEnabled, setDemoAdProviderEnabled] = useState<boolean>(false);
  const [invulnerableSeconds, setInvulnerableSeconds] = useState<number>(0);

  // Live Telemetry State synced to HUD
  const [telemetry, setTelemetry] = useState<RunTelemetry>(() => ({
    mode: 'ENDLESS',
    score: 0,
    bestScore: storage.getEndlessBestScore(),
    isNewBest: false,
    distanceMeters: 0,
    survivalTimeSeconds: 0,
    orbsCollected: 0,
    maxCombo: 1,
    currentCombo: 1,
    comboTimer: 0,
    nearMissCount: 0,
    speedKmh: 460,
    speedPhaseName: 'PHASE 1 // IGNITION',
    speedPhaseIndex: 1,
    activeModifier: CHALLENGE_MODIFIERS[0],
    usedRewardedContinue: false,
    causeOfCrash: '',
  }));

  // Mutable Game Engine Instances (Zero React re-render overhead inside 60fps loop)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerController>(new PlayerController());
  const trackGenRef = useRef<TrackGenerator>(new TrackGenerator(Date.now()));
  const scoringRef = useRef<ScoringSystem>(new ScoringSystem());
  const rendererRef = useRef<NeonRenderer>(new NeonRenderer());

  const obstaclesRef = useRef<ObstacleEntity[]>([]);
  const orbsRef = useRef<EnergyOrbEntity[]>([]);
  const particlesRef = useRef<ParticleEntity[]>([]);
  const floatingTextsRef = useRef<FloatingTextEntity[]>([]);

  const currentModeRef = useRef<GameMode>('ENDLESS');
  const runModifierRef = useRef<ChallengeModifier>(CHALLENGE_MODIFIERS[0]);
  const usedRewardedContinueRef = useRef<boolean>(false);
  const isNewBestRef = useRef<boolean>(false);
  const countdownTimerRef = useRef<number | null>(null);

  // Touch Swipe Tracking Refs
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Subscribe to Analytics events for inspector display
  useEffect(() => {
    analytics.registerAdapter(() => {
      setRecentEvents([...analytics.getRecentEvents()]);
    });
  }, []);

  // Update Daily Challenge countdown every second & roll over at midnight
  useEffect(() => {
    const interval = window.setInterval(() => {
      setDailyCountdown(getCountdownToNextDaily());
      const todayKey = getTodayDateKey();
      if (todayKey !== dailyConfig.dateKey) {
        const nextConfig = getDailyChallengeForDate(todayKey);
        setDailyConfig(nextConfig);
        setDailyBestScore(storage.getDailyBestScore(todayKey));
        setDailyLeaderboard(storage.getDailyLeaderboard(todayKey, nextConfig.targetMedals));
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [dailyConfig.dateKey]);

  // Initialize background attract-mode entities on mount
  const initWorldEntities = useCallback(
    (seed: number, shipId: string) => {
      const preset = SHIP_PRESETS.find((s) => s.id === shipId) || SHIP_PRESETS[0];
      playerRef.current.reset(preset);
      trackGenRef.current.reset(seed);
      scoringRef.current.reset();
      obstaclesRef.current = [];
      orbsRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
      trackGenRef.current.populateInitialTrack(obstaclesRef.current, orbsRef.current);
    },
    []
  );

  useEffect(() => {
    initWorldEntities(Date.now(), selectedShipId);
  }, [initWorldEntities, selectedShipId]);

  // Steer Left / Right Handler
  const handleSteer = useCallback((direction: -1 | 1) => {
    if (screenRef.current !== 'PLAYING' && screenRef.current !== 'COUNTDOWN') return;
    const moved = playerRef.current.steer(direction);
    if (moved) {
      audio.playSteer(direction);
    }
  }, []);

  // Start a new Run (Endless or Daily Challenge) with 3 -> 2 -> 1 -> GO Countdown
  const startRun = useCallback(
    (mode: GameMode, isRetry: boolean = false) => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }

      currentModeRef.current = mode;
      usedRewardedContinueRef.current = false;
      isNewBestRef.current = false;
      setAutoPausedByVisibility(false);
      setShareFeedback(null);

      const todayConfig = getDailyChallengeForDate(getTodayDateKey());
      setDailyConfig(todayConfig);

      const modifier = mode === 'DAILY' ? todayConfig.primaryModifier : activeModifier;
      runModifierRef.current = modifier;

      const seed = mode === 'DAILY' ? todayConfig.seed : Date.now() ^ Math.floor(Math.random() * 1e9);
      initWorldEntities(seed, selectedShipId);

      const currentBest =
        mode === 'DAILY'
          ? storage.getDailyBestScore(todayConfig.dateKey)
          : storage.getEndlessBestScore();

      setTelemetry({
        mode,
        score: 0,
        bestScore: currentBest,
        isNewBest: false,
        distanceMeters: 0,
        survivalTimeSeconds: 0,
        orbsCollected: 0,
        maxCombo: 1,
        currentCombo: 1,
        comboTimer: 0,
        nearMissCount: 0,
        speedKmh: Math.round(460 * modifier.speedMultiplier),
        speedPhaseName: 'PHASE 1 // IGNITION',
        speedPhaseIndex: 1,
        activeModifier: modifier,
        usedRewardedContinue: false,
        causeOfCrash: '',
      });

      if (isRetry) {
        analytics.track('retry_clicked', { mode });
      }
      if (mode === 'DAILY') {
        analytics.track('daily_challenge_started', {
          dateKey: todayConfig.dateKey,
          seed: todayConfig.seed,
        });
      }
      analytics.track('game_started', {
        mode,
        modifier: modifier.id,
      });

      // Begin 3 -> 2 -> 1 -> GO! countdown
      updateScreen('COUNTDOWN');
      setCountdownValue(3);
      audio.playGameStart();
      audio.playCountdown(3);

      let step = 3;
      countdownTimerRef.current = window.setInterval(() => {
        step -= 1;
        if (step >= 1) {
          setCountdownValue(step);
          audio.playCountdown(step as 2 | 1);
        } else if (step === 0) {
          setCountdownValue(0);
          audio.playCountdown(0);
        } else {
          if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          if (screenRef.current === 'COUNTDOWN') {
            updateScreen('PLAYING');
          }
        }
      }, 390);
    },
    [activeModifier, initWorldEntities, selectedShipId, updateScreen]
  );

  // Handle Player Crash -> Game Over Transition
  const handlePlayerCrash = useCallback(
    (obstacle: ObstacleEntity) => {
      rendererRef.current.triggerShake(18);
      rendererRef.current.triggerCrashFlash();

      const s = scoringRef.current;
      const finalScore = Math.floor(s.score);
      const mode = currentModeRef.current;
      let newBest = false;
      let updatedBest = bestScore;

      if (mode === 'DAILY') {
        newBest = storage.saveDailyBestScore(dailyConfig.dateKey, finalScore);
        updatedBest = storage.getDailyBestScore(dailyConfig.dateKey);
        setDailyBestScore(updatedBest);

        storage.recordDailyAttempt(dailyConfig.dateKey, {
          score: finalScore,
          distance: Math.floor(s.distanceMeters),
          maxCombo: s.maxCombo,
          nearMisses: s.nearMissCount,
          survivalSeconds: Math.floor(s.survivalSeconds),
        });
        setDailyLeaderboard(
          storage.getDailyLeaderboard(dailyConfig.dateKey, dailyConfig.targetMedals)
        );
      } else {
        newBest = storage.saveEndlessBestScore(finalScore);
        updatedBest = storage.getEndlessBestScore();
        setBestScore(updatedBest);
      }

      storage.incrementLifetimeStats(s.distanceMeters);
      isNewBestRef.current = newBest;

      const phase = trackGenRef.current.getSpeedPhase(s.survivalSeconds);
      const finalTelemetry: RunTelemetry = {
        mode,
        score: finalScore,
        bestScore: updatedBest,
        isNewBest: newBest,
        distanceMeters: Math.floor(s.distanceMeters),
        survivalTimeSeconds: s.survivalSeconds,
        orbsCollected: s.orbsCollected,
        maxCombo: s.maxCombo,
        currentCombo: s.currentCombo,
        comboTimer: 0,
        nearMissCount: s.nearMissCount,
        speedKmh: Math.round(phase.baseSpeed * runModifierRef.current.speedMultiplier),
        speedPhaseName: phase.name,
        speedPhaseIndex: phase.index,
        activeModifier: runModifierRef.current,
        usedRewardedContinue: usedRewardedContinueRef.current,
        causeOfCrash: obstacle.type,
      };

      setTelemetry(finalTelemetry);
      audio.playGameOver();

      analytics.track('game_finished', {
        mode,
        score: finalScore,
        distance: Math.floor(s.distanceMeters),
        survivalSeconds: Math.round(s.survivalSeconds),
        maxCombo: s.maxCombo,
        nearMisses: s.nearMissCount,
      });

      // Brief 380ms dramatic impact moment so player sees the particle explosion before modal opens
      window.setTimeout(() => {
        if (playerRef.current.crashed) {
          updateScreen('GAME_OVER');
        }
      }, 380);
    },
    [bestScore, dailyConfig.dateKey, dailyConfig.targetMedals, updateScreen]
  );

  // Optional Rewarded Ad Continue Handler
  const handleRewardedContinue = useCallback(async () => {
    const granted = await adManager.requestRewardedContinue();
    if (!granted) return;

    usedRewardedContinueRef.current = true;
    const player = playerRef.current;
    player.crashed = false;
    player.invulnerableTimer = 3.5;
    setInvulnerableSeconds(3.5);

    // Clear nearby obstacles so player has a clean runway upon revival
    obstaclesRef.current = obstaclesRef.current.filter((obs) => obs.z > 240 || obs.z < -30);
    updateScreen('PLAYING');
    audio.playGameStart();
  }, [updateScreen]);

  // Pause & Resume Handlers
  const handlePause = useCallback((byVisibility = false) => {
    if (screenRef.current === 'PLAYING' || screenRef.current === 'COUNTDOWN') {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setAutoPausedByVisibility(byVisibility);
      updateScreen('PAUSED');
    }
  }, [updateScreen]);

  const handleResume = useCallback(() => {
    if (screenRef.current === 'PAUSED') {
      setAutoPausedByVisibility(false);
      audio.playClick();
      updateScreen('PLAYING');
    }
  }, [updateScreen]);

  // Automatic Pause when Browser Tab becomes inactive or blurred
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        handlePause(true);
      }
    };
    const onWindowBlur = () => {
      handlePause(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [handlePause]);

  // Keyboard Controls Listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSteer(-1);
      } else if (key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleSteer(1);
      } else if (key === 'p' || e.key === 'Escape') {
        e.preventDefault();
        if (screenRef.current === 'PLAYING' || screenRef.current === 'COUNTDOWN') {
          handlePause(false);
        } else if (screenRef.current === 'PAUSED') {
          handleResume();
        } else if (
          screenRef.current === 'HOW_TO_PLAY' ||
          screenRef.current === 'DAILY_CHALLENGE'
        ) {
          updateScreen('HOME');
        }
      } else if (key === 'm') {
        e.preventDefault();
        const nextMuted = audio.toggleMute();
        setMuted(nextMuted);
      } else if (e.key === ' ' || e.key === 'Enter' || key === 'r') {
        if (screenRef.current === 'HOME' && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          startRun('ENDLESS', false);
        } else if (screenRef.current === 'GAME_OVER') {
          e.preventDefault();
          startRun(currentModeRef.current, true);
        } else if (screenRef.current === 'PAUSED' && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          handleResume();
        } else if (screenRef.current === 'DAILY_CHALLENGE' && e.key === 'Enter') {
          e.preventDefault();
          startRun('DAILY', false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePause, handleResume, handleSteer, startRun, updateScreen]);

  // Share Score Handler (Web Share API with Clipboard Fallback)
  const handleShareScore = useCallback(async () => {
    audio.playClick();
    const durationText = formatDuration(telemetry.survivalTimeSeconds);
    const scoreText = formatScore(telemetry.score);
    const modeLabel =
      telemetry.mode === 'DAILY' ? `Today's NEON RUSH Daily Challenge` : 'NEON RUSH';
    const shareMessage = `I survived ${durationText} and scored ${scoreText} in ${modeLabel}. Can you beat me? 🚀`;

    analytics.track('score_shared', {
      score: telemetry.score,
      survivalSeconds: Math.round(telemetry.survivalTimeSeconds),
      mode: telemetry.mode,
    });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'NEON RUSH – High Score Telemetry',
          text: shareMessage,
          url: window.location.href,
        });
        setShareFeedback('SHARED! 🚀');
        window.setTimeout(() => setShareFeedback(null), 2600);
        return;
      } catch {
        // User cancelled or share failed; fall through to clipboard fallback
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareMessage);
      setShareFeedback('COPIED TO CLIPBOARD! 🚀');
    } catch {
      // Fallback textarea copy
      const ta = document.createElement('textarea');
      ta.value = shareMessage;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setShareFeedback('COPIED TO CLIPBOARD! 🚀');
      } catch {
        setShareFeedback(shareMessage);
      }
      document.body.removeChild(ta);
    }
    window.setTimeout(() => setShareFeedback(null), 2800);
  }, [telemetry]);

  // Toggle Optional Demo Rewarded Ad SDK Adapter (for testing rewarded continue architecture)
  const handleToggleDemoAdProvider = useCallback(() => {
    audio.playClick();
    if (!demoAdProviderEnabled) {
      adManager.configureProvider({
        name: 'PortalDemoAdSDK',
        isBannerAvailable: () => false,
        mountBanner: () => {},
        isRewardedAdReady: () => true,
        showRewardedAd: () =>
          new Promise((resolve) => {
            window.setTimeout(() => resolve(true), 450);
          }),
      });
      setDemoAdProviderEnabled(true);
    } else {
      adManager.configureProvider(null);
      setDemoAdProviderEnabled(false);
    }
  }, [demoAdProviderEnabled]);

  // Main 60 FPS RequestAnimationFrame Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let hudSyncAccumulator = 0;
    let autopilotTimer = 0;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(320, Math.floor(rect.width * dpr));
      const targetH = Math.max(240, Math.floor(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const loop = (now: number) => {
      animationFrameId = window.requestAnimationFrame(loop);

      // Clamp delta time to prevent physics jumps after tab switches
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const state = screenRef.current;
      const player = playerRef.current;
      const trackGen = trackGenRef.current;
      const scoring = scoringRef.current;
      const renderer = rendererRef.current;

      const phase = trackGen.getSpeedPhase(scoring.survivalSeconds);
      const modifier = runModifierRef.current;

      // Smoothly ramp world speed within the current phase
      const progressiveBoost = Math.min(280, scoring.survivalSeconds * 3.1);
      const worldSpeed = (phase.baseSpeed + progressiveBoost) * modifier.speedMultiplier;

      if (state === 'PLAYING') {
        player.update(dt, worldSpeed / 500);
        trackGen.update(
          dt,
          worldSpeed,
          scoring.survivalSeconds,
          modifier.spawnDensityMultiplier,
          obstaclesRef.current,
          orbsRef.current
        );
        scoring.update(
          dt,
          worldSpeed,
          player,
          obstaclesRef.current,
          orbsRef.current,
          particlesRef.current,
          floatingTextsRef.current,
          modifier,
          width,
          height,
          {
            onCrash: handlePlayerCrash,
            onNearMiss: () => {
              renderer.triggerShake(6);
            },
            onOrbCollect: () => {},
          }
        );

        // Sync React HUD telemetry ~15 times per second for zero-lag tabular display
        hudSyncAccumulator += dt;
        if (hudSyncAccumulator >= 0.065) {
          hudSyncAccumulator = 0;
          setInvulnerableSeconds(player.invulnerableTimer);
          setTelemetry((prev) => ({
            ...prev,
            score: Math.floor(scoring.score),
            distanceMeters: Math.floor(scoring.distanceMeters),
            survivalTimeSeconds: scoring.survivalSeconds,
            orbsCollected: scoring.orbsCollected,
            maxCombo: scoring.maxCombo,
            currentCombo: scoring.currentCombo,
            comboTimer: scoring.comboTimer,
            nearMissCount: scoring.nearMissCount,
            speedKmh: Math.round(worldSpeed),
            speedPhaseName: phase.name,
            speedPhaseIndex: phase.index,
          }));
        }
      } else if (state === 'COUNTDOWN') {
        // Gentle idle hover during countdown
        player.update(dt, 0.7);
      } else if (
        state === 'HOME' ||
        state === 'DAILY_CHALLENGE' ||
        state === 'HOW_TO_PLAY'
      ) {
        // Background Autopilot Attract Mode so the game feels alive immediately
        autopilotTimer += dt;
        player.invulnerableTimer = 1.0; // Never crash in attract mode
        if (autopilotTimer > 0.35) {
          autopilotTimer = 0;
          // Look ahead for closest obstacle in current lane and steer around it
          const danger = obstaclesRef.current.find(
            (o) => o.z > 0 && o.z < 360 && Math.abs(o.lane - player.targetLane) < 0.75
          );
          if (danger) {
            if (player.targetLane <= -1) player.steer(1);
            else if (player.targetLane >= 1) player.steer(-1);
            else player.steer(Math.random() < 0.5 ? -1 : 1);
          } else {
            // Or steer toward an upcoming orb
            const nextOrb = orbsRef.current.find((orb) => !orb.collected && orb.z > 40 && orb.z < 280);
            if (nextOrb && Math.abs(nextOrb.lane - player.targetLane) >= 0.8) {
              player.steer(nextOrb.lane > player.targetLane ? 1 : -1);
            }
          }
        }
        player.update(dt, 0.85);
        trackGen.update(dt, 440, 8, 1.0, obstaclesRef.current, orbsRef.current);
      }

      // Render 60 FPS Scene
      renderer.render(
        ctx,
        width,
        height,
        state === 'PAUSED' ? 0 : dt,
        state === 'PAUSED' ? 0 : worldSpeed,
        player,
        obstaclesRef.current,
        orbsRef.current,
        particlesRef.current,
        floatingTextsRef.current,
        phase.color,
        scoring.currentCombo
      );
    };

    animationFrameId = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [handlePlayerCrash]);

  // Touch Swipe Gesture Handlers on the Game Theatre
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (
      touchStartXRef.current === null ||
      touchStartYRef.current === null ||
      e.touches.length !== 1
    ) {
      return;
    }

    const dx = e.touches[0].clientX - touchStartXRef.current;
    const dy = e.touches[0].clientY - touchStartYRef.current;

    // Trigger immediate lane shift once horizontal swipe exceeds 28px
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
      handleSteer(dx > 0 ? 1 : -1);
      // Reset anchor to allow continuous multi-lane swipes in one motion
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  return (
    <div className="min-h-screen w-full bg-[#06070E] text-[#F8FAFC] flex flex-col">
      {/* Primary 100dvh Viewport-Locked Game Theatre */}
      <div
        ref={gameAreaRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[100dvh] flex flex-col justify-between overflow-hidden select-none"
      >
        {/* Reserved Top Desktop Ad Container (Strictly outside active HUD/controls) */}
        {screen !== 'PLAYING' && screen !== 'COUNTDOWN' && (
          <div className="hidden md:flex w-full justify-center pt-2 px-4 z-20 pointer-events-auto">
            <AdBannerSlot slot="desktop-top-banner" className="w-[728px] h-[54px]" />
          </div>
        )}

        {/* Full-Viewport 60 FPS HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none"
        />

        {/* Active In-Game HUD (Shown during PLAYING and COUNTDOWN) */}
        {(screen === 'PLAYING' || screen === 'COUNTDOWN') && (
          <GameHud
            telemetry={telemetry}
            muted={muted}
            showTouchButtons={showTouchButtons}
            invulnerableSeconds={invulnerableSeconds}
            onToggleMute={() => {
              const next = audio.toggleMute();
              setMuted(next);
            }}
            onPause={() => handlePause(false)}
            onSteerLeft={() => handleSteer(-1)}
            onSteerRight={() => handleSteer(1)}
          />
        )}

        {/* 3 -> 2 -> 1 -> GO! Countdown Overlay */}
        {screen === 'COUNTDOWN' && (
          <CountdownOverlay count={countdownValue} mode={currentModeRef.current} />
        )}

        {/* Center Modal Stage for HOME, DAILY_CHALLENGE, HOW_TO_PLAY, PAUSED, GAME_OVER */}
        <div className="relative flex-1 flex items-center justify-center overflow-y-auto py-2 pointer-events-none">
          {screen === 'HOME' && (
            <HomeModal
              bestScore={bestScore}
              dailyBestScore={dailyBestScore}
              dailyConfig={dailyConfig}
              dailyCountdown={dailyCountdown}
              activeModifier={activeModifier}
              onCycleModifier={() => {
                audio.playClick();
                setModifierIndex((prev) => (prev + 1) % CHALLENGE_MODIFIERS.length);
              }}
              selectedShipId={selectedShipId}
              onSelectShip={(id) => {
                audio.playClick();
                setSelectedShipId(id);
                storage.setSelectedShipId(id);
              }}
              muted={muted}
              onToggleMute={() => {
                const next = audio.toggleMute();
                setMuted(next);
              }}
              showTouchButtons={showTouchButtons}
              onToggleTouchButtons={() => {
                audio.playClick();
                const next = !showTouchButtons;
                setShowTouchButtons(next);
                storage.setShowTouchButtons(next);
              }}
              onStartEndless={() => startRun('ENDLESS', false)}
              onOpenDaily={() => {
                audio.playClick();
                updateScreen('DAILY_CHALLENGE');
              }}
              onOpenHowToPlay={() => {
                audio.playClick();
                updateScreen('HOW_TO_PLAY');
              }}
            />
          )}

          {screen === 'DAILY_CHALLENGE' && (
            <DailyChallengeModal
              config={dailyConfig}
              bestScore={dailyBestScore}
              countdown={dailyCountdown}
              leaderboard={dailyLeaderboard}
              onStartDaily={() => startRun('DAILY', false)}
              onBack={() => {
                audio.playClick();
                updateScreen('HOME');
              }}
            />
          )}

          {screen === 'HOW_TO_PLAY' && (
            <HowToPlayModal
              onClose={() => {
                audio.playClick();
                updateScreen('HOME');
              }}
              onStartPlay={() => startRun('ENDLESS', false)}
            />
          )}

          {screen === 'PAUSED' && (
            <PauseModal
              telemetry={telemetry}
              autoPausedByVisibility={autoPausedByVisibility}
              onResume={handleResume}
              onRestart={() => startRun(currentModeRef.current, true)}
              onHome={() => {
                audio.playClick();
                updateScreen('HOME');
              }}
            />
          )}

          {screen === 'GAME_OVER' && (
            <GameOverModal
              telemetry={telemetry}
              canRewardedContinue={adManager.canOfferRewardedContinue(
                usedRewardedContinueRef.current
              )}
              onRewardedContinue={handleRewardedContinue}
              onPlayAgain={() => startRun(currentModeRef.current, true)}
              onShareScore={handleShareScore}
              shareFeedback={shareFeedback}
              onHome={() => {
                audio.playClick();
                updateScreen('HOME');
              }}
            />
          )}
        </div>

        {/* Reserved Bottom Mobile Banner Ad Container (Strictly separated from controls) */}
        {screen !== 'PLAYING' && screen !== 'COUNTDOWN' && (
          <div className="flex md:hidden w-full justify-center pb-2 px-3 z-20 pointer-events-auto">
            <AdBannerSlot slot="mobile-bottom-banner" className="w-[320px] h-[44px]" />
          </div>
        )}
      </div>

      {/* Semantic HTML SEO / Discoverability Landing Page Drawer Below the Fold */}
      <SeoDrawer
        isOpen={seoDrawerOpen}
        onToggle={() => {
          audio.playClick();
          setSeoDrawerOpen((prev) => !prev);
        }}
        onScrollToPlay={() => {
          audio.playClick();
          gameAreaRef.current?.scrollIntoView({ behavior: 'smooth' });
          if (screenRef.current !== 'PLAYING' && screenRef.current !== 'COUNTDOWN') {
            startRun('ENDLESS', false);
          }
        }}
        recentEvents={recentEvents}
        demoAdProviderEnabled={demoAdProviderEnabled}
        onToggleDemoAdProvider={handleToggleDemoAdProvider}
      />
    </div>
  );
}

export default App;
