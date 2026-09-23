import { describe, expect, it } from 'vitest';

import { ITEM_LIST, JOB_LIST, LOCATION_ORDER, NPC_LIST } from '@/game';

import { GLYPHS } from './glyphs';
import { ITEM_GLYPHS, JOB_GLYPHS, LOCATION_ART, NPC_ART, UI } from './registry';

describe('art', () => {
  it('gives every piece of content its own picture', () => {
    for (const job of JOB_LIST) expect(JOB_GLYPHS[job.id], job.id).toBeDefined();
    for (const item of ITEM_LIST) expect(ITEM_GLYPHS[item.id], item.id).toBeDefined();
    for (const npc of NPC_LIST) expect(NPC_ART[npc.id], npc.id).toBeDefined();
    for (const id of LOCATION_ORDER) expect(LOCATION_ART[id], id).toBeDefined();
  });

  it('only uses glyphs that were copied into the app', () => {
    const used = [
      ...Object.values(JOB_GLYPHS),
      ...Object.values(ITEM_GLYPHS),
      ...Object.values(NPC_ART).map((art) => art.glyph),
      ...Object.values(LOCATION_ART).map((art) => art.glyph),
      ...Object.values(UI),
    ];
    for (const name of used) expect(GLYPHS[name], name).toBeTruthy();
  });
});
