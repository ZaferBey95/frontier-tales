import type { ClassDef, ClassId } from '../types';

export const CLASS_ORDER: ClassId[] = ['gunslinger', 'rancher', 'scout', 'lawman'];

export const CLASSES: Record<ClassId, ClassDef> = {
  gunslinger: {
    id: 'gunslinger',
    name: 'Silahşör',
    icon: '💥',
    description: 'Silahı herkesten hızlı çeker. Düellolarda %15 daha fazla hasar verir.',
    startBonus: { aim: 1 },
    perks: { duelDamage: 0.15 },
  },
  rancher: {
    id: 'rancher',
    name: 'Rançer',
    icon: '🐂',
    description: 'Toprağın ve hayvanların adamı. İşlerden %15 daha fazla para kazanır.',
    startBonus: { strength: 1 },
    perks: { jobMoney: 0.15 },
  },
  scout: {
    id: 'scout',
    name: 'İzci',
    icon: '🧭',
    description: 'Bu toprakları avucunun içi gibi bilir. %20 daha hızlı yol alır, eşya bulma şansı %50 daha yüksektir.',
    startBonus: { agility: 1 },
    perks: { travelSpeed: 0.2, dropChance: 0.5 },
  },
  lawman: {
    id: 'lawman',
    name: 'Kanun Adamı',
    icon: '⭐',
    description: 'Yıldızını gururla taşır. %25 daha fazla canı vardır ve %10 daha fazla tecrübe kazanır.',
    startBonus: { charm: 1 },
    perks: { maxHp: 0.25, xp: 0.1 },
  },
};
