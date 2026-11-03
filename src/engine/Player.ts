import { LaneIndex, ShipPreset } from '../types/game';
import { SHIP_PRESETS } from '../services/storage';

/**
 * Player Vehicle Entity for NEON RUSH.
 * Controls 5-lane discrete targets (-2, -1, 0, 1, 2) with continuous spring-damper
 * lateral interpolation, roll banking angles, and thruster ribbon coordinates.
 */

export interface TrailPoint {
  laneX: number;
  zOffset: number;
  alpha: number;
}

export class PlayerController {
  public targetLane: LaneIndex = 0;
  public currentLane: number = 0; // Smoothly interpolated float (-2 to +2)
  public lateralVelocity: number = 0;
  public rollAngle: number = 0; // Banking angle in radians
  public bobPhase: number = 0;
  public invulnerableTimer: number = 0; // Seconds of shield remaining (e.g., after revive)
  public nearMissFlashTimer: number = 0;
  public orbPickupFlashTimer: number = 0;
  public crashed: boolean = false;
  public trail: TrailPoint[] = [];
  public preset: ShipPreset = SHIP_PRESETS[0];

  public reset(preset?: ShipPreset): void {
    this.targetLane = 0;
    this.currentLane = 0;
    this.lateralVelocity = 0;
    this.rollAngle = 0;
    this.bobPhase = 0;
    this.invulnerableTimer = 0;
    this.nearMissFlashTimer = 0;
    this.orbPickupFlashTimer = 0;
    this.crashed = false;
    this.trail = [];
    if (preset) {
      this.preset = preset;
    }
  }

  /**
   * Shift one lane left (-1) or right (+1).
   * Returns true if the target lane actually changed.
   */
  public steer(direction: -1 | 1): boolean {
    if (this.crashed) return false;
    const next = Math.max(-2, Math.min(2, this.targetLane + direction)) as LaneIndex;
    if (next !== this.targetLane) {
      this.targetLane = next;
      // Add immediate impulse to roll angle for snappy arcade feel
      this.rollAngle = direction * 0.45;
      return true;
    }
    return false;
  }

  public update(dt: number, speedFactor: number): void {
    if (this.crashed) return;

    // Critically damped spring interpolation toward targetLane
    const stiffness = 22.0;
    const diff = this.targetLane - this.currentLane;
    this.lateralVelocity = diff * stiffness;
    this.currentLane += this.lateralVelocity * dt;

    // Snap when extremely close
    if (Math.abs(diff) < 0.004) {
      this.currentLane = this.targetLane;
      this.lateralVelocity = 0;
    }

    // Smoothly bank into turns and recover toward 0
    const targetRoll = Math.max(-0.52, Math.min(0.52, diff * 0.55));
    this.rollAngle += (targetRoll - this.rollAngle) * Math.min(1, dt * 16);

    // Subtle hover oscillation
    this.bobPhase += dt * (7 + speedFactor * 4);

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
    if (this.nearMissFlashTimer > 0) {
      this.nearMissFlashTimer = Math.max(0, this.nearMissFlashTimer - dt);
    }
    if (this.orbPickupFlashTimer > 0) {
      this.orbPickupFlashTimer = Math.max(0, this.orbPickupFlashTimer - dt);
    }

    // Update thruster trail ribbon
    this.trail.unshift({
      laneX: this.currentLane,
      zOffset: 0,
      alpha: 1.0,
    });

    const trailSpeed = 120 * (0.8 + speedFactor * 0.5);
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].zOffset += trailSpeed * dt;
      this.trail[i].alpha = Math.max(0, 1 - i / 14);
    }

    if (this.trail.length > 14) {
      this.trail.length = 14;
    }
  }
}
