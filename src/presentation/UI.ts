import { STAGES } from '../gameplay/LevelSystem';
import type { RunResult, SaveData, Skin } from '../gameplay/Progression';

export type UIAction = { type: 'pause' | 'resume' | 'restart' | 'next' | 'stage' | 'equip' | 'mute'; value?: number | Skin };

const seconds = (time: number): string => `${String(Math.floor(time / 60)).padStart(2, '0')}:${(time % 60).toFixed(2).padStart(5, '0')}`;
const number = (value: number): string => value.toLocaleString('en-US');

/** DOM only: receives state snapshots, dispatches intentions, never edits gameplay state. */
export class UI {
  readonly viewport: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly score: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly objective: HTMLElement;
  private readonly sector: HTMLElement;
  private readonly intro: HTMLElement;
  private readonly introIndex: HTMLElement;
  private readonly introTitle: HTMLElement;
  private readonly introText: HTMLElement;
  private readonly guidance: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly promptText: HTMLElement;
  private readonly bridgeTimer: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly hud: HTMLElement;
  private noticeHandle = 0;
  private lastHint = '';

  constructor(private readonly root: HTMLElement, private readonly onAction: (action: UIAction) => void) {
    root.innerHTML = `
      <div id="viewport" aria-label="FORGE//SHIFT game world"></div>
      <div class="hud">
        <header class="topbar">
          <div class="identity"><div class="brand">FORGE<span>//</span>SHIFT</div><div class="subtitle" id="sector">SECTOR 01 — FOUNDATION</div>
            <div class="score-line"><div><span class="eyebrow">SCORE</span><strong id="score">0000</strong></div><div><span class="eyebrow">COMBO</span><strong id="combo">×0</strong></div></div>
          </div>
          <div class="time-block"><span class="eyebrow">RUN TIME</span><strong id="timer">00:00.00</strong><span id="bridge-timer" class="bridge-timer" hidden>BRIDGE · 00s</span></div>
          <div class="mission"><span class="eyebrow">CURRENT OBJECTIVE</span><strong id="objective">REACH THE SHIFT NODE</strong>
            <button class="pause-button" data-action="pause" aria-label="Pause game">II <span>PAUSE</span></button></div>
        </header>
        <div class="intro" id="intro"><div class="intro-rule"></div><span id="intro-index">01 / 06</span><h1 id="intro-title">THE FIRST<br/><em>CONNECTION.</em></h1><p id="intro-text">Deploy the missing bridge.</p></div>
        <div class="prompt" id="prompt" hidden><div class="prompt-icon">◇</div><div><span>SHIFT NODE IN RANGE</span><strong id="prompt-text">E / SPACE · DEPLOY BRIDGE</strong></div><div class="prompt-pulse"></div></div>
        <div class="notice" id="notice" role="status" aria-live="polite" hidden></div>
        <div class="guidance" id="guidance"><span class="line"></span><div class="instruction">MOVE <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span class="divider">/</span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd><span class="divider">•</span> SHIFT <kbd>E</kbd></div><span class="line"></span></div>
      </div>
      <div class="touch-controls" aria-label="Touch movement controls"><div class="dpad"><button data-control="forward" class="up" aria-label="Forward">↑</button><button data-control="left" class="left" aria-label="Left">←</button><button data-control="backward" class="down" aria-label="Backward">↓</button><button data-control="right" class="right" aria-label="Right">→</button></div><button class="touch-action" data-control="interact" aria-label="Deploy shift bridge">SHIFT</button></div>
      <div class="orientation-note">LANDSCAPE RECOMMENDED FOR THE BEST VIEW</div>
      <div class="overlay" id="overlay" hidden></div>`;
    const get = (selector: string): HTMLElement => {
      const node = root.querySelector<HTMLElement>(selector);
      if (!node) throw new Error(`UI element missing: ${selector}`);
      return node;
    };
    this.viewport = get('#viewport');
    this.timer = get('#timer');
    this.score = get('#score');
    this.combo = get('#combo');
    this.objective = get('#objective');
    this.sector = get('#sector');
    this.intro = get('#intro');
    this.introIndex = get('#intro-index');
    this.introTitle = get('#intro-title');
    this.introText = get('#intro-text');
    this.guidance = get('#guidance');
    this.prompt = get('#prompt');
    this.promptText = get('#prompt-text');
    this.bridgeTimer = get('#bridge-timer');
    this.overlay = get('#overlay');
    this.notice = get('#notice');
    this.hud = get('.hud');
    root.addEventListener('click', this.click);
  }

