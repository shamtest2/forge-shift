import * as THREE from 'three';
import { SceneBuilder, type StageVisuals } from '../presentation/SceneBuilder';

export interface StageSpec {
  name: string;
  callSign: string;
  briefing: string;
  nodes: number;
  speed: number;
  /** Zero means the bridge stays deployed until the player reconfigures it. */
  bridgeTime: number;
  heights: readonly number[];
  hazardAfter: readonly number[];
  rushLane: boolean;
  targetTime: number;
}

export const STAGES: readonly StageSpec[] = [
  { name: 'FOUNDATION', callSign: 'THE FIRST CONNECTION', briefing: 'Deploy the missing bridge. Reach extraction.', nodes: 1, speed: 6.9, bridgeTime: 0, heights: [0, 0], hazardAfter: [], rushLane: false, targetTime: 15 },
  { name: 'SPLIT ROUTE', callSign: 'TWO WAYS THROUGH', briefing: 'The outer lane is faster. The inner lane is safer.', nodes: 2, speed: 7.1, bridgeTime: 0, heights: [0, 0, 0], hazardAfter: [0], rushLane: true, targetTime: 26 },
  { name: 'TIMING', callSign: 'NOTHING STAYS OPEN', briefing: 'Bridges retract. Move before the timer ends.', nodes: 2, speed: 7.1, bridgeTime: 16, heights: [0, 0, 0], hazardAfter: [0, 1], rushLane: true, targetTime: 27 },
  { name: 'VERTICALITY', callSign: 'RISE THROUGH THE FORGE', briefing: 'Shift the ascending ramps and keep moving.', nodes: 3, speed: 7.2, bridgeTime: 17, heights: [0, 1.4, 2.8, 1.3], hazardAfter: [1], rushLane: true, targetTime: 39 },
  { name: 'PRESSURE', callSign: 'THE SYSTEM CLOSES IN', briefing: 'Chain shifts. Protect your combo.', nodes: 3, speed: 7.9, bridgeTime: 13, heights: [0, 1, 0, 1.5], hazardAfter: [0, 1, 2], rushLane: true, targetTime: 34 },
  { name: 'APEX', callSign: 'MASTER THE MACHINE', briefing: 'All systems live. The route is yours to shape.', nodes: 3, speed: 8.0, bridgeTime: 11, heights: [0, 1.5, 2.4, 0.5], hazardAfter: [0, 1, 2], rushLane: true, targetTime: 33 },
];

export interface BridgeLayout {
  index: number;
  nodeX: number;
  nodeZ: number;
  near: number; // Greater z: bank the runner reaches first.
  far: number;
  startY: number;
  endY: number;
}

export interface PlatformLayout { near: number; far: number; y: number; }
export interface HazardLayout { x: number; z: number; y: number; frequency: number; phase: number; }
export interface PickupLayout { x: number; z: number; y: number; }
export interface StageLayout {
  spec: StageSpec;
  stageIndex: number;
  platforms: PlatformLayout[];
  bridges: BridgeLayout[];
  hazards: HazardLayout[];
  pickups: PickupLayout[];
  finishZ: number;
}

/** Owns authored route geometry, real walkability, pickups and physical hazards. */
export class LevelSystem {
  layout!: StageLayout;
  visuals!: StageVisuals;
  readonly bridgeProgress: number[] = [];
  readonly collected = new Set<number>();
  readonly clearedHazards = new Set<number>();

  constructor(private readonly builder: SceneBuilder) {
    this.load(0);
  }

  load(stageIndex: number, variation = 0): void {
    const spec = STAGES[stageIndex];
    if (!spec) throw new Error(`Unknown stage: ${stageIndex}`);
    const bridges: BridgeLayout[] = [];
    const platforms: PlatformLayout[] = [];
    const hazards: HazardLayout[] = [];
    const pickups: PickupLayout[] = [];
    for (let i = 0; i < spec.nodes; i++) {
      const near = -16 - i * 28;
      const far = near - 8;
      bridges.push({ index: i, nodeX: i % 2 ? 2.48 : -2.48, nodeZ: near + 7,
        near, far, startY: spec.heights[i] ?? 0, endY: spec.heights[i + 1] ?? 0 });
      platforms.push({ near: i === 0 ? 7 : -24 - (i - 1) * 28, far: near, y: spec.heights[i] ?? 0 });
      if (spec.hazardAfter.includes(i)) {
        hazards.push({ x: 0, z: far - 5.4, y: spec.heights[i + 1] ?? 0, frequency: 1.7 + i * 0.23, phase: i * 1.65 + stageIndex * 0.31 });
      }
      // A second, authored pickup pattern on replay; both layouts stay reachable.
      pickups.push({ x: (i % 2 ? -1.65 : 1.65) * (variation % 2 ? -1 : 1),
        z: far - 8.6, y: spec.heights[i + 1] ?? 0 });
      if (spec.rushLane) pickups.push({ x: 3.02, z: near - 4, y: ((spec.heights[i] ?? 0) + (spec.heights[i + 1] ?? 0)) / 2 });
    }
    const landingNear = bridges[bridges.length - 1]!.far;
    platforms.push({ near: landingNear, far: landingNear - 15, y: spec.heights[spec.nodes] ?? 0 });
    this.layout = { stageIndex, spec, bridges, platforms, hazards, pickups, finishZ: landingNear - 11 };
    this.bridgeProgress.length = spec.nodes;
    this.bridgeProgress.fill(0);
    this.collected.clear();
    this.clearedHazards.clear();
    this.visuals = this.builder.buildStage(this.layout);
  }

