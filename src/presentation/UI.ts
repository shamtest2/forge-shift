import type { Input, Control } from '../core/Input';
import type { StageConfig } from '../gameplay/LevelSystem';

export interface ResultView {
  won: boolean;
  stage: StageConfig;
  time: number;
  score: number;
  best: number;
  bestTime: number | null;
  combo: number;
  cores: number;
  unlocked: string | null;
  breakdown: { label: string; value: number }[];
}
export interface HUDView { time: number; score: number; combo: number; progress: number; cores: number; goal: string; stage: StageConfig; }

const timecode = (seconds: number): string => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
const num = (value: number): string => Math.round(value).toLocaleString('en-US');

/** All DOM presentation lives here; interaction callbacks remain owned by Game. */
export class UI {
  private readonly root: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly score: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly cores: HTMLElement;
  private readonly objective: HTMLElement;
  private readonly sector: HTMLElement;
  private readonly progress: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly input: Input;
  private noticeTimer = 0;
  private introTimer = 9;
  private mode: 'gameplay' | 'paused' | 'results' = 'gameplay';
  onPause?: () => void;
  onResume?: () => void;
  onRestart?: () => void;
  onContinue?: () => void;
  onSelectStage?: (index: number) => void;
  onMute?: () => void;

  constructor(root: HTMLElement, input: Input) {
    this.root = root;
    this.input = input;
    root.innerHTML = `
      <div class="screen-grain" aria-hidden="true"></div>
      <div class="hud" id="hud">
        <header class="top-bar">
          <div class="identity"><div class="brand">FORGE<span>//</span>SHIFT</div><div class="brand-caption">FACILITY TRAVERSAL DIVISION <b>·</b> 01—06</div></div>
          <div class="run-clock"><span class="eyebrow">RUN TIME <i></i> LIVE</span><strong id="timer">00:00.00</strong></div>
          <div class="top-actions"><div class="score-cluster"><div><span class="eyebrow">SCORE</span><strong id="score">0</strong></div><div><span class="eyebrow">CHAIN</span><strong id="combo">×1</strong></div></div><button class="icon-button" data-action="pause" title="Pause (P or Esc)" aria-label="Pause game">Ⅱ</button><button class="icon-button sound-toggle" data-action="mute" title="Toggle sound" aria-label="Toggle sound">◖))</button></div>
        </header>
        <div class="sector-line"><div class="sector-name"><span class="eyebrow">CURRENT SECTOR</span><span id="sector">01 / FOUNDATION</span></div><div class="route-progress"><span>ENTRY</span><div class="progress-track"><div id="progress"></div></div><span>EXIT</span></div><div class="core-count" title="Cores collected this run"><span class="core-glyph">◇</span><b id="cores">0</b></div></div>
        <div class="goal"><span class="goal-dot"></span><span id="objective">Find the Shift Node</span></div>
        <div class="context-prompt" id="prompt" aria-live="polite"></div>
        <div class="notice" id="notice" aria-live="polite"></div>
        <div class="bottom-bar"><div class="intro" id="intro"><span class="eyebrow">SYSTEM BRIEF / 01</span><strong>THE ROUTE IS NOT FIXED.</strong><span>Move with <kbd>W A S D</kbd> or <kbd>↑ ← ↓ →</kbd><br>Approach a node. Press <kbd>E</kbd> or <kbd>SPACE</kbd> to SHIFT.</span></div><div class="controls-hint">WASD / ARROWS <em>MOVE</em><span></span>E / SPACE <em>SHIFT</em></div></div>
      </div>
      <div class="touch-controls" id="touch-controls" aria-label="Touch controls">
        <div class="touch-dpad"><button data-control="forward" aria-label="Move forward">↑</button><button data-control="left" aria-label="Move left">←</button><button data-control="backward" aria-label="Move backward">↓</button><button data-control="right" aria-label="Move right">→</button></div>
        <button class="touch-shift" data-control="shift" aria-label="Activate Shift">SHIFT <small>◇</small></button>
      </div>
      <div class="overlay" id="overlay" hidden></div>
    `;
    const get = (id: string): HTMLElement => {
      const element = root.querySelector<HTMLElement>(`#${id}`);
      if (!element) throw new Error(`Missing UI element #${id}`);
      return element;
    };
    this.timer = get('timer'); this.score = get('score'); this.combo = get('combo');
    this.cores = get('cores'); this.objective = get('objective'); this.sector = get('sector');
    this.progress = get('progress'); this.prompt = get('prompt'); this.notice = get('notice'); this.overlay = get('overlay');
    root.querySelector('[data-action="pause"]')?.addEventListener('click', () => this.onPause?.());
    root.querySelector('[data-action="mute"]')?.addEventListener('click', () => this.onMute?.());
    for (const element of root.querySelectorAll<HTMLElement>('[data-control]')) {
      const control = element.dataset.control as Control;
      element.addEventListener('pointerdown', (event) => {
        event.preventDefault(); element.setPointerCapture(event.pointerId); this.input.press(control);
        element.classList.add('down');
      });
      const release = (event: PointerEvent) => {
        event.preventDefault(); this.input.release(control); element.classList.remove('down');
      };
      element.addEventListener('pointerup', release);
      element.addEventListener('pointercancel', release);
      element.addEventListener('lostpointercapture', () => { this.input.release(control); element.classList.remove('down'); });
    }
  }

