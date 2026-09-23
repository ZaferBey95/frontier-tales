import { ATTRIBUTES, ATTRIBUTE_ORDER, type ItemDef } from '@/game';

import { signed } from './format';

/** Short lines describing what an item does. */
export function itemStats(item: ItemDef): string[] {
  const stats: string[] = [];
  for (const attr of ATTRIBUTE_ORDER) {
    const bonus = item.bonuses?.[attr];
    if (bonus) stats.push(`${ATTRIBUTES[attr].icon} ${signed(bonus)} ${ATTRIBUTES[attr].name}`);
  }
  if (item.weapon) stats.push(`💥 ${item.weapon.min}–${item.weapon.max} hasar`);
  if (item.speed) stats.push(`🐎 %${Math.round((item.speed - 1) * 100)} daha hızlı`);
  return stats;
}
