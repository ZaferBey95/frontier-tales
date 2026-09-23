// Derived numbers: effective attributes, health, job points, rewards, travel
// times and prices. All pure functions of the character and content data.

import {
  BASE_HP,
  ENERGY_REGEN_PER_MS,
  FISTS,
  HP_PER_LEVEL,
  HP_PER_STRENGTH,
  HP_REGEN_SHARE_PER_MS,
  JOB_DURATIONS,
  JOB_MONEY_PER_POINT,
  JOB_POINTS_CAP,
  JOB_XP_PER_POINT,
  MAX_ENERGY,
  SELL_SHARE_BASE,
  SELL_SHARE_MAX,
  SELL_SHARE_PER_CHARM,
  TRAVEL_MS_PER_UNIT,
} from './balance';
import { ATTRIBUTE_ORDER, CLASSES, LOCATIONS, SLOT_ORDER, getItem } from './content';
import type {
  Attributes,
  Character,
  ClassPerks,
  GameState,
  ItemDef,
  JobDef,
  JobDurationId,
  LocationId,
  WeaponStats,
} from './types';

export function perks(character: Character): ClassPerks {
  return CLASSES[character.classId].perks;
}

export function equippedItems(character: Character): ItemDef[] {
  const items: ItemDef[] = [];
  for (const slot of SLOT_ORDER) {
    const id = character.equipment[slot];
    if (id) items.push(getItem(id));
  }
  return items;
}

/** Attribute bonuses from class and equipment. */
export function attributeBonuses(character: Character): Attributes {
  const bonus: Attributes = { strength: 0, agility: 0, aim: 0, charm: 0 };
  const classBonus = CLASSES[character.classId].startBonus;
  for (const id of ATTRIBUTE_ORDER) bonus[id] += classBonus[id] ?? 0;
  for (const item of equippedItems(character)) {
    for (const id of ATTRIBUTE_ORDER) bonus[id] += item.bonuses?.[id] ?? 0;
  }
  return bonus;
}

export function effectiveAttributes(character: Character): Attributes {
  const bonus = attributeBonuses(character);
  const result = { ...character.attributes };
  for (const id of ATTRIBUTE_ORDER) result[id] = Math.max(0, result[id] + bonus[id]);
  return result;
}

export function maxHp(character: Character): number {
  const strength = effectiveAttributes(character).strength;
  const base = BASE_HP + (character.level - 1) * HP_PER_LEVEL + strength * HP_PER_STRENGTH;
  return Math.round(base * (1 + (perks(character).maxHp ?? 0)));
}

export function maxEnergy(): number {
  return MAX_ENERGY;
}

/** Health and energy after regenerating for `elapsedMs`. */
export function regenerate(character: Character, elapsedMs: number): { hp: number; energy: number } {
  const hpMax = maxHp(character);
  const elapsed = Math.max(0, elapsedMs);
  return {
    hp: Math.min(hpMax, character.hp + hpMax * HP_REGEN_SHARE_PER_MS * elapsed),
    energy: Math.min(MAX_ENERGY, character.energy + ENERGY_REGEN_PER_MS * elapsed),
  };
}

/** Current health and energy without changing the state. */
export function vitalsAt(state: GameState, now: number): { hp: number; energy: number; hpMax: number; energyMax: number } {
  const { hp, energy } = regenerate(state.character, now - state.settledAt);
  return { hp, energy, hpMax: maxHp(state.character), energyMax: MAX_ENERGY };
}

export function jobSkill(character: Character, job: JobDef): number {
  const attrs = effectiveAttributes(character);
  let skill = 0;
  for (const id of ATTRIBUTE_ORDER) skill += (job.weights[id] ?? 0) * attrs[id];
  return skill;
}

/** Skill above the job's difficulty. Negative means the job is too hard. */
export function jobPoints(character: Character, job: JobDef): number {
  return Math.floor(jobSkill(character, job) - job.difficulty);
}

export interface JobEstimate {
  points: number;
  canDo: boolean;
  money: number;
  xp: number;
  injuryChance: number;
  energy: number;
  ms: number;
}

export function jobInjuryChance(points: number, danger: number, rolls: number): number {
  const perRoll = danger / (1 + Math.max(0, points) * 0.15);
  return 1 - Math.pow(1 - perRoll, rolls);
}

/** Average money and xp a job pays for the given duration. */
export function estimateJob(character: Character, job: JobDef, durationId: JobDurationId): JobEstimate {
  const duration = JOB_DURATIONS[durationId];
  const points = jobPoints(character, job);
  const effective = Math.min(Math.max(points, 0), JOB_POINTS_CAP);
  const classPerks = perks(character);
  const money = job.money * duration.reward * (1 + effective * JOB_MONEY_PER_POINT) * (1 + (classPerks.jobMoney ?? 0));
  return {
    points,
    canDo: points >= 0,
    money: Math.round(money),
    xp: xpWithPerk(character, job.xp * duration.reward * (1 + effective * JOB_XP_PER_POINT)),
    injuryChance: jobInjuryChance(points, job.danger, Math.min(duration.dropRolls, 3)),
    energy: duration.energy,
    ms: duration.ms,
  };
}

export function distance(a: LocationId, b: LocationId): number {
  const from = LOCATIONS[a];
  const to = LOCATIONS[b];
  return Math.hypot(from.x - to.x, from.y - to.y);
}

export function travelSpeed(character: Character): number {
  const horseId = character.equipment.horse;
  const horseSpeed = horseId ? (getItem(horseId).speed ?? 1) : 1;
  return horseSpeed * (1 + (perks(character).travelSpeed ?? 0));
}

export function travelMs(character: Character, from: LocationId, to: LocationId): number {
  if (from === to) return 0;
  return Math.round((distance(from, to) * TRAVEL_MS_PER_UNIT) / travelSpeed(character));
}

export function weaponOf(character: Character): WeaponStats {
  const weaponId = character.equipment.weapon;
  return weaponId ? (getItem(weaponId).weapon ?? FISTS) : FISTS;
}

export function sellShare(character: Character): number {
  const charm = effectiveAttributes(character).charm;
  return Math.min(SELL_SHARE_MAX, SELL_SHARE_BASE + charm * SELL_SHARE_PER_CHARM);
}

/** What the shop pays for one of this item. Loot always sells at its value. */
export function sellPrice(character: Character, item: ItemDef): number {
  if (item.kind === 'loot') return item.value;
  return Math.max(1, Math.floor((item.value * sellShare(character)) / SELL_SHARE_BASE));
}

/** Experience after the class bonus. */
export function xpWithPerk(character: Character, base: number): number {
  return Math.round(base * (1 + (perks(character).xp ?? 0)));
}
