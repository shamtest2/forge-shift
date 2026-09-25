export type Phase = 'boot' | 'loading' | 'gameplay' | 'paused' | 'results';

const allowed: Record<Phase, readonly Phase[]> = {
  boot: ['loading'],
  loading: ['gameplay'],
  gameplay: ['paused', 'results'],
  paused: ['gameplay', 'results'],
  results: ['gameplay'],
};

/** Explicit transitions prevent overlapping gameplay, pause and results states. */
export class GameState {
  phase: Phase = 'boot';
  transition(next: Phase): void {
    if (!allowed[this.phase].includes(next)) throw new Error(`Illegal game transition: ${this.phase} -> ${next}`);
    this.phase = next;
  }
}
