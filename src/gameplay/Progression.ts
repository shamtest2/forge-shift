import { STAGES } from './LevelSystem';
import type { RunOutcome } from './RunSystem';

export type Skin = 'ice' | 'ember' | 'ghost';
export interface Best { time: number; score: number; }
export interface SaveData {
  version: 1;
  unlocked: number;
  cores: number;
  completions: number;
  best: Record<number, Best>;
  skin: Skin;
  muted: boolean;
}
export interface Store { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export interface RunResult {
  outcome: RunOutcome;
  stage: number;
  time: number;
  score: number;
  combo: number;
  shifts: number;
  pickups: number;
  cleanPasses: number;
  reward: number;
  bonus: number;
  newBestScore: boolean;
  newBestTime: boolean;
  newUnlock: Skin | null;
}

const SAVE_KEY = 'forge-shift:progress:v1';
const fresh = (): SaveData => ({ version: 1, unlocked: 0, cores: 0, completions: 0, best: {}, skin: 'ice', muted: false });
const finite = (value: unknown, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Skill scoring and versioned progress. CrazyGames Data replaces localStorage on the portal. */
export class Progression {
  save: SaveData;
  score = 0;
  combo = 0;
  bestCombo = 0;
  shifts = 0;
  pickups = 0;
  cleanPasses = 0;
  private idle = 0;
  private stage = 0;

  constructor(private readonly storage: Store) {
    this.save = this.read();
  }

  start(stage: number): void {
    this.stage = stage;
    this.score = this.combo = this.bestCombo = this.shifts = this.pickups = this.cleanPasses = 0;
    this.idle = 0;
  }

  shift(): number {
    this.shifts++;
    return this.award(100);
  }

  collect(): number {
    this.pickups++;
    return this.award(75);
  }

  avoid(): number {
    this.cleanPasses++;
    return this.award(50);
  }

  tick(dt: number, moving: boolean): void {
    this.idle = moving ? 0 : this.idle + dt;
    if (this.idle > 13 && this.combo > 0) { this.combo = 0; this.idle = 0; }
  }

  finish(outcome: RunOutcome, time: number): RunResult {
    const oldCores = this.save.cores;
    const spec = STAGES[this.stage]!;
    let bonus = 0;
    if (outcome === 'complete') {
      const timeBonus = Math.max(0, Math.round((spec.targetTime - time) * 22));
      bonus = 500 + timeBonus + (this.shifts === spec.nodes ? 100 : 0);
      this.score += bonus;
    }
    // Repeated attempts still retain physically gathered cores, never just free time.
    const reward = this.pickups + (outcome === 'complete' ? 2 + this.stage + (this.cleanPasses >= spec.hazardAfter.length ? 1 : 0) : 0);
    this.save.cores += reward;
    const best = this.save.best[this.stage];
    const newBestScore = outcome === 'complete' && this.score > (best?.score ?? 0);
    const newBestTime = outcome === 'complete' && time < (best?.time ?? Infinity);
    if (outcome === 'complete') {
      this.save.completions++;
      this.save.unlocked = Math.max(this.save.unlocked, Math.min(this.stage + 1, STAGES.length - 1));
      this.save.best[this.stage] = { score: Math.max(best?.score ?? 0, this.score), time: Math.min(best?.time ?? Infinity, time) };
    }
    const newUnlock: Skin | null = oldCores < 8 && this.save.cores >= 8 ? 'ember'
      : oldCores < 22 && this.save.cores >= 22 ? 'ghost' : null;
    this.persist();
    return { outcome, stage: this.stage, time, score: this.score, combo: this.bestCombo,
      shifts: this.shifts, pickups: this.pickups, cleanPasses: this.cleanPasses,
      reward, bonus, newBestScore, newBestTime, newUnlock };
  }

  canEquip(skin: Skin): boolean {
    return skin === 'ice' || (skin === 'ember' && this.save.cores >= 8) || (skin === 'ghost' && this.save.cores >= 22);
  }

  equip(skin: Skin): boolean {
    if (!this.canEquip(skin)) return false;
    this.save.skin = skin;
    this.persist();
    return true;
  }

  setMuted(muted: boolean): void {
    this.save.muted = muted;
    this.persist();
  }

  private award(base: number): number {
    this.combo++;
    this.bestCombo = Math.max(this.combo, this.bestCombo);
    this.idle = 0;
    const points = Math.round(base * (1 + Math.min(this.combo - 1, 7) * .2));
    this.score += points;
    return points;
  }

  private read(): SaveData {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return fresh();
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1) return fresh();
      const data = value as Partial<SaveData>;
      const safe = fresh();
      safe.cores = Math.max(0, Math.floor(finite(data.cores)));
      safe.completions = Math.max(0, Math.floor(finite(data.completions)));
      safe.unlocked = Math.max(0, Math.min(STAGES.length - 1, Math.floor(finite(data.unlocked))));
      safe.muted = data.muted === true;
      if (data.best && typeof data.best === 'object') {
        for (let i = 0; i < STAGES.length; i++) {
          const best = data.best[i];
          if (best && finite(best.time) > 0 && finite(best.score) > 0) {
            safe.best[i] = { time: Math.min(36000, best.time), score: Math.min(1e8, best.score) };
          }
        }
      }
      if (data.skin === 'ember' && safe.cores >= 8 || data.skin === 'ghost' && safe.cores >= 22) safe.skin = data.skin;
      return safe;
    } catch { return fresh(); } // Corrupted/denied storage must never prevent gameplay.
  }

  private persist(): void {
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch { /* Private mode can deny writes. */ }
  }
}
