import {
  ChallengeModifier,
  EnergyOrbEntity,
  FloatingTextEntity,
  ObstacleEntity,
  ParticleEntity,
} from '../types/game';
import { PlayerController } from './Player';
import { audio } from '../services/audio';

/**
 * Collision Detection, Near-Miss Telemetry & Combo Scoring System for NEON RUSH.
 */

export interface ScoringCallbacks {
  onCrash: (obstacle: ObstacleEntity) => void;
  onNearMiss: (points: number, lane: number) => void;
  onOrbCollect: (points: number, combo: number, isSuper: boolean) => void;
}

export class ScoringSystem {
  public score = 0;
  public distanceMeters = 0;
  public survivalSeconds = 0;
  public orbsCollected = 0;
  public nearMissCount = 0;
  public currentCombo = 1;
  public maxCombo = 1;
  public comboStreakOrbs = 0;
  public comboTimer = 0; // 0.0 to 1.0
  public readonly comboDurationSeconds = 4.6;
  private nextFloatingId = 1;
  private processedNearMissGroups = new Set<number>();

  public reset(): void {
    this.score = 0;
    this.distanceMeters = 0;
    this.survivalSeconds = 0;
    this.orbsCollected = 0;
    this.nearMissCount = 0;
    this.currentCombo = 1;
    this.maxCombo = 1;
    this.comboStreakOrbs = 0;
    this.comboTimer = 0;
    this.processedNearMissGroups.clear();
  }

  public update(
    dt: number,
    worldSpeed: number,
    player: PlayerController,
    obstacles: ObstacleEntity[],
    orbs: EnergyOrbEntity[],
    particles: ParticleEntity[],
    floatingTexts: FloatingTextEntity[],
    modifier: ChallengeModifier,
    canvasWidth: number,
    canvasHeight: number,
    callbacks: ScoringCallbacks
  ): void {
    if (player.crashed) return;

    this.survivalSeconds += dt;
    const deltaMeters = (worldSpeed * dt) / 14;
    this.distanceMeters += deltaMeters;

    // Continuous survival score scaled by current combo
    this.score += deltaMeters * 3.2 * (1 + (this.currentCombo - 1) * 0.15);

    // Update combo decay timer
    if (this.currentCombo > 1 || this.comboStreakOrbs > 0) {
      this.comboTimer -= dt / this.comboDurationSeconds;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.currentCombo = 1;
        this.comboStreakOrbs = 0;
      }
    }

    // 1. Check Energy Orb Pickups (generous magnet radius so collection feels juicy)
    for (const orb of orbs) {
      if (orb.collected) continue;

      // Player plane is around z = 0..42
      if (orb.z <= 48 && orb.z >= -32) {
        const laneDiff = Math.abs(player.currentLane - orb.lane);
        if (laneDiff <= 0.68) {
          orb.collected = true;
          this.orbsCollected++;
          this.comboStreakOrbs++;
          this.comboTimer = 1.0;

          const prevCombo = this.currentCombo;
          // Increase combo multiplier every 2 orbs up to 8x
          const nextCombo = Math.min(8, 1 + Math.floor(this.comboStreakOrbs / 2));
          this.currentCombo = nextCombo;
          if (this.currentCombo > this.maxCombo) {
            this.maxCombo = this.currentCombo;
          }

          const baseValue = orb.isSuperOrb ? 150 : 65;
          const points = Math.round(
            baseValue * this.currentCombo * modifier.orbValueMultiplier
          );
          this.score += points;
          player.orbPickupFlashTimer = 0.22;

          audio.playCollect(this.currentCombo);
          if (this.currentCombo > prevCombo && this.currentCombo >= 2) {
            audio.playCombo(this.currentCombo);
          }

          // Spawn floating score popup near player ship
          const screenX = canvasWidth * 0.5 + player.currentLane * (canvasWidth * 0.09);
          const screenY = canvasHeight * 0.76;

          this.spawnFloatingText(
            floatingTexts,
            `+${points}`,
            this.currentCombo > 1 ? `${this.currentCombo}X COMBO` : undefined,
            screenX,
            screenY - 26,
            orb.isSuperOrb ? '#00F5D4' : '#FEE440',
            orb.isSuperOrb ? 1.25 : 1.0
          );

          // Spawn golden/cyan pickup particles
          this.spawnBurst(
            particles,
            screenX,
            screenY,
            12,
            orb.isSuperOrb ? '#00F5D4' : '#FEE440'
          );

          callbacks.onOrbCollect(points, this.currentCombo, Boolean(orb.isSuperOrb));
        }
      }
    }

