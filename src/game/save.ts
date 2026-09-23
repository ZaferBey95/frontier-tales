// Loading saved games. Bump SAVE_VERSION and add a step here whenever the
// shape of GameState changes, so old saves keep working.

import { SAVE_VERSION } from './balance';
import { ITEMS, JOBS, LOCATIONS, QUESTS } from './content';
import type { GameState } from './types';

/** Returns a usable state, or null when the save is unreadable. */
export function migrateSave(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const state = raw as GameState;
  if (typeof state.version !== 'number' || state.version > SAVE_VERSION) return null;
  if (!state.character || !Array.isArray(state.queue) || !Array.isArray(state.log)) return null;

  // Version 2: log entries lost their emoji icon in favour of structured data.
  if (state.version < 2) {
    for (const entry of state.log) delete (entry as { icon?: string }).icon;
    state.version = 2;
  }

  // Drop references to content that no longer exists.
  const character = state.character;
  if (!LOCATIONS[character.locationId]) character.locationId = 'town';
  for (const itemId of Object.keys(character.inventory)) {
    if (!ITEMS[itemId]) delete character.inventory[itemId];
  }
  for (const [slot, itemId] of Object.entries(character.equipment)) {
    if (itemId && !ITEMS[itemId]) delete character.equipment[slot as keyof typeof character.equipment];
  }
  for (const questId of Object.keys(state.quests)) {
    if (!QUESTS[questId]) delete state.quests[questId];
  }
  // A task pointing at removed content is dropped along with everything after it.
  const broken = state.queue.findIndex((task) =>
    task.kind === 'job' ? !JOBS[task.jobId] : task.kind === 'travel' ? !LOCATIONS[task.to] : false,
  );
  if (broken >= 0) state.queue.splice(broken);
  return state;
}
