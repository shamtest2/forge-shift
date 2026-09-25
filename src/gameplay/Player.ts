import * as THREE from 'three';
import type { MoveVector } from '../core/Input';

const SPEED = 8.4;
const ACCELERATION = 16;
const BRAKING = 12;

/** World-space movement with an independently animated, authored exosuit silhouette. */
export class Player {
  readonly root = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  readonly position = this.root.position;
  readonly radius = 0.43;
  private readonly body = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly geometry = new Map<string, THREE.BufferGeometry>();
  private readonly materials: THREE.Material[];
  private readonly armor: THREE.MeshStandardMaterial;
  private readonly graphite: THREE.MeshStandardMaterial;
  private readonly joints: THREE.MeshStandardMaterial;
  private readonly light: THREE.MeshStandardMaterial;
  private readonly detail: THREE.MeshStandardMaterial;
  private phase = 0;
  private heading = 0;

  constructor(scene: THREE.Scene) {
    this.armor = new THREE.MeshStandardMaterial({ color: 0xc6d5df, metalness: 0.68, roughness: 0.31 });
    this.graphite = new THREE.MeshStandardMaterial({ color: 0x202c35, metalness: 0.66, roughness: 0.41 });
    this.joints = new THREE.MeshStandardMaterial({ color: 0x0d141b, metalness: 0.25, roughness: 0.62 });
    this.light = new THREE.MeshStandardMaterial({ color: 0x0b869c, emissive: 0x00c9e9, emissiveIntensity: 1.8, metalness: 0.2, roughness: 0.35 });
    this.detail = new THREE.MeshStandardMaterial({ color: 0x728fa1, metalness: 0.8, roughness: 0.31 });
    this.materials = [this.armor, this.graphite, this.joints, this.light, this.detail];
    this.buildSuit();
    this.root.add(this.body);
    scene.add(this.root);
  }

  get speed(): number {
    return this.velocity.length();
  }

  get facing(): number {
    return this.heading;
  }

  setAppearance(variant: 'default' | 'carbon' | 'arctic'): void {
    this.armor.color.setHex(variant === 'carbon' ? 0x546777 : variant === 'arctic' ? 0xe0e5e2 : 0xc6d5df);
  }

  reset(x = 0, z = 5): void {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.root.rotation.y = 0;
    this.heading = 0;
    this.phase = 0;
  }

