import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useNow } from '@/hooks/use-now';
import { useGame } from '@/store/game';
import { Badge } from '@/ui/art/icon';
import { logArt } from '@/ui/art/registry';
import { Card, Label, Row, Screen } from '@/ui/components';
import { timeAgo } from '@/ui/format';
import { Rewards } from '@/ui/rewards';
import { space, useTheme } from '@/ui/theme';

export default function LogScreen() {
  const game = useGame((s) => s.game);
  const markLogRead = useGame((s) => s.markLogRead);
  const theme = useTheme();
  const now = useNow(30_000);

  // Everything counts as read once the player leaves this tab.
  useFocusEffect(useCallback(() => () => markLogRead(), [markLogRead]));

  if (!game) return null;

  return (
    <Screen>
      {game.log.length === 0 && (
        <Card>
          <Label center tone="muted">
            Henüz anlatacak bir şey yok.
          </Label>
        </Card>
      )}
      {game.log.map((entry) => {
        const art = logArt(entry);
        return (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/report/[id]', params: { id: entry.id } })}
            style={({ pressed }) => [
              styles.entry,
              {
                backgroundColor: theme.surface,
                borderColor: entry.read ? theme.border : theme.accent,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Row gap={space.md} style={styles.top}>
              <Badge glyph={art.glyph} tone={art.tone} size={44} corner={art.corner} />
              <View style={styles.flex}>
                <Row>
                  <Label bold={!entry.read} style={styles.flex} numberOfLines={2}>
                    {entry.title}
                  </Label>
                  <Label size={12} tone="muted">
                    {timeAgo(entry.at, now)}
                  </Label>
                </Row>
                {entry.rewards ? (
                  <Rewards rewards={entry.rewards} />
                ) : (
                  <Label size={13} tone="muted" numberOfLines={1}>
                    {entry.lines[0]}
                  </Label>
                )}
              </View>
            </Row>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 6 },
  top: { alignItems: 'flex-start' },
  entry: { borderWidth: 1, borderRadius: 12, padding: space.md },
});