  update(dt: number, view: HUDView): void {
    if (this.mode !== 'gameplay') return;
    this.timer.textContent = timecode(view.time);
    this.score.textContent = num(view.score);
    this.combo.textContent = `×${view.combo}`;
    this.cores.textContent = `${view.cores}`;
    this.sector.textContent = view.stage.code;
    this.objective.textContent = view.goal;
    this.progress.style.width = `${Math.max(0, Math.min(100, view.progress * 100))}%`;
    if (this.noticeTimer > 0 && (this.noticeTimer -= dt) <= 0) this.notice.classList.remove('visible');
    if (this.introTimer > 0 && (this.introTimer -= dt) <= 0) this.root.querySelector('#intro')?.classList.add('dismissed');
  }

  dismissIntro(): void { this.introTimer = 0; this.root.querySelector('#intro')?.classList.add('dismissed'); }
  showPrompt(title: string, description: string, progress = 0): void {
    this.prompt.innerHTML = `<span class="prompt-icon">E <small>/</small> SPACE</span><span class="prompt-copy"><b>${title}</b><small>${description}</small></span><span class="prompt-charge" style="--charge:${Math.min(100, progress * 100)}%"></span>`;
    this.prompt.classList.add('visible');
  }
  hidePrompt(): void { this.prompt.classList.remove('visible'); }
  toast(title: string, description = '', duration = 2.5): void {
    this.notice.innerHTML = `<b>${title}</b><span>${description}</span>`;
    this.noticeTimer = duration;
    this.notice.classList.add('visible');
  }
  clearOverlay(): void {
    this.overlay.hidden = true;
    this.overlay.innerHTML = '';
    this.mode = 'gameplay';
    this.root.querySelector('.hud')?.classList.remove('dimmed');
  }

  showPause(stageIndex: number, unlocked: number, stages: readonly StageConfig[], suit: string): void {
    this.mode = 'paused';
    this.root.querySelector('.hud')?.classList.add('dimmed');
    this.overlay.hidden = false;
    const list = stages.map((stage, index) =>
      `<button class="stage-choice ${index === stageIndex ? 'selected' : ''}" data-stage="${index}" ${index > unlocked ? 'disabled' : ''}><span>${stage.code}</span><b>${stage.name}</b><small>${index > unlocked ? 'LOCKED' : index === stageIndex ? 'CURRENT' : 'AVAILABLE'}</small></button>`).join('');
    this.overlay.innerHTML = `<section class="dialog pause-dialog" aria-label="Paused">
      <div class="eyebrow">SYSTEM / STANDBY</div><h1>RUN PAUSED<span>.</span></h1><p>Take a breath. The facility will wait.</p>
      <div class="dialog-actions"><button class="button primary" data-action="resume">RESUME RUN <span>↗</span></button><button class="button secondary" data-action="restart">RESTART SECTOR</button></div>
      <div class="dialog-divider"></div><div class="eyebrow">SECTOR SELECT · ${suit.toUpperCase()} SUIT</div><div class="stage-grid">${list}</div>
      <div class="dialog-foot">P / ESC TO RESUME <span>FORGE//SHIFT</span></div>
    </section>`;
    this.overlay.querySelector('[data-action="resume"]')?.addEventListener('click', () => this.onResume?.());
    this.overlay.querySelector('[data-action="restart"]')?.addEventListener('click', () => this.onRestart?.());
    for (const button of this.overlay.querySelectorAll<HTMLElement>('[data-stage]')) {
      button.addEventListener('click', () => this.onSelectStage?.(Number(button.dataset.stage)));
    }
  }

  showResults(view: ResultView, hasNext: boolean): void {
    this.mode = 'results';
    this.root.querySelector('.hud')?.classList.add('dimmed');
    this.overlay.hidden = false;
    const title = view.won ? 'SECTOR CLEARED' : 'SIGNAL LOST';
    const breakdown = view.breakdown.map(item => `<div><span>${item.label}</span><b>+${num(item.value)}</b></div>`).join('');
    this.overlay.innerHTML = `<section class="dialog results-dialog ${view.won ? 'success' : 'failure'}" aria-label="Run result">
      <div class="eyebrow">${view.stage.code} · ${view.won ? 'RUN ARCHIVED' : 'RUN TERMINATED'}</div>
      <h1>${title}<span>.</span></h1><p>${view.won ? 'The route was never fixed. You made it yours.' : 'The facility resets. Your next line can be cleaner.'}</p>
      <div class="result-hero"><div><span class="eyebrow">FINAL SCORE</span><strong>${num(view.score)}</strong><small>PERSONAL BEST ${num(view.best)}</small></div><div><span class="eyebrow">RUN TIME</span><strong>${timecode(view.time)}</strong><small>${view.bestTime === null ? 'NO RECORD YET' : `BEST ${timecode(view.bestTime)}`}</small></div></div>
      <div class="result-breakdown">${breakdown}</div>
      <div class="result-rewards"><span>MAX CHAIN <b>×${view.combo}</b></span><span>CORES EARNED <b>+${view.cores}</b></span></div>
      ${view.unlocked ? `<div class="unlock-banner">◆ &nbsp; ${view.unlocked}</div>` : ''}
      <div class="dialog-actions"><button class="button primary" data-action="restart">RUN AGAIN <span>↗</span></button>${hasNext && view.won ? '<button class="button secondary" data-action="continue">NEXT SECTOR →</button>' : ''}</div>
      <div class="dialog-foot">R / ENTER TO RETRY <span>FORGE//SHIFT</span></div>
    </section>`;
    this.overlay.querySelector('[data-action="restart"]')?.addEventListener('click', () => this.onRestart?.());
    this.overlay.querySelector('[data-action="continue"]')?.addEventListener('click', () => this.onContinue?.());
  }
  setMuted(muted: boolean): void {
    const button = this.root.querySelector('.sound-toggle');
    if (button) button.textContent = muted ? '◖×' : '◖))';
  }
  dispose(): void { this.root.replaceChildren(); }
}
