// Player actions. Each one settles the state to `now`, validates, and returns
// either a new state or a Turkish error message for the UI.

import {
  DUEL_ENERGY,
  DUEL_LOSS_MONEY_SHARE,
  DUEL_MIN_HP_SHARE,
  JOB_DURATIONS,
  MAX_ENERGY,
  MAX_QUEUE,
  REST_MS,
  restCost,
} from './balance';
import { ITEMS, JOBS, LOCATIONS, NPCS, QUESTS, getItem } from './content';
import { simulateDuel } from './duel';
import { estimateJob, maxHp, sellPrice, travelMs, xpWithPerk } from './formulas';
import { questAvailable, questReady, recordQuestEvent } from './quests';
import { createRng, randomInt } from './rng';
import { settle } from './simulation';
import {
  addItem,
  addLog,
  cloneState,
  grantMoney,
  grantXp,
  isTravelling,
  newId,
  projectedLocation,
  removeItem,
  takeSeed,
} from './state';
import type {
  ActionResult,
  AttributeId,
  EquipSlot,
  GameState,
  JobDurationId,
  LocationId,
  Task,
  TravelTask,
} from './types';

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function enqueue(state: GameState, task: Task, now: number): void {
  if (state.queue.length === 0) task.startedAt = now;
  state.queue.push(task);
}

function travelTask(state: GameState, from: LocationId, to: LocationId): TravelTask {
  return {
    id: newId(state, 'task'),
    kind: 'travel',
    from,
    to,
    durationMs: travelMs(state.character, from, to),
    seed: takeSeed(state),
  };
}

const QUEUE_FULL = `Sıran dolu. Aynı anda en fazla ${MAX_QUEUE} iş sıraya koyabilirsin.`;

export function startJob(state: GameState, jobId: string, durationId: JobDurationId, now: number): ActionResult {
  const job = JOBS[jobId];
  const duration = JOB_DURATIONS[durationId];
  if (!job || !duration) return fail('Böyle bir iş yok.');

  const s = settle(state, now);
  const estimate = estimateJob(s.character, job, durationId);
  if (!estimate.canDo) {
    return fail(`Bu iş için henüz yeterince becerikli değilsin (iş puanın ${estimate.points}).`);
  }
  const from = projectedLocation(s);
  const needsTravel = from !== job.locationId;
  if (s.queue.length + (needsTravel ? 2 : 1) > MAX_QUEUE) {
    return fail(needsTravel ? 'Oraya gidip bu işi yapmak için sırada 2 boş yer lazım.' : QUEUE_FULL);
  }
  if (s.character.energy < duration.energy) {
    return fail(`Yeterli enerjin yok. Bu iş ${duration.energy} enerji istiyor.`);
  }

  if (needsTravel) enqueue(s, travelTask(s, from, job.locationId), now);
  s.character.energy -= duration.energy;
  enqueue(
    s,
    {
      id: newId(s, 'task'),
      kind: 'job',
      jobId,
      duration: durationId,
      durationMs: duration.ms,
      energyCost: duration.energy,
      seed: takeSeed(s),
    },
    now,
  );
  return { ok: true, state: s };
}

export function startTravel(state: GameState, to: LocationId, now: number): ActionResult {
  if (!LOCATIONS[to]) return fail('Böyle bir yer yok.');
  const s = settle(state, now);
  const from = projectedLocation(s);
  if (from === to) return fail(s.queue.length > 0 ? 'Zaten oraya gidiyorsun.' : 'Zaten buradasın.');
  if (s.queue.length >= MAX_QUEUE) return fail(QUEUE_FULL);
  enqueue(s, travelTask(s, from, to), now);
  return { ok: true, state: s };
}

export function startRest(state: GameState, now: number): ActionResult {
  const s = settle(state, now);
  if (projectedLocation(s) !== 'town') return fail(`Otel sadece ${LOCATIONS.town.name} kasabasında.`);
  if (s.queue.length >= MAX_QUEUE) return fail(QUEUE_FULL);
  const cost = restCost(s.character.level);
  if (s.character.money < cost) return fail(`Bir oda ${cost} dolar. Yeterli paran yok.`);
  s.character.money -= cost;
  enqueue(s, { id: newId(s, 'task'), kind: 'rest', cost, durationMs: REST_MS, seed: takeSeed(s) }, now);
  return { ok: true, state: s };
}

