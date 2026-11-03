import { DailyLeaderboardEntry, ShipPreset } from '../types/game';

/**
 * Fault-tolerant LocalStorage service for NEON RUSH.
 * Automatically falls back to an in-memory Map when localStorage is blocked
 * (e.g., strict privacy mode, sandboxed iframe, or storage quota exceeded).
 */

const STORAGE_PREFIX = 'neon_rush_v1_';

const KEYS = {
  BEST_SCORE_ENDLESS: `${STORAGE_PREFIX}best_score_endless`,
  DAILY_BEST_PREFIX: `${STORAGE_PREFIX}daily_best_`,
  DAILY_BOARD_PREFIX: `${STORAGE_PREFIX}daily_board_`,
  MUTED: `${STORAGE_PREFIX}audio_muted`,
  SHOW_TOUCH_BUTTONS: `${STORAGE_PREFIX}show_touch_buttons`,
  SELECTED_SHIP: `${STORAGE_PREFIX}selected_ship`,
  TOTAL_RUNS: `${STORAGE_PREFIX}total_runs`,
  TOTAL_DISTANCE: `${STORAGE_PREFIX}total_distance`,
};

export const SHIP_PRESETS: ShipPreset[] = [
  {
    id: 'interceptor-cyan',
    name: 'VORTEX MK-I',
    primaryColor: '#00F5D4',
    secondaryColor: '#00BBF9',
    thrusterColor: '#00F5D4',
    unlockScore: 0,
  },
  {
    id: 'phantom-magenta',
    name: 'HYPERION PULSE',
    primaryColor: '#FF2A85',
    secondaryColor: '#9B5DE5',
    thrusterColor: '#FF2A85',
    unlockScore: 2500,
  },
  {
    id: 'solar-apex',
    name: 'SOLARIS GOLD',
    primaryColor: '#FEE440',
    secondaryColor: '#FF6B35',
    thrusterColor: '#FEE440',
    unlockScore: 6000,
  },
  {
    id: 'spectre-violet',
    name: 'SINGULARITY X',
    primaryColor: '#C77DFF',
    secondaryColor: '#00F5D4',
    thrusterColor: '#E0AAFF',
    unlockScore: 12000,
  },
];

class StorageService {
  private memoryFallback = new Map<string, string>();
  private storageAvailable: boolean;

  constructor() {
    this.storageAvailable = this.checkStorageAvailability();
  }

  private checkStorageAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = `${STORAGE_PREFIX}__test__`;
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public isPersistent(): boolean {
    return this.storageAvailable;
  }

  private getItem(key: string): string | null {
    try {
      if (this.storageAvailable) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback to memory
    }
    return this.memoryFallback.get(key) ?? null;
  }

  private setItem(key: string, value: string): void {
    this.memoryFallback.set(key, value);
    try {
      if (this.storageAvailable) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Silently ignore quota or security errors; memoryFallback retains session value
    }
  }

  public getEndlessBestScore(): number {
    const raw = this.getItem(KEYS.BEST_SCORE_ENDLESS);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  public saveEndlessBestScore(score: number): boolean {
    const cleanScore = Math.floor(score);
    const currentBest = this.getEndlessBestScore();
    if (cleanScore > currentBest) {
      this.setItem(KEYS.BEST_SCORE_ENDLESS, String(cleanScore));
      return true;
    }
    return false;
  }

  public getDailyBestScore(dateKey: string): number {
    const raw = this.getItem(`${KEYS.DAILY_BEST_PREFIX}${dateKey}`);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  public saveDailyBestScore(dateKey: string, score: number): boolean {
    const cleanScore = Math.floor(score);
    const currentBest = this.getDailyBestScore(dateKey);
    if (cleanScore > currentBest) {
      this.setItem(`${KEYS.DAILY_BEST_PREFIX}${dateKey}`, String(cleanScore));
      return true;
    }
    return false;
  }

  public getDailyLeaderboard(
    dateKey: string,
    targetMedals: { bronze: number; silver: number; gold: number; apex: number }
  ): DailyLeaderboardEntry[] {
    const raw = this.getItem(`${KEYS.DAILY_BOARD_PREFIX}${dateKey}`);
    let playerEntries: DailyLeaderboardEntry[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          playerEntries = parsed;
        }
      } catch {
        playerEntries = [];
      }
    }

    // Target pace benchmark ghosts (transparently labeled as Sector Pace Targets)
    const benchmarkEntries: DailyLeaderboardEntry[] = [
      {
        id: 'pace-apex',
        pilotTag: 'APEX PACE TARGET',
        score: targetMedals.apex,
        distance: Math.round(targetMedals.apex * 0.18),
        maxCombo: 8,
        nearMisses: 14,
        survivalSeconds: 95,
        timestamp: 0,
        isPlayer: false,
      },
      {
        id: 'pace-gold',
        pilotTag: 'GOLD PACE TARGET',
        score: targetMedals.gold,
        distance: Math.round(targetMedals.gold * 0.19),
        maxCombo: 6,
        nearMisses: 9,
        survivalSeconds: 68,
        timestamp: 0,
        isPlayer: false,
      },
      {
        id: 'pace-silver',
        pilotTag: 'SILVER PACE TARGET',
        score: targetMedals.silver,
        distance: Math.round(targetMedals.silver * 0.21),
        maxCombo: 4,
        nearMisses: 5,
        survivalSeconds: 45,
        timestamp: 0,
        isPlayer: false,
      },
      {
        id: 'pace-bronze',
        pilotTag: 'BRONZE PACE TARGET',
        score: targetMedals.bronze,
        distance: Math.round(targetMedals.bronze * 0.22),
        maxCombo: 3,
        nearMisses: 2,
        survivalSeconds: 28,
        timestamp: 0,
        isPlayer: false,
      },
    ];

    const combined = [...playerEntries, ...benchmarkEntries];
    combined.sort((a, b) => b.score - a.score);
    return combined.slice(0, 8);
  }

