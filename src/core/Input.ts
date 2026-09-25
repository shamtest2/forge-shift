export type MoveVector = { x: number; z: number };

/** A single source of truth for keyboard and touch movement. World forward is -Z. */
export class Input {
  private readonly keys = new Set<string>();
  private readonly touch = new Set<string>();
  private readonly movement: MoveVector = { x: 0, z: 0 };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  get move(): Readonly<MoveVector> {
    const held = (key: string, arrow: string) =>
      this.keys.has(key) || this.keys.has(arrow) || this.touch.has(key);
    this.movement.x = Number(held('d', 'ArrowRight')) - Number(held('a', 'ArrowLeft'));
    this.movement.z = Number(held('s', 'ArrowDown')) - Number(held('w', 'ArrowUp'));
    return this.movement;
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  setTouch(key: string, down: boolean): void {
    if (down) this.touch.add(key);
    else this.touch.delete(key);
  }

  clear = (): void => {
    this.keys.clear();
    this.touch.clear();
  };

  dispose(): void {
    this.clear();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clear);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private onVisibility = (): void => {
    if (document.hidden) this.clear();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.isGameKey(event)) event.preventDefault();
    if (!event.repeat) this.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (this.isGameKey(event)) event.preventDefault();
    this.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  };

  private isGameKey(event: KeyboardEvent): boolean {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return false;
    return /^(arrow(up|down|left|right)|[wasderp])$/i.test(event.key) || event.key === ' ';
  }
}
