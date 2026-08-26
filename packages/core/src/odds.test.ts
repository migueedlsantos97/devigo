import { describe, expect, it } from 'vitest';
import {
  OddsError, americanToDecimal, bookMargin, decimalToAmerican, decimalToImplied,
  fractionalToDecimal, impliedToDecimal, roundTo,
} from './odds.js';

describe('odds conversion', () => {
  it('converts decimal to implied probability', () => {
    expect(decimalToImplied(2)).toBe(0.5);
    expect(roundTo(decimalToImplied(1.91))).toBe(0.5236);
  });

  it('round-trips implied to decimal', () => {
    expect(impliedToDecimal(0.5)).toBe(2);
    expect(roundTo(impliedToDecimal(decimalToImplied(3.4)), 6)).toBe(3.4);
  });

  it('converts american to decimal both signs', () => {
    expect(americanToDecimal(150)).toBe(2.5);
    expect(roundTo(americanToDecimal(-110))).toBe(1.9091);
  });

  it('converts decimal to american both sides of evens', () => {
    expect(decimalToAmerican(2.5)).toBe(150);
    expect(Math.round(decimalToAmerican(1.9091))).toBe(-110);
    expect(decimalToAmerican(2)).toBe(100);
  });

  it('parses fractional odds', () => {
    expect(fractionalToDecimal('7/2')).toBe(4.5);
    expect(fractionalToDecimal(' 1 / 1 ')).toBe(2);
  });

  it('computes book margin', () => {
    expect(roundTo(bookMargin([1.91, 1.91]))).toBe(0.0471);
  });

  it('rejects invalid input', () => {
    expect(() => decimalToImplied(1)).toThrow(OddsError);
    expect(() => decimalToImplied(Number.NaN)).toThrow(/finite/);
    expect(() => impliedToDecimal(0)).toThrow(OddsError);
    expect(() => impliedToDecimal(1.2)).toThrow(OddsError);
    expect(() => americanToDecimal(50)).toThrow(OddsError);
    expect(() => americanToDecimal(Number.POSITIVE_INFINITY)).toThrow(OddsError);
    expect(() => decimalToAmerican(0.5)).toThrow(OddsError);
    expect(() => fractionalToDecimal('evens')).toThrow(OddsError);
    expect(() => fractionalToDecimal('7/0')).toThrow(/denominator/);
    expect(() => bookMargin([])).toThrow(OddsError);
  });
});
