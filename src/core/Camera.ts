import * as THREE from 'three';
import type { Player } from '../gameplay/Player';

/** Fixed route orientation with spring-smoothed follow and route look-ahead. */
export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  private readonly desired = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private focus = 0;
  private shake = 0;
  private time = 0;
  private initialized = false;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.08, 180);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.fov = width < 700 ? (width < height ? 72 : 61) : 56;
    this.camera.updateProjectionMatrix();
  }

  shiftFocus(): void { this.focus = 1; this.shake = 0.16; }
  impact(): void { this.shake = 0.2; }
  reset(): void { this.initialized = false; this.focus = 0; this.shake = 0; }

  update(dt: number, player: Player): void {
    this.time += dt;
    this.focus = Math.max(0, this.focus - dt * 0.8);
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const speed = Math.min(1, player.speed / 9);
    const mobile = this.camera.aspect < 1.1;
    const behind = mobile ? 9.9 : 10.8;
    const ahead = mobile ? 5.2 : 6.6;
    // The camera remains inside the wide, open traversal lane; scenery frames do not cross its path.
    this.desired.set(player.position.x + (mobile ? 2.2 : 2.8), player.position.y + 6.4 + this.focus * 1.1, player.position.z - behind - speed * 1.2 - this.focus * 1.3);
    this.aim.set(player.position.x, player.position.y + 1.1, player.position.z + ahead + speed * 1.3 + this.focus * 1.5);
    if (!this.initialized) {
      this.camera.position.copy(this.desired);
      this.target.copy(this.aim);
      this.initialized = true;
    } else {
      const follow = 1 - Math.exp(-dt * 6.5);
      const look = 1 - Math.exp(-dt * 7.5);
      this.camera.position.lerp(this.desired, follow);
      this.target.lerp(this.aim, look);
    }
    this.velocity.set(Math.sin(this.time * 61), Math.cos(this.time * 52), 0).multiplyScalar(this.shake * 0.028);
    this.camera.position.add(this.velocity);
    this.camera.lookAt(this.target);
    const fov = (mobile ? (this.camera.aspect < 1 ? 72 : 61) : 56) + speed * 2 + this.focus * 3;
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }
}
