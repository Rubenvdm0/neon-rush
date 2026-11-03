import { EnergyOrbEntity, LaneIndex, ObstacleEntity, ObstaclePatternType } from '../types/game';
import { SeededRNG } from '../services/dailyChallenge';

/**
 * Procedural Track, Obstacle & Energy Orb Generator for NEON RUSH.
 *
 * Guarantees:
 * 1. First 10 seconds are welcoming, rhythmic, and orb-rich so players immediately
 *    experience combo multipliers and near-miss bonuses.
 * 2. Every generated wave guarantees at least one reachable safe lane from the prior wave.
 * 3. Deterministic seeding ensures Daily Challenge runs are 100% identical for all attempts.
 */

const ALL_LANES: readonly LaneIndex[] = [-2, -1, 0, 1, 2];

export interface SpeedPhaseInfo {
  index: number;
  name: string;
  baseSpeed: number; // world Z units per second
  color: string;
}

export const SPEED_PHASES: SpeedPhaseInfo[] = [
  { index: 1, name: 'PHASE 1 // IGNITION', baseSpeed: 460, color: '#00F5D4' },
  { index: 2, name: 'PHASE 2 // SLIPSTREAM', baseSpeed: 575, color: '#00BBF9' },
  { index: 3, name: 'PHASE 3 // OVERDRIVE', baseSpeed: 700, color: '#FEE440' },
  { index: 4, name: 'PHASE 4 // MACH VECTOR', baseSpeed: 835, color: '#FF2A85' },
  { index: 5, name: 'PHASE 5 // SINGULARITY', baseSpeed: 980, color: '#C77DFF' },
];

export class TrackGenerator {
  private rng: SeededRNG;
  private nextEntityId = 1;
  private nextGroupId = 1;
  private lastSpawnZ = 220;
  private lastSafeLane: LaneIndex = 0;
  public horizonZ = 1280;

  constructor(seed: number = Date.now()) {
    this.rng = new SeededRNG(seed);
  }

  public reset(seed: number): void {
    this.rng = new SeededRNG(seed);
    this.nextEntityId = 1;
    this.nextGroupId = 1;
    this.lastSpawnZ = 220;
    this.lastSafeLane = 0;
  }

  public getSpeedPhase(survivalSeconds: number): SpeedPhaseInfo {
    if (survivalSeconds < 12) return SPEED_PHASES[0];
    if (survivalSeconds < 30) return SPEED_PHASES[1];
    if (survivalSeconds < 58) return SPEED_PHASES[2];
    if (survivalSeconds < 95) return SPEED_PHASES[3];
    return SPEED_PHASES[4];
  }

  /**
   * Seeds the initial visible track corridor at the start of a run
   * so the player immediately sees inviting golden energy orbs and clean obstacles ahead.
   */
  public populateInitialTrack(
    obstacles: ObstacleEntity[],
    orbs: EnergyOrbEntity[]
  ): void {
    // Immediate welcoming line of 4 orbs right in front of the player
    const introOrbZ = [210, 270, 330, 390];
    for (const z of introOrbZ) {
      orbs.push({
        id: this.nextEntityId++,
        z,
        lane: 0,
        collected: false,
        missed: false,
        pulsePhase: z * 0.02,
      });
    }

    this.lastSpawnZ = 450;
    this.lastSafeLane = 0;

    // Populate up to horizonZ with starter waves
    while (this.lastSpawnZ < this.horizonZ) {
      this.spawnNextWave(obstacles, orbs, 2, 1.0);
    }
  }

  /**
   * Advances all world entities toward the player (z decreases) and spawns new waves at the horizon.
   */
  public update(
    dt: number,
    worldSpeed: number,
    survivalSeconds: number,
    densityMultiplier: number,
    obstacles: ObstacleEntity[],
    orbs: EnergyOrbEntity[]
  ): void {
    const dz = worldSpeed * dt;
    this.lastSpawnZ -= dz;

    // Move obstacles & update oscillating sweepers
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.z -= dz;

      if (obs.type === 'SWEEPER_DRONE') {
        obs.oscillationPhase += dt * obs.oscillationSpeed;
        obs.lane = Math.max(
          -2,
          Math.min(2, obs.baseLane + Math.sin(obs.oscillationPhase) * obs.oscillationRange)
        );
      }

      // Remove obstacles well behind camera
      if (obs.z < -140) {
        obstacles.splice(i, 1);
      }
    }

