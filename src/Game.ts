import * as THREE from 'three';
import { Input } from './core/Input';
import { FollowCamera } from './core/Camera';
import { Player } from './gameplay/Player';
import { SceneBuilder } from './presentation/SceneBuilder';

/** Composition root. The loop coordinates systems; simulation stays in its owners. */
export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly input = new Input();
  private readonly scene = new SceneBuilder();
  private readonly player = new Player(this.scene.scene);
  private readonly camera = new FollowCamera(this.player);
  private raf = 0;
  private lastFrame = 0;
  private frames = 0;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const gl = this.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    const software = /swiftshader|llvmpipe/i.test(gpu);
    this.renderer.setPixelRatio(software ? 0.9 : Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = !software;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.id = 'game-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'FORGE//SHIFT 3D game world');
    this.container.prepend(this.renderer.domElement);
    this.player.reset();
    this.camera.reset();
    this.onResize();
    window.addEventListener('resize', this.onResize);
    if (import.meta.env.DEV) {
      // Read-only QA telemetry supplements screenshots; it never substitutes for visual testing.
      Object.assign(window, { __forgeDebug: () => ({
        player: this.player.position.toArray(),
        camera: this.camera.camera.position.toArray(),
        speed: this.player.speed,
        frames: this.frames,
        drawCalls: this.renderer.info.render.calls,
      }) });
    }
  }

  start(): void {
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.input.dispose();
    this.player.dispose();
    this.scene.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.resize(width, height);
  };

  private frame = (now: number): void => {
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    if (!document.hidden) {
      this.player.update(dt, this.input.move);
      this.camera.update(dt);
      this.renderer.render(this.scene.scene, this.camera.camera);
      if (this.frames++ === 0) this.container.dataset.gameReady = 'true';
    }
    this.raf = requestAnimationFrame(this.frame);
  };
}
