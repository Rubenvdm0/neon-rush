import { ChallengeModifier, DailyChallengeConfig } from '../types/game';

/**
 * Deterministic Seeded PRNG (Mulberry32) & Daily Challenge Generator.
 * Ensures every player on the same calendar date experiences the exact same
 * track pattern, difficulty profile, and modifiers without needing a backend.
 */

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  /**
   * Returns a deterministic float in [0, 1)
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max] inclusive
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Picks a deterministic item from a non-empty array
   */
  public pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

export function hashDateString(dateStr: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const CHALLENGE_MODIFIERS: ChallengeModifier[] = [
  {
    id: 'standard-calibration',
    name: 'PURE TELEMETRY',
    shortTag: 'BALANCED',
    description: 'Standard thruster thrust and balanced plasma orb resonance.',
    speedMultiplier: 1.0,
    orbValueMultiplier: 1.0,
    nearMissMultiplier: 1.0,
    spawnDensityMultiplier: 1.0,
    accentColor: '#00F5D4',
  },
  {
    id: 'hyper-thrusters',
    name: 'OVERDRIVE TURBINE',
    shortTag: '+15% SPEED // +25% SCORE',
    description: 'Higher base cruising speed with +25% bonus on all energy orbs and near-misses.',
    speedMultiplier: 1.15,
    orbValueMultiplier: 1.25,
    nearMissMultiplier: 1.25,
    spawnDensityMultiplier: 1.05,
    accentColor: '#FF2A85',
  },
  {
    id: 'razor-corridor',
    name: 'RAZOR GRAZE PROTOCOL',
    shortTag: '2X NEAR-MISS BOUNTY',
    description: 'Skimming past obstacles in adjacent lanes awards double near-miss telemetry points.',
    speedMultiplier: 1.05,
    orbValueMultiplier: 1.0,
    nearMissMultiplier: 2.0,
    spawnDensityMultiplier: 1.1,
    accentColor: '#FEE440',
  },
  {
    id: 'plasma-surge',
    name: 'PLASMA HARVEST',
    shortTag: '1.75X ORB VALUE',
    description: 'High-energy golden orb clusters yield +75% points when chained in a combo.',
    speedMultiplier: 1.04,
    orbValueMultiplier: 1.75,
    nearMissMultiplier: 1.1,
    spawnDensityMultiplier: 1.0,
    accentColor: '#00BBF9',
  },
  {
    id: 'mach-gauntlet',
    name: 'MACH GAUNTLET',
    shortTag: 'DENSE GRID // +40% BOUNTY',
    description: 'Tighter laser gate corridors with +40% bonus to both orbs and near-miss grazing.',
    speedMultiplier: 1.12,
    orbValueMultiplier: 1.4,
    nearMissMultiplier: 1.4,
    spawnDensityMultiplier: 1.18,
    accentColor: '#C77DFF',
  },
];

const SECTOR_PREFIXES = [
  'CYBER-VEIL',
  'SOLAR-RIFT',
  'HYPER-GRID',
  'VECTOR-CORE',
  'CHROMA-DRIFT',
  'NOVA-TRENCH',
  'SYNTH-HORIZON',
  'AETHER-LANE',
];

const SECTOR_SUFFIXES = [
  'CORRIDOR',
  'EXPRESSWAY',
  'GAUNTLET',
  'CONDUIT',
  'SLIPSTREAM',
  'OVERPASS',
  'MONOLITH',
];

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyChallengeForDate(dateKey: string = getTodayDateKey()): DailyChallengeConfig {
  const seed = hashDateString(`NEON_RUSH_DAILY_${dateKey}`);
  const rng = new SeededRNG(seed);

  const prefix = rng.pick(SECTOR_PREFIXES);
  const suffix = rng.pick(SECTOR_SUFFIXES);
  const sectorNumber = rng.nextInt(10, 99);

  // Pick modifiers (excluding standard for daily challenge to make it distinct)
  const specialModifiers = CHALLENGE_MODIFIERS.slice(1);
  const primaryModifier = rng.pick(specialModifiers);
  const remainingModifiers = specialModifiers.filter((m) => m.id !== primaryModifier.id);
  const secondaryModifier = rng.pick(remainingModifiers);

  const diffRoll = rng.nextInt(0, 3);
  const difficultyLabels: DailyChallengeConfig['difficultyLabel'][] = [
    'STANDARD',
    'OVERDRIVE',
    'HYPER-VECTOR',
    'APEX',
  ];
  const difficultyLabel = difficultyLabels[diffRoll];
  const difficultyStars = diffRoll + 2; // 2 to 5 stars

  const baseBronze = rng.nextInt(14, 20) * 100;
  const silver = baseBronze * 2;
  const gold = Math.round(baseBronze * 3.6);
  const apex = Math.round(baseBronze * 5.8);

  return {
    dateKey,
    seed,
    codeName: `OP-${dateKey.replace(/-/g, '')}`,
    sectorTitle: `${prefix} ${suffix} // SEC-${sectorNumber}`,
    difficultyLabel,
    difficultyStars,
    primaryModifier,
    secondaryModifier,
    targetMedals: {
      bronze: baseBronze,
      silver,
      gold,
      apex,
    },
  };
}

export function getCountdownToNextDaily(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}