  enterStage(index: number, progress: SaveData): void {
    const stage = STAGES[index]!;
    this.overlay.hidden = true;
    this.hud.classList.remove('dimmed');
    this.sector.textContent = `SECTOR ${String(index + 1).padStart(2, '0')}   —   ${stage.name}`;
    this.introIndex.textContent = `${String(index + 1).padStart(2, '0')} / 06`;
    const words = stage.callSign.split(' ');
    this.introTitle.innerHTML = `${words.slice(0, -1).join(' ')}<br/><em>${words.at(-1)}.</em>`;
    this.introText.textContent = stage.briefing;
    this.intro.classList.add('visible');
    this.guidance.classList.toggle('revealed', progress.completions > 0);
    this.objective.textContent = 'FIND THE SHIFT NODE ↗';
    this.score.textContent = '0000';
    this.combo.textContent = '×0';
    this.timer.textContent = '00:00.00';
    this.prompt.hidden = true;
    this.bridgeTimer.hidden = true;
    this.notice.hidden = true;
  }

  update(time: number, score: number, combo: number, hint: string | null, bridgeTime: number | null, stageIndex: number, shifts: number): void {
    this.timer.textContent = seconds(time);
    this.score.textContent = number(score).padStart(4, '0');
    this.combo.textContent = `×${combo}`;
    this.combo.classList.toggle('active', combo > 1);
    this.intro.classList.toggle('visible', time < 5.3);
    this.guidance.classList.toggle('faded', time > 14 || shifts > 0);
    this.objective.textContent = shifts < STAGES[stageIndex]!.nodes ? 'SHIFT TO OPEN THE ROUTE ↗' : 'REACH EXTRACTION ↗';
    this.prompt.hidden = !hint;
    if (hint && hint !== this.lastHint) this.promptText.textContent = hint;
    this.lastHint = hint ?? '';
    this.bridgeTimer.hidden = bridgeTime === null;
    if (bridgeTime !== null) {
      this.bridgeTimer.textContent = `BRIDGE RETRACTS · ${Math.ceil(bridgeTime)}s`;
      this.bridgeTimer.classList.toggle('urgent', bridgeTime < 5);
    }
  }

  notify(message: string, kind: 'cyan' | 'amber' = 'cyan'): void {
    window.clearTimeout(this.noticeHandle);
    this.notice.textContent = message;
    this.notice.dataset.kind = kind;
    this.notice.hidden = false;
    this.noticeHandle = window.setTimeout(() => { this.notice.hidden = true; }, 2300);
  }

  showPause(stage: number, progress: SaveData): void {
    this.hud.classList.add('dimmed');
    this.overlay.hidden = false;
    this.overlay.innerHTML = `<div class="overlay-shade"></div><section class="panel pause-panel" role="dialog" aria-modal="true" aria-label="Game paused">
      <div class="panel-top"><span class="eyebrow">FORGE//SHIFT  /  SYSTEM PAUSED</span><span class="panel-cross">◇</span></div>
      <h2>TAKE A BREATH<span>.</span></h2><p class="panel-sub">Your run is paused. Resume whenever you're ready.</p>
      <div class="panel-actions"><button class="action primary" data-action="resume">RESUME RUN <b>→</b></button><button class="action secondary" data-action="restart">RESTART STAGE ↺</button></div>
      <div class="panel-rule"></div><span class="eyebrow">SELECT SECTOR</span>${this.stageButtons(progress, stage)}
      <div class="panel-rule"></div><span class="eyebrow">SUIT FINISH <span class="muted-label">COSMETIC ONLY</span></span>${this.skinButtons(progress)}
      <button class="sound-toggle" data-action="mute">AUDIO ${progress.muted ? 'OFF' : 'ON'} ${progress.muted ? '◌' : '♫'}</button>
      <p class="panel-footer">WASD / ARROWS · MOVE &nbsp;&nbsp; E / SPACE · SHIFT &nbsp;&nbsp; P / ESC · PAUSE</p>
    </section>`;
    this.overlay.querySelector<HTMLElement>('[data-action="resume"]')?.focus();
  }

