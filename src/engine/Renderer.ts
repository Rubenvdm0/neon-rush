import {
  EnergyOrbEntity,
  FloatingTextEntity,
  ObstacleEntity,
  ParticleEntity,
} from '../types/game';
import { PlayerController } from './Player';

/**
 * 60 FPS HTML5 Canvas Pseudo-3D Synthwave Renderer for NEON RUSH.
 * Uses perspective projection without heavy WebGL asset overhead for instant load & 60 FPS.
 */

interface SpeedLine {
  angle: number;
  distance: number; // 0.05 to 1.0 from vanishing point
  length: number;
  speed: number;
  color: string;
}

export class NeonRenderer {
  private speedLines: SpeedLine[] = [];
  private gridScrollOffset = 0;
  public shakeIntensity = 0;
  public crashFlashAlpha = 0;
  private curvePhase = 0;

  constructor() {
    this.initSpeedLines();
  }

  private initSpeedLines(): void {
    this.speedLines = [];
    const colors = ['#00F5D4', '#00BBF9', '#FF2A85', '#9B5DE5'];
    for (let i = 0; i < 42; i++) {
      this.speedLines.push({
        angle: (Math.PI * 2 * i) / 42 + (Math.random() - 0.5) * 0.1,
        distance: Math.random(),
        length: 0.06 + Math.random() * 0.12,
        speed: 0.45 + Math.random() * 0.85,
        color: colors[i % colors.length],
      });
    }
  }

