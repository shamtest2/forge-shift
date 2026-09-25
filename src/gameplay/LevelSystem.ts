import type { SceneBuilder } from '../presentation/SceneBuilder';

export interface SurfaceSpec {
  id: string;
  kind: 'deck' | 'bridge' | 'ramp' | 'detour';
  x: number;
  width: number;
  z0: number;
  z1: number;
  y0: number;
  y1?: number;
}
export interface NodeSpec { id: string; x: number; z: number; y: number; bridge: string; duration?: number; }
export interface HazardSpec { id: string; x: number; z: number; y: number; width: number; period: number; phase: number; kind: 'sweep' | 'pulse'; }
export interface PickupSpec { x: number; z: number; y: number; }
export interface StageConfig {
  name: string;
  code: string;
  brief: string;
  speed: number;
  par: number;
  spawn: { x: number; z: number; y: number };
  finish: { x: number; z: number; y: number };
  surfaces: SurfaceSpec[];
  nodes: NodeSpec[];
  hazards: HazardSpec[];
  pickups: PickupSpec[];
}

export const STAGES: readonly StageConfig[] = [
  {
    name: 'THE THRESHOLD', code: '01 / FOUNDATION', brief: 'Bring the bridge online. Reach extraction.', speed: 8.2, par: 28,
    spawn: { x: 0, y: 0, z: 0 }, finish: { x: 0, y: 0, z: 32 },
    surfaces: [
      { id: 'entry', kind: 'deck', x: 0, width: 9, z0: -11, z1: 12, y0: 0 },
      { id: 'span-1', kind: 'bridge', x: 0, width: 6.8, z0: 12, z1: 19, y0: 0 },
      { id: 'exit', kind: 'deck', x: 0, width: 8.5, z0: 19, z1: 37, y0: 0 },
    ],
    nodes: [{ id: 'A', x: 2, z: 8.6, y: 0, bridge: 'span-1' }],
    hazards: [], pickups: [{ x: -2.7, y: 0, z: 6 }, { x: 1.9, y: 0, z: 25 }],
  },
];

/** Stage data, physical walkable surfaces and bridge collision share the same source of truth. */
export class LevelSystem {
  stage: StageConfig = STAGES[0];
  index = 0;
  private readonly bridgeStates = new Map<string, { progress: number; target: number }>();

  constructor(private readonly visuals: SceneBuilder) { this.load(0); }

  load(index: number): void {
    if (!STAGES[index]) throw new RangeError(`Unknown stage ${index}`);
    this.stage = STAGES[index];
    this.index = index;
    this.bridgeStates.clear();
    for (const surface of this.stage.surfaces) {
      if (surface.kind === 'bridge') this.bridgeStates.set(surface.id, { progress: 0, target: 0 });
    }
    this.visuals.buildStage(this.stage);
  }

  setBridge(id: string, active: boolean): void {
    const bridge = this.bridgeStates.get(id);
    if (!bridge) throw new Error(`Missing shift bridge ${id}`);
    bridge.target = Number(active);
  }
  bridgeProgress(id: string): number { return this.bridgeStates.get(id)?.progress ?? 0; }
  isBridgeActive(id: string): boolean { return this.bridgeStates.get(id)?.target === 1; }

  update(dt: number): void {
    for (const [id, bridge] of this.bridgeStates) {
      const sign = Math.sign(bridge.target - bridge.progress);
      bridge.progress = Math.max(0, Math.min(1, bridge.progress + sign * dt * 1.9));
      this.visuals.setBridgeProgress(id, bridge.progress);
    }
  }

  groundAt(x: number, z: number): number | null {
    let height: number | null = null;
    for (const surface of this.stage.surfaces) {
      if (Math.abs(x - surface.x) > surface.width * 0.5 || z < surface.z0 - 0.015 || z > surface.z1 + 0.015) continue;
      if (surface.kind === 'bridge' && this.bridgeProgress(surface.id) < 0.95) continue;
      const slope = (z - surface.z0) / (surface.z1 - surface.z0);
      const y = surface.y0 + ((surface.y1 ?? surface.y0) - surface.y0) * Math.max(0, Math.min(1, slope));
      height = height === null ? y : Math.max(height, y);
    }
    return height;
  }

  get length(): number { return this.stage.finish.z; }
  get atFinish(): number { return this.stage.finish.z; }
}
