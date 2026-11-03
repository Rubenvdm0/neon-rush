/**
 * Core TypeScript definitions for NEON RUSH
 * Separates state machine, entity telemetry, daily challenge seeds, ads, and analytics.
 */

export type ScreenState =
  | 'HOME'
  | 'DAILY_CHALLENGE'
  | 'HOW_TO_PLAY'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER';

export type GameMode = 'ENDLESS' | 'DAILY';

export type LaneIndex = -2 | -1 | 0 | 1 | 2;

export type ObstaclePatternType =
  | 'SINGLE_BLOCK'
  | 'LASER_GATE'
  | 'SWEEPER_DRONE'
  | 'SLALOM_WALL'
  | 'TUNNEL_PINCH'
  | 'PULSE_PYLON';

export interface ChallengeModifier {
  id: string;
  name: string;
  shortTag: string;
  description: string;
  speedMultiplier: number;
  orbValueMultiplier: number;
  nearMissMultiplier: number;
  spawnDensityMultiplier: number;
  accentColor: string;
}

export interface DailyChallengeConfig {
  dateKey: string; // YYYY-MM-DD
  seed: number;
  codeName: string;
  sectorTitle: string;
  difficultyLabel: 'STANDARD' | 'OVERDRIVE' | 'HYPER-VECTOR' | 'APEX';
  difficultyStars: number; // 1 to 5
  primaryModifier: ChallengeModifier;
  secondaryModifier: ChallengeModifier;
  targetMedals: {
    bronze: number;
    silver: number;
    gold: number;
    apex: number;
  };
}

export interface DailyLeaderboardEntry {
  id: string;
  pilotTag: string;
  score: number;
  distance: number;
  maxCombo: number;
  nearMisses: number;
  survivalSeconds: number;
  timestamp: number;
  isPlayer: boolean;
}

export interface ObstacleEntity {
  id: number;
  z: number; // Distance ahead along track (0 = player plane, 1200 = horizon)
  lane: number; // Continuous lane position (-2 to +2)
  baseLane: number;
  widthLanes: number; // Width in lane units (typically 0.82)
  height: number;
  type: ObstaclePatternType;
  oscillationSpeed: number; // For SWEEPER_DRONE
  oscillationRange: number;
  oscillationPhase: number;
  color: string;
  passed: boolean;
  nearMissChecked: boolean;
  groupId: number;
}

export interface EnergyOrbEntity {
  id: number;
  z: number;
  lane: number;
  collected: boolean;
  missed: boolean;
  pulsePhase: number;
  isSuperOrb?: boolean;
}

export interface ParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  glow: boolean;
}

export interface FloatingTextEntity {
  id: number;
  text: string;
  subtext?: string;
  x: number; // normalized 0..1 or canvas px
  y: number;
  vy: number;
  color: string;
  alpha: number;
  scale: number;
  life: number;
  maxLife: number;
}

export interface ShipPreset {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  thrusterColor: string;
  unlockScore: number;
}

export interface RunTelemetry {
  mode: GameMode;
  score: number;
  bestScore: number;
  isNewBest: boolean;
  distanceMeters: number;
  survivalTimeSeconds: number;
  orbsCollected: number;
  maxCombo: number;
  currentCombo: number;
  comboTimer: number; // 0.0 to 1.0 remaining
  nearMissCount: number;
  speedKmh: number;
  speedPhaseName: string;
  speedPhaseIndex: number;
  activeModifier: ChallengeModifier;
  usedRewardedContinue: boolean;
  causeOfCrash: string;
}

export type AnalyticsEventName =
  | 'game_started'
  | 'game_finished'
  | 'retry_clicked'
  | 'daily_challenge_started'
  | 'score_shared'
  | 'ad_requested'
  | 'ad_completed';

export interface AnalyticsEventPayload {
  event: AnalyticsEventName;
  timestamp: number;
  properties?: Record<string, string | number | boolean>;
}
