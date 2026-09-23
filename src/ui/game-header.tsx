import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CLASSES,
  JOB_DURATIONS,
  LOCATIONS,
  cancelTask,
  getJob,
  taskTimes,
  vitalsAt,
  xpToNext,
  type GameState,
  type Task,
} from '@/game';
import { useNow } from '@/hooks/use-now';
import { useGame } from '@/store/game';

import { Bar, Label, Row } from './components';
import { confirm } from './confirm';
import { countdown, duration, money } from './format';
import { MAX_WIDTH, space, useTheme } from './theme';

export function taskLabel(task: Task): { icon: string; text: string } {
  switch (task.kind) {
    case 'travel': {
      const to = LOCATIONS[task.to];
      return { icon: '🐎', text: `Yolculuk: ${to.name}` };
    }
    case 'job': {
      const job = getJob(task.jobId);
      return { icon: job.icon, text: `${job.name} (${JOB_DURATIONS[task.duration].label})` };
    }
    case 'rest':
      return { icon: '🛏️', text: 'Otelde dinlenme' };
  }
}

export function GameHeader({ safeTop = false }: { safeTop?: boolean }) {
  const game = useGame((s) => s.game);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const now = useNow();
  if (!game) return null;

  const { character } = game;
  const vitals = vitalsAt(game, now);
  const need = xpToNext(character.level);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: (safeTop ? insets.top : 0) + space.sm },
      ]}>
      <View style={styles.inner}>
        <Row>
          <Label bold style={styles.flex} numberOfLines={1}>
            {CLASSES[character.classId].icon} {character.name} · Sv. {character.level}
          </Label>
          <Label bold tone="accent">
            💰 {money(character.money)}
          </Label>
        </Row>
        <Row gap={space.md}>
          <Meter icon="❤️" value={vitals.hp} max={vitals.hpMax} color={theme.hp} />
          <Meter icon="⚡" value={vitals.energy} max={vitals.energyMax} color={theme.energy} />
          <Meter icon="⭐" value={character.xp} max={need} color={theme.xp} />
        </Row>
        <TaskQueue game={game} now={now} />
      </View>
    </View>
  );
}

function Meter({ icon, value, max, color }: { icon: string; value: number; max: number; color: string }) {
  return (
    <View style={styles.meter} accessible accessibilityLabel={`${icon} ${Math.floor(value)} / ${max}`}>
      <Row gap={4}>
        <Text style={styles.meterIcon}>{icon}</Text>
        <Label size={12} tone="muted">
          {Math.floor(value)}/{max}
        </Label>
      </Row>
      <Bar value={value} max={max} color={color} height={6} />
    </View>
  );
}

function TaskQueue({ game, now }: { game: GameState; now: number }) {
  const act = useGame((s) => s.act);
  const theme = useTheme();
  const times = taskTimes(game);

  if (times.length === 0) {
    return (
      <Label size={13} tone="muted">
        💤 Boştasın. Haritadan bir iş seç ya da yola çık.
      </Label>
    );
  }

  const cancel = async (task: Task, running: boolean) => {
    const later = game.queue.length - game.queue.findIndex((t) => t.id === task.id) - 1;
    const parts = [];
    if (running && task.kind === 'job') parts.push('Başlamış bir işin enerjisi geri verilmez.');
    if (later > 0) parts.push(`Arkasından sıradaki ${later} iş de iptal olur.`);
    if (parts.length > 0 && !(await confirm('İptal edilsin mi?', parts.join(' '), 'İptal et'))) return;
    act((state, at) => cancelTask(state, task.id, at));
  };

  return (
    <View style={styles.queue}>
      {times.map(({ task, start, end }, index) => {
        const running = index === 0;
        const { icon, text } = taskLabel(task);
        return (
          <View key={task.id} style={[styles.task, { borderColor: theme.border, backgroundColor: running ? theme.surfaceAlt : 'transparent' }]}>
            <Row>
              <Text style={styles.taskIcon}>{icon}</Text>
              <Label size={13} bold={running} style={styles.flex} numberOfLines={1}>
                {text}
              </Label>
              <Label size={13} tone={running ? 'accent' : 'muted'} bold={running}>
                {running ? countdown(end - now) : `sırada · ${duration(end - start)}`}
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${text} iptal et`}
                hitSlop={10}
                onPress={() => cancel(task, running)}
                style={styles.cancel}>
                <Text style={[styles.cancelText, { color: theme.textMuted }]}>✕</Text>
              </Pressable>
            </Row>
            {running && <Bar value={now - start} max={end - start} color={theme.primary} height={4} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, paddingHorizontal: space.lg, paddingBottom: space.sm, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MAX_WIDTH, gap: 6 },
  flex: { flex: 1 },
  meter: { flex: 1, gap: 2 },
  meterIcon: { fontSize: 12 },
  queue: { gap: 4 },
  task: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  taskIcon: { fontSize: 14 },
  cancel: { paddingLeft: 6 },
  cancelText: { fontSize: 14, fontWeight: '700' },
});
