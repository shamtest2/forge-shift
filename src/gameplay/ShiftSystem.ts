import * as THREE from 'three';
import { LevelSystem } from './LevelSystem';

export interface ShiftFeedback { activated: boolean; retracted: boolean; index: number; }

/** Node proximity, state A/B, mechanical deployment, timed retraction and cooldown. */
export class ShiftSystem {
  readonly target: boolean[] = [];
  readonly remaining: number[] = [];
  readonly progress: number[] = [];
  readonly cooldown: number[] = [];
  nearest = -1;
  private phase = 0;

  constructor(private readonly level: LevelSystem) {
    this.reset();
  }

  reset(): void {
    const count = this.level.layout.spec.nodes;
    this.target.length = this.remaining.length = this.progress.length = this.cooldown.length = count;
    this.target.fill(false);
    this.remaining.fill(0);
    this.progress.fill(0);
    this.cooldown.fill(0);
    this.nearest = -1;
    this.phase = 0;
    for (let i = 0; i < count; i++) this.level.setBridgeProgress(i, 0);
  }

  activate(player: THREE.Vector3): ShiftFeedback | null {
    const index = this.level.nearestNode(player);
    if (index < 0 || (this.cooldown[index] ?? 0) > 0) return null;
    const bridge = this.level.layout.bridges[index]!;
    // Retracting a structure out from under the player is never an interaction choice.
    if (this.target[index] && player.z < bridge.near && player.z > bridge.far) return null;
    const active = !this.target[index];
    this.target[index] = active;
    this.cooldown[index] = .72;
    this.remaining[index] = active ? this.level.layout.spec.bridgeTime : 0;
    return { activated: active, retracted: !active, index };
  }

  update(dt: number, player: THREE.Vector3): void {
    this.phase += dt;
    this.nearest = this.level.nearestNode(player);
    for (let i = 0; i < this.target.length; i++) {
      this.cooldown[i] = Math.max(0, (this.cooldown[i] ?? 0) - dt);
      if (this.target[i] && this.remaining[i]! > 0) {
        this.remaining[i] = Math.max(0, this.remaining[i]! - dt);
        if (this.remaining[i] === 0) this.target[i] = false;
      }
      const progress = this.progress[i] ?? 0;
      const next = THREE.MathUtils.clamp(progress + (this.target[i] ? dt / .8 : -dt / .67), 0, 1);
      if (next !== progress) {
        this.progress[i] = next;
        this.level.setBridgeProgress(i, next);
      }
      const visual = this.level.visuals.nodes[i];
      if (!visual) continue;
      const nearby = this.nearest === i;
      const intensity = this.target[i] ? 1.8 : nearby ? 1.08 : .45;
      visual.energy.emissiveIntensity = intensity + Math.sin(this.phase * 3.8 + i) * .12;
      visual.core.rotation.y += dt * (this.target[i] ? 2.2 : .45);
      visual.core.rotation.z += dt * .34;
      visual.ring.rotation.z = Math.sin(this.phase * (this.target[i] ? 2.4 : 1.1)) * .12;
      (visual.halo.material as THREE.SpriteMaterial).opacity = this.target[i] ? .28 : nearby ? .23 : .12;
      visual.group.scale.setScalar(nearby && !this.target[i] ? 1 + Math.sin(this.phase * 4) * .012 : 1);
    }
  }

  get prompt(): string | null {
    if (this.nearest < 0) return null;
    if ((this.cooldown[this.nearest] ?? 0) > 0) return 'SHIFTING ROUTE…';
    return this.target[this.nearest] ? 'ROUTE LINKED   ·   E / SPACE TO RETRACT' : 'E / SPACE   ·   DEPLOY BRIDGE';
  }

  get timedBridge(): number | null {
    if (!this.level.layout.spec.bridgeTime) return null;
    for (let i = this.target.length - 1; i >= 0; i--) {
      if (this.target[i] && this.remaining[i]! > 0) return this.remaining[i]!;
    }
    return null;
  }
}
