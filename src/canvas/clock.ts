type Tick = (dtMs: number, now: number) => void;

/**
 * One requestAnimationFrame loop per canvas (PRD §6.5). Pausing it freezes packets and every
 * JS tween; CSS animations are frozen separately with the `.sc-paused` class.
 * dt is clamped (100 ms) so a backgrounded tab doesn't teleport packets when it returns.
 */
export class AnimationClock {
  private subs = new Set<Tick>();
  private always = new Set<Tick>();
  private raf = 0;
  private last = 0;
  private pausedListeners = new Set<() => void>();
  paused = false;
  speed = 1;

  subscribe(fn: Tick, opts: { always?: boolean } = {}): () => void {
    (opts.always ? this.always : this.subs).add(fn);
    this.ensure();
    return () => {
      this.subs.delete(fn);
      this.always.delete(fn);
      if (this.subs.size === 0 && this.always.size === 0) this.stop();
    };
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.pausedListeners.forEach((l) => l());
  }

  onPausedChange(l: () => void): () => void {
    this.pausedListeners.add(l);
    return () => this.pausedListeners.delete(l);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /**
   * Run one frame by hand with a fixed dt. Used by tests and the dev handle (window.__sc) —
   * e.g. when the page is in a background tab where requestAnimationFrame doesn't fire.
   */
  advance(dtMs: number): void {
    const now = performance.now();
    this.always.forEach((fn) => fn(dtMs, now));
    if (!this.paused) this.subs.forEach((fn) => fn(dtMs * this.speed, now));
  }

  dispose(): void {
    this.stop();
    this.subs.clear();
    this.always.clear();
    this.pausedListeners.clear();
  }

  private ensure() {
    if (this.raf || typeof requestAnimationFrame === 'undefined') return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (now: number) => {
    const raw = Math.min(100, Math.max(0, now - this.last));
    this.last = now;
    this.always.forEach((fn) => fn(raw, now));
    if (!this.paused) {
      const dt = raw * this.speed;
      this.subs.forEach((fn) => fn(dt, now));
    }
    this.raf = requestAnimationFrame(this.frame);
  };
}
