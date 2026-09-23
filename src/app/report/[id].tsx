import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { useGame } from '@/store/game';
import { Card, Emoji, Label, Screen, Title } from '@/ui/components';
import { space } from '@/ui/theme';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame((s) => s.game);
  const markLogRead = useGame((s) => s.markLogRead);
  const entry = game?.log.find((item) => item.id === id);

  useEffect(() => {
    if (entry && !entry.read) markLogRead(entry.id);
  }, [entry, markLogRead]);

  if (!entry) {
    return (
      <Screen>
        <Label tone="muted">Bu rapor artık yok.</Label>
      </Screen>
    );
  }

  const date = new Date(entry.at);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Rapor' }} />
      <Card>
        <Emoji size={48} style={styles.center}>
          {entry.icon}
        </Emoji>
        <Title size={22} center>
          {entry.title}
        </Title>
        <Label size={12} tone="muted" center>
          {date.toLocaleDateString()} {time}
        </Label>
      </Card>
      <Card>
        {entry.lines.map((line, index) =>
          line === '' ? (
            <Label key={index} size={8}>
              {' '}
            </Label>
          ) : (
            <Label key={index} size={15} style={styles.line}>
              {line}
            </Label>
          ),
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  line: { paddingVertical: space.xs / 2 },
});
