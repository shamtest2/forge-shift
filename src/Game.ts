import * as THREE from 'three';
import { Input } from './core/Input';
import { GameState } from './core/GameState';
import { FollowCamera } from './core/Camera';
import { Player } from './gameplay/Player';
import { LevelSystem, STAGES } from './gameplay/LevelSystem';
import { SceneBuilder } from './presentation/SceneBuilder';
import { UI } from './presentation/UI';

/** Composition root: update systems in order; individual systems own their mechanics. */
export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new SceneBuilder();
  private readonly input = new Input();
  private readonly state = new GameState();
  private readonly camera = new FollowCamera();
  private readonly level: LevelSystem;
  private readonly player: Player;
  private readonly ui: UI;
  private readonly container: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private lastFrame = 0;
  private frameId = 0;
  private time = 0;
  private frameCount = 0;

  constructor(container: HTMLElement, hud: HTMLElement) {
    this.container = container;
    const mobile = matchMedia('(pointer: coarse)').matches;
    const lowPower = mobile || navigator.hardwareConcurrency <= 4;
    this.renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = !lowPower;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.setQuality(!lowPower);
    container.appendChild(this.renderer.domElement);
    this.level = new LevelSystem(this.scene);
    this.player = new Player(this.scene.scene);
    this.player.reset(0, 0, 0);
    this.ui = new UI(hud, this.input);
    this.input.onGesture = () => { if (this.input.vertical || this.input.horizontal) this.ui.dismissIntro(); };
    this.ui.onPause = () => this.pause();
    this.ui.onResume = () => this.resume();
    this.ui.onRestart = () => this.restart();
    this.ui.onSelectStage = (index) => { this.level.load(index); this.restart(); };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.camera.update(0, this.player);
    this.state.transition('loading');
    if (import.meta.env.DEV) {
      (window as Window & { __FORGE_DEBUG__?: () => unknown }).__FORGE_DEBUG__ = () => ({
        state: this.state.phase,
        player: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z, speed: this.player.speed },
        camera: { x: this.camera.camera.position.x, y: this.camera.camera.position.y, z: this.camera.camera.position.z },
        time: this.time,
        frames: this.frameCount,
        axes: { x: this.input.horizontal, z: this.input.vertical },
        stage: this.level.index,
        renderer: { calls: this.renderer.info.render.calls, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures },
      });
    }
  }

  start(): void {
    this.state.transition('gameplay');
    this.lastFrame = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
    document.querySelector('#boot-screen')?.classList.add('ready');
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(0.18, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    if (this.input.consume('pause')) {
      if (this.state.phase === 'paused') this.resume();
      else if (this.state.phase === 'gameplay') this.pause();
    }
    if (this.input.consume('restart') && this.state.phase !== 'gameplay') this.restart();
    if (this.state.phase === 'gameplay') {
      this.time += dt;
      // Bounded substeps keep gap collision stable even when a low-end GPU drops a frame.
      let remaining = dt;
      while (remaining > 0.0001) {
        const step = Math.min(remaining, 1 / 45);
        this.level.update(step);
        this.player.update(step, this.input, this.level);
        remaining -= step;
      }
      this.camera.update(dt, this.player);
      this.ui.update(dt, {
        stage: this.level.stage, time: this.time, score: 0, combo: 1, cores: 0,
        progress: this.player.position.z / this.level.atFinish, goal: 'Explore the route ahead',
      });
    }
    this.renderer.render(this.scene.scene, this.camera.camera);
    this.frameCount++;
    this.frameId = requestAnimationFrame(this.tick);
  };

  private resize(): void {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    const mobile = matchMedia('(pointer: coarse)').matches;
    const lowPower = mobile || navigator.hardwareConcurrency <= 4;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.75));
    this.renderer.setSize(width, height, false);
    this.camera.resize(width, height);
  }
  private pause(): void {
    if (this.state.phase !== 'gameplay') return;
    this.state.transition('paused');
    this.input.clear();
    this.ui.showPause(this.level.index, 0, STAGES, 'STANDARD');
  }
  private resume(): void {
    if (this.state.phase !== 'paused') return;
    this.state.transition('gameplay');
    this.ui.clearOverlay();
  }
  private restart(): void {
    if (this.state.phase === 'paused' || this.state.phase === 'results') this.state.transition('gameplay');
    this.input.clear();
    this.ui.clearOverlay();
    this.level.load(this.level.index);
    const start = this.level.stage.spawn;
    this.player.reset(start.x, start.y, start.z);
    this.camera.reset();
    this.camera.update(0, this.player);
    this.time = 0;
  }
  dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.input.dispose();
    this.ui.dispose();
    this.player.dispose(this.scene.scene);
    this.scene.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
