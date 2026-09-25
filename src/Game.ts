import * as THREE from 'three';
import { Input } from './core/Input';
import { CameraRig } from './core/Camera';
import { GameState } from './core/GameState';
import { Player } from './gameplay/Player';
import { LevelSystem, STAGES } from './gameplay/LevelSystem';
import { ShiftSystem } from './gameplay/ShiftSystem';
import { RunSystem, type RunOutcome } from './gameplay/RunSystem';
import { Progression, type RunResult, type Skin, type Store } from './gameplay/Progression';
import { SceneBuilder } from './presentation/SceneBuilder';
import { UI, type UIAction } from './presentation/UI';

const localStore: Store = {
  getItem(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
  setItem(key, value) { try { window.localStorage.setItem(key, value); } catch { /* Restricted storage. */ } },
};

/** Composition root: explicit state transitions and ordered system updates. */
export class Game {
  private readonly state = new GameState();
  private readonly builder = new SceneBuilder();
  private readonly level = new LevelSystem(this.builder);
  private readonly player = new Player(this.builder.scene);
  private readonly camera = new CameraRig();
  private readonly shifts = new ShiftSystem(this.level);
  private readonly run = new RunSystem();
  private readonly progression = new Progression(localStore);
  private readonly ui: UI;
  private readonly input: Input;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly floor = (x: number, z: number): number | null => this.level.groundHeight(x, z);
  private readonly constrainX = (x: number, z: number): number => this.level.constrainX(x, z);
  private stage = 0;
  private attempts = 0;
  private result: RunResult | null = null;
  private previous = performance.now();
  private uiTick = 0;
  private frame = 0;
  private raf = 0;

  constructor(private readonly root: HTMLElement) {
    this.state.enter('loading');
    this.ui = new UI(root, this.action);
    this.input = new Input(root);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.38;
    const gl = this.renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    const software = /swiftshader|llvmpipe/i.test(gpu);
    this.renderer.setPixelRatio(software ? 0.85 : Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.25 : 1.6));
    this.ui.viewport.appendChild(this.renderer.domElement);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.state.enter('gameplay');
    this.loadStage(0);
  }

  start(): void {
    this.previous = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    if (import.meta.env.DEV) {
      window.__forgeDebug = () => ({
        frame: this.frame,
        player: this.player.position.toArray() as [number, number, number],
        camera: this.camera.camera.position.toArray() as [number, number, number],
        grounded: this.player.grounded,
        calls: this.renderer.info.render.calls,
        webgl: !this.renderer.getContext().isContextLost(),
        phase: this.state.phase,
        stage: this.stage,
        time: this.run.elapsed,
        score: this.progression.score,
        bridges: [...this.shifts.progress],
        pickupCount: this.progression.pickups,
        cores: this.progression.save.cores,
      });
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.input.dispose();
    this.ui.dispose();
    this.player.dispose(this.builder.scene);
    this.builder.dispose();
    this.renderer.dispose();
    delete window.__forgeDebug;
  }

  private loadStage(index: number): void {
    this.stage = index;
    this.level.load(index, this.attempts++);
    this.shifts.reset();
    this.run.begin();
    this.progression.start(index);
    this.player.reset(this.level.layout.platforms[0]!.y);
    this.player.speed = STAGES[index]!.speed;
    this.player.setFinish(this.progression.save.skin);
    this.camera.reset(this.player.position);
    this.ui.enterStage(index, this.progression.save);
    this.result = null;
    this.input.clear();
    this.uiTick = 0;
  }

  private finish(outcome: RunOutcome): void {
    this.result = this.progression.finish(outcome, this.run.elapsed);
    this.state.enter('results');
    this.ui.showResult(this.result, this.progression.save);
    this.input.clear();
    this.camera.impact(outcome === 'complete' ? .08 : .19);
  }

  private interact(): void {
    const feedback = this.shifts.activate(this.player.position);
    if (!feedback) return;
    this.camera.impact(.11);
    if (feedback.activated) {
      const points = this.progression.shift();
      this.ui.notify(`BRIDGE 0${feedback.index + 1} DEPLOYING  ·  +${points}`);
    } else this.ui.notify(`BRIDGE 0${feedback.index + 1} RETRACTED`, 'amber');
  }

  private pause(): void {
    if (this.state.phase === 'gameplay') {
      this.state.enter('paused');
      this.input.clear();
      this.ui.showPause(this.stage, this.progression.save);
    } else if (this.state.phase === 'paused') {
      this.state.enter('gameplay');
      this.ui.hideOverlay();
      this.input.clear();
      this.previous = performance.now();
    }
  }

  private readonly action = ({ type, value }: UIAction): void => {
    switch (type) {
      case 'pause': if (this.state.phase === 'gameplay') this.pause(); break;
      case 'resume': if (this.state.phase === 'paused') this.pause(); break;
      case 'restart':
        if (this.state.phase === 'paused' || this.state.phase === 'results') this.state.enter('gameplay');
        this.loadStage(this.stage);
        break;
      case 'next':
        if (this.state.phase !== 'results' || this.stage >= this.progression.save.unlocked) break;
        this.state.enter('gameplay');
        this.loadStage(Math.min(this.stage + 1, STAGES.length - 1));
        break;
      case 'stage':
        if (typeof value !== 'number' || value > this.progression.save.unlocked || value < 0 || value >= STAGES.length) break;
        if (this.state.phase === 'paused' || this.state.phase === 'results') this.state.enter('gameplay');
        this.loadStage(value);
        break;
      case 'equip':
        if (typeof value !== 'string' || !this.progression.equip(value as Skin)) break;
        this.player.setFinish(value as Skin);
        if (this.state.phase === 'paused') this.ui.refreshPause(this.stage, this.progression.save);
        else if (this.result) this.ui.refreshResult(this.result, this.progression.save);
        break;
      case 'mute':
        this.progression.setMuted(!this.progression.save.muted);
        if (this.state.phase === 'paused') this.ui.refreshPause(this.stage, this.progression.save);
        break;
    }
  };

  private readonly resize = (): void => {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    this.camera.resize(width, height);
    this.renderer.setSize(width, height);
  };

  private readonly loop = (_frameTime: number): void => {
    // Some compositors deliver throttled rAF timestamps even as real wall time
    // advances (notably software WebGL). Clock from performance.now instead.
    const now = performance.now();
    const dt = Math.min(Math.max((now - this.previous) / 1000, 0), .2);
    this.previous = now;
    if (this.input.consume('pause')) this.pause();
    if (this.input.consume('restart')) this.action({ type: 'restart' });
    if (this.input.consume('mute')) this.action({ type: 'mute' });

    if (this.state.phase === 'gameplay') {
      if (this.input.consume('interact')) this.interact();
      // Stable substeps preserve world speed on low-FPS GPUs; no collision tunneling.
      let remaining = dt;
      while (remaining > 0 && this.state.phase === 'gameplay') {
        const step = Math.min(remaining, 1 / 60);
        this.player.speed = STAGES[this.stage]!.speed * (this.level.onRushLane(this.player.position.x, this.player.position.z) ? 1.23 : 1);
        this.player.update(step, this.input.x, this.input.z, this.floor, this.constrainX);
        this.shifts.update(step, this.player.position);
        const events = this.level.update(step, this.run.elapsed + step, this.player.position);
        for (let i = 0; i < events.pickup; i++) {
          const points = this.progression.collect();
          this.ui.notify(`ENERGY CORE  +${points}`);
        }
        for (let i = 0; i < events.cleanPass; i++) {
          const points = this.progression.avoid();
          this.ui.notify(`CLEAN PASS  +${points}`);
        }
        this.progression.tick(step, this.player.horizontalSpeed > .35);
        const outcome = this.run.tick(step, this.player, this.level, events.hazard);
        if (outcome) this.finish(outcome);
        remaining -= step;
      }
      if (this.state.phase === 'gameplay') {
        const near = this.shifts.nearest;
        this.camera.update(dt, this.player.position, this.player.horizontalSpeed,
          near >= 0 && !this.shifts.target[near]);
        this.uiTick += dt;
        if (this.uiTick > .085) {
          this.ui.update(this.run.elapsed, this.progression.score, this.progression.combo,
            this.shifts.prompt, this.shifts.timedBridge, this.stage, this.progression.shifts);
          this.uiTick = 0;
        }
      }
    }
    this.renderer.render(this.builder.scene, this.camera.camera);
    this.frame++;
    this.raf = requestAnimationFrame(this.loop);
  };
}