  public triggerShake(amount: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, amount);
  }

  public triggerCrashFlash(): void {
    this.crashFlashAlpha = 0.85;
  }

  /**
   * Projects a 3D world point (lane in [-2.5, +2.5], z in [-50, 1280], yOffset in world units)
   * onto 2D canvas coordinates with perspective scale.
   */
  private project(
    lane: number,
    z: number,
    yHeight: number,
    width: number,
    height: number,
    vpX: number,
    vpY: number,
    cameraLane: number,
    curveAmount: number
  ): { x: number; y: number; scale: number; laneWidthPx: number } {
    const fov = 260;
    const clampedZ = Math.max(-45, z);
    const scale = fov / (fov + clampedZ);

    const floorBottomY = height * 0.82;
    const yFloor = vpY + (floorBottomY - vpY) * scale;

    // Total track width at player plane (z = 0, scale = 1)
    const trackSpreadAtCamera = Math.min(width * 0.86, Math.max(320, width * 0.64));
    const singleLaneWidthAtCamera = trackSpreadAtCamera / 5;
    const laneWidthPx = singleLaneWidthAtCamera * scale;

    // Gentle horizon curvature at high distance
    const depthNorm = Math.max(0, 1 - scale);
    const curveShift = curveAmount * depthNorm * depthNorm * (width * 0.12);

    // Camera follows a fraction of player's lane for kinetic parallax
    const relLane = lane - cameraLane * 0.28;
    const x = vpX + curveShift + relLane * laneWidthPx;
    const y = yFloor - yHeight * scale;

    return { x, y, scale, laneWidthPx };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dt: number,
    worldSpeed: number,
    player: PlayerController,
    obstacles: ObstacleEntity[],
    orbs: EnergyOrbEntity[],
    particles: ParticleEntity[],
    floatingTexts: FloatingTextEntity[],
    phaseColor: string,
    combo: number
  ): void {
    const speedRatio = Math.max(0.3, Math.min(2.2, worldSpeed / 520));
    this.gridScrollOffset = (this.gridScrollOffset + worldSpeed * dt) % 120;
    this.curvePhase += dt * 0.38 * speedRatio;
    const curveAmount = Math.sin(this.curvePhase) * 0.65;

    // Decay screen shake & crash flash
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 38);
    }
    if (this.crashFlashAlpha > 0) {
      this.crashFlashAlpha = Math.max(0, this.crashFlashAlpha - dt * 2.4);
    }

    ctx.save();

    // Apply screen shake offset
    if (this.shakeIntensity > 0.2) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const sy = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(sx, sy);
    }

    // Subtle camera horizon tilt based on player steering roll
    const cameraRoll = -player.rollAngle * 0.035;
    if (Math.abs(cameraRoll) > 0.0005) {
      ctx.translate(width * 0.5, height * 0.5);
      ctx.rotate(cameraRoll);
      ctx.translate(-width * 0.5, -height * 0.5);
    }

    const vpX = width * 0.5 - player.currentLane * (width * 0.018);
    const vpY = height * 0.34;

    // 1. Background Sky & Horizon Core
    this.drawSkyAndHorizon(ctx, width, height, vpX, vpY, phaseColor, speedRatio, combo);

    // 2. Speed Lines radiating from Vanishing Point
    this.drawSpeedLines(ctx, width, height, vpX, vpY, dt, speedRatio);

    // 3. Perspective 5-Lane Neon Track Grid
    this.drawTrackGrid(
      ctx,
      width,
      height,
      vpX,
      vpY,
      player.currentLane,
      player.targetLane,
      curveAmount,
      phaseColor
    );

    // 4. Sort and Draw World Entities (Obstacles & Energy Orbs) from Far to Near
    type RenderItem =
      | { kind: 'obstacle'; z: number; entity: ObstacleEntity }
      | { kind: 'orb'; z: number; entity: EnergyOrbEntity };

    const renderQueue: RenderItem[] = [];
    for (const obs of obstacles) {
      if (obs.z > -40 && obs.z <= 1280) {
        renderQueue.push({ kind: 'obstacle', z: obs.z, entity: obs });
      }
    }
    for (const orb of orbs) {
      if (!orb.collected && orb.z > -30 && orb.z <= 1280) {
        renderQueue.push({ kind: 'orb', z: orb.z, entity: orb });
      }
    }

    // Sort far (high Z) to near (low Z)
    renderQueue.sort((a, b) => b.z - a.z);

    let playerDrawn = false;
    for (const item of renderQueue) {
      // Draw player right at z = 0 plane so obstacles behind z=0 overlap naturally
      if (!playerDrawn && item.z < 0) {
        this.drawPlayerCraft(ctx, width, height, vpX, vpY, player, curveAmount, combo);
        playerDrawn = true;
      }

      if (item.kind === 'orb') {
        this.drawEnergyOrb(
          ctx,
          width,
          height,
          vpX,
          vpY,
          item.entity,
          player.currentLane,
          curveAmount
        );
      } else {
        this.drawObstacle(
          ctx,
          width,
          height,
          vpX,
          vpY,
          item.entity,
          player.currentLane,
          curveAmount
        );
      }
    }

    if (!playerDrawn) {
      this.drawPlayerCraft(ctx, width, height, vpX, vpY, player, curveAmount, combo);
    }

    // 5. Update and Draw Particle System
    this.updateAndDrawParticles(ctx, particles, dt);

    // 6. Update and Draw Floating Score Telemetry Popups
    this.updateAndDrawFloatingTexts(ctx, floatingTexts, dt);

    // 7. Near-Miss Edge Vignette or Crash Chromatic Flash
    if (player.nearMissFlashTimer > 0) {
      const alpha = (player.nearMissFlashTimer / 0.32) * 0.26;
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        width * 0.25,
        width * 0.5,
        height * 0.5,
        width * 0.7
      );
      grad.addColorStop(0, 'rgba(0, 245, 212, 0)');
      grad.addColorStop(1, `rgba(0, 245, 212, ${alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    if (this.crashFlashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 30, 66, ${this.crashFlashAlpha * 0.45})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  private drawSkyAndHorizon(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vpX: number,
    vpY: number,
    phaseColor: string,
    speedRatio: number,
    combo: number
  ): void {
    // Deep Obsidian Void Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#04050A');
    skyGrad.addColorStop(0.34, '#0C0F24');
    skyGrad.addColorStop(0.36, '#140B29');
    skyGrad.addColorStop(1, '#06070E');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Glowing Synthwave Sun / Core at Vanishing Point
    const sunRadius = Math.min(width, height) * (0.14 + Math.min(combo, 8) * 0.006);
    const sunGrad = ctx.createRadialGradient(vpX, vpY, 4, vpX, vpY, sunRadius * 2.4);
    sunGrad.addColorStop(0, 'rgba(255, 42, 133, 0.42)');
    sunGrad.addColorStop(0.38, 'rgba(155, 93, 229, 0.22)');
    sunGrad.addColorStop(0.75, 'rgba(0, 245, 212, 0.06)');
    sunGrad.addColorStop(1, 'rgba(6, 7, 14, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, vpY + sunRadius * 1.5);

    // Retro-futuristic segmented synth sun disc above horizon
    ctx.save();
    ctx.beginPath();
    ctx.arc(vpX, vpY - sunRadius * 0.18, sunRadius * 0.72, Math.PI, 0, false);
    ctx.closePath();
    const discGrad = ctx.createLinearGradient(0, vpY - sunRadius, 0, vpY);
    discGrad.addColorStop(0, '#FEE440');
    discGrad.addColorStop(0.55, '#FF2A85');
    discGrad.addColorStop(1, '#9B5DE5');
    ctx.fillStyle = discGrad;
    ctx.globalAlpha = 0.75;
    ctx.fill();

    // Horizontal scanline cutouts across the lower sun
    ctx.fillStyle = '#0C0F24';
    for (let i = 0; i < 5; i++) {
      const lineY = vpY - i * (sunRadius * 0.11) - 4;
      const lineH = Math.max(1.5, (5 - i) * 1.1);
      ctx.fillRect(vpX - sunRadius, lineY, sunRadius * 2, lineH);
    }
    ctx.restore();

    // Distant Angular Wireframe Synth Peaks along the Horizon
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, vpY);
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const px = (width / segments) * i;
      const distFromCenter = Math.abs(px - vpX) / (width * 0.5);
      const peakHeight =
        Math.sin(i * 1.7 + 0.5) * 18 +
        Math.cos(i * 2.9) * 12 +
        distFromCenter * 42 * (0.8 + speedRatio * 0.1);
      const py = vpY - Math.max(2, peakHeight * (distFromCenter > 0.22 ? 1 : 0.18));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(width, vpY);
    ctx.closePath();

    ctx.fillStyle = '#070914';
    ctx.fill();
    ctx.strokeStyle = phaseColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Horizon laser divider line
    ctx.save();
    ctx.strokeStyle = '#00F5D4';
    ctx.shadowColor = '#00F5D4';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, vpY);
    ctx.lineTo(width, vpY);
    ctx.stroke();
    ctx.restore();
  }

  private drawSpeedLines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vpX: number,
    vpY: number,
    dt: number,
    speedRatio: number
  ): void {
    const maxRadius = Math.hypot(width, height) * 0.75;
    ctx.save();
    for (const line of this.speedLines) {
      line.distance += line.speed * speedRatio * dt * 0.95;
      if (line.distance > 1.0) {
        line.distance = 0.06 + Math.random() * 0.12;
      }

      const r1 = line.distance * maxRadius;
      const r2 = Math.min(
        maxRadius,
        (line.distance + line.length * speedRatio * 0.85) * maxRadius
      );

      const x1 = vpX + Math.cos(line.angle) * r1;
      const y1 = vpY + Math.sin(line.angle) * r1 * 0.68;
      const x2 = vpX + Math.cos(line.angle) * r2;
      const y2 = vpY + Math.sin(line.angle) * r2 * 0.68;

      ctx.strokeStyle = line.color;
      ctx.globalAlpha = Math.min(0.55, line.distance * 0.55 * Math.min(1.4, speedRatio));
      ctx.lineWidth = 1 + line.distance * 1.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawTrackGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vpX: number,
    vpY: number,
    cameraLane: number,
    targetLane: number,
    curveAmount: number,
    phaseColor: string
  ): void {
    ctx.save();

    // Draw dark track asphalt ribbon polygon from horizon to bottom
    const farLeft = this.project(-2.5, 1280, 0, width, height, vpX, vpY, cameraLane, curveAmount);
    const farRight = this.project(2.5, 1280, 0, width, height, vpX, vpY, cameraLane, curveAmount);
    const nearLeft = this.project(-2.5, -40, 0, width, height, vpX, vpY, cameraLane, curveAmount);
    const nearRight = this.project(2.5, -40, 0, width, height, vpX, vpY, cameraLane, curveAmount);

    const roadGrad = ctx.createLinearGradient(0, vpY, 0, height);
    roadGrad.addColorStop(0, 'rgba(13, 16, 33, 0.92)');
    roadGrad.addColorStop(0.5, 'rgba(9, 12, 26, 0.96)');
    roadGrad.addColorStop(1, 'rgba(6, 7, 15, 0.99)');

    ctx.beginPath();
    ctx.moveTo(farLeft.x, farLeft.y);
    ctx.lineTo(farRight.x, farRight.y);
    ctx.lineTo(nearRight.x, nearRight.y);
    ctx.lineTo(nearLeft.x, nearLeft.y);
    ctx.closePath();
    ctx.fillStyle = roadGrad;
    ctx.fill();

    // Highlight active target lane ribbon so player has instant lane clarity
    const activeLeftEdge = targetLane - 0.5;
    const activeRightEdge = targetLane + 0.5;
    ctx.beginPath();
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const z = -30 + (1250 * i) / steps;
      const p = this.project(activeLeftEdge, z, 0, width, height, vpX, vpY, cameraLane, curveAmount);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    for (let i = steps; i >= 0; i--) {
      const z = -30 + (1250 * i) / steps;
      const p = this.project(
        activeRightEdge,
        z,
        0,
        width,
        height,
        vpX,
        vpY,
        cameraLane,
        curveAmount
      );
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const laneGlow = ctx.createLinearGradient(0, vpY, 0, height);
    laneGlow.addColorStop(0, 'rgba(0, 245, 212, 0.01)');
    laneGlow.addColorStop(0.7, 'rgba(0, 245, 212, 0.07)');
    laneGlow.addColorStop(1, 'rgba(0, 245, 212, 0.14)');
    ctx.fillStyle = laneGlow;
    ctx.fill();

    // Draw scrolling horizontal Z-grid cross lines
    for (let zBase = 0; zBase < 1260; zBase += 60) {
      const z = zBase - (this.gridScrollOffset % 60);
      if (z < -30) continue;
      const pL = this.project(-2.5, z, 0, width, height, vpX, vpY, cameraLane, curveAmount);
      const pR = this.project(2.5, z, 0, width, height, vpX, vpY, cameraLane, curveAmount);

      const alpha = Math.max(0.05, Math.min(0.32, pL.scale * 0.38));
      ctx.strokeStyle = `rgba(0, 245, 212, ${alpha})`;
      ctx.lineWidth = Math.max(1, pL.scale * 1.8);
      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.lineTo(pR.x, pR.y);
      ctx.stroke();
    }

    // Draw the 6 longitudinal lane boundary rails (-2.5, -1.5, -0.5, 0.5, 1.5, 2.5)
    const boundaries = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
    for (const bLane of boundaries) {
      const isOuterBarrier = Math.abs(bLane) > 2.0;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const z = -35 + (1300 * i) / 18;
        const p = this.project(bLane, z, 0, width, height, vpX, vpY, cameraLane, curveAmount);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }

      if (isOuterBarrier) {
        ctx.strokeStyle = phaseColor;
        ctx.shadowColor = phaseColor;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.9;
      } else {
        ctx.strokeStyle = '#00F5D4';
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.32;
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawEnergyOrb(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vpX: number,
    vpY: number,
    orb: EnergyOrbEntity,
    cameraLane: number,
    curveAmount: number
  ): void {
    const hoverY = 18 + Math.sin(orb.pulsePhase) * 5;
    const proj = this.project(
      orb.lane,
      orb.z,
      hoverY,
      width,
      height,
      vpX,
      vpY,
      cameraLane,
      curveAmount
    );
    const floorProj = this.project(
      orb.lane,
      orb.z,
      0,
      width,
      height,
      vpX,
      vpY,
      cameraLane,
      curveAmount
    );

    const radius = Math.max(3.5, (orb.isSuperOrb ? 22 : 16) * proj.scale);
    const primaryColor = orb.isSuperOrb ? '#00F5D4' : '#FEE440';
    const secondaryColor = orb.isSuperOrb ? '#9B5DE5' : '#FF6B35';

    ctx.save();

    // Floor shadow / glow disc
    ctx.fillStyle = primaryColor;
    ctx.globalAlpha = 0.25 * Math.min(1, proj.scale * 1.4);
    ctx.beginPath();
    ctx.ellipse(
      floorProj.x,
      floorProj.y,
      radius * 1.15,
      Math.max(1.5, radius * 0.35),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Outer plasma halo
    const grad = ctx.createRadialGradient(
      proj.x,
      proj.y,
      radius * 0.15,
      proj.x,
      proj.y,
      radius * 2.1
    );
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.35, primaryColor);
    grad.addColorStop(0.75, secondaryColor);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.globalAlpha = Math.min(1, proj.scale * 1.65);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, radius * 2.0, 0, Math.PI * 2);
    ctx.fill();

    // Crisp geometric diamond core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, 1.8 * proj.scale);
    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y - radius * 0.9);
    ctx.lineTo(proj.x + radius * 0.9, proj.y);
    ctx.lineTo(proj.x, proj.y + radius * 0.9);
    ctx.lineTo(proj.x - radius * 0.9, proj.y);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  private drawObstacle(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vpX: number,
    vpY: number,
    obs: ObstacleEntity,
    cameraLane: number,
    curveAmount: number
  ): void {
    const depthThickness = 22;
    const halfW = obs.widthLanes * 0.5;

    // For Sweeper Drones, draw laser guide rail on the floor across its sweep zone
    if (obs.type === 'SWEEPER_DRONE') {
      const railL = this.project(
        obs.baseLane - obs.oscillationRange,
        obs.z,
        0,
        width,
        height,
        vpX,
        vpY,
        cameraLane,
        curveAmount
      );
      const railR = this.project(
        obs.baseLane + obs.oscillationRange,
        obs.z,
        0,
        width,
        height,
        vpX,
        vpY,
        cameraLane,
        curveAmount
      );
      ctx.save();
      ctx.strokeStyle = 'rgba(254, 228, 64, 0.55)';
      ctx.lineWidth = Math.max(1.5, 3.5 * railL.scale);
      ctx.setLineDash([6 * railL.scale, 4 * railL.scale]);
      ctx.beginPath();
      ctx.moveTo(railL.x, railL.y);
      ctx.lineTo(railR.x, railR.y);
      ctx.stroke();
      ctx.restore();
    }

    // Front face corners (closer to camera: z)
    const fBL = this.project(
      obs.lane - halfW,
      obs.z,
      0,
      width,
      height,
      vpX,
      vpY,
      cameraLane,
      curveAmount
    );
    const fBR = this.project(
      obs.lane + halfW,
      obs.z,
      0,
      width,
      height,
      vpX,
      vpY,
      cameraLane,
      curveAmount
    );
    const fTL = this.project(
      obs.lane - halfW,
      obs.z,
      obs.height,
      width,
      height,
      vpX,
      vpY,
      cameraLane,
      curveAmount
    );
    const fTR = this.project(
      obs.lane + halfW,
      obs.z,
      obs.height,
      width,
      height,
      vpX,
      vpY,
      cameraLane,
      curveAmount
    );

    // Back top corners for 3D extrusion depth (z + depthThickness)
    const bTL = this.project(
      obs.lane - halfW,
      obs.z + depthThickness,
      obs.height,
      width,
      height,
      vpX,
      vpY,
      cameraLane,
      curveAmount
    );
    const bTR = this.project(
      obs.lane + halfW,
      obs.z + depthThickness,
      obs.height,
      width,
      height,
      vpX,
      vpY,
      cameraLane,
      curveAmount
    );

    const alpha = Math.min(1, Math.max(0.15, 1.35 - obs.z / 1280));

    ctx.save();
    ctx.globalAlpha = alpha;

    // Floor reflection glow
    ctx.fillStyle = obs.color;
    ctx.globalAlpha = alpha * 0.22;
    ctx.fillRect(
      fBL.x - 4 * fBL.scale,
      fBL.y,
      fBR.x - fBL.x + 8 * fBL.scale,
      Math.max(2, 10 * fBL.scale)
    );
    ctx.globalAlpha = alpha;

    // Top extruded bevel face
    ctx.beginPath();
    ctx.moveTo(fTL.x, fTL.y);
    ctx.lineTo(fTR.x, fTR.y);
    ctx.lineTo(bTR.x, bTR.y);
    ctx.lineTo(bTL.x, bTL.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fill();
    ctx.strokeStyle = obs.color;
    ctx.lineWidth = Math.max(1, 1.6 * fBL.scale);
    ctx.stroke();

    // Front monolith face
    const faceGrad = ctx.createLinearGradient(0, fTL.y, 0, fBL.y);
    faceGrad.addColorStop(0, obs.color);
    faceGrad.addColorStop(0.35, 'rgba(22, 12, 36, 0.92)');
    faceGrad.addColorStop(1, 'rgba(10, 8, 22, 0.96)');

    ctx.beginPath();
    ctx.moveTo(fTL.x, fTL.y);
    ctx.lineTo(fTR.x, fTR.y);
    ctx.lineTo(fBR.x, fBR.y);
    ctx.lineTo(fBL.x, fBL.y);
    ctx.closePath();
    ctx.fillStyle = faceGrad;
    ctx.fill();

    // Neon glowing outline
    ctx.strokeStyle = obs.color;
    ctx.shadowColor = obs.color;
    ctx.shadowBlur = 10 * fBL.scale;
    ctx.lineWidth = Math.max(1.2, 2.4 * fBL.scale);
    ctx.stroke();

    // Inner hazard energy core bar
    const midY = (fTL.y + fBL.y) * 0.5;
    const padX = (fBR.x - fBL.x) * 0.18;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, 2 * fBL.scale);
    ctx.beginPath();
    ctx.moveTo(fBL.x + padX, midY);
    ctx.lineTo(fBR.x - padX, midY);
    ctx.stroke();

    ctx.restore();
  }

  private drawPlayerCraft(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vpX: number,
    vpY: number,
    player: PlayerController,
    curveAmount: number,
    combo: number
  ): void {
    if (player.crashed) return;

    const hoverY = 6 + Math.sin(player.bobPhase) * 2.5;
    const proj = this.project(
      player.currentLane,
      0,
      hoverY,
      width,
      height,
      vpX,
      vpY,
      player.currentLane,
      curveAmount
    );
    const floorProj = this.project(
      player.currentLane,
      0,
      0,
      width,
      height,
      vpX,
      vpY,
      player.currentLane,
      curveAmount
    );

    const primary = player.preset.primaryColor;
    const secondary = player.preset.secondaryColor;
    const thruster = player.preset.thrusterColor;

    // 1. Draw Thruster Ribbon Trail behind craft
    if (player.trail.length > 1) {
      ctx.save();
      for (let i = 0; i < player.trail.length - 1; i++) {
        const pt1 = player.trail[i];
        const pt2 = player.trail[i + 1];
        const p1 = this.project(
          pt1.laneX,
          -pt1.zOffset * 0.45,
          2,
          width,
          height,
          vpX,
          vpY,
          player.currentLane,
          curveAmount
        );
        const p2 = this.project(
          pt2.laneX,
          -pt2.zOffset * 0.45,
          2,
          width,
          height,
          vpX,
          vpY,
          player.currentLane,
          curveAmount
        );

        ctx.strokeStyle = thruster;
        ctx.globalAlpha = pt1.alpha * 0.42;
        ctx.lineWidth = Math.max(2, (14 - i) * 1.4);
        ctx.beginPath();
        ctx.moveTo(p1.x - 12, p1.y);
        ctx.lineTo(p2.x - 12, p2.y);
        ctx.moveTo(p1.x + 12, p1.y);
        ctx.lineTo(p2.x + 12, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    const shipScale = Math.max(0.78, Math.min(1.35, width / 1100));

    ctx.save();
    ctx.translate(proj.x, proj.y);

    // Ground under-glow shadow beneath ship
    ctx.save();
    ctx.translate(0, floorProj.y - proj.y + 8);
    const underGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, 46 * shipScale);
    underGlow.addColorStop(0, primary);
    underGlow.addColorStop(0.5, secondary);
    underGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = underGlow;
    ctx.globalAlpha = 0.45;
    ctx.scale(1.4, 0.38);
    ctx.beginPath();
    ctx.arc(0, 0, 44 * shipScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Rotate craft by aerodynamic roll angle
    ctx.rotate(player.rollAngle);
    ctx.scale(shipScale, shipScale);

    // Invulnerability shield dome flicker (after revive)
    if (player.invulnerableTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#00F5D4';
      ctx.fillStyle = 'rgba(0, 245, 212, 0.14)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -4, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Main Swept Delta Wings (Futuristic Interceptor silhouette)
    ctx.shadowColor = primary;
    ctx.shadowBlur = 16 + Math.min(combo, 8) * 1.5;

    // Outer Wing Hull
    ctx.beginPath();
    ctx.moveTo(0, -34); // Nose apex
    ctx.lineTo(42, 16); // Right wingtip
    ctx.lineTo(28, 22); // Right outer tail
    ctx.lineTo(14, 12); // Right inner notch
    ctx.lineTo(-14, 12); // Left inner notch
    ctx.lineTo(-28, 22); // Left outer tail
    ctx.lineTo(-42, 16); // Left wingtip
    ctx.closePath();

    const hullGrad = ctx.createLinearGradient(0, -34, 0, 22);
    hullGrad.addColorStop(0, '#19223C');
    hullGrad.addColorStop(0.6, '#0D1021');
    hullGrad.addColorStop(1, '#06070E');
    ctx.fillStyle = hullGrad;
    ctx.fill();

    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Inner Wing Accent Stripes
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(26, 13);
    ctx.lineTo(13, 9);
    ctx.lineTo(0, -8);
    ctx.lineTo(-13, 9);
    ctx.lineTo(-26, 13);
    ctx.closePath();
    ctx.fillStyle = secondary;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Cockpit Canopy Glass
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(8, 2);
    ctx.lineTo(0, 8);
    ctx.lineTo(-8, 2);
    ctx.closePath();
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();

    // Dual Plasma Thruster Exhaust Nozzles
    const flameFlicker = 1 + Math.sin(player.bobPhase * 4) * 0.22;
    const nozzleOffsets = [-13, 13];
    for (const nx of nozzleOffsets) {
      ctx.beginPath();
      ctx.moveTo(nx - 5, 12);
      ctx.lineTo(nx + 5, 12);
      ctx.lineTo(nx, 12 + 22 * flameFlicker);
      ctx.closePath();
      ctx.fillStyle = thruster;
      ctx.fill();

      // White-hot inner core
      ctx.beginPath();
      ctx.moveTo(nx - 2.5, 12);
      ctx.lineTo(nx + 2.5, 12);
      ctx.lineTo(nx, 12 + 12 * flameFlicker);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    ctx.restore();
  }

  private updateAndDrawParticles(
    ctx: CanvasRenderingContext2D,
    particles: ParticleEntity[],
    dt: number
  ): void {
    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt; // subtle gravity arc
      p.alpha -= p.decay * dt;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private updateAndDrawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    floatingTexts: FloatingTextEntity[],
    dt: number
  ): void {
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life += dt;
      ft.y += ft.vy * dt;
      ft.vy *= 0.94; // smooth deceleration

      if (ft.life >= ft.maxLife) {
        floatingTexts.splice(i, 1);
        continue;
      }

      const progress = ft.life / ft.maxLife;
      const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = `800 ${Math.round(18 * ft.scale)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);

      if (ft.subtext) {
        ctx.font = `700 ${Math.round(11 * ft.scale)}px "Chakra Petch", sans-serif`;
        ctx.fillStyle = '#F8FAFC';
        ctx.fillText(ft.subtext, ft.x, ft.y - 19 * ft.scale);
      }
    }
    ctx.restore();
  }
}
