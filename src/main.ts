import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import './style.css';
import { Game } from './Game';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Game mount missing');

app.innerHTML = `
  <header class="hud-header" aria-label="Game status">
    <div class="brand"><span class="brand-mark">F//S</span><span>FORGE<span class="slash">//</span>SHIFT</span></div>
    <div class="sector"><span class="signal"></span> SECTOR 01 <span class="subtle">/ TRANSIT DIVISION</span></div>
  </header>
  <div class="reticle" aria-hidden="true"><span></span></div>
  <footer class="help-bar" aria-label="Controls">
    <div class="help-title">01 <span>TRAVERSAL</span><small>Find the path forward</small></div>
    <div class="help-control"><span class="keys">W A S D</span><span class="control-label">MOVE</span></div>
    <span class="help-or">/</span>
    <div class="help-control"><span class="keys">↑ ← ↓ →</span><span class="control-label">MOVE</span></div>
  </footer>
`;

try {
  new Game(app).start();
} catch (error) {
  console.error('FORGE//SHIFT startup failed', error);
  app.innerHTML = '<div class="startup-error"><h1>DISPLAY UNAVAILABLE</h1><p>WebGL is required. Please enable hardware acceleration and refresh.</p></div>';
}
