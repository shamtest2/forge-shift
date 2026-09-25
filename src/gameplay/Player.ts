import * as THREE from 'three';

/** A small articulated runner, built as layered armor rather than a primitive capsule. */
export class Player {
  readonly position = new THREE.Vector3(0, 0, 3);
  readonly velocity = new THREE.Vector3();
  readonly group = new THREE.Group();
  private readonly model = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly owned: Array<THREE.BufferGeometry | THREE.Material> = [];
  private readonly accents: THREE.MeshStandardMaterial[] = [];
  private stride = 0;
  private fallSpeed = 0;
  grounded = true;
  speed = 6.9;

  constructor(scene: THREE.Scene) {
    this.buildSuit();
    this.group.add(this.model);
    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  reset(y = 0): void {
    this.position.set(0, y, 3);
    this.velocity.set(0, 0, 0);
    this.fallSpeed = 0;
    this.grounded = true;
    this.stride = 0;
    this.group.position.copy(this.position);
    this.model.rotation.set(0, 0, 0);
    this.model.position.y = 0;
  }

  get horizontalSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  setFinish(skin: 'ice' | 'ember' | 'ghost'): void {
    const colors = { ice: 0x00d7ff, ember: 0xffb14a, ghost: 0xe7edf3 };
    for (const material of this.accents) {
      material.color.setHex(colors[skin]);
      material.emissive.setHex(colors[skin]);
    }
  }

  /** Ground comes from the actual walkable level; gaps and edges have no floor. */
  update(dt: number, inputX: number, inputZ: number,
    ground: (x: number, z: number) => number | null,
    constrainX: (x: number, z: number) => number): void {
    const magnitude = Math.hypot(inputX, inputZ) || 1;
    const targetX = inputX / magnitude * this.speed;
    const targetZ = inputZ / magnitude * this.speed;
    // Stop promptly at narrow shoulders and gaps; momentum should not carry
    // a released strafe off a ledge on a low-frame-rate device.
    const acceleration = inputX || inputZ ? 14 : 18;
    const t = 1 - Math.exp(-acceleration * dt);
    this.velocity.x += (targetX - this.velocity.x) * t;
    this.velocity.z += (targetZ - this.velocity.z) * t;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    const boundedX = constrainX(this.position.x, this.position.z);
    if (boundedX !== this.position.x) {
      this.position.x = boundedX;
      this.velocity.x = 0;
    }

    const floor = ground(this.position.x, this.position.z);
    if (floor !== null && (this.grounded || (this.fallSpeed <= 0 && this.position.y >= floor - 0.25))) {
      this.position.y = floor;
      this.fallSpeed = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
      this.fallSpeed = Math.max(this.fallSpeed - 20 * dt, -28);
      this.position.y += this.fallSpeed * dt;
    }
    this.animate(dt);
    this.group.position.copy(this.position);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
    for (const resource of this.owned) resource.dispose();
  }

  private animate(dt: number): void {
    const effort = Math.min(this.horizontalSpeed / this.speed, 1);
    this.stride += dt * (5 + effort * 10);
    this.model.position.y = this.grounded ? Math.abs(Math.sin(this.stride)) * 0.055 * effort : 0;
    this.leftLeg.rotation.x = Math.sin(this.stride) * 0.58 * effort;
    this.rightLeg.rotation.x = -this.leftLeg.rotation.x;
    this.leftArm.rotation.x = -this.leftLeg.rotation.x * 0.72;
    this.rightArm.rotation.x = -this.rightLeg.rotation.x * 0.72;
    const desiredYaw = effort > 0.12 ? Math.atan2(-this.velocity.x, -this.velocity.z) : this.model.rotation.y;
    let delta = desiredYaw - this.model.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    this.model.rotation.y += delta * Math.min(1, dt * 12);
    this.model.rotation.z += ((-this.velocity.x / this.speed) * 0.065 - this.model.rotation.z) * Math.min(1, dt * 10);
  }

  private buildSuit(): void {
    const mat = (color: number, metallic = 0.65, roughness = 0.4, glow = 0): THREE.MeshStandardMaterial => {
      const material = new THREE.MeshStandardMaterial({ color, metalness: metallic, roughness,
        emissive: glow ? color : 0x000000, emissiveIntensity: glow });
      this.owned.push(material);
      if (glow) this.accents.push(material);
      return material;
    };
    const armor = mat(0xb8c4ce, 0.8, 0.28);
    const graphite = mat(0x19242d, 0.55, 0.55);
    const dark = mat(0x080e14, 0.32, 0.3);
    const highlight = mat(0xf2f5f6, 0.65, 0.32);
    const energy = mat(0x00d7ff, 0.2, 0.25, 0.85);
    const geom = (w: number, h: number, d: number): THREE.BoxGeometry => {
      const geometry = new THREE.BoxGeometry(w, h, d);
      this.owned.push(geometry);
      return geometry;
    };
    const piece = (parent: THREE.Object3D, material: THREE.Material,
      w: number, h: number, d: number, x: number, y: number, z: number, rz = 0): THREE.Mesh => {
      const mesh = new THREE.Mesh(geom(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.rotation.z = rz;
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    // Inner chassis and shaped breast/back plates.
    piece(this.model, graphite, 0.46, 0.62, 0.29, 0, 1.13, 0);
    const torsoShape = new THREE.Shape();
    torsoShape.moveTo(-0.31, 1.41); torsoShape.lineTo(0.31, 1.41);
    torsoShape.lineTo(0.25, 0.99); torsoShape.lineTo(0.13, 0.88);
    torsoShape.lineTo(-0.13, 0.88); torsoShape.lineTo(-0.25, 0.99);
    torsoShape.closePath();
    const torso = new THREE.ExtrudeGeometry(torsoShape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.035, bevelSegments: 1 });
    torso.computeVertexNormals(); this.owned.push(torso);
    const back = new THREE.Mesh(torso, armor); back.position.z = 0.04; back.castShadow = true; this.model.add(back);
    piece(this.model, dark, 0.37, 0.18, 0.035, 0, 1.19, -0.21);
    piece(this.model, highlight, 0.42, 0.065, 0.05, 0, 1.39, -0.2);
    piece(this.model, energy, 0.22, 0.035, 0.045, 0, 1.25, -0.237);
    piece(this.model, graphite, 0.38, 0.24, 0.3, 0, 0.78, 0.0);
    piece(this.model, armor, 0.42, 0.11, 0.34, 0, 0.91, 0);
    // Compact cooling pack, split vents and a guarded power spine visible to camera.
    piece(this.model, graphite, 0.39, 0.43, 0.18, 0, 1.16, 0.22);
    for (const side of [-1, 1]) {
      piece(this.model, dark, 0.12, 0.31, 0.06, side * 0.115, 1.15, 0.33);
      piece(this.model, energy, 0.025, 0.22, 0.009, side * 0.115, 1.17, 0.37);
      piece(this.model, highlight, 0.12, 0.035, 0.05, side * 0.115, 1.37, 0.32);
    }
    // Helmet: segmented shell, inset black faceplate, narrow illuminated sensor.
    const helm = new THREE.Group(); helm.position.y = 1.64; this.model.add(helm);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.252, 12, 10), armor);
    this.owned.push(shell.geometry); shell.scale.set(1.13, 1, 1.12); shell.castShadow = true; helm.add(shell);
    piece(helm, dark, 0.42, 0.18, 0.055, 0, -0.025, -0.238);
    piece(helm, energy, 0.32, 0.026, 0.008, 0, -0.012, -0.274);
    piece(helm, graphite, 0.37, 0.09, 0.18, 0, 0.188, 0.005);
    piece(helm, highlight, 0.16, 0.065, 0.02, 0, 0.045, 0.267);
    for (const side of [-1, 1]) {
      const arm = side < 0 ? this.leftArm : this.rightArm;
      arm.position.set(side * 0.355, 1.37, 0); this.model.add(arm);
      piece(arm, graphite, 0.19, 0.29, 0.22, 0, -0.12, 0);
      piece(arm, armor, 0.24, 0.21, 0.27, side * 0.018, -0.06, 0.012, side * 0.12);
      piece(arm, armor, 0.16, 0.25, 0.18, 0, -0.36, -0.04);
      piece(arm, dark, 0.16, 0.13, 0.18, 0, -0.54, -0.06);
      piece(arm, energy, 0.025, 0.15, 0.016, side * 0.11, -0.36, -0.04);
      const leg = side < 0 ? this.leftLeg : this.rightLeg;
      leg.position.set(side * 0.145, 0.83, 0); this.model.add(leg);
      piece(leg, graphite, 0.24, 0.38, 0.26, 0, -0.20, 0);
      piece(leg, armor, 0.24, 0.29, 0.27, 0, -0.20, -0.045);
      piece(leg, highlight, 0.21, 0.10, 0.27, 0, -0.41, -0.05);
      piece(leg, graphite, 0.205, 0.25, 0.22, 0, -0.55, 0.02);
      piece(leg, armor, 0.23, 0.18, 0.31, 0, -0.71, -0.06);
      piece(leg, dark, 0.25, 0.065, 0.36, 0, -0.80, -0.07);
    }
  }
}
