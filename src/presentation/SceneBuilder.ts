import * as THREE from 'three';
import type { BridgeLayout, StageLayout } from '../gameplay/LevelSystem';

export interface BridgeVisual { setProgress: (progress: number) => void; }
export interface NodeVisual {
  group: THREE.Group;
  ring: THREE.Mesh;
  core: THREE.Mesh;
  energy: THREE.MeshStandardMaterial;
  halo: THREE.Sprite;
  floorGlow: THREE.Mesh;
}
export interface StageVisuals {
  bridges: BridgeVisual[];
  nodes: NodeVisual[];
  hazards: THREE.Group[];
  pickups: THREE.Group[];
  extraction: THREE.Group;
}

interface Batch { geometry: THREE.BufferGeometry; material: THREE.Material; transforms: THREE.Matrix4[]; }

/** Authored modular facility kit; static repetition is instanced, live machinery remains separate. */
export class SceneBuilder {
  readonly scene = new THREE.Scene();
  private readonly facility = new THREE.Group();
  private readonly stage = new THREE.Group();
  private readonly geometries = new Map<string, THREE.BufferGeometry>();
  private readonly materials: THREE.Material[] = [];
  private readonly stageResources: Array<THREE.Material | THREE.Texture> = [];
  private readonly batches = new Map<string, Batch>();
  private readonly ambientHalo: THREE.Texture;
  private readonly microMetal: THREE.Texture;

  readonly steel = this.material(0x34414b, .7, .43);
  readonly darkSteel = this.material(0x19232c, .67, .55);
  readonly graphite = this.material(0x101a22, .42, .72);
  readonly deck = this.material(0x25343e, .47, .78);
  readonly edge = this.material(0x738692, .75, .43);
  readonly white = this.material(0xc1d0d8, .65, .37);
  readonly recess = this.material(0x0b1219, .43, .77);
  readonly energy = this.material(0x00a7cc, .26, .38, 1.3);
  readonly dimEnergy = this.material(0x12637a, .28, .53, .55);
  readonly amber = this.material(0xe89539, .28, .4, 1.12);
  readonly danger = this.material(0x68462b, .45, .58);

