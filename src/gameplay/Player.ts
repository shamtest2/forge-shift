import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Input } from '../core/Input';
import type { LevelSystem } from './LevelSystem';

/** Small, animated exosuit silhouette. Position is at the soles, not the camera or torso. */
export class Player {
  readonly root = new THREE.Group();
  readonly position = this.root.position;
  private readonly body = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly velocity = new THREE.Vector3();
  private readonly armor = new THREE.MeshStandardMaterial({ color: 0xd7e1e6, metalness: 0.76, roughness: 0.32 });
  private readonly under = new THREE.MeshStandardMaterial({ color: 0x18242c, metalness: 0.35, roughness: 0.78 });
  private readonly dark = new THREE.MeshStandardMaterial({ color: 0x28353e, metalness: 0.86, roughness: 0.32 });
  private readonly energy = new THREE.MeshStandardMaterial({ color: 0x45ddf3, emissive: 0x00bfe9, emissiveIntensity: 1.5, metalness: 0.15, roughness: 0.24 });
  private readonly visor = new THREE.MeshPhysicalMaterial({ color: 0x071825, metalness: 0.6, roughness: 0.12, clearcoat: 1 });
  private readonly pieces: THREE.BufferGeometry[] = [];
  private readonly shadow: THREE.Mesh;
  private airVelocity = 0;
  private stride = 0;
  private distance = 0;
  private grounded = true;
  speed = 0;

