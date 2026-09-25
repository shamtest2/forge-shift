import * as THREE from 'three';
import type { Player } from '../gameplay/Player';

/** Smooth fixed-heading chase rig: world-space axes remain stable for both keyboard layouts. */
export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  private readonly desired = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly player: Player;

  constructor(player: Player) {
    this.player = player;
    this.camera = new THREE.PerspectiveCamera(59, 1, 0.1, 180);
    this.reset();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  reset(): void {
    const p = this.player.position;
    this.camera.position.set(p.x, p.y + 6.0, p.z + 10.5);
    this.look.set(p.x, p.y + 1.25, p.z - 4.0);
    this.camera.lookAt(this.look);
  }

  update(dt: number): void {
    const p = this.player.position;
    // Anticipate the route, but never jerk the view in response to a quick turn.
    const speed = Math.min(this.player.speed / 8.4, 1);
    this.desired.set(p.x + this.player.velocity.x * 0.08, p.y + 6.0 + speed * 0.4, p.z + 10.5 + speed * 0.5);
    this.target.set(p.x + this.player.velocity.x * 0.12, p.y + 1.3, p.z - 4.0 - speed * 1.2);
    const follow = 1 - Math.exp(-5.4 * dt);
    this.camera.position.lerp(this.desired, follow);
    this.look.lerp(this.target, 1 - Math.exp(-6.2 * dt));
    this.camera.lookAt(this.look);
    const fov = 59 + speed * 3;
    this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-3 * dt));
    this.camera.updateProjectionMatrix();
  }
}
