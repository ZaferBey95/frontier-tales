// Turn-based duel simulation. The faster fighter shoots first each round and
// the duel ends when someone drops or the rounds run out.

import { DUEL_MAX_ROUNDS } from './balance';
import { effectiveAttributes, perks, weaponOf } from './formulas';
import { createRng, randomInt } from './rng';
import type { Character, NpcDef, WeaponStats } from './types';

export type Side = 'player' | 'npc';

export interface DuelRound {
  round: number;
  shooter: Side;
  hit: boolean;
  damage: number;
  playerHp: number;
  npcHp: number;
}

export interface DuelResult {
  outcome: 'win' | 'loss' | 'draw';
  rounds: DuelRound[];
  playerHp: number;
  npcHp: number;
}

interface Fighter {
  aim: number;
  agility: number;
  weapon: WeaponStats;
  damageBonus: number;
}

export function hitChance(attackerAim: number, defenderAgility: number): number {
  return Math.min(0.95, Math.max(0.1, 0.55 + 0.03 * (attackerAim - defenderAgility)));
}

function damageRoll(rng: () => number, fighter: Fighter): number {
  const base = randomInt(rng, fighter.weapon.min, fighter.weapon.max);
  return Math.max(1, Math.round(base * (1 + 0.04 * fighter.aim) * (1 + fighter.damageBonus)));
}

export function playerFighter(character: Character): Fighter {
  const attrs = effectiveAttributes(character);
  return {
    aim: attrs.aim,
    agility: attrs.agility,
    weapon: weaponOf(character),
    damageBonus: perks(character).duelDamage ?? 0,
  };
}

export function npcFighter(npc: NpcDef): Fighter {
  return { aim: npc.aim, agility: npc.agility, weapon: npc.weapon, damageBonus: 0 };
}

export function simulateDuel(character: Character, startHp: number, npc: NpcDef, seed: number): DuelResult {
  const rng = createRng(seed);
  const player = playerFighter(character);
  const enemy = npcFighter(npc);
  let playerHp = startHp;
  let npcHp = npc.hp;
  const rounds: DuelRound[] = [];
  const order: Side[] = player.agility >= enemy.agility ? ['player', 'npc'] : ['npc', 'player'];

  for (let round = 1; round <= DUEL_MAX_ROUNDS; round++) {
    for (const shooter of order) {
      const attacker = shooter === 'player' ? player : enemy;
      const defender = shooter === 'player' ? enemy : player;
      const hit = rng() < hitChance(attacker.aim, defender.agility);
      const damage = hit ? damageRoll(rng, attacker) : 0;
      if (shooter === 'player') npcHp = Math.max(0, npcHp - damage);
      else playerHp = Math.max(0, playerHp - damage);
      rounds.push({ round, shooter, hit, damage, playerHp, npcHp });
      if (playerHp <= 0 || npcHp <= 0) {
        return { outcome: npcHp <= 0 ? 'win' : 'loss', rounds, playerHp, npcHp };
      }
    }
  }
  return { outcome: 'draw', rounds, playerHp, npcHp };
}

/** Share of wins over a fixed set of seeds, for showing odds before a duel. */
export function estimateWinChance(character: Character, startHp: number, npc: NpcDef, samples = 60): number {
  let wins = 0;
  for (let i = 1; i <= samples; i++) {
    if (simulateDuel(character, startHp, npc, i * 2654435761).outcome === 'win') wins += 1;
  }
  return wins / samples;
}
