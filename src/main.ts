import './style.css';
import { Game } from './Game';

interface DebugSnapshot {
  frame: number;
  player: [number, number, number];
  camera: [number, number, number];
  grounded: boolean;
  calls: number;
  webgl: boolean;
  phase: string;
  stage: number;
  time: number;
  score: number;
  bridges: number[];
  pickupCount: number;
  cores: number;
}

declare global {
  interface Window {
    __forgeSdkScript?: Promise<boolean>;
    __forgeDebug?: () => DebugSnapshot;
  }
}

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Root element missing');

try {
  const game = new Game(app);
  game.start();
  window.dispatchEvent(new Event('forge-ready'));
} catch (error) {
  console.error('FORGE//SHIFT could not initialize', error);
  app.innerHTML = '<div class="boot error">DISPLAY UNAVAILABLE<small>WebGL is required. Try updating your browser and reloading.</small></div>';
}
