import type { Vec } from './types';

export interface Move {
  id: string;
  from: Vec;
  to: Vec;
}

export interface MoveEntry {
  moves: Move[];
  /** Entries pushed with the same tag within `coalesceMs` merge (keyboard nudges). */
  tag?: string;
  at: number;
}

const same = (a: Vec, b: Vec) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;

/** Undo/redo for layout changes (PRD AC-C4: at least 50 steps). */
export class MoveHistory {
  private past: MoveEntry[] = [];
  private future: MoveEntry[] = [];

  constructor(
    private limit = 200,
    private coalesceMs = 600,
  ) {}

  push(moves: Move[], tag?: string, now = Date.now()): void {
    const real = moves.filter((m) => !same(m.from, m.to));
    if (real.length === 0) return;
    const last = this.past[this.past.length - 1];
    if (
      tag &&
      last?.tag === tag &&
      now - last.at <= this.coalesceMs &&
      last.moves.length === real.length &&
      real.every((m) => last.moves.some((l) => l.id === m.id))
    ) {
      last.moves = last.moves.map((l) => ({ ...l, to: real.find((m) => m.id === l.id)!.to }));
      last.at = now;
    } else {
      this.past.push({ moves: real, tag, at: now });
      if (this.past.length > this.limit) this.past.shift();
    }
    this.future = [];
  }

  /** Returns the positions to restore, or null. */
  undo(): Map<string, Vec> | null {
    const e = this.past.pop();
    if (!e) return null;
    this.future.push(e);
    return new Map(e.moves.map((m) => [m.id, m.from]));
  }

  redo(): Map<string, Vec> | null {
    const e = this.future.pop();
    if (!e) return null;
    this.past.push(e);
    return new Map(e.moves.map((m) => [m.id, m.to]));
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
