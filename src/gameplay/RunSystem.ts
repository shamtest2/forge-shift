import type { Player } from './Player';
import type { LevelSystem } from './LevelSystem';

export type RunOutcome = 'complete' | 'fall' | 'hazard' | 'timeout';

/** The clock and explicit finish/fail conditions, independent of menus or rendering. */
export class RunSystem {
  elapsed = 0;
  bestComboThisRun = 0;

  begin(): void {
    this.elapsed = 0;
    this.bestComboThisRun = 0;
  }

  tick(dt: number, player: Player, level: LevelSystem, hitHazard: boolean): RunOutcome | null {
    this.elapsed += dt;
    if (hitHazard && player.grounded) return 'hazard';
    if (player.position.y < -3.8) return 'fall';
    if (level.reachedFinish(player.position)) return 'complete';
    // Introductory runs are deliberately untimed. Later stages have generous
    // hard limits, separate from the speed target that influences score.
    const limit = level.layout.stageIndex < 2 ? Infinity : level.layout.spec.targetTime * 3.5;
    if (this.elapsed > limit) return 'timeout';
    return null;
  }
}