/** Cancels a task and everything queued after it. Unstarted tasks are refunded. */
export function cancelTask(state: GameState, taskId: string, now: number): ActionResult {
  const s = settle(state, now);
  const index = s.queue.findIndex((task) => task.id === taskId);
  if (index < 0) return fail('Bu iş artık sırada değil.');
  const removed = s.queue.splice(index);
  for (const task of removed) {
    if (task.startedAt !== undefined) continue;
    if (task.kind === 'job') s.character.energy = Math.min(MAX_ENERGY, s.character.energy + task.energyCost);
    if (task.kind === 'rest') s.character.money += task.cost;
  }
  return { ok: true, state: s };
}

export function canShop(state: GameState): boolean {
  return state.character.locationId === 'town' && !isTravelling(state);
}

export function buyItem(state: GameState, itemId: string, now: number): ActionResult {
  const item = ITEMS[itemId];
  if (!item || item.price === undefined) return fail('Bu eşya dükkânda satılmıyor.');
  const s = settle(state, now);
  if (!canShop(s)) return fail(`Dükkân ${LOCATIONS.town.name} kasabasında. Önce oraya gitmelisin.`);
  if (s.character.level < item.level) return fail(`Bu eşyayı almak için ${item.level}. seviye olmalısın.`);
  if (s.character.money < item.price) return fail('Yeterli paran yok.');
  s.character.money -= item.price;
  addItem(s, itemId);
  return { ok: true, state: s };
}

export function sellItem(state: GameState, itemId: string, count: number, now: number): ActionResult {
  const item = ITEMS[itemId];
  if (!item || count < 1) return fail('Bu eşya satılamaz.');
  const s = settle(state, now);
  if (!canShop(s)) return fail(`Dükkân ${LOCATIONS.town.name} kasabasında. Önce oraya gitmelisin.`);
  const price = sellPrice(s.character, item) * count;
  if (!removeItem(s, itemId, count)) return fail('Elinde o kadar yok.');
  s.character.money += price;
  return { ok: true, state: s };
}

function clampHp(state: GameState): void {
  state.character.hp = Math.min(state.character.hp, maxHp(state.character));
}

export function equipItem(state: GameState, itemId: string, now: number): ActionResult {
  const item = ITEMS[itemId];
  if (!item || item.kind !== 'equipment' || !item.slot) return fail('Bu eşya kuşanılamaz.');
  const s = settle(state, now);
  if (s.character.level < item.level) return fail(`Bu eşya için ${item.level}. seviye olmalısın.`);
  if (!removeItem(s, itemId)) return fail('Bu eşya çantanda yok.');
  const previous = s.character.equipment[item.slot];
  if (previous) addItem(s, previous);
  s.character.equipment[item.slot] = itemId;
  clampHp(s);
  return { ok: true, state: s };
}

export function unequipItem(state: GameState, slot: EquipSlot, now: number): ActionResult {
  const s = settle(state, now);
  const itemId = s.character.equipment[slot];
  if (!itemId) return fail('Bu yuvada bir şey yok.');
  delete s.character.equipment[slot];
  addItem(s, itemId);
  clampHp(s);
  return { ok: true, state: s };
}

export function spendAttributePoint(state: GameState, attribute: AttributeId, now: number): ActionResult {
  const s = settle(state, now);
  if (s.character.attributePoints < 1) return fail('Harcayacak özellik puanın yok.');
  if (!(attribute in s.character.attributes)) return fail('Böyle bir özellik yok.');
  s.character.attributes[attribute] += 1;
  s.character.attributePoints -= 1;
  return { ok: true, state: s };
}