  public recordDailyAttempt(
    dateKey: string,
    entry: Omit<DailyLeaderboardEntry, 'id' | 'timestamp' | 'isPlayer' | 'pilotTag'>
  ): void {
    this.saveDailyBestScore(dateKey, entry.score);
    const raw = this.getItem(`${KEYS.DAILY_BOARD_PREFIX}${dateKey}`);
    let playerEntries: DailyLeaderboardEntry[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          playerEntries = parsed;
        }
      } catch {
        playerEntries = [];
      }
    }

    const newEntry: DailyLeaderboardEntry = {
      ...entry,
      id: `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pilotTag: `YOU // RUN #${playerEntries.length + 1}`,
      timestamp: Date.now(),
      isPlayer: true,
    };

    playerEntries.push(newEntry);
    playerEntries.sort((a, b) => b.score - a.score);
    const trimmed = playerEntries.slice(0, 6);
    this.setItem(`${KEYS.DAILY_BOARD_PREFIX}${dateKey}`, JSON.stringify(trimmed));
  }

  public getMuted(): boolean {
    return this.getItem(KEYS.MUTED) === 'true';
  }

  public setMuted(muted: boolean): void {
    this.setItem(KEYS.MUTED, muted ? 'true' : 'false');
  }

  public getShowTouchButtons(): boolean {
    const val = this.getItem(KEYS.SHOW_TOUCH_BUTTONS);
    if (val === null) {
      // Default to true on touch-capable devices or mobile viewports
      if (typeof window !== 'undefined') {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
      }
      return true;
    }
    return val === 'true';
  }

  public setShowTouchButtons(show: boolean): void {
    this.setItem(KEYS.SHOW_TOUCH_BUTTONS, show ? 'true' : 'false');
  }

  public getSelectedShipId(): string {
    return this.getItem(KEYS.SELECTED_SHIP) || SHIP_PRESETS[0].id;
  }

  public setSelectedShipId(shipId: string): void {
    this.setItem(KEYS.SELECTED_SHIP, shipId);
  }

  public incrementLifetimeStats(distanceMeters: number): { runs: number; distance: number } {
    const runs = (parseInt(this.getItem(KEYS.TOTAL_RUNS) || '0', 10) || 0) + 1;
    const distance =
      (parseInt(this.getItem(KEYS.TOTAL_DISTANCE) || '0', 10) || 0) + Math.floor(distanceMeters);
    this.setItem(KEYS.TOTAL_RUNS, String(runs));
    this.setItem(KEYS.TOTAL_DISTANCE, String(distance));
    return { runs, distance };
  }

  public getLifetimeStats(): { runs: number; distance: number } {
    return {
      runs: parseInt(this.getItem(KEYS.TOTAL_RUNS) || '0', 10) || 0,
      distance: parseInt(this.getItem(KEYS.TOTAL_DISTANCE) || '0', 10) || 0,
    };
  }
}

export const storage = new StorageService();
