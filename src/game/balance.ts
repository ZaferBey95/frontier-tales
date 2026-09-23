// Tunable numbers in one place. Durations are in milliseconds.

import type { JobDurationDef, JobDurationId } from './types';

export const SAVE_VERSION = 2;

export const START_MONEY = 30;
export const START_ATTRIBUTE_POINTS = 3;
export const ATTRIBUTE_POINTS_PER_LEVEL = 2;
export const MAX_LEVEL = 50;

export const MAX_ENERGY = 100;
/** Full energy bar in 4 hours. */
export const ENERGY_REGEN_PER_MS = MAX_ENERGY / (4 * 60 * 60 * 1000);
/** Full health bar in 3 hours (as a share of max health). */
export const HP_REGEN_SHARE_PER_MS = 1 / (3 * 60 * 60 * 1000);

export const BASE_HP = 100;
export const HP_PER_LEVEL = 10;
export const HP_PER_STRENGTH = 5;

export const MAX_QUEUE = 3;
export const MAX_LOG = 60;

/** Travel time per map unit on foot. */
export const TRAVEL_MS_PER_UNIT = 5000;

export const JOB_DURATIONS: Record<JobDurationId, JobDurationDef> = {
  short: { id: 'short', label: '30 sn', ms: 30 * 1000, energy: 2, reward: 1, dropRolls: 1 },
  medium: { id: 'medium', label: '10 dk', ms: 10 * 60 * 1000, energy: 6, reward: 4, dropRolls: 3 },
  long: { id: 'long', label: '1 saat', ms: 60 * 60 * 1000, energy: 15, reward: 11, dropRolls: 8 },
};
export const JOB_DURATION_ORDER: JobDurationId[] = ['short', 'medium', 'long'];

/** Job points above the requirement stop paying off after this. */
export const JOB_POINTS_CAP = 25;
export const JOB_MONEY_PER_POINT = 0.04;
export const JOB_XP_PER_POINT = 0.02;
/** Random spread of job money, e.g. 0.2 = ±20%. */
export const JOB_MONEY_SPREAD = 0.2;

export const REST_MS = 10 * 60 * 1000;
export const REST_ENERGY = 50;
export const REST_HP_SHARE = 0.6;
export function restCost(level: number): number {
  return 5 + level * 2;
}

export const DUEL_ENERGY = 10;
/** Share of max health needed to start a duel. */
export const DUEL_MIN_HP_SHARE = 0.2;
export const DUEL_MAX_ROUNDS = 30;
/** Share of money lost when knocked out. */
export const DUEL_LOSS_MONEY_SHARE = 0.1;
export const FISTS = { min: 2, max: 5 };

export const SELL_SHARE_BASE = 0.4;
export const SELL_SHARE_PER_CHARM = 0.01;
export const SELL_SHARE_MAX = 0.6;

/** Experience needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(25 * Math.pow(level, 1.6));
}
