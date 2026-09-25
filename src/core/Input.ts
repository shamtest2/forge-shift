export type Control = 'forward' | 'backward' | 'left' | 'right' | 'shift' | 'pause' | 'restart';

const bindings: Record<string, Control> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'shift', Space: 'shift',
  Escape: 'pause', KeyP: 'pause',
  KeyR: 'restart', Enter: 'restart',
};

/** Keyboard and touch share one action map. Input is cleared on blur so keys cannot stick. */
export class Input {
  private readonly heldKeys = new Set<string>();
  private readonly touchCounts = new Map<Control, number>();
  private readonly pending = new Set<Control>();
  onGesture?: () => void;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const control = bindings[event.code];
    if (!control) return;
    if (event.target instanceof HTMLElement && /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)
      && (event.code === 'Enter' || event.code === 'Space')) return;
    event.preventDefault();
    if (!this.heldKeys.has(event.code)) {
      this.heldKeys.add(event.code);
      if (control === 'shift' || control === 'pause' || control === 'restart') this.pending.add(control);
      this.onGesture?.();
    }
  };
  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (bindings[event.code]) {
      event.preventDefault();
      this.heldKeys.delete(event.code);
    }
  };
  private readonly onBlur = () => this.clear();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private readonly onVisibility = () => { if (document.hidden) this.clear(); };

  private active(control: Control): boolean {
    if ((this.touchCounts.get(control) ?? 0) > 0) return true;
    for (const code in bindings) {
      if (bindings[code] === control && this.heldKeys.has(code)) return true;
    }
    return false;
  }

  get horizontal(): number { return Number(this.active('right')) - Number(this.active('left')); }
  get vertical(): number { return Number(this.active('forward')) - Number(this.active('backward')); }

  /** One-shot actions; a held key cannot repeatedly trigger an interaction. */
  consume(control: 'shift' | 'pause' | 'restart'): boolean {
    const result = this.pending.delete(control);
    return result;
  }

  press(control: Control): void {
    const count = this.touchCounts.get(control) ?? 0;
    this.touchCounts.set(control, count + 1);
    if (count === 0 && (control === 'shift' || control === 'pause' || control === 'restart')) this.pending.add(control);
    this.onGesture?.();
  }
  release(control: Control): void {
    const count = this.touchCounts.get(control) ?? 0;
    if (count <= 1) this.touchCounts.delete(control);
    else this.touchCounts.set(control, count - 1);
  }
  trigger(control: 'shift' | 'pause' | 'restart'): void {
    this.pending.add(control);
    this.onGesture?.();
  }
  clear(): void { this.heldKeys.clear(); this.touchCounts.clear(); this.pending.clear(); }
  dispose(): void {
    this.clear();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