  constructor(scene: THREE.Scene) {
    this.root.name = 'Pilot / MK-IV traversal rig';
    const rounded = (x: number, y: number, z: number, radius = 0.06) => {
      const shape = new RoundedBoxGeometry(x, y, z, 2, radius);
      this.pieces.push(shape);
      return shape;
    };
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    this.root.add(this.body);
    const torso = rounded(0.74, 0.82, 0.38, 0.12);
    part(this.body, torso, this.under, 0, 1.52, 0);
    const breastplate = rounded(0.62, 0.51, 0.12, 0.08);
    part(this.body, breastplate, this.armor, 0, 1.67, 0.25);
    const core = rounded(0.3, 0.065, 0.033, 0.015);
    part(this.body, core, this.energy, 0, 1.66, 0.323);
    const rib = rounded(0.12, 0.37, 0.17, 0.032);
    part(this.body, rib, this.dark, -0.29, 1.44, 0.24);
    part(this.body, rib, this.dark, 0.29, 1.44, 0.24);
    const waist = rounded(0.54, 0.22, 0.38, 0.07);
    part(this.body, waist, this.dark, 0, 1.03, 0);
    const pack = rounded(0.54, 0.64, 0.23, 0.07);
    part(this.body, pack, this.dark, 0, 1.55, -0.29);
    const reactor = rounded(0.14, 0.42, 0.06, 0.025);
    part(this.body, reactor, this.energy, 0, 1.56, -0.44);
    const helmet = rounded(0.57, 0.54, 0.57, 0.2);
    part(this.body, helmet, this.armor, 0, 2.16, 0);
    const mask = rounded(0.52, 0.28, 0.15, 0.07);
    part(this.body, mask, this.visor, 0, 2.15, 0.29);
    const eye = rounded(0.41, 0.037, 0.022, 0.01);
    part(this.body, eye, this.energy, 0, 2.20, 0.376);
    const crest = rounded(0.18, 0.055, 0.47, 0.02);
    part(this.body, crest, this.dark, 0, 2.45, 0.01);
    const joint = new THREE.MeshStandardMaterial({ color: 0x111a20, metalness: 0.25, roughness: 0.85 });
    for (const [side, leg, arm] of [[-1, this.leftLeg, this.leftArm], [1, this.rightLeg, this.rightArm]] as const) {
      leg.position.set(side * 0.22, 0.99, 0);
      this.body.add(leg);
      part(leg, rounded(0.26, 0.49, 0.31, 0.07), this.armor, 0, -0.24, 0.015);
      part(leg, rounded(0.2, 0.18, 0.24, 0.05), joint, 0, -0.52, 0);
      part(leg, rounded(0.28, 0.43, 0.31, 0.06), this.dark, 0, -0.73, 0);
      part(leg, rounded(0.21, 0.3, 0.047, 0.014), this.armor, 0, -0.72, 0.16);
      part(leg, rounded(0.34, 0.16, 0.5, 0.05), this.armor, 0, -0.95, 0.11);
      arm.position.set(side * 0.48, 1.89, 0);
      this.body.add(arm);
      part(arm, rounded(0.3, 0.27, 0.42, 0.085), this.armor, side * 0.04, -0.1, 0);
      part(arm, rounded(0.22, 0.48, 0.25, 0.06), this.dark, side * 0.07, -0.36, 0);
      part(arm, rounded(0.19, 0.35, 0.25, 0.05), this.armor, side * 0.08, -0.73, 0.02);
      part(arm, rounded(0.2, 0.16, 0.26, 0.05), joint, side * 0.08, -0.95, 0.02);
      const shoulderLight = rounded(0.025, 0.19, 0.13, 0.008);
      part(arm, shoulderLight, this.energy, side * 0.19, -0.12, 0.18);
    }
    const shadowGeometry = new THREE.CircleGeometry(0.64, 24);
    this.pieces.push(shadowGeometry);
    const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.23, depthWrite: false });
    this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.013;
    this.shadow.scale.set(1, 1.5, 1);
    this.root.add(this.shadow);
    scene.add(this.root);
  }

  get isFalling(): boolean { return !this.grounded; }
  get travelled(): number { return this.distance; }

  reset(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.airVelocity = 0;
    this.grounded = true;
    this.speed = 0;
    this.distance = 0;
    this.stride = 0;
    this.body.rotation.set(0, 0, 0);
    this.leftLeg.rotation.x = this.rightLeg.rotation.x = 0;
    this.leftArm.rotation.x = this.rightArm.rotation.x = 0;
  }

  /** Applies one gameplay step; missing floor means an actual fall, never an invisible wall. */
  update(dt: number, input: Input, level: LevelSystem): void {
    let x = input.horizontal;
    let z = input.vertical;
    const magnitude = Math.hypot(x, z);
    if (magnitude > 1) { x /= magnitude; z /= magnitude; }
    const maxSpeed = level.stage.speed;
    const blend = 1 - Math.exp(-dt * (magnitude ? 13 : 10));
    this.velocity.x += (x * maxSpeed - this.velocity.x) * blend;
    this.velocity.z += (z * maxSpeed - this.velocity.z) * blend;
    const dx = this.velocity.x * dt;
    const dz = this.velocity.z * dt;
    this.position.x += dx;
    this.position.z += dz;
    this.distance += Math.hypot(dx, dz);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    const floor = level.groundAt(this.position.x, this.position.z);
    if (floor !== null && this.position.y >= floor - 0.34 && this.airVelocity <= 0) {
      this.position.y = floor;
      this.airVelocity = 0;
      this.grounded = true;
    } else {
      this.airVelocity -= dt * 24;
      this.position.y += this.airVelocity * dt;
      this.grounded = false;
    }
    const motion = Math.min(1, this.speed / 5) * Number(this.grounded);
    this.stride += dt * this.speed * 2.3;
    this.leftLeg.rotation.x = Math.sin(this.stride) * 0.38 * motion;
    this.rightLeg.rotation.x = -this.leftLeg.rotation.x;
    this.leftArm.rotation.x = -this.leftLeg.rotation.x * 0.65;
    this.rightArm.rotation.x = this.leftLeg.rotation.x * 0.65;
    this.body.position.y = Math.abs(Math.sin(this.stride)) * 0.035 * motion;
    this.body.rotation.z += (-this.velocity.x / maxSpeed * 0.12 - this.body.rotation.z) * Math.min(1, dt * 8);
    this.body.rotation.x += (this.velocity.z / maxSpeed * 0.065 - this.body.rotation.x) * Math.min(1, dt * 8);
    this.shadow.visible = this.grounded;
  }

  setSuit(color: number, energy: number): void {
    this.armor.color.setHex(color);
    this.energy.color.setHex(energy);
    this.energy.emissive.setHex(energy);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.root);
    for (const geometry of this.pieces) geometry.dispose();
    for (const material of [this.armor, this.under, this.dark, this.energy, this.visor]) material.dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
