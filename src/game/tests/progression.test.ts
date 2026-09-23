import { describe, expect, it } from 'vitest';

import { ATTRIBUTE_POINTS_PER_LEVEL, MAX_ENERGY, START_MONEY, xpToNext } from '../balance';
import { maxHp, regenerate, vitalsAt } from '../formulas';
import { settle } from '../simulation';
import { grantXp, newGame, validateName } from '../state';
import { HOUR, T0, game } from './helpers';

describe('new game', () => {
  it('starts in town with full health and energy', () => {
    const state = game('lawman');
    expect(state.character.locationId).toBe('town');
    expect(state.character.money).toBe(START_MONEY);
    expect(state.character.energy).toBe(MAX_ENERGY);
    expect(state.character.hp).toBe(maxHp(state.character));
    expect(state.log).toHaveLength(1);
  });

  it('rejects names that are too short or too long', () => {
    expect(validateName(' a ')).not.toBeNull();
    expect(validateName('x'.repeat(21))).not.toBeNull();
    expect(validateName('  Kara Murat  ')).toBeNull();
    expect(() => newGame('a', 'scout', T0, 1)).toThrow();
    expect(newGame('  Kara Murat ', 'scout', T0, 1).character.name).toBe('Kara Murat');
  });

  it('gives the lawman more health', () => {
    expect(maxHp(game('lawman').character)).toBeGreaterThan(maxHp(game('rancher').character));
  });
});

describe('experience', () => {
  it('levels up, grants points and heals', () => {
    const state = game();
    state.character.hp = 5;
    const reached = grantXp(state, xpToNext(1) + xpToNext(2) + 3, T0);
    expect(reached).toEqual([2, 3]);
    expect(state.character.level).toBe(3);
    expect(state.character.xp).toBe(3);
    expect(state.character.attributePoints).toBe(3 + 2 * ATTRIBUTE_POINTS_PER_LEVEL);
    expect(state.character.hp).toBe(maxHp(state.character));
    expect(state.log[0].kind).toBe('level');
  });

  it('needs more experience for every level', () => {
    for (let level = 1; level < 30; level++) expect(xpToNext(level + 1)).toBeGreaterThan(xpToNext(level));
  });
});

describe('regeneration', () => {
  it('refills energy over time up to the maximum', () => {
    const state = game();
    state.character.energy = 10;
    expect(regenerate(state.character, HOUR).energy).toBeCloseTo(35);
    expect(regenerate(state.character, 10 * HOUR).energy).toBe(MAX_ENERGY);
  });

  it('shows current vitals without changing the save', () => {
    const state = game();
    state.character.energy = 0;
    const vitals = vitalsAt(state, T0 + 2 * HOUR);
    expect(vitals.energy).toBeCloseTo(50);
    expect(state.character.energy).toBe(0);
  });

  it('settles regeneration into the save', () => {
    const state = game();
    state.character.energy = 0;
    const later = settle(state, T0 + HOUR);
    expect(later.character.energy).toBeCloseTo(25);
    expect(later.settledAt).toBe(T0 + HOUR);
    expect(state.character.energy).toBe(0);
  });
});
