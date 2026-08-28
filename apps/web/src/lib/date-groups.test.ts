import { describe, expect, it } from 'vitest';
import { withinWindow, type MatchWindow } from '@/lib/date-groups';

/** An ISO timestamp `days` from now at the given local hour. */
const at = (days: number, hour: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const windows: ReadonlyArray<MatchWindow> = ['today', 'tomorrow', 'threeDays', 'all'];

describe('withinWindow', () => {
  it('puts tonight under today, however late it is browsed', () => {
    expect(withinWindow(at(0, 23), 'today')).toBe(true);
    expect(withinWindow(at(0, 23), 'tomorrow')).toBe(false);
  });

  it('counts calendar days, not hours from now', () => {
    // 01:00 tomorrow is barely hours away but is not today.
    expect(withinWindow(at(1, 1), 'today')).toBe(false);
    expect(withinWindow(at(1, 1), 'tomorrow')).toBe(true);
  });

  it('reaches two days out for the three-day window', () => {
    expect(withinWindow(at(2, 12), 'threeDays')).toBe(true);
    expect(withinWindow(at(3, 12), 'threeDays')).toBe(false);
  });

  it('nests outward: today and tomorrow both sit inside the three-day window', () => {
    expect(withinWindow(at(0, 12), 'threeDays')).toBe(true);
    expect(withinWindow(at(1, 12), 'threeDays')).toBe(true);
  });

  it('hides fixtures that already kicked off, except under all', () => {
    for (const window of windows) {
      expect(withinWindow(at(-1, 12), window)).toBe(window === 'all');
    }
  });

  it('shows everything under all', () => {
    for (const days of [-5, 0, 1, 30]) {
      expect(withinWindow(at(days, 12), 'all')).toBe(true);
    }
  });
});
