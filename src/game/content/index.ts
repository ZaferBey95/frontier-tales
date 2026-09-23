import type { ItemDef, JobDef, LocationId, NpcDef, QuestDef } from '../types';
import { ITEM_LIST } from './items';
import { JOB_LIST } from './jobs';
import { NPC_LIST } from './npcs';
import { QUEST_LIST } from './quests';

export { ATTRIBUTES, ATTRIBUTE_ORDER } from './attributes';
export { CLASSES, CLASS_ORDER } from './classes';
export { LOCATIONS, LOCATION_ORDER } from './locations';
export { SLOTS, SLOT_ORDER, ITEM_LIST } from './items';
export { JOB_LIST } from './jobs';
export { NPC_LIST } from './npcs';
export { QUEST_LIST } from './quests';

function indexById<T extends { id: string }>(list: T[], label: string): Record<string, T> {
  const map: Record<string, T> = {};
  for (const entry of list) {
    if (map[entry.id]) throw new Error(`Duplicate ${label} id: ${entry.id}`);
    map[entry.id] = entry;
  }
  return map;
}

export const ITEMS = indexById(ITEM_LIST, 'item');
export const JOBS = indexById(JOB_LIST, 'job');
export const NPCS = indexById(NPC_LIST, 'npc');
export const QUESTS = indexById(QUEST_LIST, 'quest');

function lookup<T>(map: Record<string, T>, id: string, label: string): T {
  const entry = map[id];
  if (!entry) throw new Error(`Unknown ${label}: ${id}`);
  return entry;
}

export const getItem = (id: string): ItemDef => lookup(ITEMS, id, 'item');
export const getJob = (id: string): JobDef => lookup(JOBS, id, 'job');
export const getNpc = (id: string): NpcDef => lookup(NPCS, id, 'npc');
export const getQuest = (id: string): QuestDef => lookup(QUESTS, id, 'quest');

export function jobsAt(locationId: LocationId): JobDef[] {
  return JOB_LIST.filter((job) => job.locationId === locationId);
}

export function npcsAt(locationId: LocationId): NpcDef[] {
  return NPC_LIST.filter((npc) => npc.locationId === locationId);
}

export const SHOP_ITEMS: ItemDef[] = ITEM_LIST.filter((item) => item.price !== undefined);
