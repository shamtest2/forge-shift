export type GamePhase = 'boot' | 'loading' | 'gameplay' | 'paused' | 'results';

const allowed: Record<GamePhase, readonly GamePhase[]> = {
  boot: ['loading'],
  loading: ['gameplay'],
  gameplay: ['paused', 'results'],
  paused: ['gameplay'],
  results: ['gameplay'],
};

/** One authoritative phase; results carry a reason, not another set of flags. */
export class GameState {
  phase: GamePhase = 'boot';

  enter(next: GamePhase): void {
    if (!allowed[this.phase].includes(next)) throw new Error(`Invalid game transition: ${this.phase} -> ${next}`);
    this.phase = next;
  }
}