  setBridgeProgress(index: number, progress: number): void {
    this.bridgeProgress[index] = progress;
    this.visuals.bridges[index]?.setProgress(progress);
  }

  groundHeight(x: number, z: number): number | null {
    // The edge and the gap are real voids. A bridge is solid only once its two
    // mechanical halves have joined; colored floor pixels are never colliders.
    if (Math.abs(x) <= 3.95) {
      for (const pad of this.layout.platforms) {
        if (z <= pad.near && z >= pad.far) return pad.y;
      }
    }
    for (const bridge of this.layout.bridges) {
      if (z > bridge.near || z < bridge.far || (this.bridgeProgress[bridge.index] ?? 0) < 0.9) continue;
      const onSafeLane = Math.abs(x) <= 1.88;
      const onRushLane = this.layout.spec.rushLane && x >= 2.51 && x <= 3.59;
      if (!onSafeLane && !onRushLane) return null;
      return THREE.MathUtils.lerp(bridge.startY, bridge.endY, (bridge.near - z) / 8);
    }
    return null;
  }

  onRushLane(x: number, z: number): boolean {
    return this.layout.spec.rushLane && x > 2.51 && x < 3.59 && this.layout.bridges.some(
      bridge => z <= bridge.near && z >= bridge.far && (this.bridgeProgress[bridge.index] ?? 0) > 0.9,
    );
  }

  update(dt: number, elapsed: number, player: THREE.Vector3): { pickup: number; hazard: boolean; cleanPass: number } {
    let pickup = 0;
    let hazard = false;
    let cleanPass = 0;
    const visuals = this.visuals;
    for (let i = 0; i < this.layout.hazards.length; i++) {
      const field = this.layout.hazards[i]!;
      const x = Math.sin(elapsed * field.frequency + field.phase) * 2.65;
      const visual = visuals.hazards[i];
      if (visual) visual.position.x = x;
      if (Math.abs(player.z - field.z) < 0.78 && Math.abs(player.x - x) < 0.72 && Math.abs(player.y - field.y) < 1.5) {
        hazard = true;
      }
      // Detect passing once rather than scoring every frame. This is awarded
      // only when the player has already cleared the dangerous z interval.
      if (player.z < field.z - 1.6 && !this.clearedHazards.has(i) && !hazard) {
        this.clearedHazards.add(i);
        cleanPass++;
      }
    }
    for (let i = 0; i < this.layout.pickups.length; i++) {
      if (this.collected.has(i)) continue;
      const item = this.layout.pickups[i]!;
      const visual = visuals.pickups[i];
      if (visual) {
        visual.rotation.y += dt * 1.9;
        visual.position.y = item.y + 0.9 + Math.sin(elapsed * 3 + i) * 0.11;
      }
      if (Math.abs(player.y - item.y) < 1.4 && Math.hypot(player.x - item.x, player.z - item.z) < 0.79) {
        this.collected.add(i);
        if (visual) visual.visible = false;
        pickup++;
      }
    }
    return { pickup, hazard, cleanPass };
  }

  reachedFinish(player: THREE.Vector3): boolean {
    return player.z < this.layout.finishZ && Math.abs(player.x) < 2.85 && player.y > (this.layout.platforms.at(-1)?.y ?? 0) - 0.6;
  }

  nearestNode(player: THREE.Vector3): number {
    let result = -1;
    let nearest = 3.6 * 3.6;
    for (const bridge of this.layout.bridges) {
      const dx = player.x - bridge.nodeX;
      const dz = player.z - bridge.nodeZ;
      const dy = player.y - bridge.startY;
      const distance = dx * dx + dz * dz + dy * dy;
      if (distance < nearest) { nearest = distance; result = bridge.index; }
    }
    return result;
  }
}
