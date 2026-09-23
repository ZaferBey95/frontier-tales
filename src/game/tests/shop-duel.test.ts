import { describe, expect, it } from 'vitest';

import { buyItem, duel, equipItem, sellItem, spendAttributePoint, startTravel, unequipItem } from '../actions';
import { DUEL_ENERGY, MAX_ENERGY } from '../balance';
import { getItem, getNpc } from '../content';
import { hitChance, simulateDuel } from '../duel';
import { effectiveAttributes, maxHp, sellPrice } from '../formulas';
import { settle } from '../simulation';
import { HOUR, T0, err, game, hero, ok } from './helpers';

describe('shop', () => {
  it('sells items in town', () => {
    const state = ok(buyItem(game(), 'straw_hat', T0));
    expect(state.character.money).toBe(30 - 15);
    expect(state.character.inventory.straw_hat).toBe(1);
  });

  it('checks money, level and location', () => {
    expect(err(buyItem(game(), 'six_shooter', T0))).toMatch(/seviye/);
    const poor = game();
    poor.character.money = 5;
    expect(err(buyItem(poor, 'straw_hat', T0))).toMatch(/paran/);
    const away = ok(startTravel(game(), 'ranch', T0));
    expect(err(buyItem(away, 'straw_hat', T0))).toMatch(/Dükkân/);
    expect(err(buyItem(game(), 'silver_revolver', T0))).toMatch(/satılmıyor/);
  });

  it('buys back items and pays more to charming characters', () => {
    let state = ok(buyItem(game(), 'straw_hat', T0));
    const price = sellPrice(state.character, getItem('straw_hat'));
    state = ok(sellItem(state, 'straw_hat', 1, T0));
    expect(state.character.money).toBe(15 + price);
    expect(state.character.inventory.straw_hat).toBeUndefined();
    expect(err(sellItem(state, 'straw_hat', 1, T0))).toMatch(/o kadar/);

    const charming = game();
    charming.character.attributes.charm = 20;
    expect(sellPrice(charming.character, getItem('six_shooter'))).toBeGreaterThan(
      sellPrice(game().character, getItem('six_shooter')),
    );
  });
});

describe('equipment', () => {
  it('swaps items between the bag and the slot', () => {
    let state = ok(buyItem(game(), 'straw_hat', T0));
    const charmBefore = effectiveAttributes(state.character).charm;
    state = ok(equipItem(state, 'straw_hat', T0));
    expect(state.character.equipment.head).toBe('straw_hat');
    expect(state.character.inventory.straw_hat).toBeUndefined();
    expect(effectiveAttributes(state.character).charm).toBe(charmBefore + 1);

    state.character.inventory.felt_hat = 1;
    state.character.level = 3;
    state = ok(equipItem(state, 'felt_hat', T0));
    expect(state.character.inventory.straw_hat).toBe(1);

    state = ok(unequipItem(state, 'head', T0));
    expect(state.character.equipment.head).toBeUndefined();
    expect(state.character.inventory.felt_hat).toBe(1);
  });

  it('respects item levels', () => {
    const state = game();
    state.character.inventory.mustang = 1;
    expect(err(equipItem(state, 'mustang', T0))).toMatch(/seviye/);
  });

  it('keeps health within the new maximum after taking something off', () => {
    let state = game();
    state.character.hp = maxHp(state.character);
    state = ok(unequipItem(state, 'body', T0));
    expect(state.character.hp).toBe(maxHp(state.character));
  });
});

describe('attributes', () => {
  it('spends points until none are left', () => {
    let state = game();
    for (let i = 0; i < 3; i++) state = ok(spendAttributePoint(state, 'aim', T0));
    expect(state.character.attributes.aim).toBe(4);
    expect(err(spendAttributePoint(state, 'aim', T0))).toMatch(/puan/);
  });
});

describe('duels', () => {
  it('keeps hit chances within limits', () => {
    expect(hitChance(100, 0)).toBe(0.95);
    expect(hitChance(0, 100)).toBe(0.1);
    expect(hitChance(5, 5)).toBeCloseTo(0.55);
  });

  it('is decided by the seed', () => {
    const character = game().character;
    const npc = getNpc('drunk_cowboy');
    expect(simulateDuel(character, 100, npc, 7)).toEqual(simulateDuel(character, 100, npc, 7));
  });

  it('pays out to the winner', () => {
    const start = hero(game());
    const result = duel(start, 'drunk_cowboy', T0);
    const state = ok(result);
    expect(state.stats.duelsWon).toBe(1);
    expect(state.character.money).toBeGreaterThan(start.character.money);
    expect(state.character.energy).toBe(MAX_ENERGY - DUEL_ENERGY);
    expect(result.ok && result.logId).toBe(state.log.find((entry) => entry.kind === 'duel')?.id);
  });

  it('knocks out the loser and takes some of their money', () => {
    const start = game();
    start.character.locationId = 'canyon';
    start.character.money = 100;
    const state = ok(duel(start, 'snake_carver', T0));
    expect(state.stats.duelsLost).toBe(1);
    expect(state.character.hp).toBe(1);
    expect(state.character.money).toBe(90);
    expect(err(duel(state, 'snake_carver', T0))).toMatch(/yaralı/);
  });

  it('needs the right place, free hands and energy', () => {
    expect(err(duel(game(), 'bandit_rookie', T0))).toMatch(/bölgesinde/);
    const busy = ok(startTravel(game(), 'ranch', T0));
    expect(err(duel(busy, 'drunk_cowboy', T0))).toMatch(/sıradaki/);
    const tired = game();
    tired.character.energy = 3;
    expect(err(duel(tired, 'drunk_cowboy', T0))).toMatch(/enerji/);
  });

  it('lets health come back after a lost duel', () => {
    const start = game();
    start.character.locationId = 'canyon';
    const lost = ok(duel(start, 'snake_carver', T0));
    const healed = settle(lost, T0 + 3 * HOUR);
    expect(healed.character.hp).toBe(maxHp(healed.character));
  });
});
