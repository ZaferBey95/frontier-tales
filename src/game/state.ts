// Creating a new game plus small helpers that mutate a cloned draft state.
// Public actions always clone first, so callers never see partial updates.

import {
  ATTRIBUTE_POINTS_PER_LEVEL,
  MAX_ENERGY,
  MAX_LEVEL,
  MAX_LOG,
  SAVE_VERSION,
  START_ATTRIBUTE_POINTS,
  START_MONEY,
  xpToNext,
} from './balance';
import { CLASSES } from './content';
import { maxHp } from './formulas';
import { nextSeed } from './rng';
import type { ClassId, GameState, LogEntry, Task } from './types';

export const NAME_MIN = 2;
export const NAME_MAX = 20;

export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < NAME_MIN) return `İsim en az ${NAME_MIN} harf olmalı.`;
  if (name.length > NAME_MAX) return `İsim en fazla ${NAME_MAX} harf olabilir.`;
  return null;
}

export function newGame(rawName: string, classId: ClassId, now: number, seed: number): GameState {
  const error = validateName(rawName);
  if (error) throw new Error(error);
  if (!CLASSES[classId]) throw new Error(`Unknown class: ${classId}`);

  const state: GameState = {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    nextId: 1,
    createdAt: now,
    settledAt: now,
    character: {
      name: rawName.trim(),
      classId,
      level: 1,
      xp: 0,
      money: START_MONEY,
      hp: 0,
      energy: MAX_ENERGY,
      attributes: { strength: 1, agility: 1, aim: 1, charm: 1 },
      attributePoints: START_ATTRIBUTE_POINTS,
      locationId: 'town',
      inventory: {},
      equipment: { body: 'patched_shirt' },
    },
    queue: [],
    quests: {},
    log: [],
    stats: { jobsDone: 0, duelsWon: 0, duelsLost: 0, moneyEarned: 0 },
  };
  state.character.hp = maxHp(state.character);
  addLog(state, {
    at: now,
    kind: 'system',
    icon: '🌵',
    title: 'Coyote Creek’e vardın',
    lines: [
      'Posta arabası seni kasabanın ortasına bırakıp tozu dumana katarak uzaklaştı.',
      'Şerif Walt Hollis’in seninle konuşmak istediği söyleniyor. Görevler sekmesine bir göz at.',
    ],
  });
  return state;
}

export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function takeSeed(state: GameState): number {
  const [value, next] = nextSeed(state.seed);
  state.seed = next;
  return value;
}

export function newId(state: GameState, prefix: string): string {
  const id = `${prefix}${state.nextId}`;
  state.nextId += 1;
  return id;
}

export function addLog(state: GameState, entry: Omit<LogEntry, 'id' | 'read'>): string {
  const id = newId(state, 'log');
  state.log.unshift({ ...entry, id, read: false });
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
  return id;
}

export function addItem(state: GameState, itemId: string, count = 1): void {
  const inventory = state.character.inventory;
  inventory[itemId] = (inventory[itemId] ?? 0) + count;
}

export function removeItem(state: GameState, itemId: string, count = 1): boolean {
  const inventory = state.character.inventory;
  const have = inventory[itemId] ?? 0;
  if (have < count) return false;
  if (have === count) delete inventory[itemId];
  else inventory[itemId] = have - count;
  return true;
}

/** Adds experience and handles level ups. Returns the new levels reached. */
export function grantXp(state: GameState, amount: number, at: number): number[] {
  const character = state.character;
  const reached: number[] = [];
  if (amount <= 0 || character.level >= MAX_LEVEL) return reached;
  character.xp += amount;
  while (character.level < MAX_LEVEL && character.xp >= xpToNext(character.level)) {
    character.xp -= xpToNext(character.level);
    character.level += 1;
    character.attributePoints += ATTRIBUTE_POINTS_PER_LEVEL;
    character.hp = maxHp(character);
    reached.push(character.level);
  }
  if (character.level >= MAX_LEVEL) character.xp = 0;
  for (const level of reached) {
    addLog(state, {
      at,
      kind: 'level',
      icon: '🎉',
      title: `Seviye atladın: ${level}. seviye!`,
      lines: [`+${ATTRIBUTE_POINTS_PER_LEVEL} özellik puanı kazandın.`, 'Canın tamamen doldu.'],
    });
  }
  return reached;
}

export function grantMoney(state: GameState, amount: number): void {
  state.character.money += amount;
  if (amount > 0) state.stats.moneyEarned += amount;
}

/** Where the character ends up after every queued task has finished. */
export function projectedLocation(state: GameState) {
  for (let i = state.queue.length - 1; i >= 0; i--) {
    const task = state.queue[i];
    if (task.kind === 'travel') return task.to;
  }
  return state.character.locationId;
}

export function activeTask(state: GameState): Task | undefined {
  return state.queue[0];
}

export function isTravelling(state: GameState): boolean {
  return state.queue[0]?.kind === 'travel';
}

/** Start and end time of every queued task. */
export function taskTimes(state: GameState): { task: Task; start: number; end: number }[] {
  const times: { task: Task; start: number; end: number }[] = [];
  let cursor = state.settledAt;
  for (const task of state.queue) {
    const start = task.startedAt ?? cursor;
    const end = start + task.durationMs;
    times.push({ task, start, end });
    cursor = end;
  }
  return times;
}
