import * as THREE from 'three';

/** Damped world-space chase rig. It never rotates with the avatar into walls. */
export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(61, 1, 0.1, 180);
  private readonly look = new THREE.Vector3(0, 1.5, -5);
  private readonly desired = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private initialized = false;
  private impulse = 0;
  private elapsed = 0;

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.fov = width < 650 ? 68 : 61;
    this.camera.updateProjectionMatrix();
  }

  reset(position: THREE.Vector3): void {
    this.initialized = false;
    this.update(1, position, 0, false);
  }

  impact(amount: number): void {
    this.impulse = Math.max(this.impulse, Math.min(amount, 0.28));
  }

  update(dt: number, player: THREE.Vector3, speed: number, focus: boolean): void {
    const forward = Math.min(speed / 9, 1);
    const width = focus ? 1.2 : 0;
    this.desired.set(player.x * 0.58 + 1.25, player.y + 6.1 + width, player.z + 9.2 + width);
    this.target.set(player.x * 0.72, player.y + 1.4, player.z - 4.6 - forward * 2 - width);
    const follow = this.initialized ? 1 - Math.exp(-dt * 5.2) : 1;
    const aim = this.initialized ? 1 - Math.exp(-dt * 6.5) : 1;
    this.camera.position.lerp(this.desired, follow);
    this.look.lerp(this.target, aim);
    this.initialized = true;
    // Brief, sub-pixel-to-small impact: never shakes the target or moves the route.
    this.elapsed += dt;
    this.impulse *= Math.exp(-dt * 13);
    if (this.impulse > 0.001) {
      this.camera.position.x += Math.sin(this.elapsed * 51) * this.impulse;
      this.camera.position.y += Math.cos(this.elapsed * 43) * this.impulse * 0.45;
    }
    this.camera.lookAt(this.look);
  }
}