export function duel(state: GameState, npcId: string, now: number): ActionResult {
  const npc = NPCS[npcId];
  if (!npc) return fail('Böyle bir rakip yok.');
  const s = settle(state, now);
  const character = s.character;
  if (s.queue.length > 0) return fail('Düello için önce sıradaki işlerini bitirmen ya da iptal etmen gerek.');
  if (character.locationId !== npc.locationId) {
    return fail(`${npc.name} şu an ${LOCATIONS[npc.locationId].name} bölgesinde. Önce oraya gitmelisin.`);
  }
  if (character.hp < maxHp(character) * DUEL_MIN_HP_SHARE) return fail('Çok yaralısın. Önce biraz dinlen.');
  if (character.energy < DUEL_ENERGY) return fail(`Düello ${DUEL_ENERGY} enerji ister. Yeterli enerjin yok.`);

  character.energy -= DUEL_ENERGY;
  const seed = takeSeed(s);
  const result = simulateDuel(character, character.hp, npc, seed);
  const rewardRng = createRng(seed ^ 0x5bd1e995);

  const summary: string[] = [];
  let title: string;
  if (result.outcome === 'win') {
    const money = randomInt(rewardRng, npc.moneyMin, npc.moneyMax);
    const xp = xpWithPerk(character, npc.xp);
    character.hp = Math.max(1, result.playerHp);
    grantMoney(s, money);
    s.stats.duelsWon += 1;
    title = `${npc.name} ile düelloyu kazandın!`;
    summary.push(`+$${money}`, `+${xp} tecrübe`);
    for (const drop of npc.drops) {
      if (rewardRng() < drop.chance) {
        addItem(s, drop.itemId);
        summary.push(`Ganimet: ${getItem(drop.itemId).icon} ${getItem(drop.itemId).name}`);
      }
    }
    summary.push(`Kalan canın: ${Math.round(character.hp)}`);
    const logId = pushDuelLog(s, now, '🏆', title, summary, result.rounds, npc.name);
    grantXp(s, xp, now);
    recordQuestEvent(s, { kind: 'duelWin', npcId: npc.id, locationId: npc.locationId });
    return { ok: true, state: s, logId };
  }

  if (result.outcome === 'loss') {
    const lost = Math.floor(character.money * DUEL_LOSS_MONEY_SHARE);
    character.money -= lost;
    character.hp = 1;
    s.stats.duelsLost += 1;
    title = `${npc.name} seni yere serdi`;
    summary.push('Gözlerini açtığında her yer dönüyordu.');
    if (lost > 0) summary.push(`Cebinden $${lost} alınmış.`);
  } else {
    character.hp = Math.max(1, result.playerHp);
    title = `${npc.name} ile düello berabere bitti`;
    summary.push('İkiniz de mermisiz kaldınız ve kendi yolunuza gittiniz.');
  }
  const logId = pushDuelLog(s, now, result.outcome === 'loss' ? '🤕' : '🤝', title, summary, result.rounds, npc.name);
  return { ok: true, state: s, logId };
}

function pushDuelLog(
  state: GameState,
  at: number,
  icon: string,
  title: string,
  summary: string[],
  rounds: ReturnType<typeof simulateDuel>['rounds'],
  npcName: string,
): string {
  const roundLines = rounds.map((r) => {
    if (r.shooter === 'player') {
      return r.hit ? `🎯 ${r.round}. tur: Vurdun! -${r.damage} (${npcName}: ${r.npcHp})` : `💨 ${r.round}. tur: Iskaladın.`;
    }
    return r.hit
      ? `🩸 ${r.round}. tur: ${npcName} seni vurdu! -${r.damage} (Sen: ${Math.round(r.playerHp)})`
      : `💨 ${r.round}. tur: ${npcName} ıskaladı.`;
  });
  return addLog(state, { at, kind: 'duel', icon, title, lines: [...summary, '', ...roundLines] });
}

export function acceptQuest(state: GameState, questId: string, now: number): ActionResult {
  const quest = QUESTS[questId];
  if (!quest) return fail('Böyle bir görev yok.');
  const s = settle(state, now);
  if (!questAvailable(s, quest)) return fail('Bu görevi şu an alamazsın.');
  s.quests[questId] = { status: 'active', acceptedAt: now, progress: quest.objectives.map(() => 0) };
  return { ok: true, state: s };
}

export function turnInQuest(state: GameState, questId: string, now: number): ActionResult {
  const quest = QUESTS[questId];
  if (!quest) return fail('Böyle bir görev yok.');
  const s = settle(state, now);
  if (!questReady(s, questId)) return fail('Görev henüz tamamlanmadı.');

  for (const objective of quest.objectives) {
    if (objective.kind === 'deliver') removeItem(s, objective.itemId, objective.count);
  }
  const { money, itemId } = quest.rewards;
  const xp = xpWithPerk(s.character, quest.rewards.xp);
  grantMoney(s, money);
  const lines = [quest.outro, ''];
  if (money > 0) lines.push(`+$${money}`);
  if (xp > 0) lines.push(`+${xp} tecrübe`);
  if (itemId) {
    addItem(s, itemId);
    lines.push(`Ödül: ${getItem(itemId).icon} ${getItem(itemId).name}`);
  }
  s.quests[questId].status = 'done';
  const logId = addLog(s, { at: now, kind: 'quest', icon: '📜', title: `Görev tamamlandı: ${quest.title}`, lines });
  grantXp(s, xp, now);
  return { ok: true, state: s, logId };
}

/** Marks one log entry, or all of them, as read. */
export function markLogRead(state: GameState, entryId?: string): GameState {
  const matches = (id: string) => entryId === undefined || id === entryId;
  if (state.log.every((entry) => entry.read || !matches(entry.id))) return state;
  const s = cloneState(state);
  for (const entry of s.log) if (matches(entry.id)) entry.read = true;
  return s;
}