    // 2. Check Obstacle Collisions & Near-Miss Grazing
    for (const obs of obstacles) {
      // Collision window around player ship plane (z in [-18, +26])
      if (obs.z <= 26 && obs.z >= -18) {
        const laneDist = Math.abs(player.currentLane - obs.lane);
        // Forgiving lethal core threshold (0.56 lane width)
        const collisionThreshold = obs.widthLanes * 0.5 + 0.16;

        if (laneDist < collisionThreshold) {
          if (player.invulnerableTimer > 0) {
            // Shielded pass-through
            if (!obs.nearMissChecked) {
              obs.nearMissChecked = true;
              const screenX = canvasWidth * 0.5 + player.currentLane * (canvasWidth * 0.09);
              const screenY = canvasHeight * 0.78;
              this.spawnBurst(particles, screenX, screenY, 18, '#00F5D4');
            }
          } else {
            // Lethal crash!
            player.crashed = true;
            audio.playCollision();
            const screenX = canvasWidth * 0.5 + player.currentLane * (canvasWidth * 0.09);
            const screenY = canvasHeight * 0.8;
            this.spawnBurst(particles, screenX, screenY, 45, '#FF1E42');
            this.spawnBurst(particles, screenX, screenY, 28, '#00F5D4');
            this.spawnBurst(particles, screenX, screenY, 20, '#FEE440');
            callbacks.onCrash(obs);
            return;
          }
        }
      }

      // Near-Miss check right as obstacle passes behind player nose (z <= -8)
      if (!obs.nearMissChecked && obs.z <= -8) {
        obs.nearMissChecked = true;
        obs.passed = true;

        // Only award once per obstacle wave group so multi-block gates don't double-trigger
        if (!this.processedNearMissGroups.has(obs.groupId)) {
          const laneDist = Math.abs(player.currentLane - obs.lane);
          // Grazing in an adjacent lane (distance between collision threshold and 1.32 lanes)
          if (laneDist >= 0.54 && laneDist <= 1.32) {
            this.processedNearMissGroups.add(obs.groupId);
            this.nearMissCount++;
            // Refresh combo timer on near miss!
            if (this.currentCombo > 1) {
              this.comboTimer = Math.min(1.0, this.comboTimer + 0.45);
            } else {
              this.comboTimer = 0.65;
            }

            const closenessBonus = laneDist < 0.88 ? 1.5 : 1.0;
            const nearMissPoints = Math.round(
              150 * this.currentCombo * modifier.nearMissMultiplier * closenessBonus
            );
            this.score += nearMissPoints;
            player.nearMissFlashTimer = 0.32;

            audio.playNearMiss();

            const screenX = canvasWidth * 0.5 + player.currentLane * (canvasWidth * 0.09);
            const screenY = canvasHeight * 0.74;

            this.spawnFloatingText(
              floatingTexts,
              `NEAR MISS +${nearMissPoints}`,
              laneDist < 0.88 ? 'RAZOR CLOSE!' : undefined,
              screenX,
              screenY - 38,
              '#00F5D4',
              1.18
            );

            this.spawnBurst(particles, screenX, screenY, 16, '#00F5D4');
            callbacks.onNearMiss(nearMissPoints, player.currentLane);
          }
        }
      }
    }
  }

  public spawnFloatingText(
    list: FloatingTextEntity[],
    text: string,
    subtext: string | undefined,
    x: number,
    y: number,
    color: string,
    scale: number = 1.0
  ): void {
    list.push({
      id: this.nextFloatingId++,
      text,
      subtext,
      x,
      y,
      vy: -72,
      color,
      alpha: 1,
      scale,
      life: 0,
      maxLife: 0.95,
    });
  }

  public spawnBurst(
    particles: ParticleEntity[],
    x: number,
    y: number,
    count: number,
    color: string
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 90 + Math.random() * 280;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: 2.2 + Math.random() * 3.8,
        color,
        alpha: 1.0,
        decay: 1.3 + Math.random() * 1.1,
        glow: true,
      });
    }
  }
}