  constructor() {
    this.scene.background = new THREE.Color('#070a10');
    this.scene.fog = new THREE.FogExp2('#090e15', .0125);
    this.scene.add(this.facility, this.stage);
    this.scene.add(new THREE.HemisphereLight(0xd6e6ee, 0x121b23, 2.05));
    const key = new THREE.DirectionalLight(0xe7f0f5, 3.2);
    key.position.set(-8, 15, 12);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x76a8bc, 1.35);
    rim.position.set(6, 10, -27);
    this.scene.add(rim);
    this.ambientHalo = this.makeHaloTexture();
    this.microMetal = this.makeMetalSurface();
    this.deck.map = this.microMetal;
    this.steel.map = this.microMetal;
    this.deck.needsUpdate = this.steel.needsUpdate = true;
    this.backdrop();
    this.turbineBanks();
    this.flush(this.facility);
  }

  buildStage(layout: StageLayout): StageVisuals {
    this.clearStage();
    for (let i = 0; i < layout.platforms.length; i++) {
      const pad = layout.platforms[i]!;
      this.drawPlatform(pad.near, pad.far, pad.y, i, layout);
    }
    for (const bridge of layout.bridges) this.gapFrame(bridge);
    for (const hazard of layout.hazards) this.hazardTrack(hazard.z, hazard.y);
    const bridges = layout.bridges.map(bridge => this.buildBridge(bridge, layout.spec.rushLane));
    const nodes = layout.bridges.map(bridge => this.buildNode(bridge));
    const hazards = layout.hazards.map(field => this.buildHazard(field.z, field.y));
    const pickups = layout.pickups.map(item => this.buildPickup(item.x, item.z, item.y));
    const extraction = this.buildExtraction(layout.finishZ, layout.platforms.at(-1)?.y ?? 0);
    this.flush(this.stage);
    return { bridges, nodes, hazards, pickups, extraction };
  }

  dispose(): void {
    this.clearStage();
    this.scene.remove(this.facility, this.stage);
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.ambientHalo.dispose();
    this.microMetal.dispose();
  }

  private clearStage(): void {
    this.stage.clear();
    this.batches.clear();
    for (const resource of this.stageResources) resource.dispose();
    this.stageResources.length = 0;
  }

  private material(color: number, metalness: number, roughness: number, emission = 0): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness,
      emissive: emission ? color : 0x000000, emissiveIntensity: emission });
    this.materials.push(m);
    return m;
  }

  private geometry(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let geometry = this.geometries.get(key);
    if (!geometry) { geometry = make(); this.geometries.set(key, geometry); }
    return geometry;
  }

  private box(w: number, h: number, d: number): THREE.BufferGeometry {
    return this.geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D,
    x = 0, y = 0, z = 0): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  private part(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number,
    material: THREE.Material): THREE.Mesh {
    return this.mesh(this.box(w, h, d), material, parent, x, y, z);
  }

  private staticPart(w: number, h: number, d: number, x: number, y: number, z: number,
    material: THREE.Material, yaw = 0): void {
    const geometry = this.box(w, h, d);
    const key = `${geometry.uuid}:${material.uuid}`;
    let batch = this.batches.get(key);
    if (!batch) { batch = { geometry, material, transforms: [] }; this.batches.set(key, batch); }
    const matrix = new THREE.Matrix4();
    matrix.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
    batch.transforms.push(matrix);
  }

  private staticBeam(ax: number, ay: number, az: number, bx: number, by: number, bz: number,
    thickness: number, material: THREE.Material): void {
    const start = new THREE.Vector3(ax, ay, az);
    const end = new THREE.Vector3(bx, by, bz);
    const direction = end.clone().sub(start);
    const geometry = this.box(thickness, thickness, direction.length());
    const key = `${geometry.uuid}:${material.uuid}`;
    let batch = this.batches.get(key);
    if (!batch) { batch = { geometry, material, transforms: [] }; this.batches.set(key, batch); }
    batch.transforms.push(new THREE.Matrix4().compose(
      start.add(end).multiplyScalar(.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize()),
      new THREE.Vector3(1, 1, 1),
    ));
  }

  private flush(target: THREE.Group): void {
    for (const batch of this.batches.values()) {
      const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.transforms.length);
      batch.transforms.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      target.add(mesh);
    }
    this.batches.clear();
  }

  private drawPlatform(near: number, far: number, y: number, index: number, layout: StageLayout): void {
    const length = near - far;
    const mid = (near + far) * .5;
    this.staticPart(8.25, .66, length, 0, y - .38, mid, this.steel);
    this.staticPart(7.91, .045, length - .3, 0, y - .015, mid, this.deck);
    this.staticPart(5.6, .44, length - .2, 0, y - .92, mid, this.darkSteel);
    for (let z = far + 1.5; z < near - .9; z += 2.9) {
      for (const side of [-1, 1]) {
        this.staticPart(3.42, .038, 2.61, side * 1.82, y + .024, z, this.graphite);
        this.staticPart(3.16, .013, 2.31, side * 1.82, y + .049, z, this.deck);
        this.staticPart(.047, .019, 2.05, side * 3.29, y + .061, z, this.edge);
      }
      this.staticPart(.052, .032, 1.75, 0, y + .055, z, this.edge);
      this.staticPart(7.7, .085, .15, 0, y - .045, z - 1.39, this.steel);
      // Flush bolt heads and raised seam rails make the tread read as fabricated steel.
      for (const x of [-3.52, -.17, .17, 3.52]) {
        this.staticPart(.065, .022, .065, x, y + .079, z + 1.11, this.white);
      }
    }
    for (let z = near - 5; z > far + 2; z -= 8.7) {
      this.staticPart(.075, .015, .72, -.16, y + .086, z, this.white, -.45);
      this.staticPart(.075, .015, .72, .16, y + .086, z, this.white, .45);
      this.staticPart(.56, .012, .04, 0, y + .087, z + .64, this.dimEnergy);
    }
    for (const side of [-1, 1]) {
      this.staticPart(.25, .46, length, side * 4.19, y - .11, mid, this.darkSteel);
      this.staticPart(.055, .028, length - .28, side * 3.83, y + .066, mid, this.dimEnergy);
      this.staticPart(.2, 1.1, length, side * 4.48, y - 1.26, mid, this.steel);
      for (let z = far + 1; z < near; z += 3.5) {
        this.staticPart(.56, .73, .24, side * 4.7, y + .25, z, this.steel);
        this.staticPart(.31, .08, .16, side * 4.74, y + .64, z, this.white);
        this.staticPart(.1, 1.15, .13, side * 4.62, y - 1.1, z, this.darkSteel);
      }
      this.staticPart(.11, .1, length - .2, side * 4.69, y + .76, mid, this.edge);
      this.staticPart(.13, .13, length - .6, side * 5.46, y - 1.45, mid, this.darkSteel);
      for (let z = far + 3.6; z < near - 2; z += 8.6) {
        // A service cabinet, louvers and a guarded white work light, always outside the rail.
        this.staticPart(.83, 1.33, 2.16, side * 5.27, y + .64, z, this.graphite);
        this.staticPart(.06, 1.04, 1.79, side * 5.75, y + .63, z, this.steel);
        for (let slot = 0; slot < 5; slot++) {
          this.staticPart(.075, .052, 1.53, side * 5.8, y + .25 + slot * .16, z, this.recess);
        }
        this.staticPart(.58, .08, .14, side * 5.21, y + 1.37, z, this.white);
        this.staticPart(.5, .022, .04, side * 5.21, y + 1.32, z + .08, this.dimEnergy);
        this.staticBeam(side * 5.24, y - .13, z - 1.3, side * 6.07, y - 1.56, z - 2.1, .16, this.steel);
      }
    }
    // Maintenance channel on the banks. Dark insets are traversable, amber is warning only.
    if (index < layout.spec.nodes) {
      for (let stripe = 0; stripe < 4; stripe++) {
        this.staticPart(.65, .013, .095, -1.45 + stripe * .92, y + .075, far + .68, this.danger, -.42);
      }
      for (const side of [-1, 1]) {
        this.staticPart(.08, .018, 2.4, side * 1.47, y + .079, far + 2.6, this.amber);
      }
    }
    // Purposeful rhythm: two articulated service portals per long platform.
    const gantries = index === 0 ? [near - 4.5, far + 4] : [near - 8];
    for (const z of gantries) this.gantry(z, y);
  }

  private gantry(z: number, y: number): void {
    for (const side of [-1, 1]) {
      this.staticPart(.94, 8.1, 1.2, side * 6.05, y + 3.8, z, this.steel);
      this.staticPart(.39, 6.9, .42, side * 5.87, y + 3.7, z, this.darkSteel);
      this.staticPart(.09, 3.4, .11, side * 5.65, y + 4.15, z + .3, this.edge);
      this.staticPart(.26, .14, .29, side * 5.58, y + 6.14, z, this.dimEnergy);
      this.staticPart(1.2, 1.07, 1.35, side * 6.05, y + .13, z, this.darkSteel);
      this.staticBeam(side * 6.08, y + 4.75, z, side * 3.9, y + 7.12, z, .29, this.steel);
      this.staticBeam(side * 5.85, y + 1.45, z + .33, side * 5.85, y + 6.15, z + .33, .09, this.edge);
      this.staticPart(.16, .13, .1, side * 6.11, y + 5.9, z + .67, this.amber);
      this.staticPart(.54, .26, 1.02, side * 3.77, y + 7.26, z, this.graphite);
    }
    this.staticPart(12.7, .62, 1.08, 0, y + 7.54, z, this.darkSteel);
    this.staticPart(11.5, .11, .22, 0, y + 7.12, z, this.edge);
    this.staticPart(1.32, .12, .24, 0, y + 7.02, z, this.white);
    this.staticPart(4.16, .09, .86, 0, y + 8.17, z, this.steel);
    this.staticPart(.18, .06, 2.3, 0, y + 8.04, z - .42, this.graphite);
    this.staticPart(1.3, .045, .12, 0, y + 7.08, z + .11, this.dimEnergy);
  }

  private gapFrame(bridge: BridgeLayout): void {
    const z = (bridge.near + bridge.far) / 2;
    for (const side of [-1, 1]) {
      this.staticPart(.4, 1.4, 8.7, side * 4.6, (bridge.startY + bridge.endY) * .5 - .68, z, this.steel);
      this.staticPart(.13, .12, 8.5, side * 4.57, (bridge.startY + bridge.endY) * .5 + .04, z, this.amber);
      this.staticPart(.44, 5.4, .75, side * 6, bridge.startY + 1.7, bridge.near + .5, this.darkSteel);
      this.staticPart(.44, 5.4, .75, side * 6, bridge.endY + 1.7, bridge.far - .5, this.darkSteel);
      this.staticBeam(side * 4.58, bridge.startY - .42, bridge.near + .65,
        side * 3.92, bridge.startY - 2.4, bridge.near - 2.6, .28, this.steel);
      this.staticBeam(side * 4.58, bridge.endY - .42, bridge.far - .65,
        side * 3.92, bridge.endY - 2.4, bridge.far + 2.6, .28, this.steel);
      this.staticPart(.62, .39, .46, side * 4.47, bridge.startY - .62, bridge.near - 1.18, this.graphite);
      this.staticPart(.62, .39, .46, side * 4.47, bridge.endY - .62, bridge.far + 1.18, this.graphite);
    }
    this.staticPart(8.3, .56, 1, 0, bridge.startY - 1.2, bridge.near, this.recess);
    this.staticPart(8.3, .56, 1, 0, bridge.endY - 1.2, bridge.far, this.recess);
  }

  private buildBridge(bridge: BridgeLayout, rush: boolean): BridgeVisual {
    const halves: THREE.Group[] = [];
    const slope = Math.atan2(bridge.endY - bridge.startY, 8);
    for (let i = 0; i < 2; i++) {
      const half = new THREE.Group();
      half.rotation.x = slope;
      this.stage.add(half);
      halves.push(half);
      this.part(half, 3.92, .36, 4.07, 0, -.20, 0, this.steel);
      this.part(half, 3.73, .058, 3.88, 0, .007, 0, this.deck);
      for (const x of [-1.2, 0, 1.2]) {
        this.part(half, .93, .023, 3.41, x, .049, 0, this.graphite);
        this.part(half, .04, .029, 3.35, x + .49, .064, 0, this.edge);
      }
      for (const edge of [-1.94, 1.94]) {
        this.part(half, .10, .14, 3.95, edge, .16, 0, this.energy);
        this.part(half, .19, .28, 3.88, edge, -.19, 0, this.darkSteel);
      }
      for (const rib of [-1.45, 0, 1.45]) {
        this.part(half, 3.88, .065, .075, 0, .085, rib, this.edge);
      }
      this.part(half, 2.8, .36, 3.65, 0, -.65, 0, this.graphite);
      for (const side of [-1, 1]) this.part(half, .25, .55, 3.6, side * 1.69, -.73, 0, this.steel);
      if (rush) {
        this.part(half, 1.16, .24, 4.07, 3.04, -.15, 0, this.steel);
        this.part(half, 1.01, .04, 3.91, 3.04, .002, 0, this.graphite);
        this.part(half, .18, .017, 3.65, 3.04, .035, 0, this.amber);
        for (const edge of [2.49, 3.59]) this.part(half, .055, .14, 3.96, edge, .13, 0, this.edge);
      }
    }
    const first = halves[0]!;
    const second = halves[1]!;
    const middleY = (bridge.startY + bridge.endY) / 2;
    const position = (progress: number): void => {
      const eased = progress * progress * (3 - 2 * progress);
      const hidden = 1 - eased;
      first.position.set(0, (bridge.startY + middleY) / 2 - hidden * 2.4, bridge.near - 2 + hidden * 3.9);
      second.position.set(0, (middleY + bridge.endY) / 2 - hidden * 2.4, bridge.far + 2 - hidden * 3.9);
      first.rotation.z = -hidden * .035;
      second.rotation.z = hidden * .035;
    };
    position(0);
    return { setProgress: position };
  }

  private buildNode(bridge: BridgeLayout): NodeVisual {
    const group = new THREE.Group();
    group.position.set(bridge.nodeX, bridge.startY, bridge.nodeZ);
    this.stage.add(group);
    this.staticBeam(bridge.nodeX, bridge.startY + .092, bridge.nodeZ - .76,
      0, bridge.startY + .092, bridge.near + .55, .072, this.dimEnergy);
    const groundRing = this.mesh(this.geometry('nodeGroundRing', () => new THREE.TorusGeometry(.88, .025, 5, 36)), this.edge, group, 0, .09, 0);
    groundRing.rotation.x = -Math.PI / 2;
    const floorMaterial = new THREE.MeshBasicMaterial({ map: this.ambientHalo, color: 0x00bdda,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .12, side: THREE.DoubleSide });
    this.stageResources.push(floorMaterial);
    const floorGlow = this.mesh(this.geometry('nodeFloorGlow', () => new THREE.PlaneGeometry(3.1, 3.1)), floorMaterial, group, 0, .093, 0);
    floorGlow.rotation.x = -Math.PI / 2;
    this.mesh(this.geometry('nodeBase', () => new THREE.CylinderGeometry(.59, .8, .25, 10)), this.steel, group, 0, .13, 0);
    this.mesh(this.geometry('nodeStem', () => new THREE.CylinderGeometry(.31, .45, .87, 8)), this.darkSteel, group, 0, .65, 0);
    this.mesh(this.geometry('nodeCap', () => new THREE.CylinderGeometry(.44, .39, .13, 10)), this.edge, group, 0, 1.11, 0);
    this.part(group, .68, .68, .26, 0, 1.62, -.1, this.darkSteel);
    this.part(group, .45, .53, .28, 0, 1.62, .06, this.recess);
    const energy = new THREE.MeshStandardMaterial({ color: 0x00d7ff, metalness: .12, roughness: .23,
      emissive: 0x00d7ff, emissiveIntensity: .48 });
    this.stageResources.push(energy);
    const ring = this.mesh(this.geometry('nodeRing', () => new THREE.TorusGeometry(.45, .052, 8, 32)), energy, group, 0, 1.62, .25);
    this.mesh(this.geometry('nodeOuter', () => new THREE.TorusGeometry(.71, .08, 8, 32)), this.steel, group, 0, 1.62, .17);
    const core = this.mesh(this.geometry('nodeCore', () => new THREE.IcosahedronGeometry(.27, 1)), energy, group, 0, 1.62, .26);
    for (const side of [-1, 1]) {
      this.part(group, .15, .33, .38, side * .61, 1.62, .1, this.edge);
      this.part(group, .32, .12, .23, side * .47, 1.24, .12, this.graphite);
      this.part(group, .07, .2, .08, side * .61, 1.62, .32, this.dimEnergy);
    }
    this.part(group, .14, .11, .4, 0, 2.32, .08, this.white);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ambientHalo, color: 0x00d7ff,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .13 }));
    this.stageResources.push(halo.material);
    halo.position.set(0, 1.62, .13);
    halo.scale.set(2.6, 2.6, 1);
    group.add(halo);
    const sign = this.makeSign(`SHIFT LINK 0${bridge.index + 1}    ◇`);
    sign.position.set(0, 3.15, -.15);
    group.add(sign);
    return { group, ring, core, energy, halo, floorGlow };
  }

  private hazardTrack(z: number, y: number): void {
    this.staticPart(7.8, .13, .32, 0, y + 2.82, z, this.edge);
    for (const side of [-1, 1]) this.staticPart(.32, 3, .4, side * 4.03, y + 1.51, z, this.steel);
    for (const offset of [-1.3, 1.3]) this.staticPart(7.6, .018, .075, 0, y + .086, z + offset, this.danger);
    this.staticPart(7.6, .015, .045, 0, y + .091, z, this.amber);
  }

  private buildHazard(z: number, y: number): THREE.Group {
    const gate = new THREE.Group();
    gate.position.set(0, y, z);
    this.stage.add(gate);
    this.part(gate, 1.0, .31, .45, 0, 2.65, 0, this.steel);
    this.part(gate, .55, 2.18, .28, 0, 1.43, 0, this.darkSteel);
    this.part(gate, .35, 2.02, .065, 0, 1.42, .175, this.amber);
    this.part(gate, .89, .2, .37, 0, .35, 0, this.danger);
    for (const side of [-1, 1]) this.part(gate, .13, 1.6, .35, side * .36, 1.48, 0, this.edge);
    return gate;
  }

  private buildPickup(x: number, z: number, y: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y + .9, z);
    this.stage.add(group);
    const crystal = this.mesh(this.geometry('pickup', () => new THREE.OctahedronGeometry(.27, 0)), this.white, group);
    crystal.rotation.z = Math.PI / 4;
    this.mesh(this.geometry('pickupRing', () => new THREE.TorusGeometry(.38, .024, 4, 16)), this.energy, group);
    this.mesh(this.geometry('pickupBase', () => new THREE.CylinderGeometry(.37, .37, .035, 12)), this.darkSteel, group, 0, -.73, 0);
    return group;
  }

  private buildExtraction(z: number, y: number): THREE.Group {
    const portal = new THREE.Group();
    portal.position.set(0, y, z);
    this.stage.add(portal);
    for (const side of [-1, 1]) {
      this.part(portal, .58, 4.4, .78, side * 2.67, 2.0, 0, this.darkSteel);
      this.part(portal, .09, 3.5, .08, side * 2.31, 1.91, .42, this.energy);
      this.part(portal, .92, .3, 1, side * 2.69, .13, 0, this.steel);
    }
    this.part(portal, 6.1, .72, 1.04, 0, 4.45, 0, this.steel);
    this.part(portal, 4.7, .1, .14, 0, 4.02, .45, this.energy);
    this.part(portal, 4.8, .026, .21, 0, .08, -.12, this.white);
    this.part(portal, 1.15, .1, .1, 0, .09, 1.15, this.energy);
    const label = this.makeSign('EXTRACTION   /   EXIT');
    label.position.set(0, 5.33, .55);
    portal.add(label);
    return portal;
  }

  private makeSign(text: string): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#101b24'; ctx.fillRect(0, 0, 512, 100);
      ctx.strokeStyle = '#607f8b'; ctx.lineWidth = 3; ctx.strokeRect(3, 3, 506, 94);
      ctx.fillStyle = '#dce7ed'; ctx.font = '700 31px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 49);
      ctx.fillStyle = '#00d7ff'; ctx.fillRect(9, 9, 25, 3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false });
    this.stageResources.push(texture, material);
    return this.mesh(this.geometry('signPlane', () => new THREE.PlaneGeometry(3.05, .6)), material, new THREE.Group());
  }

  /** Tiny procedural brushed-metal variation; one shared 256px texture, no network asset. */
  private makeMetalSurface(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const pixels = ctx.createImageData(256, 256);
      let seed = 82731;
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (1664525 * seed + 1013904223) >>> 0;
        const grain = 227 + (seed & 19) + (Math.floor(i / 4 / 256) % 5 === 0 ? 3 : 0);
        pixels.data[i] = grain;
        pixels.data[i + 1] = grain;
        pixels.data[i + 2] = Math.min(255, grain + 2);
        pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
      ctx.lineWidth = 1;
      for (let y = 11; y < 256; y += 18) {
        ctx.strokeStyle = y % 3 ? '#f2f6f7' : '#b9c5cc';
        ctx.globalAlpha = .16;
        ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(251, y - 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 3);
    texture.anisotropy = 4;
    return texture;
  }

  private makeHaloTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,.75)');
      gradient.addColorStop(.25, 'rgba(255,255,255,.3)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }

  private turbineBanks(): void {
    // These ventilator arrays give the pit a mechanical silhouette instead of
    // another wall of rectangular columns. Repeated vanes share one draw call.
    const wheel = this.geometry('vent-wheel', () => new THREE.CylinderGeometry(1.14, 1.14, .34, 16));
    const rim = this.geometry('vent-rim', () => new THREE.TorusGeometry(1.75, .1, 6, 24));
    const innerRim = this.geometry('vent-inner', () => new THREE.TorusGeometry(1.18, .052, 6, 24));
    const blade = this.box(.18, 1.16, .1);
    const wheelBatch: Batch = { geometry: wheel, material: this.recess, transforms: [] };
    const rimBatch: Batch = { geometry: rim, material: this.steel, transforms: [] };
    const innerBatch: Batch = { geometry: innerRim, material: this.dimEnergy, transforms: [] };
    const bladeBatch: Batch = { geometry: blade, material: this.edge, transforms: [] };
    for (const batch of [wheelBatch, rimBatch, innerBatch, bladeBatch]) {
      this.batches.set(`${batch.geometry.uuid}:${batch.material.uuid}`, batch);
    }
    for (const z of [-5, -33, -61, -89]) {
      for (const side of [-1, 1]) {
        const x = side * 9.45;
        const y = 2.5;
        wheelBatch.transforms.push(new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
          new THREE.Vector3(1, 1, 1),
        ));
        rimBatch.transforms.push(new THREE.Matrix4().makeTranslation(x, y, z + .3));
        innerBatch.transforms.push(new THREE.Matrix4().makeTranslation(x, y, z + .38));
        this.staticPart(4.1, .2, .38, x, y + 2.04, z, this.graphite);
        this.staticPart(4.1, .2, .38, x, y - 2.04, z, this.graphite);
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4;
          bladeBatch.transforms.push(new THREE.Matrix4().compose(
            new THREE.Vector3(x + Math.sin(angle) * .7, y + Math.cos(angle) * .7, z + .44),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle + .43),
            new THREE.Vector3(1, 1, 1),
          ));
        }
      }
    }
  }

  private backdrop(): void {
    // Layered, structural silhouettes with selective practical lights.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 11; i++) {
        const z = 12 - i * 14;
        const x = side * (14 + i % 3 * 3.2);
        this.staticPart(2.6, 13 + i % 3 * 4.4, 3.5, x, 2.8, z, this.graphite);
        this.staticPart(3.2, .43, 3.8, x, 10.1 + i % 3 * 2.2, z, this.darkSteel);
        this.staticPart(.15, .15, 2.25, x - side * 1.55, 7, z, i % 3 ? this.recess : this.danger);
        this.staticPart(.35, 9, .48, side * 10.5, -2.8, z, this.steel);
        this.staticPart(.2, 11.3, .21, x - side * 1.3, 4.25, z + 1.63, this.steel);
        this.staticPart(2.4, .14, .28, x, 7.9, z + 1.78, this.edge);
        for (let vent = 0; vent < 5; vent++) {
          this.staticPart(1.76, .095, .13, x, 1.7 + vent * .36, z + 1.83, this.steel);
        }
      }
      for (let z = 2; z > -117; z -= 15) {
        this.staticPart(.44, 11.5, 1.1, side * 6.9, -2.2, z, this.darkSteel);
        this.staticPart(.22, 12, .18, side * 8.7, -2, z, this.edge);
        this.staticPart(1.55, .31, 5.4, side * 9.65, -5.8, z - 2, this.graphite);
        this.staticBeam(side * 8.8, -3.9, z + 1.5, side * 10.7, -7.6, z - 2.8, .22, this.steel);
      }
    }
    for (let z = -21; z > -117; z -= 18) {
      this.staticPart(15, 1.1, 1.6, 0, -9.5, z, this.graphite);
      this.staticPart(16, .35, .5, 0, 10.5, z, this.darkSteel);
    }
  }
}
