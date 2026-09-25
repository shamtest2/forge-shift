import * as THREE from 'three';
import type { StageConfig, SurfaceSpec } from '../gameplay/LevelSystem';

/** Shared industrial material vocabulary; emissive materials are used only for information. */
export class SceneBuilder {
  readonly scene = new THREE.Scene();
  readonly materials = {
    abyss: new THREE.MeshStandardMaterial({ color: 0x0b1016, metalness: 0.12, roughness: 0.94 }),
    graphite: new THREE.MeshStandardMaterial({ color: 0x182129, metalness: 0.65, roughness: 0.57 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x33424c, metalness: 0.78, roughness: 0.41 }),
    deck: new THREE.MeshStandardMaterial({ color: 0x27343d, metalness: 0.53, roughness: 0.65 }),
    inset: new THREE.MeshStandardMaterial({ color: 0x151e25, metalness: 0.38, roughness: 0.77 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xb2c4cc, metalness: 0.7, roughness: 0.29 }),
    white: new THREE.MeshBasicMaterial({ color: 0xbfd3da }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x00a2c3, emissive: 0x00a8d3, emissiveIntensity: 1.45, metalness: 0.28, roughness: 0.24 }),
    cyanDim: new THREE.MeshStandardMaterial({ color: 0x164d60, emissive: 0x006482, emissiveIntensity: 0.6, metalness: 0.55, roughness: 0.4 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xbf7540, emissive: 0xca640d, emissiveIntensity: 0.86, roughness: 0.45 }),
  };
  private stageGroup = new THREE.Group();
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly textures = new Set<THREE.Texture>();
  private readonly localMaterials = new Set<THREE.Material>();
  private readonly boxCache = new Map<string, THREE.BoxGeometry>();
  private readonly bridges = new Map<string, THREE.Group>();

  constructor() {
    this.scene.background = new THREE.Color(0x080d14);
    this.scene.fog = new THREE.FogExp2(0x0a111a, 0.013);
    this.scene.add(new THREE.HemisphereLight(0xb5d1e2, 0x1b252d, 1.7));
    const key = new THREE.DirectionalLight(0xc2e2ef, 3.1);
    key.position.set(-7, 15, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -22;
    key.shadow.camera.right = 22;
    key.shadow.camera.top = 22;
    key.shadow.camera.bottom = -22;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 75;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.018;
    key.target.position.set(0, 0, 13);
    this.scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x196080, 1.6);
    rim.position.set(11, 7, 32);
    this.scene.add(rim);
  }

  setQuality(shadows: boolean): void {
    const light = this.scene.children.find((child): child is THREE.DirectionalLight => child instanceof THREE.DirectionalLight && child.castShadow);
    if (light) light.castShadow = shadows;
  }

  private geometry(x: number, y: number, z: number): THREE.BoxGeometry {
    const key = `${x.toFixed(3)}|${y.toFixed(3)}|${z.toFixed(3)}`;
    let geometry = this.boxCache.get(key);
    if (!geometry) {
      geometry = new THREE.BoxGeometry(x, y, z);
      this.boxCache.set(key, geometry);
      this.geometries.add(geometry);
    }
    return geometry;
  }

  private box(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number,
    width: number, height: number, depth: number, shadow = false): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width = 3): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = '600 48px "Space Grotesk Variable", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b4c7ce';
    ctx.fillText(text, 256, 74);
    ctx.fillStyle = '#00b7d9';
    ctx.fillRect(130, 94, 252, 3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.add(texture);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.localMaterials.add(mat);
    const geometry = new THREE.PlaneGeometry(width, width / 4);
    this.geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.09, z);
    parent.add(mesh);
  }

  private buildSurface(surface: SurfaceSpec): void {
    const { x, width, z0, z1, y0 } = surface;
    const y1 = surface.y1 ?? y0;
    const length = z1 - z0;
    const slope = y1 - y0;
    const path = Math.hypot(length, slope);
    const span = new THREE.Group();
    span.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
    span.rotation.x = -Math.atan2(slope, length);
    this.stageGroup.add(span);
    if (surface.kind === 'bridge') {
      this.bridges.set(surface.id, span);
      span.position.y -= 5;
    }
    const isBridge = surface.kind === 'bridge';
    this.box(span, this.materials.graphite, 0, -0.27, 0, width + 0.48, 0.55, path, true);
    this.box(span, this.materials.steel, 0, 0.025, 0, width, 0.09, path - 0.08);
    this.box(span, this.materials.inset, 0, 0.076, 0, width - 0.64, 0.035, path - 0.19);
    // Bays of inset plates reveal scale and direction without turning the entire floor into cyan.
    const count = Math.floor((path - 0.6) / 2.2);
    for (let i = 0; i < count; i++) {
      const dz = -path / 2 + 1.35 + i * 2.2;
      this.box(span, this.materials.deck, 0, 0.105, dz, width - 1.12, 0.027, 1.92);
      this.box(span, this.materials.graphite, 0, 0.12, dz + 0.83, width - 1.36, 0.012, 0.035);
      if (i % 2 === 0) {
        this.box(span, this.materials.silver, -width / 2 + 1.02, 0.123, dz, 0.025, 0.01, 0.62);
        this.box(span, this.materials.silver, width / 2 - 1.02, 0.123, dz, 0.025, 0.01, 0.62);
      }
    }
    for (const side of [-1, 1]) {
      this.box(span, this.materials.steel, side * (width / 2 + 0.1), 0.03, 0, 0.26, 0.33, path, true);
      this.box(span, isBridge ? this.materials.cyanDim : this.materials.silver, side * (width / 2 + 0.1), 0.21, 0, 0.045, 0.018, path - 0.18);
      this.box(span, this.materials.graphite, side * (width / 2 + 0.22), -0.52, 0, 0.12, 0.49, path);
      if (isBridge) {
        for (let i = 0; i < 4; i++) {
          this.box(span, this.materials.cyan, side * (width / 2 - 0.18), -0.08, -path / 2 + 0.65 + i * (path - 1.3) / 3,
            0.05, 0.08, 0.32);
        }
      }
    }
    if (isBridge) {
      for (let i = 0; i < 3; i++) {
        this.box(span, this.materials.steel, 0, -0.65, -path / 2 + 0.5 + i * (path - 1) / 2, width + 0.6, 0.2, 0.18);
      }
      this.box(this.stageGroup, this.materials.amber, x, y0 - 0.13, z0 + 0.08, width + 0.2, 0.04, 0.16);
      this.box(this.stageGroup, this.materials.amber, x, y1 - 0.13, z1 - 0.08, width + 0.2, 0.04, 0.16);
    }
    if (surface.kind === 'deck' && length >= 13) {
      const mark = Math.max(z0 + 3.8, z1 - 4);
      this.label(this.stageGroup, '→  E X T R A C T', x, y0, mark, 3.8);
    }
  }

  private buildInfrastructure(stage: StageConfig): void {
    const limit = stage.finish.z + 19;
    this.box(this.stageGroup, this.materials.abyss, 0, -9, limit / 2 - 7, 75, 1.1, limit + 35);
    for (let z = -15; z < limit; z += 11) {
      for (const side of [-1, 1]) {
        const x = side * 10.6;
        // H-shaped structural bays with recessed lighting and bolted shoulders.
        this.box(this.stageGroup, this.materials.graphite, x, 1.6, z, 2.1, 20, 2.2, true);
        this.box(this.stageGroup, this.materials.steel, x - side * 0.62, 2.4, z + 0.35, 0.24, 16, 0.3);
        this.box(this.stageGroup, this.materials.inset, x - side * 0.8, 2.6, z + 0.53, 0.32, 11.2, 0.12);
        this.box(this.stageGroup, this.materials.silver, x - side * 0.8, 7.2, z + 0.6, 0.12, 1.8, 0.03);
        this.box(this.stageGroup, this.materials.cyanDim, x - side * 0.8, 5.3, z + 0.6, 0.075, 0.5, 0.04);
        this.box(this.stageGroup, this.materials.steel, x, 9.6, z, 3.2, 0.9, 3.3);
        this.box(this.stageGroup, this.materials.graphite, x, 11.7, z, 1.8, 3.3, 1.6);
        this.box(this.stageGroup, this.materials.steel, x, -5.5, z, 1.6, 5, 1.6);
        this.box(this.stageGroup, this.materials.inset, side * 16, 3.1, z + 3.5, 3, 17, 7);
        this.box(this.stageGroup, this.materials.graphite, side * 17.5, 9.5, z + 3.5, 1.9, 5, 5);
        this.box(this.stageGroup, this.materials.steel, side * 12.7, -1.6, z + 2.4, 3.3, 0.5, 7);
        this.box(this.stageGroup, this.materials.inset, side * 12.7, -1.16, z + 2.4, 3.1, 0.16, 6.5);
        // Small luminous service lamps provide cadence; no permanent neon walls.
        this.box(this.stageGroup, this.materials.white, x - side * 0.8, 8.65, z + 0.62, 0.32, 0.055, 0.06);
      }
      this.box(this.stageGroup, this.materials.graphite, 0, 11.6, z, 21.2, 0.74, 1.4);
      this.box(this.stageGroup, this.materials.steel, 0, 11.03, z, 18, 0.14, 0.8);
      for (const x of [-5.5, 0, 5.5]) {
        this.box(this.stageGroup, this.materials.white, x, 10.94, z, 1.8, 0.03, 0.2);
      }
      this.box(this.stageGroup, this.materials.steel, 0, -5.3, z + 5, 21, 0.5, 0.6);
    }
    // Far silhouettes continue past extraction to avoid a flat end-of-level wall.
    for (const x of [-27, -23, 23, 27]) {
      this.box(this.stageGroup, this.materials.inset, x, 8, limit - 3 + (x % 3) * 3, 4, 33, 4);
      this.box(this.stageGroup, this.materials.steel, x, 14, limit - 3 + (x % 3) * 3, 4.4, 0.3, 4.4);
    }
  }

  private buildFinish(stage: StageConfig): void {
    const { x, y, z } = stage.finish;
    for (const side of [-1, 1]) {
      this.box(this.stageGroup, this.materials.graphite, x + side * 2.6, y + 2.1, z, 0.8, 4.5, 1.3, true);
      this.box(this.stageGroup, this.materials.steel, x + side * 2.31, y + 2.2, z - 0.7, 0.13, 3.6, 0.14);
      this.box(this.stageGroup, this.materials.cyan, x + side * 2.28, y + 2.2, z - 0.78, 0.05, 3.3, 0.04);
      this.box(this.stageGroup, this.materials.steel, x + side * 2.6, y + 4.5, z, 1.05, 0.35, 1.4);
    }
    this.box(this.stageGroup, this.materials.graphite, x, y + 4.65, z, 5.7, 0.75, 1.5);
    this.box(this.stageGroup, this.materials.silver, x, y + 4.24, z - 0.79, 2.4, 0.045, 0.06);
    this.box(this.stageGroup, this.materials.cyan, x, y + 0.13, z, 4.2, 0.025, 0.11);
    this.label(this.stageGroup, 'E X T R A C T I O N', x, y, z - 1.6, 4.1);
  }

  buildStage(stage: StageConfig): void {
    this.clearStage();
    this.stageGroup = new THREE.Group();
    this.stageGroup.name = `Sector ${stage.code}`;
    this.scene.add(this.stageGroup);
    this.buildInfrastructure(stage);
    for (const surface of stage.surfaces) this.buildSurface(surface);
    this.buildFinish(stage);
    this.label(this.stageGroup, `S E C T O R   ${stage.code.substring(0, 2)}`, 0, stage.spawn.y, stage.spawn.z + 3.4, 4);
  }

  setBridgeProgress(id: string, progress: number): void {
    const bridge = this.bridges.get(id);
    if (!bridge) return;
    const surfaceHeight = bridge.userData.originalY as number | undefined;
    if (surfaceHeight === undefined) bridge.userData.originalY = bridge.position.y + 5;
    bridge.position.y = (bridge.userData.originalY as number) - 5 * (1 - progress);
    bridge.visible = progress > 0.015;
  }

  private clearStage(): void {
    this.scene.remove(this.stageGroup);
    this.stageGroup.clear();
    this.bridges.clear();
    for (const geom of this.geometries) geom.dispose();
    for (const texture of this.textures) texture.dispose();
    for (const material of this.localMaterials) material.dispose();
    this.geometries.clear();
    this.textures.clear();
    this.localMaterials.clear();
    this.boxCache.clear();
  }
  dispose(): void {
    this.clearStage();
    for (const material of Object.values(this.materials)) material.dispose();
  }
}
