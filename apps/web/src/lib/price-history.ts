'use client';

const STORAGE_KEY = 'devigo:pricehistory';
const MAX_POINTS = 12;
const MAX_RUNNERS = 400;
/** Ignore repeat samples closer together than this — the feed itself caches 5 minutes. */
const MIN_GAP_MS = 4 * 60 * 1000;

interface Sample {
  readonly t: number;
  readonly p: number;
}

type Store = Record<string, Sample[]>;

const load = (): Store => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const persist = (store: Store): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or unavailable — sparklines are best-effort
  }
};

/**
 * Appends the current fair probability of each runner to its local history.
 * The line each sparkline draws is the movement THIS device has actually
 * observed since the user started using the app — never synthesised.
 */
export const recordFairProbabilities = (
  samples: ReadonlyArray<{ runnerId: string; fairProbability: number }>,
): Store => {
  const store = load();
  const now = Date.now();
  for (const { runnerId, fairProbability } of samples) {
    if (!(fairProbability > 0)) continue;
    const points = store[runnerId] ?? [];
    const last = points[points.length - 1];
    if (last && now - last.t < MIN_GAP_MS) continue;
    store[runnerId] = [...points, { t: now, p: fairProbability }].slice(-MAX_POINTS);
  }
  // Bound growth: keep the most recently touched runners only.
  const keys = Object.keys(store);
  if (keys.length > MAX_RUNNERS) {
    const ranked = keys
      .map((k) => ({ k, t: store[k]?.[store[k]!.length - 1]?.t ?? 0 }))
      .sort((a, b) => b.t - a.t)
      .slice(0, MAX_RUNNERS);
    const trimmed: Store = {};
    for (const { k } of ranked) trimmed[k] = store[k] as Sample[];
    persist(trimmed);
    return trimmed;
  }
  persist(store);
  return store;
};

export interface Sparkline {
  /** SVG path in a 108x24 viewBox. */
  readonly d: string;
  /** Probability change from first to last observed point. */
  readonly delta: number;
}

/**
 * Builds an SVG path from observed history. Returns null below three points —
 * a two-point "trend" is noise, and an invented curve would be a lie.
 */
export const sparklineFor = (store: Store, runnerId: string): Sparkline | null => {
  const points = store[runnerId];
  if (!points || points.length < 3) return null;
  const values = points.map((s) => s.p);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const d = values
    .map((p, i) => {
      const x = ((i / (values.length - 1)) * 108).toFixed(1);
      const y = (22 - ((p - lo) / span) * 20).toFixed(1);
      return `${i ? 'L' : 'M'}${x} ${y}`;
    })
    .join(' ');
  return { d, delta: (values[values.length - 1] as number) - (values[0] as number) };
};
