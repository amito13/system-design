/**
 * localStorage wrapper (PRD §11.2). Every key is namespaced with `sc:`, every access is
 * try/catch guarded, and the app keeps working (in memory) when storage is blocked.
 */
export const STORAGE_PREFIX = 'sc:';

const memory = new Map<string, string>();

function backend(): Storage | null {
  try {
    const s = globalThis.localStorage;
    const probe = `${STORAGE_PREFIX}__probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function rawGet(fullKey: string): string | null {
  const s = backend();
  if (!s) return memory.get(fullKey) ?? null;
  try {
    return s.getItem(fullKey);
  } catch {
    return memory.get(fullKey) ?? null;
  }
}

function rawSet(fullKey: string, value: string): void {
  memory.set(fullKey, value);
  const s = backend();
  if (!s) return;
  try {
    s.setItem(fullKey, value);
  } catch {
    /* quota or blocked: memory copy still serves this session */
  }
}

function rawRemove(fullKey: string): void {
  memory.delete(fullKey);
  try {
    backend()?.removeItem(fullKey);
  } catch {
    /* ignore */
  }
}

function allFullKeys(): string[] {
  const keys = new Set<string>([...memory.keys()].filter((k) => k.startsWith(STORAGE_PREFIX)));
  const s = backend();
  if (s) {
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k?.startsWith(STORAGE_PREFIX)) keys.add(k);
      }
    } catch {
      /* ignore */
    }
  }
  return [...keys];
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    const raw = rawGet(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    try {
      return (JSON.parse(raw) as T) ?? fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    rawSet(STORAGE_PREFIX + key, JSON.stringify(value));
  },

  remove(key: string): void {
    rawRemove(STORAGE_PREFIX + key);
  },

  /** Keys without the prefix. */
  keys(): string[] {
    return allFullKeys().map((k) => k.slice(STORAGE_PREFIX.length));
  },

  /** Snapshot of everything we own, for Settings → Data → Export. */
  exportAll(): {
    app: 'scalecanvas';
    version: 1;
    exportedAt: string;
    data: Record<string, unknown>;
  } {
    const data: Record<string, unknown> = {};
    for (const key of storage.keys()) data[key] = storage.get<unknown>(key, null);
    return { app: 'scalecanvas', version: 1, exportedAt: new Date().toISOString(), data };
  },

  /** Restore an export. Throws on a file that isn't ours. */
  importAll(payload: unknown, mode: 'merge' | 'replace'): number {
    if (
      !payload ||
      typeof payload !== 'object' ||
      (payload as { app?: unknown }).app !== 'scalecanvas' ||
      typeof (payload as { data?: unknown }).data !== 'object'
    ) {
      throw new Error('Not a ScaleCanvas export file');
    }
    if (mode === 'replace') storage.clearAll();
    const data = (payload as { data: Record<string, unknown> }).data;
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      if (!/^[\w:.-]{1,120}$/.test(key)) continue;
      storage.set(key, value);
      count++;
    }
    return count;
  },

  clearAll(): void {
    for (const k of allFullKeys()) rawRemove(k);
  },
};