  update(dt: number, input: Readonly<MoveVector>): void {
    const length = Math.hypot(input.x, input.z);
    const targetX = length ? input.x / length * SPEED : 0;
    const targetZ = length ? input.z / length * SPEED : 0;
    const response = 1 - Math.exp(-(length ? ACCELERATION : BRAKING) * dt);
    this.velocity.x += (targetX - this.velocity.x) * response;
    this.velocity.z += (targetZ - this.velocity.z) * response;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.2) {
      const target = Math.atan2(-this.velocity.x, -this.velocity.z);
      const difference = Math.atan2(Math.sin(target - this.heading), Math.cos(target - this.heading));
      this.heading += difference * (1 - Math.exp(-13 * dt));
      this.root.rotation.y = this.heading;
    }
    this.phase += dt * Math.min(speed, 8) * 1.9;
    const stride = Math.min(speed / SPEED, 1);
    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.035 * stride;
    this.leftLeg.rotation.x = Math.sin(this.phase) * 0.48 * stride;
    this.rightLeg.rotation.x = -this.leftLeg.rotation.x;
    this.leftArm.rotation.x = -this.leftLeg.rotation.x * 0.65;
    this.rightArm.rotation.x = -this.rightLeg.rotation.x * 0.65;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.geometry.forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose());
  }

  private box(parent: THREE.Object3D, name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material): THREE.Mesh {
    const key = `box-${w}-${h}-${d}`;
    let geometry = this.geometry.get(key);
    if (!geometry) {
      geometry = new THREE.BoxGeometry(w, h, d);
      this.geometry.set(key, geometry);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private shape(parent: THREE.Object3D, name: string, points: [number, number][], depth: number, x: number, y: number, z: number, material: THREE.Material): THREE.Mesh {
    const outline = new THREE.Shape();
    outline.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) outline.lineTo(points[i][0], points[i][1]);
    outline.closePath();
    let geometry = this.geometry.get(name);
    if (!geometry) {
      geometry = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1, steps: 1 });
      geometry.center();
      this.geometry.set(name, geometry);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private buildSuit(): void {
    // Silhouette: plated exosuit, offset backpack, leg armor, articulated stride.
    this.box(this.body, 'hip joint', 0.45, 0.24, 0.29, 0, 0.99, 0, this.joints);
    this.shape(this.body, 'tapered chest', [[-0.31, -0.32], [0.31, -0.32], [0.39, 0.27], [-0.39, 0.27]], 0.25, 0, 1.46, 0, this.graphite);
    this.shape(this.body, 'front cuirass', [[-0.26, -0.21], [0.26, -0.21], [0.31, 0.17], [0.12, 0.26], [-0.12, 0.26], [-0.31, 0.17]], 0.065, 0, 1.48, -0.169, this.armor);
    this.box(this.body, 'breastplate seam', 0.045, 0.37, 0.024, 0, 1.48, -0.218, this.detail);
    this.box(this.body, 'shoulder rail', 0.88, 0.15, 0.23, 0, 1.79, 0.005, this.graphite);
    this.box(this.body, 'collar', 0.33, 0.1, 0.34, 0, 1.83, 0, this.armor);
    this.box(this.body, 'neck', 0.2, 0.12, 0.2, 0, 1.86, 0, this.joints);

    // Angular helmet and recessed forward-facing visor (forward is -Z).
    this.shape(this.body, 'helmet', [[-0.20, -0.19], [0.20, -0.19], [0.25, 0.08], [0.12, 0.24], [-0.12, 0.24], [-0.25, 0.08]], 0.29, 0, 2.06, 0, this.armor);
    this.box(this.body, 'visor recess', 0.36, 0.085, 0.024, 0, 2.08, -0.18, this.joints);
    this.box(this.body, 'visor glass', 0.29, 0.028, 0.026, 0, 2.08, -0.197, this.light);
    this.box(this.body, 'crown', 0.075, 0.14, 0.31, 0, 2.29, 0, this.graphite);
    this.box(this.body, 'backpack chassis', 0.47, 0.53, 0.23, 0, 1.49, 0.25, this.graphite);
    this.box(this.body, 'backpack spine', 0.1, 0.45, 0.04, 0, 1.49, 0.391, this.detail);
    for (const side of [-1, 1]) {
      this.box(this.body, 'reactor mount', 0.105, 0.41, 0.14, side * 0.17, 1.50, 0.388, this.armor);
      this.box(this.body, 'reactor slit', 0.033, 0.22, 0.012, side * 0.17, 1.51, 0.472, this.light);
      this.box(this.body, 'hip plate', 0.21, 0.22, 0.26, side * 0.22, 0.95, -0.045, this.armor);

      const arm = side < 0 ? this.leftArm : this.rightArm;
      arm.position.set(side * 0.45, 1.73, 0);
      this.body.add(arm);
      this.shape(arm, 'angular pauldron', [[-0.18, -0.12], [0.18, -0.12], [0.18, 0.10], [0.07, 0.18], [-0.07, 0.18], [-0.18, 0.10]], 0.27, 0, -0.05, 0, this.armor);
      this.box(arm, 'upper arm', 0.15, 0.29, 0.19, 0, -0.29, 0, this.graphite);
      this.box(arm, 'elbow', 0.17, 0.13, 0.17, 0, -0.47, 0, this.joints);
      this.box(arm, 'forearm gauntlet', 0.19, 0.27, 0.22, 0, -0.64, -0.01, this.armor);
      this.box(arm, 'gauntlet seam', 0.055, 0.13, 0.02, 0, -0.66, -0.135, this.detail);
      this.box(arm, 'hand', 0.13, 0.12, 0.17, 0, -0.85, -0.02, this.joints);

      const leg = side < 0 ? this.leftLeg : this.rightLeg;
      leg.position.set(side * 0.19, 0.9, 0);
      this.body.add(leg);
      this.box(leg, 'thigh actuator', 0.23, 0.41, 0.25, 0, -0.23, 0, this.graphite);
      this.box(leg, 'thigh plating', 0.24, 0.33, 0.085, 0, -0.21, -0.125, this.armor);
      this.box(leg, 'knee', 0.21, 0.14, 0.24, 0, -0.47, -0.04, this.detail);
      this.box(leg, 'shin armor', 0.23, 0.34, 0.24, 0, -0.66, -0.015, this.armor);
      this.box(leg, 'shin inlay', 0.035, 0.18, 0.014, 0, -0.63, -0.146, this.detail);
      this.box(leg, 'boot', 0.25, 0.17, 0.37, 0, -0.83, -0.09, this.graphite);
      this.box(leg, 'toe cap', 0.25, 0.07, 0.17, 0, -0.88, -0.205, this.armor);
    }
  }
}
