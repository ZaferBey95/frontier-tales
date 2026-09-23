import { describe, expect, it } from 'vitest';

import { acceptQuest, buyItem, duel, equipItem, startJob, turnInQuest } from '../actions';
import { availableQuests, objectiveStatus, questReady } from '../quests';
import { migrateSave } from '../save';
import { settle } from '../simulation';
import { taskTimes } from '../state';
import { HOUR, T0, err, game, hero, ok } from './helpers';

function finishQueue(state: ReturnType<typeof game>) {
  const times = taskTimes(state);
  return settle(state, times.length ? times[times.length - 1].end : state.settledAt);
}

describe('quests', () => {
  it('walks through the first quest', () => {
    let state = game();
    expect(availableQuests(state).map((quest) => quest.id)).toEqual(['welcome']);
    expect(err(turnInQuest(state, 'welcome', T0))).toMatch(/tamamlanmadı/);

    state = ok(acceptQuest(state, 'welcome', T0));
    expect(err(acceptQuest(state, 'welcome', T0))).toMatch(/alamazsın/);
    state = finishQueue(ok(startJob(state, 'mend_fences', 'short', T0)));
    expect(objectiveStatus(state, 'welcome', 0).done).toBe(true);
    expect(objectiveStatus(state, 'welcome', 1).done).toBe(true);
    expect(questReady(state, 'welcome')).toBe(true);

    const money = state.character.money;
    state = ok(turnInQuest(state, 'welcome', state.settledAt));
    expect(state.quests.welcome.status).toBe('done');
    expect(state.character.money).toBe(money + 20);
    expect(availableQuests(state).map((quest) => quest.id).sort()).toEqual(['proper_hat', 'saloon_brawl']);
  });

  it('only counts progress made after accepting', () => {
    let state = finishQueue(ok(startJob(game(), 'mend_fences', 'short', T0)));
    state = ok(acceptQuest(state, 'welcome', state.settledAt));
    expect(objectiveStatus(state, 'welcome', 0).done).toBe(true);
    expect(objectiveStatus(state, 'welcome', 1).done).toBe(false);
  });

  it('checks equipment and takes delivered items', () => {
    let state = game();
    state.quests.welcome = { status: 'done', acceptedAt: T0, progress: [1, 1] };
    state = ok(acceptQuest(state, 'proper_hat', T0));
    state = ok(buyItem(state, 'straw_hat', T0));
    expect(questReady(state, 'proper_hat')).toBe(false);
    state = ok(equipItem(state, 'straw_hat', T0));
    state = ok(turnInQuest(state, 'proper_hat', T0));

    state = ok(acceptQuest(state, 'rabbit_pelts', T0));
    state.character.inventory.rabbit_pelt = 4;
    expect(objectiveStatus(state, 'rabbit_pelts', 0)).toEqual({ current: 3, target: 3, done: true });
    state = ok(turnInQuest(state, 'rabbit_pelts', T0));
    expect(state.character.inventory.rabbit_pelt).toBe(1);
    expect(state.character.inventory.old_boots).toBe(1);
  });

  it('counts duel wins against the right opponent', () => {
    let state = hero(game());
    state.quests.welcome = { status: 'done', acceptedAt: T0, progress: [1, 1] };
    state = ok(acceptQuest(state, 'saloon_brawl', T0));
    state = ok(duel(state, 'drunk_cowboy', T0));
    expect(questReady(state, 'saloon_brawl')).toBe(true);
  });
});

describe('saves', () => {
  it('rejects unreadable or future saves', () => {
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave({ hello: 'world' })).toBeNull();
    expect(migrateSave({ ...game(), version: 999 })).toBeNull();
  });

  it('cleans up references to removed content', () => {
    let state = ok(startJob(game(), 'mend_fences', 'short', T0));
    state.character.inventory.old_relic = 2;
    (state.queue[1] as { jobId: string }).jobId = 'removed_job';
    const migrated = migrateSave(JSON.parse(JSON.stringify(state)));
    expect(migrated?.character.inventory.old_relic).toBeUndefined();
    expect(migrated?.queue).toHaveLength(1);
    expect(() => settle(migrated!, T0 + HOUR)).not.toThrow();
  });
});