  showResult(result: RunResult, progress: SaveData): void {
    this.hud.classList.add('dimmed');
    this.overlay.hidden = false;
    const won = result.outcome === 'complete';
    const status = won ? 'RUN COMPLETE' : result.outcome === 'hazard' ? 'FIELD CONTACT' : result.outcome === 'timeout' ? 'TIME EXPIRED' : 'ROUTE LOST';
    const detail = won ? (result.newBestTime ? 'NEW PERSONAL BEST // EXTRACTION CONFIRMED' : 'EXTRACTION CONFIRMED // GO FASTER')
      : result.outcome === 'hazard' ? 'Read the amber sweep. Move around it.'
      : result.outcome === 'timeout' ? 'The system closed. Chain your shifts faster.'
      : 'Missing floor. Shift a bridge before crossing.';
    const next = won && result.stage < STAGES.length - 1;
    const best = progress.best[result.stage];
    this.overlay.innerHTML = `<div class="overlay-shade"></div><section class="panel result-panel" role="dialog" aria-modal="true" aria-label="${status}">
      <div class="panel-top"><span class="eyebrow">SECTOR ${String(result.stage + 1).padStart(2, '0')} / ${STAGES[result.stage]!.name}</span><span class="panel-cross">${won ? '◇' : '×'}</span></div>
      <span class="result-kicker ${won ? '' : 'warning'}">${won ? 'MISSION ACCOMPLISHED' : 'SIGNAL INTERRUPTED'}</span>
      <h2>${status}<span>.</span></h2><p class="panel-sub">${detail}</p>
      <div class="result-stats"><div><span>TIME</span><strong>${seconds(result.time)}</strong></div><div><span>SCORE</span><strong>${number(result.score)}</strong></div><div><span>BEST COMBO</span><strong>×${result.combo}</strong></div></div>
      <div class="result-breakdown"><span>${result.shifts} SHIFT${result.shifts === 1 ? '' : 'S'} · ${result.pickups} CORE${result.pickups === 1 ? '' : 'S'} · ${result.cleanPasses} CLEAN PASS${result.cleanPasses === 1 ? '' : 'ES'}</span><span>${won ? `+${number(result.bonus)} FINISH` : 'RETRY FOR THE FINISH BONUS'}</span></div>
      <div class="reward"><div><span class="eyebrow">CORE BANK</span><strong>+${result.reward} <span>◇</span></strong></div><div><span class="eyebrow">TOTAL</span><strong>${progress.cores} <span>◇</span></strong></div>${result.newUnlock ? `<span class="new-unlock">NEW SUIT FINISH: ${result.newUnlock.toUpperCase()}</span>` : ''}</div>
      <div class="best-line">${best ? `PERSONAL BEST  ${number(best.score)} PTS  /  ${seconds(best.time)}` : 'COMPLETE THE STAGE TO SET A PERSONAL BEST'}</div>
      <div class="panel-actions"><button class="action primary" data-action="restart">RUN AGAIN <b>↺</b></button>${next ? '<button class="action secondary" data-action="next">NEXT SECTOR →</button>' : ''}</div>
      <div class="panel-rule"></div><span class="eyebrow">SECTOR SELECT</span>${this.stageButtons(progress, result.stage)}
      <div class="panel-rule"></div><span class="eyebrow">SUIT FINISH <span class="muted-label">COSMETIC ONLY</span></span>${this.skinButtons(progress)}
      <p class="panel-footer">R · INSTANT RETRY &nbsp; / &nbsp; SELECT ANY UNLOCKED SECTOR</p>
    </section>`;
    this.overlay.querySelector<HTMLElement>('[data-action="restart"]')?.focus();
  }

  hideOverlay(): void {
    this.overlay.hidden = true;
    this.hud.classList.remove('dimmed');
  }

  refreshPause(stage: number, progress: SaveData): void {
    this.showPause(stage, progress);
  }

  refreshResult(result: RunResult, progress: SaveData): void {
    this.showResult(result, progress);
  }

  dispose(): void {
    this.root.removeEventListener('click', this.click);
    window.clearTimeout(this.noticeHandle);
  }

  private stageButtons(progress: SaveData, current: number): string {
    return `<div class="stage-select">${STAGES.map((stage, index) => {
      const unlocked = index <= progress.unlocked;
      return `<button data-action="stage" data-value="${index}" ${unlocked ? '' : 'disabled'} class="stage-choice ${index === current ? 'selected' : ''}" title="${stage.name}"><span>0${index + 1}</span><small>${unlocked ? stage.name : 'LOCKED'}</small></button>`;
    }).join('')}</div>`;
  }

  private skinButtons(progress: SaveData): string {
    const options: Array<[Skin, number, string]> = [['ice', 0, 'GLACIER'], ['ember', 8, 'EMBER'], ['ghost', 22, 'SPECTER']];
    return `<div class="skin-select">${options.map(([skin, cost, name]) => `<button data-action="equip" data-value="${skin}" ${progress.cores < cost ? 'disabled' : ''} class="skin-choice ${skin} ${progress.skin === skin ? 'selected' : ''}"><i></i>${name}<small>${progress.cores < cost ? `${cost} CORES` : skin === progress.skin ? 'EQUIPPED' : 'SELECT'}</small></button>`).join('')}</div>`;
  }

  private readonly click = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]');
    if (!button || button.disabled) return;
    const type = button.dataset.action as UIAction['type'];
    const value = button.dataset.value;
    if (type === 'stage') this.onAction({ type, value: Number(value) });
    else if (type === 'equip') this.onAction({ type, value: value as Skin });
    else this.onAction({ type });
  };
}
