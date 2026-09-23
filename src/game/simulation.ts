// Moves the game forward in time: regenerates health and energy and resolves
// every queued task whose end time has passed, in order.

import {
  JOB_DURATIONS,
  JOB_DURATION_ORDER,
  JOB_MONEY_SPREAD,
  MAX_ENERGY,
  REST_ENERGY,
  REST_HP_SHARE,
} from './balance';
import { LOCATIONS, getItem, getJob } from './content';
import { estimateJob, jobInjuryChance, maxHp, perks, regenerate } from './formulas';
import { recordQuestEvent } from './quests';
import { createRng, randomBetween } from './rng';
import { addItem, addLog, cloneState, grantMoney, grantXp } from './state';
import type { GameState, JobTask, RestTask, Task, TravelTask } from './types';

/** True when at least one queued task has finished by `now`. */
export function needsSettle(state: GameState, now: number): boolean {
  const first = state.queue[0];
  return !!first && first.startedAt !== undefined && first.startedAt + first.durationMs <= now;
}

/** Regenerates the draft up to `time`. */
export function regenTo(state: GameState, time: number): void {
  if (time <= state.settledAt) return;
  const { hp, energy } = regenerate(state.character, time - state.settledAt);
  state.character.hp = hp;
  state.character.energy = energy;
  state.settledAt = time;
}

/** Returns a new state brought forward to `now`. */
export function settle(state: GameState, now: number): GameState {
  const draft = cloneState(state);
  while (draft.queue.length > 0) {
    const task = draft.queue[0];
    if (task.startedAt === undefined) task.startedAt = draft.settledAt;
    const end = task.startedAt + task.durationMs;
    if (end > now) break;
    regenTo(draft, end);
    draft.queue.shift();
    resolveTask(draft, task, end);
    if (draft.queue[0]) draft.queue[0].startedAt = end;
  }
  regenTo(draft, now);
  return draft;
}

function resolveTask(state: GameState, task: Task, at: number): void {
  switch (task.kind) {
    case 'travel':
      resolveTravel(state, task, at);
      break;
    case 'job':
      resolveJob(state, task, at);
      break;
    case 'rest':
      resolveRest(state, task, at);
      break;
  }
}

function resolveTravel(state: GameState, task: TravelTask, at: number): void {
  state.character.locationId = task.to;
  const location = LOCATIONS[task.to];
  addLog(state, {
    at,
    kind: 'travel',
    icon: location.icon,
    title: `${location.name} bölgesine vardın`,
    lines: [location.description],
  });
  recordQuestEvent(state, { kind: 'visit', locationId: task.to });
}

function resolveJob(state: GameState, task: JobTask, at: number): void {
  const job = getJob(task.jobId);
  const character = state.character;
  const duration = JOB_DURATIONS[task.duration];
  const rng = createRng(task.seed);
  const estimate = estimateJob(character, job, task.duration);

  const spread = 1 + JOB_MONEY_SPREAD * (rng() * 2 - 1);
  const money = job.money > 0 ? Math.max(1, Math.round(estimate.money * spread)) : 0;
  const xp = estimate.xp;

  const dropBonus = 1 + (perks(character).dropChance ?? 0);
  const found: Record<string, number> = {};
  for (let roll = 0; roll < duration.dropRolls; roll++) {
    for (const drop of job.drops) {
      if (rng() < Math.min(0.95, drop.chance * dropBonus)) {
        found[drop.itemId] = (found[drop.itemId] ?? 0) + 1;
      }
    }
  }

  const lines: string[] = [`+$${money}`, `+${xp} tecrübe`];
  for (const [itemId, count] of Object.entries(found)) {
    addItem(state, itemId, count);
    lines.push(`Buldun: ${getItem(itemId).icon} ${getItem(itemId).name}${count > 1 ? ` ×${count}` : ''}`);
  }

  const injuryChance = jobInjuryChance(estimate.points, job.danger, Math.min(duration.dropRolls, 3));
  if (job.danger > 0 && rng() < injuryChance) {
    const lengthFactor = 1 + 0.3 * JOB_DURATION_ORDER.indexOf(task.duration);
    const damage = Math.round(maxHp(character) * job.danger * randomBetween(rng, 0.3, 1) * lengthFactor);
    const before = character.hp;
    character.hp = Math.max(1, character.hp - damage);
    const lost = Math.round(before - character.hp);
    if (lost > 0) lines.push(`Yaralandın: -${lost} can`);
  }

  grantMoney(state, money);
  state.stats.jobsDone += 1;
  addLog(state, {
    at,
    kind: 'job',
    icon: job.icon,
    title: `${job.name} (${duration.label}) bitti`,
    lines,
  });
  grantXp(state, xp, at);
  recordQuestEvent(state, { kind: 'job', jobId: job.id, locationId: job.locationId });
}

function resolveRest(state: GameState, _task: RestTask, at: number): void {
  const character = state.character;
  const hpMax = maxHp(character);
  character.hp = Math.min(hpMax, character.hp + hpMax * REST_HP_SHARE);
  character.energy = Math.min(MAX_ENERGY, character.energy + REST_ENERGY);
  addLog(state, {
    at,
    kind: 'rest',
    icon: '🛏️',
    title: 'Otelde dinlendin',
    lines: [`+${REST_ENERGY} enerji`, `+%${Math.round(REST_HP_SHARE * 100)} can`],
  });
}
