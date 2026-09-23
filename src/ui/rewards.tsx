import { StyleSheet, Text, View } from 'react-native';

import { getItem, type LogRewards } from '@/game';

import type { GlyphName } from './art/glyphs';
import { Badge, Glyph } from './art/icon';
import { UI, itemArt } from './art/registry';
import { money } from './format';
import { useTheme } from './theme';

/** An item's badge and name, e.g. in drop lists and rewards. */
export function ItemChip({ itemId, count, size = 22 }: { itemId: string; count?: number; size?: number }) {
  const theme = useTheme();
  const art = itemArt(itemId);
  return (
    <View style={[styles.chip, { backgroundColor: theme.surfaceAlt }]}>
      <Badge glyph={art.glyph} tone={art.tone} size={size} />
      <Text style={[styles.text, { color: theme.text }]}>
        {getItem(itemId).name}
        {count && count > 1 ? ` ×${count}` : ''}
      </Text>
    </View>
  );
}

function Amount({ glyph, color, text }: { glyph: GlyphName; color: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.surfaceAlt }]}>
      <Glyph name={glyph} size={15} color={color} />
      <Text style={[styles.text, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

export function Rewards({ rewards }: { rewards: LogRewards }) {
  const theme = useTheme();
  const parts = [];
  if (rewards.money) parts.push(<Amount key="money" glyph={UI.money} color={theme.accent} text={`+${money(rewards.money)}`} />);
  if (rewards.moneyLost) {
    parts.push(<Amount key="moneyLost" glyph={UI.money} color={theme.danger} text={`-${money(rewards.moneyLost)}`} />);
  }
  if (rewards.xp) parts.push(<Amount key="xp" glyph={UI.xp} color={theme.xp} text={`+${rewards.xp} XP`} />);
  if (rewards.energy) {
    parts.push(<Amount key="energy" glyph={UI.energy} color={theme.energy} text={`+${rewards.energy} enerji`} />);
  }
  if (rewards.hpGained) parts.push(<Amount key="hpGained" glyph={UI.hp} color={theme.hp} text={`+${rewards.hpGained} can`} />);
  if (rewards.hpLost) parts.push(<Amount key="hpLost" glyph={UI.injury} color={theme.danger} text={`-${rewards.hpLost} can`} />);
  for (const stack of rewards.items ?? []) {
    parts.push(<ItemChip key={stack.itemId} itemId={stack.itemId} count={stack.count} />);
  }
  if (parts.length === 0) return null;
  return <View style={styles.wrap}>{parts}</View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 13, fontWeight: '700' },
});
