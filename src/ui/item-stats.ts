import { ATTRIBUTES, ATTRIBUTE_ORDER, type ItemDef } from '@/game';

import type { GlyphName } from './art/glyphs';
import { ATTRIBUTE_ART } from './art/registry';
import { signed } from './format';

export interface ItemStat {
  glyph: GlyphName;
  text: string;
  negative?: boolean;
}

/** Short lines describing what an item does. */
export function itemStats(item: ItemDef): ItemStat[] {
  const stats: ItemStat[] = [];
  for (const attr of ATTRIBUTE_ORDER) {
    const bonus = item.bonuses?.[attr];
    if (bonus) {
      stats.push({ glyph: ATTRIBUTE_ART[attr].glyph, text: `${signed(bonus)} ${ATTRIBUTES[attr].name}`, negative: bonus < 0 });
    }
  }
  if (item.weapon) stats.push({ glyph: 'bullet-impacts', text: `${item.weapon.min}–${item.weapon.max} hasar` });
  if (item.speed) stats.push({ glyph: 'horseshoe', text: `%${Math.round((item.speed - 1) * 100)} daha hızlı` });
  return stats;
}
