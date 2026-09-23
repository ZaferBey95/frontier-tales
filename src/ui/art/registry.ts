// Which picture and colour every piece of game content gets.

import {
  JOBS,
  QUESTS,
  getItem,
  type AttributeId,
  type ClassId,
  type EquipSlot,
  type LocationId,
  type LogEntry,
  type QuestGiverId,
  type Rarity,
} from '@/game';

import type { GlyphName } from './glyphs';
import type { ToneName } from './tones';

export interface Art {
  glyph: GlyphName;
  tone: ToneName;
}

export const LOCATION_ART: Record<LocationId, Art> = {
  town: { glyph: 'saloon', tone: 'rust' },
  ranch: { glyph: 'barn', tone: 'sage' },
  forest: { glyph: 'forest', tone: 'pine' },
  river: { glyph: 'river', tone: 'sky' },
  mine: { glyph: 'gold-mine', tone: 'night' },
  railroad: { glyph: 'steam-locomotive', tone: 'leather' },
  canyon: { glyph: 'monument-valley', tone: 'blood' },
};

export const JOB_GLYPHS: Record<string, GlyphName> = {
  sweep_saloon: 'broom',
  deliver_mail: 'envelope',
  bartend: 'beer-stein',
  mend_fences: 'wooden-fence',
  herd_cattle: 'cow',
  break_horses: 'horse-head',
  chop_wood: 'axe-in-stump',
  hunt_rabbits: 'rabbit',
  hunt_deer: 'deer',
  fish: 'fishing-pole',
  pan_gold: 'gold-nuggets',
  ferry: 'raft',
  mine_silver: 'mining',
  blast_rock: 'dynamite',
  lay_track: 'rail-road',
  guard_payroll: 'strongbox',
  track_outlaws: 'boot-prints',
  watch_smugglers: 'spyglass',
};

export const ITEM_GLYPHS: Record<string, GlyphName> = {
  straw_hat: 'skimmer-hat',
  felt_hat: 'western-hat',
  sheriff_hat: 'outback-hat',
  bowler_hat: 'top-hat',
  patched_shirt: 'shirt',
  leather_vest: 'leather-vest',
  duster_coat: 'pirate-coat',
  poncho: 'poncho',
  old_boots: 'leather-boot',
  spur_boots: 'cowboy-boot',
  snakeskin_boots: 'boots',
  bowie_knife: 'bowie-knife',
  rusty_pistol: 'revolver',
  six_shooter: 'revolver',
  double_barrel: 'sawed-off-shotgun',
  hunting_rifle: 'musket',
  silver_revolver: 'revolver',
  long_rifle: 'winchester-rifle',
  old_mule: 'donkey',
  bay_horse: 'horse-head',
  mustang: 'horse-head',
  arabian: 'horse-head',
  rabbit_pelt: 'rabbit-head',
  fish: 'fishing',
  cowhide: 'animal-hide',
  deer_antler: 'deer-head',
  gold_nugget: 'gold-nuggets',
  silver_ore: 'ore',
  wanted_poster: 'wanted-reward',
  pocket_watch: 'pocket-watch',
};

export const NPC_ART: Record<string, Art> = {
  drunk_cowboy: { glyph: 'beer-bottle', tone: 'leather' },
  card_sharp: { glyph: 'card-ace-spades', tone: 'plum' },
  bandit_rookie: { glyph: 'bandana', tone: 'rust' },
  bandit_veteran: { glyph: 'bandit', tone: 'blood' },
  snake_carver: { glyph: 'rattlesnake', tone: 'night' },
};

export const CLASS_ART: Record<ClassId, Art> = {
  gunslinger: { glyph: 'cowboy-holster', tone: 'rust' },
  rancher: { glyph: 'lasso', tone: 'leather' },
  scout: { glyph: 'compass', tone: 'pine' },
  lawman: { glyph: 'law-star', tone: 'gold' },
};

export const ATTRIBUTE_ART: Record<AttributeId, Art> = {
  strength: { glyph: 'biceps', tone: 'rust' },
  agility: { glyph: 'sprint', tone: 'sage' },
  aim: { glyph: 'bullseye', tone: 'sky' },
  charm: { glyph: 'conversation', tone: 'plum' },
};

