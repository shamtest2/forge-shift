import * as THREE from 'three';
import { Input } from './core/Input';
import { CameraRig } from './core/Camera';
import { Player } from './gameplay/Player';
import { SceneBuilder } from './presentation/SceneBuilder';

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly world = new SceneBuilder();
  private readonly player = new Player(this.world.scene);
  private readonly camera = new CameraRig();
  private readonly input: Input;
  private readonly timer: HTMLElement;
  private previous = performance.now();
  private elapsed = 0;
  private frame = 0;
  private raf = 0;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div id="viewport" aria-label="FORGE//SHIFT game world"></div>
      <div class="hud">
        <header class="topbar">
          <div class="identity"><div class="brand">FORGE<span>//</span>SHIFT</div><div class="subtitle">SECTOR 01 <i></i> FOUNDATION</div></div>
          <div class="time-block"><span class="eyebrow">RUN TIME</span><strong id="timer">00:00.00</strong></div>
          <div class="mission"><span class="eyebrow">CURRENT OBJECTIVE</span><strong>REACH EXTRACTION <span class="arrow">↗</span></strong></div>
        </header>
        <div class="intro"><div class="intro-rule"></div><span>01 / 06</span><h1>THE FIRST<br/><em>CONNECTION.</em></h1><p>Move forward. Find the route.</p></div>
        <div class="guidance"><span class="line"></span><div class="instruction">MOVE <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span class="divider">/</span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></div><span class="line"></span></div>
      </div>
      <div class="touch-controls" aria-label="Touch movement controls"><div class="dpad"><button data-control="forward" class="up" aria-label="Forward">↑</button><button data-control="left" class="left" aria-label="Left">←</button><button data-control="backward" class="down" aria-label="Backward">↓</button><button data-control="right" class="right" aria-label="Right">→</button></div><button class="touch-action" data-control="interact" aria-label="Shift">SHIFT</button></div>`;
    const viewport = root.querySelector<HTMLElement>('#viewport');
    const timer = root.querySelector<HTMLElement>('#timer');
    if (!viewport || !timer) throw new Error('Game surface could not be created');
    this.timer = timer;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    viewport.appendChild(this.renderer.domElement);
    this.input = new Input(root);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.camera.reset(this.player.position);
  }

  start(): void {
    this.previous = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    if (import.meta.env.DEV) {
      window.__forgeDebug = () => ({
        frame: this.frame,
        player: this.player.position.toArray(),
        camera: this.camera.camera.position.toArray(),
        grounded: this.player.grounded,
        calls: this.renderer.info.render.calls,
        webgl: !this.renderer.getContext().isContextLost(),
      });
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.input.dispose();
    this.player.dispose(this.world.scene);
    this.world.dispose();
    this.renderer.dispose();
    delete window.__forgeDebug;
  }

  private readonly resize = (): void => {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    this.camera.resize(width, height);
    this.renderer.setSize(width, height);
  };

  private readonly loop = (now: number): void => {
    // Rendering may be slower than simulation (especially with software WebGL).
    // Catch up in small steps instead of making movement/timing depend on FPS.
    const dt = Math.min((now - this.previous) / 1000, 0.2);
    this.previous = now;
    this.elapsed += dt;
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 60);
      this.player.update(step, this.input.x, this.input.z, (x, z) => this.world.groundHeight(x, z));
      remaining -= step;
    }
    if (this.player.position.y < -6) {
      this.player.reset();
      this.camera.reset(this.player.position);
      this.elapsed = 0;
    }
    this.camera.update(dt, this.player.position, this.player.horizontalSpeed, false);
    const mins = Math.floor(this.elapsed / 60);
    const secs = this.elapsed % 60;
    this.timer.textContent = `${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`;
    this.renderer.render(this.world.scene, this.camera.camera);
    this.frame++;
    this.raf = requestAnimationFrame(this.loop);
  };
}
