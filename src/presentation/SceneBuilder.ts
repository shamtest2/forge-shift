import * as THREE from 'three';

const C = {
  floor: 0x141d25,
  plate: 0x28343e,
  structure: 0x303e49,
  dark: 0x10171e,
  edge: 0x798d9b,
  energy: 0x00d7ff,
  danger: 0xffb14a,
};

/** A modular, single-material-family industrial space; all repeated parts are instanced. */
export class SceneBuilder {
  readonly scene = new THREE.Scene();
  readonly world = new THREE.Group();
  readonly materials = {
    floor: new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.76, metalness: 0.36 }),
    plate: new THREE.MeshStandardMaterial({ color: C.plate, roughness: 0.5, metalness: 0.62 }),
    structure: new THREE.MeshStandardMaterial({ color: C.structure, roughness: 0.55, metalness: 0.68 }),
    dark: new THREE.MeshStandardMaterial({ color: C.dark, roughness: 0.83, metalness: 0.25 }),
    edge: new THREE.MeshStandardMaterial({ color: C.edge, roughness: 0.38, metalness: 0.72 }),
    energy: new THREE.MeshStandardMaterial({ color: 0x053542, emissive: C.energy, emissiveIntensity: 1.4, roughness: 0.33, metalness: 0.4 }),
    warning: new THREE.MeshStandardMaterial({ color: 0x5e341a, emissive: C.danger, emissiveIntensity: 0.6, roughness: 0.48 }),
  };
  private readonly geometry = new Map<string, THREE.BufferGeometry>();
  private readonly ownedTextures: THREE.Texture[] = [];

  constructor() {
    this.scene.background = new THREE.Color(0x080e15);
    this.scene.fog = new THREE.FogExp2(0x0b141d, 0.012);
    this.scene.add(this.world);
    const hemi = new THREE.HemisphereLight(0xb4cfe2, 0x202b31, 2.0);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xe6f2ff, 2.45);
    sun.position.set(-8, 15, -13);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -17;
    sun.shadow.camera.right = 17;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 55;
    sun.shadow.bias = -0.001;
    sun.target.position.set(0, 0, -18);
    this.scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(0x427b96, 1.25);
    rim.position.set(8, 8, 12);
    this.scene.add(rim);
    this.buildFoundation();
  }

  private cube(w: number, h: number, d: number): THREE.BufferGeometry {
    const key = `cube-${w}-${h}-${d}`;
    let geo = this.geometry.get(key);
    if (!geo) {
      geo = new THREE.BoxGeometry(w, h, d);
      this.geometry.set(key, geo);
    }
    return geo;
  }

  private box(parent: THREE.Object3D, material: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, cast = false): THREE.Mesh {
    const mesh = new THREE.Mesh(this.cube(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  /** Instancing keeps the long authored runway inexpensive on low-end GPUs. */
  private repeated(parent: THREE.Object3D, material: THREE.Material, dims: [number, number, number], points: [number, number, number][], cast = false): void {
    const mesh = new THREE.InstancedMesh(this.cube(...dims), material, points.length);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < points.length; i++) {
      matrix.makeTranslation(...points[i]);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }

  private buildFoundation(): void {
    const w = this.world;
    // Primary traversable deck, understructure and deeply recessed service trenches.
    this.box(w, this.materials.dark, 15.5, 1.5, 140, 0, -1.4, -56);
    this.box(w, this.materials.floor, 10, 0.55, 136, 0, -0.29, -56);
    for (const x of [-7.5, 7.5]) {
      this.box(w, this.materials.structure, 3.6, 0.35, 138, x, -1.3, -56);
      this.box(w, this.materials.dark, 0.9, 1.2, 138, x > 0 ? 6.15 : -6.15, -0.34, -56);
      this.box(w, this.materials.structure, 0.12, 0.9, 138, x > 0 ? 5.67 : -5.67, 0.17, -56);
      this.box(w, this.materials.edge, 0.055, 0.05, 138, x > 0 ? 5.59 : -5.59, 0.64, -56);
      this.box(w, this.materials.energy, 0.045, 0.035, 134, x > 0 ? 5.47 : -5.47, 0.47, -56);
    }

    const tiles: [number, number, number][] = [];
    const central: [number, number, number][] = [];
    const seams: [number, number, number][] = [];
    const vents: [number, number, number][] = [];
    const reflectors: [number, number, number][] = [];
    for (let z = 9; z > -122; z -= 4) {
      for (const x of [-3.55, 3.55]) {
        tiles.push([x, 0.025, z]);
        vents.push([x * 1.3, 0.055, z - 1.0]);
        reflectors.push([x * 1.3, 0.058, z + 1.18]);
      }
      central.push([0, 0.018, z]);
      seams.push([0, 0.035, z - 1.85]);
    }
    this.repeated(w, this.materials.plate, [2.7, 0.055, 3.56], tiles);
    this.repeated(w, this.materials.structure, [3.5, 0.04, 3.56], central);
    this.repeated(w, this.materials.dark, [9.8, 0.02, 0.09], seams);
    this.repeated(w, this.materials.dark, [0.5, 0.017, 0.45], vents);
    this.repeated(w, this.materials.edge, [0.3, 0.012, 0.065], reflectors);

    // Offset overhead frames, service pipes and long-range skyline make the route feel built.
    const framePosts: [number, number, number][] = [];
    const frameBeams: [number, number, number][] = [];
    const serviceLights: [number, number, number][] = [];
    const housing: [number, number, number][] = [];
    const intake: [number, number, number][] = [];
    for (let z = 1; z > -126; z -= 18) {
      framePosts.push([-10.1, 3.2, z], [10.1, 3.2, z]);
      frameBeams.push([0, 7.2, z]);
      housing.push([-10.1, 6.3, z], [10.1, 6.3, z]);
      serviceLights.push([-8.9, 6.9, z - 0.35], [8.9, 6.9, z - 0.35]);
      intake.push([-12.5, 1.2, z - 5], [12.5, 1.2, z - 5]);
    }
    this.repeated(w, this.materials.structure, [1.1, 6.4, 1.3], framePosts, true);
    this.repeated(w, this.materials.structure, [21, 0.75, 1.3], frameBeams, true);
    this.repeated(w, this.materials.plate, [1.8, 0.65, 1.6], housing);
    this.repeated(w, this.materials.edge, [2.25, 0.065, 0.26], serviceLights);
    this.repeated(w, this.materials.dark, [2.0, 3.1, 4.3], intake);
    for (const x of [-10.7, 10.7]) {
      this.box(w, this.materials.dark, 0.31, 0.31, 140, x, 5.83, -56);
      this.box(w, this.materials.plate, 0.11, 0.1, 140, x, 6.03, -56);
      this.box(w, this.materials.structure, 0.65, 0.22, 140, x * 1.18, 2.8, -56);
    }

    // Distant industrial masses outside the traversal plane; a dark layered horizon.
    const towers: [number, number, number][] = [];
    const towerCaps: [number, number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const z = 6 - i * 11.5;
      for (const side of [-1, 1]) {
        towers.push([side * (19 + (i % 3) * 4), 4.1 + (i % 4), z]);
        towerCaps.push([side * (19 + (i % 3) * 4), 9.2 + (i % 4) * 2, z]);
      }
    }
    this.repeated(w, this.materials.dark, [3.4, 8.4, 8.2], towers);
    this.repeated(w, this.materials.structure, [4.1, 0.36, 8.5], towerCaps);

    // Approach language: sparse arrow chevrons, a physical checkpoint threshold and signage.
    const arrow = new THREE.Shape();
    arrow.moveTo(-0.8, 0.8); arrow.lineTo(0, -0.15); arrow.lineTo(0.8, 0.8);
    arrow.lineTo(0.8, 1.15); arrow.lineTo(0, 0.2); arrow.lineTo(-0.8, 1.15); arrow.closePath();
    const arrowGeo = new THREE.ShapeGeometry(arrow);
    this.geometry.set('arrows', arrowGeo);
    for (const z of [-3, -11, -27, -48, -71, -94]) {
      const mesh = new THREE.Mesh(arrowGeo, this.materials.edge);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(0, 0.055, z);
      w.add(mesh);
    }
    this.box(w, this.materials.structure, 11, 0.35, 0.5, 0, 5.1, -16, true);
    for (const x of [-5.25, 5.25]) this.box(w, this.materials.plate, 0.43, 5.2, 0.55, x, 2.45, -16, true);
    this.box(w, this.materials.energy, 2.8, 0.065, 0.26, 0, 4.89, -16.25);
    this.addSign();
  }

  private addSign(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#121b24';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#00d7ff';
    ctx.fillRect(36, 42, 9, 176);
    ctx.fillStyle = '#e7edf3';
    ctx.font = 'bold 78px sans-serif';
    ctx.fillText('FORGE//SHIFT', 81, 131);
    ctx.fillStyle = '#aab5c0';
    ctx.font = '29px sans-serif';
    ctx.fillText('TRANSIT DIVISION    /    SECTOR 01', 83, 192);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.ownedTextures.push(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.92), material);
    sign.position.set(0, 5.74, -16);
    this.world.add(sign);
  }

  dispose(): void {
    this.world.removeFromParent();
    this.geometry.forEach(geo => geo.dispose());
    Object.values(this.materials).forEach(mat => mat.dispose());
    this.ownedTextures.forEach(texture => texture.dispose());
    this.world.traverse(obj => {
      if (obj instanceof THREE.Mesh && !this.geometryHas(obj.geometry)) obj.geometry.dispose();
      if (obj instanceof THREE.Mesh && !Object.values(this.materials).includes(obj.material as THREE.MeshStandardMaterial)) {
        (obj.material as THREE.Material).dispose();
      }
    });
  }

  private geometryHas(geo: THREE.BufferGeometry): boolean {
    for (const value of this.geometry.values()) if (value === geo) return true;
    return false;
  }
}
