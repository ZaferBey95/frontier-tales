import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTE_ORDER,
  CLASSES,
  ITEMS,
  ITEM_LIST,
  JOB_LIST,
  LOCATIONS,
  NPC_LIST,
  QUESTS,
  QUEST_LIST,
  jobsAt,
} from '../content';
import { jobPoints } from '../formulas';
import { game } from './helpers';

describe('content', () => {
  it('only references items that exist', () => {
    const drops = [...JOB_LIST.flatMap((job) => job.drops), ...NPC_LIST.flatMap((npc) => npc.drops)];
    for (const drop of drops) expect(ITEMS[drop.itemId], drop.itemId).toBeDefined();
    for (const quest of QUEST_LIST) {
      if (quest.rewards.itemId) expect(ITEMS[quest.rewards.itemId], quest.rewards.itemId).toBeDefined();
      for (const objective of quest.objectives) {
        if (objective.kind === 'deliver') expect(ITEMS[objective.itemId]).toBeDefined();
      }
    }
  });

  it('only references locations, jobs, npcs and quests that exist', () => {
    for (const job of JOB_LIST) expect(LOCATIONS[job.locationId]).toBeDefined();
    for (const npc of NPC_LIST) expect(LOCATIONS[npc.locationId]).toBeDefined();
    const jobIds = new Set(JOB_LIST.map((job) => job.id));
    const npcIds = new Set(NPC_LIST.map((npc) => npc.id));
    for (const quest of QUEST_LIST) {
      for (const id of quest.requires) expect(QUESTS[id], `${quest.id} requires ${id}`).toBeDefined();
      for (const objective of quest.objectives) {
        if (objective.kind === 'job' && objective.jobId) expect(jobIds.has(objective.jobId)).toBe(true);
        if (objective.kind === 'duelWin' && objective.npcId) expect(npcIds.has(objective.npcId)).toBe(true);
        if ('locationId' in objective && objective.locationId) expect(LOCATIONS[objective.locationId]).toBeDefined();
      }
    }
  });

  it('gives every job attribute weights that add up to 2', () => {
    for (const job of JOB_LIST) {
      const total = ATTRIBUTE_ORDER.reduce((sum, id) => sum + (job.weights[id] ?? 0), 0);
      expect(total, job.id).toBeCloseTo(2);
    }
  });

  it('gives equipment a slot and loot none', () => {
    for (const item of ITEM_LIST) {
      if (item.kind === 'equipment') expect(item.slot, item.id).toBeDefined();
      else expect(item.slot, item.id).toBeUndefined();
      if (item.slot === 'weapon') expect(item.weapon, item.id).toBeDefined();
      if (item.slot === 'horse') expect(item.speed, item.id).toBeGreaterThan(1);
    }
  });

  it('lets a new character of every class start working somewhere', () => {
    for (const classId of Object.keys(CLASSES) as (keyof typeof CLASSES)[]) {
      const state = game(classId);
      const doable = jobsAt('town').concat(jobsAt('ranch')).filter((job) => jobPoints(state.character, job) >= 0);
      expect(doable.length, classId).toBeGreaterThan(0);
    }
  });

  it('only has quest chains that can be finished', () => {
    const done = new Set<string>();
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const quest of QUEST_LIST) {
        if (!done.has(quest.id) && quest.requires.every((id) => done.has(id))) {
          done.add(quest.id);
          progressed = true;
        }
      }
    }
    expect(done.size).toBe(QUEST_LIST.length);
  });
});
