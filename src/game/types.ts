// Core game types. Everything in src/game is plain TypeScript with no React or
// Expo imports so the same rules can later run on a server.

export type AttributeId = 'strength' | 'agility' | 'aim' | 'charm';
export type Attributes = Record<AttributeId, number>;

export type ClassId = 'gunslinger' | 'rancher' | 'scout' | 'lawman';

export type LocationId = 'town' | 'ranch' | 'forest' | 'river' | 'mine' | 'railroad' | 'canyon';

export type EquipSlot = 'head' | 'body' | 'feet' | 'weapon' | 'horse';

export type JobDurationId = 'short' | 'medium' | 'long';

export interface ClassPerks {
  /** Extra duel damage, e.g. 0.15 = +15%. */
  duelDamage?: number;
  /** Extra money from jobs. */
  jobMoney?: number;
  /** Extra travel speed. */
  travelSpeed?: number;
  /** Relative increase of item drop chances. */
  dropChance?: number;
  /** Extra maximum health. */
  maxHp?: number;
  /** Extra experience from every source. */
  xp?: number;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  icon: string;
  description: string;
  startBonus: Partial<Attributes>;
  perks: ClassPerks;
}

export interface AttributeDef {
  id: AttributeId;
  name: string;
  short: string;
  icon: string;
  description: string;
}

export type LocationService = 'shop' | 'hotel';

export interface LocationDef {
  id: LocationId;
  name: string;
  icon: string;
  description: string;
  /** Map position, both axes 0-100. */
  x: number;
  y: number;
  services: LocationService[];
}

export interface DropDef {
  itemId: string;
  /** Chance per roll, 0-1. */
  chance: number;
}

export interface JobDef {
  id: string;
  name: string;
  icon: string;
  locationId: LocationId;
  description: string;
  /** Attribute weights; they add up to 2. */
  weights: Partial<Attributes>;
  /** Skill needed to take the job at all. */
  difficulty: number;
  /** Money for the short duration before bonuses. */
  money: number;
  /** Experience for the short duration before bonuses. */
  xp: number;
  /** Base injury chance, 0-1. */
  danger: number;
  drops: DropDef[];
}

export interface JobDurationDef {
  id: JobDurationId;
  label: string;
  ms: number;
  energy: number;
  /** Money and xp multiplier compared to the short duration. */
  reward: number;
  /** Number of independent drop rolls. */
  dropRolls: number;
}

export type ItemKind = 'equipment' | 'loot';

export interface WeaponStats {
  min: number;
  max: number;
}

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  kind: ItemKind;
  slot?: EquipSlot;
  description: string;
  /** Shop price. Items with no price are not sold in the shop. */
  price?: number;
  /** Sell value. Loot sells for exactly this; equipment gets more with charm. */
  value: number;
  level: number;
  bonuses?: Partial<Attributes>;
  weapon?: WeaponStats;
  /** Travel speed multiplier for horses. */
  speed?: number;
}

export interface NpcDef {
  id: string;
  name: string;
  icon: string;
  locationId: LocationId;
  description: string;
  level: number;
  hp: number;
  aim: number;
  agility: number;
  weapon: WeaponStats;
  moneyMin: number;
  moneyMax: number;
  xp: number;
  drops: DropDef[];
}

export type QuestObjective =
  | { kind: 'visit'; locationId: LocationId }
  | { kind: 'job'; jobId?: string; locationId?: LocationId; count: number }
  | { kind: 'equip'; slot: EquipSlot }
  | { kind: 'duelWin'; npcId?: string; locationId?: LocationId; count: number }
  | { kind: 'deliver'; itemId: string; count: number }
  | { kind: 'level'; level: number };

export interface QuestRewards {
  money: number;
  xp: number;
  itemId?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  giver: string;
  giverIcon: string;
  story: string;
  /** Short line shown when the quest is turned in. */
  outro: string;
  requires: string[];
  minLevel: number;
  objectives: QuestObjective[];
  rewards: QuestRewards;
}

export interface Character {
  name: string;
  classId: ClassId;
  level: number;
  /** Experience collected towards the next level. */
  xp: number;
  money: number;
  /** Health and energy as of GameState.settledAt (fractional). */
  hp: number;
  energy: number;
  /** Attribute points the player has placed, without class or item bonuses. */
  attributes: Attributes;
  attributePoints: number;
  locationId: LocationId;
  inventory: Record<string, number>;
  equipment: Partial<Record<EquipSlot, string>>;
}

interface TaskBase {
  id: string;
  durationMs: number;
  /** Set once the task is at the front of the queue and running. */
  startedAt?: number;
  seed: number;
}

export interface TravelTask extends TaskBase {
  kind: 'travel';
  from: LocationId;
  to: LocationId;
}

export interface JobTask extends TaskBase {
  kind: 'job';
  jobId: string;
  duration: JobDurationId;
  energyCost: number;
}

export interface RestTask extends TaskBase {
  kind: 'rest';
  cost: number;
}

export type Task = TravelTask | JobTask | RestTask;

export interface QuestState {
  status: 'active' | 'done';
  acceptedAt: number;
  /** Progress per objective index, used by counting objectives. */
  progress: number[];
}

export type LogKind = 'job' | 'travel' | 'rest' | 'duel' | 'level' | 'quest' | 'shop' | 'system';

export interface LogEntry {
  id: string;
  at: number;
  kind: LogKind;
  icon: string;
  title: string;
  lines: string[];
  read: boolean;
}

export interface GameStats {
  jobsDone: number;
  duelsWon: number;
  duelsLost: number;
  moneyEarned: number;
}

export interface GameState {
  version: number;
  /** Random generator state, advanced whenever a seed is handed out. */
  seed: number;
  nextId: number;
  createdAt: number;
  /** Time up to which health, energy and the task queue have been settled. */
  settledAt: number;
  character: Character;
  queue: Task[];
  quests: Record<string, QuestState>;
  log: LogEntry[];
  stats: GameStats;
}

export type ActionResult =
  | { ok: true; state: GameState; logId?: string }
  | { ok: false; error: string };