    // Move energy orbs
    for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];
      orb.z -= dz;
      orb.pulsePhase += dt * 6;
      if (orb.z < -100 || orb.collected) {
        orbs.splice(i, 1);
      }
    }

    // Spawn new waves up to the horizon
    while (this.lastSpawnZ < this.horizonZ) {
      this.spawnNextWave(obstacles, orbs, survivalSeconds, densityMultiplier);
    }
  }

  private pickReachableSafeLane(maxStep: number = 2): LaneIndex {
    const candidates = ALL_LANES.filter(
      (l) => Math.abs(l - this.lastSafeLane) <= maxStep
    );
    const chosen = this.rng.pick(candidates);
    this.lastSafeLane = chosen;
    return chosen;
  }

  private spawnNextWave(
    obstacles: ObstacleEntity[],
    orbs: EnergyOrbEntity[],
    survivalSeconds: number,
    densityMultiplier: number
  ): void {
    // Spacing between waves tightens gently as speed increases, while staying fair
    const difficultyFactor = Math.min(1, survivalSeconds / 90);
    const baseGap = 255 - difficultyFactor * 55;
    const waveGap = Math.max(175, Math.round(baseGap / Math.max(0.85, densityMultiplier)));

    const waveZ = this.lastSpawnZ + waveGap;
    const groupId = this.nextGroupId++;

    // Choose obstacle pattern based on survival time
    let pattern: ObstaclePatternType = 'SINGLE_BLOCK';
    const roll = this.rng.next();

    if (survivalSeconds < 10) {
      // First 10 seconds: super clear, gratifying warmup patterns
      pattern = roll < 0.55 ? 'SINGLE_BLOCK' : 'PULSE_PYLON';
    } else if (survivalSeconds < 25) {
      if (roll < 0.3) pattern = 'SINGLE_BLOCK';
      else if (roll < 0.65) pattern = 'LASER_GATE';
      else pattern = 'PULSE_PYLON';
    } else if (survivalSeconds < 50) {
      if (roll < 0.25) pattern = 'LASER_GATE';
      else if (roll < 0.52) pattern = 'SWEEPER_DRONE';
      else if (roll < 0.78) pattern = 'SLALOM_WALL';
      else pattern = 'PULSE_PYLON';
    } else {
      if (roll < 0.22) pattern = 'LASER_GATE';
      else if (roll < 0.46) pattern = 'SWEEPER_DRONE';
      else if (roll < 0.72) pattern = 'SLALOM_WALL';
      else if (roll < 0.9) pattern = 'TUNNEL_PINCH';
      else pattern = 'PULSE_PYLON';
    }

    const safeLane = this.pickReachableSafeLane(2);

    switch (pattern) {
      case 'SINGLE_BLOCK': {
        // Place 1 or 2 blocks NOT in safeLane
        const blockedCandidates = ALL_LANES.filter((l) => l !== safeLane);
        const blockCount = survivalSeconds < 8 ? 1 : 2;
        const chosenBlocks: LaneIndex[] = [];

        for (let i = 0; i < blockCount; i++) {
          const pick = this.rng.pick(blockedCandidates);
          if (!chosenBlocks.includes(pick)) {
            chosenBlocks.push(pick);
          }
        }

        for (const lane of chosenBlocks) {
          obstacles.push(this.createObstacle(waveZ, lane, 'SINGLE_BLOCK', '#FF2A85', groupId));
        }

        this.spawnOrbRibbon(orbs, waveZ - waveGap * 0.55, waveZ + 25, safeLane, 3);
        this.lastSpawnZ = waveZ;
        break;
      }

      case 'PULSE_PYLON': {
        // Two tall high-voltage pylons creating a rewarding near-miss corridor
        const blocked = ALL_LANES.filter((l) => l !== safeLane);
        const pylon1 = this.rng.pick(blocked);
        const pylon2 = this.rng.pick(blocked.filter((l) => l !== pylon1));

        obstacles.push(this.createObstacle(waveZ, pylon1, 'PULSE_PYLON', '#FF1E42', groupId, 1.45));
        if (pylon2 !== undefined) {
          obstacles.push(this.createObstacle(waveZ, pylon2, 'PULSE_PYLON', '#FF1E42', groupId, 1.45));
        }

        // Place an orb right adjacent to pylon1 if safe to encourage a near-miss!
        this.spawnOrbRibbon(orbs, waveZ - 90, waveZ + 30, safeLane, 3);
        this.lastSpawnZ = waveZ;
        break;
      }

      case 'LASER_GATE': {
        // Blocks 3 lanes, leaving 2 open lanes (including safeLane)
        const otherSafeCandidates = ALL_LANES.filter((l) => l !== safeLane);
        const secondSafe = this.rng.pick(otherSafeCandidates);

        for (const lane of ALL_LANES) {
          if (lane !== safeLane && lane !== secondSafe) {
            obstacles.push(this.createObstacle(waveZ, lane, 'LASER_GATE', '#FF2A85', groupId));
          }
        }

        this.spawnOrbRibbon(orbs, waveZ - 100, waveZ + 20, safeLane, 3);
        this.lastSpawnZ = waveZ;
        break;
      }

      case 'SWEEPER_DRONE': {
        // Moving sentinel drone oscillating horizontally across 3 center lanes
        const baseLane = this.rng.pick([-1, 0, 1] as const);
        const obs = this.createObstacle(waveZ, baseLane, 'SWEEPER_DRONE', '#FEE440', groupId);
        obs.oscillationRange = 1.35;
        obs.oscillationSpeed = 2.4 + Math.min(1.8, survivalSeconds * 0.015);
        obs.oscillationPhase = this.rng.next() * Math.PI * 2;
        obstacles.push(obs);

        // Place orbs along outer safe lane
        const orbLane: LaneIndex = baseLane >= 0 ? -2 : 2;
        this.lastSafeLane = orbLane;
        this.spawnOrbRibbon(orbs, waveZ - 95, waveZ + 35, orbLane, 3);
        this.lastSpawnZ = waveZ;
        break;
      }

      case 'TUNNEL_PINCH': {
        // Outer walls (-2 and +2) plus one inner obstacle, funneling through the middle
        const centerSafe: LaneIndex = this.rng.pick([-1, 0, 1] as const);
        this.lastSafeLane = centerSafe;
        const innerBlocked = ([-1, 0, 1] as LaneIndex[]).find((l) => l !== centerSafe) ?? 1;

        for (const lane of [-2, 2, innerBlocked] as LaneIndex[]) {
          obstacles.push(this.createObstacle(waveZ, lane, 'TUNNEL_PINCH', '#9B5DE5', groupId, 1.25));
        }

        this.spawnOrbRibbon(orbs, waveZ - 80, waveZ + 40, centerSafe, 4, true);
        this.lastSpawnZ = waveZ;
        break;
      }

      case 'SLALOM_WALL': {
        // Two sequential mini-waves that guide the player in a smooth S-curve
        const laneA = safeLane;
        const stepDir = laneA <= 0 ? 1 : -1;
        const laneB = Math.max(-2, Math.min(2, laneA + stepDir)) as LaneIndex;
        this.lastSafeLane = laneB;

        const subGap = 155;
        const waveZ2 = waveZ + subGap;

        // First wall leaves laneA and an adjacent lane open
        for (const lane of ALL_LANES) {
          if (Math.abs(lane - laneA) > 1) {
            obstacles.push(this.createObstacle(waveZ, lane, 'SLALOM_WALL', '#FF2A85', groupId));
          }
        }
        // Second wall leaves laneB and an adjacent lane open
        const groupId2 = this.nextGroupId++;
        for (const lane of ALL_LANES) {
          if (Math.abs(lane - laneB) > 1) {
            obstacles.push(this.createObstacle(waveZ2, lane, 'SLALOM_WALL', '#FF2A85', groupId2));
          }
        }

        // Diagonal orb trail guiding from laneA to laneB
        orbs.push({
          id: this.nextEntityId++,
          z: waveZ - 45,
          lane: laneA,
          collected: false,
          missed: false,
          pulsePhase: 0,
        });
        orbs.push({
          id: this.nextEntityId++,
          z: waveZ + subGap * 0.5,
          lane: (laneA + laneB) * 0.5,
          collected: false,
          missed: false,
          pulsePhase: 1,
        });
        orbs.push({
          id: this.nextEntityId++,
          z: waveZ2 + 15,
          lane: laneB,
          collected: false,
          missed: false,
          pulsePhase: 2,
          isSuperOrb: true,
        });

        this.lastSpawnZ = waveZ2;
        break;
      }
    }
  }

  private createObstacle(
    z: number,
    lane: LaneIndex,
    type: ObstaclePatternType,
    color: string,
    groupId: number,
    heightMultiplier: number = 1.0
  ): ObstacleEntity {
    return {
      id: this.nextEntityId++,
      z,
      lane,
      baseLane: lane,
      widthLanes: 0.8,
      height: 56 * heightMultiplier,
      type,
      oscillationSpeed: 0,
      oscillationRange: 0,
      oscillationPhase: 0,
      color,
      passed: false,
      nearMissChecked: false,
      groupId,
    };
  }

  private spawnOrbRibbon(
    orbs: EnergyOrbEntity[],
    startZ: number,
    endZ: number,
    lane: LaneIndex,
    count: number,
    includeSuperLast: boolean = false
  ): void {
    if (count <= 0) return;
    const step = count > 1 ? (endZ - startZ) / (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      const z = startZ + step * i;
      orbs.push({
        id: this.nextEntityId++,
        z,
        lane,
        collected: false,
        missed: false,
        pulsePhase: i * 0.65,
        isSuperOrb: includeSuperLast && i === count - 1,
      });
    }
  }
}
