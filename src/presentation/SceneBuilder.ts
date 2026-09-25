import * as THREE from 'three';

/** Shared-material industrial kit. Geometry ownership stays here, not in the render loop. */
export class SceneBuilder {
  readonly scene = new THREE.Scene();
  readonly root = new THREE.Group();
  private readonly geometries = new Map<string, THREE.BoxGeometry>();
  private readonly materials: THREE.Material[] = [];
  private readonly steel = this.material(0x29343e, 0.62, 0.44);
  private readonly graphite = this.material(0x151e27, 0.52, 0.65);
  private readonly deck = this.material(0x1d2932, 0.44, 0.8);
  private readonly inset = this.material(0x35434e, 0.66, 0.48);
  private readonly white = this.material(0xaebfc9, 0.7, 0.35);
  private readonly cyan = this.material(0x006d89, 0.35, 0.45, 0.75);
  private readonly amber = this.material(0x8a572c, 0.28, 0.52, 0.7);

  constructor() {
    this.scene.background = new THREE.Color('#070a10');
    this.scene.fog = new THREE.FogExp2('#080e16', 0.013);
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xb9cfdd, 0x101822, 1.9));
    const key = new THREE.DirectionalLight(0xe0ecf6, 3.0);
    key.position.set(-8, 15, 12);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x4b9ab0, 1.0);
    rim.position.set(6, 7, -24);
    this.scene.add(rim);
    this.drawPlatform(7, -16, 0);
    this.backdrop();
  }

  groundHeight(x: number, z: number): number | null {
    return Math.abs(x) <= 4 && z <= 7 && z >= -16 ? 0 : null;
  }

  dispose(): void {
    this.scene.remove(this.root);
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const material of this.materials) material.dispose();
  }

  private material(color: number, metalness: number, roughness: number, glow = 0): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness,
      emissive: glow ? color : 0x000000, emissiveIntensity: glow });
    this.materials.push(m);
    return m;
  }

  private box(w: number, h: number, d: number): THREE.BoxGeometry {
    const key = `${w}:${h}:${d}`;
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = new THREE.BoxGeometry(w, h, d);
      this.geometries.set(key, geometry);
    }
    return geometry;
  }

  private piece(w: number, h: number, d: number, x: number, y: number, z: number,
    material: THREE.Material, parent: THREE.Object3D = this.root): THREE.Mesh {
    const mesh = new THREE.Mesh(this.box(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  private drawPlatform(near: number, far: number, height: number): void {
    const length = near - far;
    const middle = (near + far) / 2;
    this.piece(8.2, 0.63, length, 0, height - 0.35, middle, this.steel);
    this.piece(7.8, 0.045, length - 0.4, 0, height - 0.01, middle, this.deck);
    for (let z = far + 1.5; z < near - 1; z += 3.1) {
      for (const side of [-1, 1]) {
        this.piece(3.37, 0.027, 2.82, side * 1.81, height + 0.025, z, this.graphite);
        this.piece(0.035, 0.018, 2.16, side * 3.22, height + 0.052, z, this.inset);
      }
      this.piece(0.07, 0.024, 2.16, 0, height + 0.049, z, this.white);
      this.piece(7.9, 0.095, 0.1, 0, height - 0.07, z - 1.46, this.inset);
    }
    for (const side of [-1, 1]) {
      this.piece(0.27, 0.38, length, side * 4.16, height - 0.05, middle, this.graphite);
      this.piece(0.07, 0.025, length - 0.35, side * 3.85, height + 0.045, middle, this.cyan);
      for (let z = far + 0.5; z < near; z += 3.1) {
        this.piece(0.72, 1.1, 0.3, side * 4.75, height + 0.13, z, this.steel);
        this.piece(0.11, 0.07, 0.18, side * 4.82, height + 0.67, z, this.white);
      }
      this.piece(0.11, 0.11, length, side * 4.7, height + 0.72, middle, this.inset);
    }
    // The gantries establish scale and depth but clear the elevated chase camera.
    for (const z of [-2, -11]) {
      for (const side of [-1, 1]) {
        this.piece(0.85, 7.7, 1.05, side * 6.1, height + 3.7, z, this.steel);
        this.piece(0.34, 6.65, 0.42, side * 5.96, height + 3.48, z, this.graphite);
        this.piece(0.09, 3.3, 0.1, side * 5.72, height + 4.2, z + 0.27, this.white);
        this.piece(0.21, 0.15, 0.38, side * 5.52, height + 5.9, z, this.cyan);
      }
      this.piece(12.9, 0.65, 0.92, 0, height + 7.35, z, this.graphite);
      this.piece(11.7, 0.1, 0.2, 0, height + 6.96, z, this.inset);
      this.piece(1.3, 0.15, 0.24, 0, height + 6.88, z, this.white);
    }
  }

  private backdrop(): void {
    // Industrial superstructure disappears into the void rather than becoming a grey plane.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        const z = 8 - i * 15;
        const x = side * (15 + i % 3 * 4);
        this.piece(2.1, 15 + i % 2 * 6, 2.8, x, 3, z, this.graphite);
        this.piece(2.6, 0.4, 3.3, x, 9 + i % 2 * 3, z, this.steel);
        this.piece(0.1, 0.15, 1.8, x - side * 1.25, 7, z, this.amber);
      }
    }
    for (let z = -28; z > -110; z -= 18) {
      this.piece(12, 1.1, 1.5, 0, -7, z, this.graphite);
      this.piece(0.3, 12, 0.6, -6, -1.5, z, this.steel);
      this.piece(0.3, 12, 0.6, 6, -1.5, z, this.steel);
    }
  }
}
