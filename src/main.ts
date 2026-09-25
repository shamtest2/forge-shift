import './style.css';
import { Game } from './Game';

const container = document.querySelector<HTMLElement>('#game-canvas');
const hud = document.querySelector<HTMLElement>('#game-ui');
const boot = document.querySelector<HTMLElement>('#boot-screen');
if (!container || !hud || !boot) throw new Error('Game shell is incomplete');
try {
  const game = new Game(container, hud);
  game.start();
  // During Vite hot reload, remove WebGL resources and input handlers before reconstructing the game.
  if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());
} catch (error) {
  console.error('FORGE//SHIFT startup failed', error);
  boot.classList.add('error');
  boot.textContent = 'WEBGL COULD NOT START — PLEASE ENABLE HARDWARE ACCELERATION AND RELOAD';
}
