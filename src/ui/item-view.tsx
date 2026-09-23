import { StyleSheet, Text, View } from 'react-native';

import { getItem } from '@/game';

import { Badge } from './art/icon';
import { RARITY, itemArt } from './art/registry';
import { TONES } from './art/tones';
import { Pill } from './components';
import { itemStats } from './item-stats';

export function ItemBadge({ itemId, size = 52, dimmed }: { itemId: string; size?: number; dimmed?: boolean }) {
  const art = itemArt(itemId);
  return <Badge glyph={art.glyph} tone={art.tone} size={size} dimmed={dimmed} />;
}

export function RarityTag({ itemId }: { itemId: string }) {
  const rarity = RARITY[getItem(itemId).rarity];
  const tone = TONES[rarity.tone];
  return (
    <View style={[styles.tag, { backgroundColor: tone.bottom, borderColor: tone.rim }]}>
      <Text style={[styles.tagText, { color: tone.ink }]}>{rarity.name}</Text>
    </View>
  );
}

export function ItemStatsRow({ itemId }: { itemId: string }) {
  const stats = itemStats(getItem(itemId));
  if (stats.length === 0) return null;
  return (
    <View style={styles.stats}>
      {stats.map((stat) => (
        <Pill key={stat.text} label={stat.text} glyph={stat.glyph} tone={stat.negative ? 'danger' : 'default'} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
