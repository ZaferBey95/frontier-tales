import { describe, expect, it } from 'vitest';

import { cancelTask, startJob, startRest, startTravel } from '../actions';
import { JOB_DURATIONS, MAX_ENERGY, REST_MS, restCost } from '../balance';
import { getJob } from '../content';
import { estimateJob, travelMs } from '../formulas';
import { needsSettle, settle } from '../simulation';
import { projectedLocation, taskTimes } from '../state';
import { HOUR, MIN, SEC, T0, err, game, hero, ok } from './helpers';

describe('jobs', () => {
  it('runs a job at the current location and pays out when it ends', () => {
    const start = game();
    const state = ok(startJob(start, 'sweep_saloon', 'short', T0));
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0].startedAt).toBe(T0);
    expect(state.character.energy).toBe(MAX_ENERGY - JOB_DURATIONS.short.energy);

    expect(needsSettle(state, T0 + 29 * SEC)).toBe(false);
    expect(needsSettle(state, T0 + 30 * SEC)).toBe(true);

    const done = settle(state, T0 + 30 * SEC);
    expect(done.queue).toHaveLength(0);
    expect(done.stats.jobsDone).toBe(1);
    expect(done.character.money).toBeGreaterThan(start.character.money);
    expect(done.character.xp + (done.character.level - 1) * 1000).toBeGreaterThan(0);
    expect(done.log[0].kind).toBe('job');
  });

  it('pays more for longer shifts', () => {
    const character = game().character;
    const job = getJob('herd_cattle');
    const short = estimateJob(character, job, 'short');
    const long = estimateJob(character, job, 'long');
    expect(long.money).toBeGreaterThan(short.money * 5);
    expect(long.xp).toBeGreaterThan(short.xp * 5);
  });

  it('refuses jobs that are too hard', () => {
    expect(err(startJob(game(), 'guard_payroll', 'short', T0))).toMatch(/becerikli/);
  });

  it('refuses jobs without enough energy', () => {
    const state = game();
    state.character.energy = 1;
    expect(err(startJob(state, 'sweep_saloon', 'short', T0))).toMatch(/enerji/);
  });

  it('travels first when the job is somewhere else', () => {
    const state = ok(startJob(game(), 'mend_fences', 'short', T0));
    expect(state.queue.map((task) => task.kind)).toEqual(['travel', 'job']);
    const trip = travelMs(state.character, 'town', 'ranch');
    expect(state.queue[0].durationMs).toBe(trip);

    const arrived = settle(state, T0 + trip);
    expect(arrived.character.locationId).toBe('ranch');
    expect(arrived.queue).toHaveLength(1);
    expect(arrived.queue[0].startedAt).toBe(T0 + trip);

    const done = settle(state, T0 + trip + 30 * SEC);
    expect(done.queue).toHaveLength(0);
    expect(done.stats.jobsDone).toBe(1);
  });

  it('limits the queue to three tasks', () => {
    let state = game();
    state = ok(startJob(state, 'sweep_saloon', 'short', T0));
    state = ok(startJob(state, 'sweep_saloon', 'short', T0));
    expect(err(startJob(state, 'mend_fences', 'short', T0))).toMatch(/2 boş yer/);
    state = ok(startJob(state, 'sweep_saloon', 'short', T0));
    expect(err(startJob(state, 'sweep_saloon', 'short', T0))).toMatch(/dolu/);
  });

  it('catches up on everything that happened while away', () => {
    let state = game();
    state = ok(startJob(state, 'sweep_saloon', 'medium', T0));
    state = ok(startTravel(state, 'ranch', T0));
    state = ok(startJob(state, 'mend_fences', 'long', T0));
    const times = taskTimes(state);
    const end = times[times.length - 1].end;

    const later = settle(state, end + 5 * HOUR);
    expect(later.queue).toHaveLength(0);
    expect(later.character.locationId).toBe('ranch');
    expect(later.stats.jobsDone).toBe(2);
    expect(later.character.energy).toBe(MAX_ENERGY);
    expect(later.settledAt).toBe(end + 5 * HOUR);
  });

  it('gives the same results for the same save', () => {
    const run = () => settle(ok(startJob(hero(game()), 'hunt_rabbits', 'long', T0)), T0 + 2 * HOUR);
    expect(run()).toEqual(run());
  });
});

describe('travel', () => {
  it('plans trips from where the queue ends', () => {
    let state = ok(startTravel(game(), 'ranch', T0));
    state = ok(startTravel(state, 'forest', T0));
    expect(projectedLocation(state)).toBe('forest');
    expect(state.queue[1].durationMs).toBe(travelMs(state.character, 'ranch', 'forest'));
    expect(err(startTravel(state, 'forest', T0))).toMatch(/Zaten/);
  });

  it('is faster on horseback and for scouts', () => {
    const walker = game('rancher').character;
    const rider = game('rancher').character;
    rider.equipment.horse = 'bay_horse';
    const scout = game('scout').character;
    const trip = travelMs(walker, 'town', 'canyon');
    expect(travelMs(rider, 'town', 'canyon')).toBeLessThan(trip);
    expect(travelMs(scout, 'town', 'canyon')).toBeLessThan(trip);
  });
});

describe('cancelling', () => {
  it('refunds energy for jobs that have not started', () => {
    let state = game();
    state = ok(startJob(state, 'sweep_saloon', 'short', T0));
    state = ok(startJob(state, 'sweep_saloon', 'medium', T0));
    const energyBefore = state.character.energy;
    state = ok(cancelTask(state, state.queue[1].id, T0));
    expect(state.queue).toHaveLength(1);
    expect(state.character.energy).toBe(energyBefore + JOB_DURATIONS.medium.energy);
  });

  it('keeps the energy of a job already running', () => {
    let state = ok(startJob(game(), 'sweep_saloon', 'medium', T0));
    const energyBefore = state.character.energy;
    state = ok(cancelTask(state, state.queue[0].id, T0 + MIN));
    expect(state.queue).toHaveLength(0);
    expect(state.character.energy).toBeLessThan(energyBefore + 1);
  });

  it('drops everything after a cancelled trip and stays put', () => {
    let state = ok(startJob(game(), 'mend_fences', 'short', T0));
    state = ok(cancelTask(state, state.queue[0].id, T0 + SEC));
    expect(state.queue).toHaveLength(0);
    expect(state.character.locationId).toBe('town');
    expect(state.character.energy).toBeCloseTo(MAX_ENERGY, 0);
  });
});

describe('resting', () => {
  it('costs money and restores health and energy in town', () => {
    const state = game();
    state.character.energy = 10;
    state.character.hp = 10;
    const resting = ok(startRest(state, T0));
    expect(resting.character.money).toBe(state.character.money - restCost(1));
    const rested = settle(resting, T0 + REST_MS);
    expect(rested.character.energy).toBeGreaterThan(55);
    expect(rested.character.hp).toBeGreaterThan(60);
  });

  it('is only possible in town', () => {
    const state = ok(startTravel(game(), 'ranch', T0));
    expect(err(startRest(state, T0))).toMatch(/Otel/);
  });

  it('refunds the room when cancelled before it starts', () => {
    let state = ok(startJob(game(), 'sweep_saloon', 'short', T0));
    const money = state.character.money;
    state = ok(startRest(state, T0));
    state = ok(cancelTask(state, state.queue[1].id, T0));
    expect(state.character.money).toBe(money);
  });
});