export const GIVER_ART: Record<QuestGiverId, Art> = {
  sheriff: { glyph: 'police-badge', tone: 'gold' },
  martha: { glyph: 'barn', tone: 'sage' },
  pete: { glyph: 'miner', tone: 'leather' },
};

export const SLOT_GLYPHS: Record<EquipSlot, GlyphName> = {
  head: 'western-hat',
  body: 'shirt',
  feet: 'cowboy-boot',
  weapon: 'revolver',
  horse: 'horse-head',
};

export const RARITY: Record<Rarity, { name: string; tone: ToneName }> = {
  common: { name: 'Sıradan', tone: 'sand' },
  uncommon: { name: 'Kaliteli', tone: 'sage' },
  rare: { name: 'Nadir', tone: 'sky' },
  epic: { name: 'Destansı', tone: 'plum' },
  legendary: { name: 'Efsanevi', tone: 'gold' },
};

/** Small single-colour icons used next to numbers. */
export const UI = {
  money: 'two-coins',
  hp: 'hearts',
  energy: 'power-lightning',
  xp: 'round-star',
  injury: 'bandage-roll',
  time: 'hourglass',
  travel: 'horseshoe',
  idle: 'campfire',
  rest: 'bed',
  shop: 'shop',
  quest: 'scroll-unfurled',
  log: 'newspaper',
  map: 'treasure-map',
  character: 'western-hat',
  levelUp: 'upgrade',
  win: 'trophy',
  loss: 'knocked-out-stars',
  draw: 'crossed-pistols',
  hit: 'bullet-impacts',
  miss: 'dodge',
  wound: 'blood',
  bag: 'knapsack',
  loot: 'swap-bag',
  done: 'check-mark',
  locked: 'padlock',
  cancel: 'cancel',
  welcome: 'tumbleweed',
} satisfies Record<string, GlyphName>;

export function jobArt(jobId: string, locationId: LocationId): Art {
  return { glyph: JOB_GLYPHS[jobId] ?? 'hourglass', tone: LOCATION_ART[locationId].tone };
}

export function itemArt(itemId: string): Art {
  const item = getItem(itemId);
  return { glyph: ITEM_GLYPHS[itemId] ?? 'swap-bag', tone: RARITY[item.rarity].tone };
}

export function npcArt(npcId: string): Art {
  return NPC_ART[npcId] ?? { glyph: 'bandit', tone: 'blood' };
}

export function questArt(questId: string): Art {
  const quest = QUESTS[questId];
  return quest ? GIVER_ART[quest.giverId] : { glyph: 'scroll-unfurled', tone: 'sand' };
}

/** The picture for a log entry, plus a small outcome marker for duels. */
export function logArt(entry: LogEntry): Art & { corner?: Art } {
  const subject = entry.subject;
  let art: Art | undefined;
  if (subject?.type === 'location' && subject.id in LOCATION_ART) art = LOCATION_ART[subject.id as LocationId];
  if (subject?.type === 'job' && JOBS[subject.id]) art = jobArt(subject.id, JOBS[subject.id].locationId);
  if (subject?.type === 'npc') art = npcArt(subject.id);
  if (subject?.type === 'quest') art = questArt(subject.id);
  if (!art) {
    if (entry.kind === 'level') art = { glyph: UI.levelUp, tone: 'gold' };
    else if (entry.kind === 'rest') art = { glyph: UI.rest, tone: 'sky' };
    else if (entry.kind === 'quest') art = { glyph: UI.quest, tone: 'sand' };
    else art = { glyph: UI.welcome, tone: 'sand' };
  }
  if (entry.duel) {
    const corner: Record<string, Art> = {
      win: { glyph: UI.win, tone: 'gold' },
      loss: { glyph: UI.loss, tone: 'blood' },
      draw: { glyph: UI.draw, tone: 'silver' },
    };
    return { ...art, corner: corner[entry.duel.outcome] };
  }
  return art;
}
