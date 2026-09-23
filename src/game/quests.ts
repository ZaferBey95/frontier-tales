// Quest availability and objective progress.

import { LOCATIONS, QUEST_LIST, SLOTS, getItem, getJob, getNpc, getQuest } from './content';
import type { GameState, LocationId, QuestDef, QuestObjective } from './types';

export type QuestEvent =
  | { kind: 'visit'; locationId: LocationId }
  | { kind: 'job'; jobId: string; locationId: LocationId }
  | { kind: 'duelWin'; npcId: string; locationId: LocationId };

function matches(objective: QuestObjective, event: QuestEvent): boolean {
  switch (objective.kind) {
    case 'visit':
      return event.kind === 'visit' && event.locationId === objective.locationId;
    case 'job':
      return (
        event.kind === 'job' &&
        (!objective.jobId || objective.jobId === event.jobId) &&
        (!objective.locationId || objective.locationId === event.locationId)
      );
    case 'duelWin':
      return (
        event.kind === 'duelWin' &&
        (!objective.npcId || objective.npcId === event.npcId) &&
        (!objective.locationId || objective.locationId === event.locationId)
      );
    default:
      return false;
  }
}

function target(objective: QuestObjective): number {
  switch (objective.kind) {
    case 'job':
    case 'duelWin':
    case 'deliver':
      return objective.count;
    case 'level':
      return objective.level;
    default:
      return 1;
  }
}

/** Counts an event towards every active quest it matches. Mutates the state. */
export function recordQuestEvent(state: GameState, event: QuestEvent): void {
  for (const [questId, questState] of Object.entries(state.quests)) {
    if (questState.status !== 'active') continue;
    const quest = getQuest(questId);
    quest.objectives.forEach((objective, index) => {
      if (!matches(objective, event)) return;
      const goal = target(objective);
      questState.progress[index] = Math.min(goal, (questState.progress[index] ?? 0) + 1);
    });
  }
}

export interface ObjectiveStatus {
  current: number;
  target: number;
  done: boolean;
}

export function objectiveStatus(state: GameState, questId: string, index: number): ObjectiveStatus {
  const objective = getQuest(questId).objectives[index];
  const counted = state.quests[questId]?.progress[index] ?? 0;
  const goal = target(objective);
  let current = counted;
  switch (objective.kind) {
    case 'visit': {
      const here = state.character.locationId === objective.locationId && state.queue[0]?.kind !== 'travel';
      current = counted >= 1 || here ? 1 : 0;
      break;
    }
    case 'equip':
      current = state.character.equipment[objective.slot] ? 1 : 0;
      break;
    case 'deliver':
      current = Math.min(goal, state.character.inventory[objective.itemId] ?? 0);
      break;
    case 'level':
      current = Math.min(goal, state.character.level);
      break;
    default:
      break;
  }
  return { current, target: goal, done: current >= goal };
}

export function questReady(state: GameState, questId: string): boolean {
  if (state.quests[questId]?.status !== 'active') return false;
  return getQuest(questId).objectives.every((_, index) => objectiveStatus(state, questId, index).done);
}

export function questAvailable(state: GameState, quest: QuestDef): boolean {
  if (state.quests[quest.id]) return false;
  if (state.character.level < quest.minLevel) return false;
  return quest.requires.every((id) => state.quests[id]?.status === 'done');
}

export function availableQuests(state: GameState): QuestDef[] {
  return QUEST_LIST.filter((quest) => questAvailable(state, quest));
}

export function activeQuests(state: GameState): QuestDef[] {
  return QUEST_LIST.filter((quest) => state.quests[quest.id]?.status === 'active');
}

export function completedQuests(state: GameState): QuestDef[] {
  return QUEST_LIST.filter((quest) => state.quests[quest.id]?.status === 'done');
}

/** Quests whose prerequisites are done but the character is too low level. */
export function lockedByLevel(state: GameState): QuestDef[] {
  return QUEST_LIST.filter(
    (quest) =>
      !state.quests[quest.id] &&
      state.character.level < quest.minLevel &&
      quest.requires.every((id) => state.quests[id]?.status === 'done'),
  );
}

export function describeObjective(objective: QuestObjective): string {
  switch (objective.kind) {
    case 'visit':
      return `${LOCATIONS[objective.locationId].name} bölgesine git`;
    case 'job': {
      const what = objective.jobId ? `“${getJob(objective.jobId).name}” işini yap` : 'Bir iş yap';
      const where = objective.locationId ? ` (${LOCATIONS[objective.locationId].name})` : '';
      return `${what}${where}`;
    }
    case 'equip':
      return `Bir ${SLOTS[objective.slot].name.toLocaleLowerCase('tr')} kuşan`;
    case 'duelWin': {
      if (objective.npcId) return `${getNpc(objective.npcId).name} ile düelloyu kazan`;
      const where = objective.locationId ? `${LOCATIONS[objective.locationId].name} bölgesinde ` : '';
      return `${where}düello kazan`;
    }
    case 'deliver':
      return `${getItem(objective.itemId).name} getir`;
    case 'level':
      return `${objective.level}. seviyeye ulaş`;
    default:
      return '';
  }
}
