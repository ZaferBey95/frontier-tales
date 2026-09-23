import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useNow } from '@/hooks/use-now';
import { useGame } from '@/store/game';
import { Card, Emoji, Label, Row, Screen } from '@/ui/components';
import { timeAgo } from '@/ui/format';
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
      {game.log.map((entry) => (
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
          <Row gap={space.md}>
            <Emoji size={26}>{entry.icon}</Emoji>
            <View style={styles.flex}>
              <Label bold={!entry.read}>{entry.title}</Label>
              <Label size={13} tone="muted" numberOfLines={1}>
                {entry.lines.filter(Boolean).slice(0, 3).join(' · ')}
              </Label>
            </View>
            <Label size={12} tone="muted">
              {timeAgo(entry.at, now)}
            </Label>
          </Row>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  entry: { borderWidth: 1, borderRadius: 12, padding: space.md },
});
