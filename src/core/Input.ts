export type Action = 'interact' | 'pause' | 'restart' | 'mute';
type Direction = 'forward' | 'backward' | 'left' | 'right';
type Control = Direction | Action;

// Both keyboard layouts enter exactly the same digital control path.
const keys: Record<string, Control> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'interact', Space: 'interact',
  Escape: 'pause', KeyP: 'pause',
  KeyR: 'restart', KeyM: 'mute',
};

export class Input {
  private readonly down = new Set<string>();
  private readonly touch = new Map<number, Control>();
  private readonly actions = new Set<Action>();

  constructor(private readonly root: HTMLElement) {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', this.onVisibility);
    root.addEventListener('pointerdown', this.pointerDown);
    root.addEventListener('pointerup', this.pointerEnd);
    root.addEventListener('pointercancel', this.pointerEnd);
    root.addEventListener('lostpointercapture', this.pointerEnd);
  }

  get x(): number {
    return Number(this.held('right')) - Number(this.held('left'));
  }

  get z(): number {
    return Number(this.held('backward')) - Number(this.held('forward'));
  }

  consume(action: Action): boolean {
    if (!this.actions.has(action)) return false;
    this.actions.delete(action);
    return true;
  }

  clear = (): void => {
    this.down.clear();
    this.touch.clear();
    this.actions.clear();
  };

  dispose(): void {
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.clear);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.root.removeEventListener('pointerdown', this.pointerDown);
    this.root.removeEventListener('pointerup', this.pointerEnd);
    this.root.removeEventListener('pointercancel', this.pointerEnd);
    this.root.removeEventListener('lostpointercapture', this.pointerEnd);
    this.clear();
  }

  private held(control: Direction): boolean {
    for (const code of this.down) if (keys[code] === control) return true;
    for (const active of this.touch.values()) if (active === control) return true;
    return false;
  }

  private keyDown = (event: KeyboardEvent): void => {
    const control = keys[event.code];
    if (!control || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault(); // Especially important for Space and the four arrows.
    if (this.down.has(event.code)) return;
    this.down.add(event.code);
    if (control === 'interact' || control === 'pause' || control === 'restart' || control === 'mute') {
      this.actions.add(control);
    }
  };

  private keyUp = (event: KeyboardEvent): void => {
    if (!keys[event.code]) return;
    event.preventDefault();
    this.down.delete(event.code);
  };

  private onVisibility = (): void => {
    if (document.hidden) this.clear();
  };

  private pointerDown = (event: PointerEvent): void => {
    const target = (event.target as Element).closest<HTMLElement>('[data-control]');
    if (!target) return;
    const control = target.dataset.control as Control;
    if (!Object.values(keys).includes(control)) return;
    event.preventDefault();
    target.setPointerCapture(event.pointerId);
    this.touch.set(event.pointerId, control);
    target.classList.add('pressed');
    if (control === 'interact' || control === 'pause' || control === 'restart' || control === 'mute') {
      this.actions.add(control);
    }
  };

  private pointerEnd = (event: PointerEvent): void => {
    const control = this.touch.get(event.pointerId);
    if (!control) return;
    this.touch.delete(event.pointerId);
    const target = event.target as HTMLElement;
    target.classList.remove('pressed');
  };
}
