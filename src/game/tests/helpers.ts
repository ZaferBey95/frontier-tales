import { expect } from 'vitest';

import { newGame } from '../state';
import type { ActionResult, ClassId, GameState } from '../types';

export const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);
export const SEC = 1000;
export const MIN = 60 * SEC;
export const HOUR = 60 * MIN;

export function game(classId: ClassId = 'rancher', seed = 42): GameState {
  return newGame('Test Kovboy', classId, T0, seed);
}

/** Unwraps a successful action result, failing the test otherwise. */
export function ok(result: ActionResult): GameState {
  if (!result.ok) throw new Error(`Expected success, got: ${result.error}`);
  return result.state;
}

export function err(result: ActionResult): string {
  expect(result.ok).toBe(false);
  return result.ok ? '' : result.error;
}

/** A character strong enough for any job or duel. */
export function hero(state: GameState): GameState {
  state.character.level = 20;
  state.character.attributes = { strength: 30, agility: 30, aim: 30, charm: 30 };
  state.character.hp = 10_000;
  state.character.equipment.weapon = 'long_rifle';
  return state;
}
