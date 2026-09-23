import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
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

import type { GlyphName } from './art/glyphs';
import { Badge, Glyph } from './art/icon';
import { CLASS_ART, LOCATION_ART, UI, jobArt, type Art } from './art/registry';
import { Bar, IconText, Label, Row } from './components';
import { confirm } from './confirm';
import { countdown, duration, money } from './format';
import { MAX_WIDTH, space, useTheme } from './theme';

export function taskArt(task: Task): Art & { text: string } {
  switch (task.kind) {
    case 'travel':
      return { ...LOCATION_ART[task.to], text: `Yolculuk: ${LOCATIONS[task.to].name}` };
    case 'job': {
      const job = getJob(task.jobId);
      return { ...jobArt(job.id, job.locationId), text: `${job.name} (${JOB_DURATIONS[task.duration].label})` };
    }
    case 'rest':
      return { glyph: UI.rest, tone: 'sky', text: 'Otelde dinlenme' };
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
  const classArt = CLASS_ART[character.classId];

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: (safeTop ? insets.top : 0) + space.sm },
      ]}>
      <View style={styles.inner}>
        <Row>
          <Badge glyph={classArt.glyph} tone={classArt.tone} size={26} shape="circle" />
          <Label bold style={styles.flex} numberOfLines={1}>
            {character.name} · Sv. {character.level}
          </Label>
          <IconText glyph={UI.money} tone="accent" bold size={15}>
            {money(character.money)}
          </IconText>
        </Row>
        <Row gap={space.md}>
          <Meter glyph={UI.hp} label="Can" value={vitals.hp} max={vitals.hpMax} color={theme.hp} />
          <Meter glyph={UI.energy} label="Enerji" value={vitals.energy} max={vitals.energyMax} color={theme.energy} />
          <Meter glyph={UI.xp} label="Tecrübe" value={character.xp} max={need} color={theme.xp} />
        </Row>
        <TaskQueue game={game} now={now} />
      </View>
    </View>
  );
}

function Meter({ glyph, label, value, max, color }: { glyph: GlyphName; label: string; value: number; max: number; color: string }) {
  return (
    <View style={styles.meter} accessible accessibilityLabel={`${label} ${Math.floor(value)} / ${max}`}>
      <Row gap={4}>
        <Glyph name={glyph} size={13} color={color} />
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
      <IconText glyph={UI.idle} tone="muted" size={13} iconColor={theme.accent}>
        Boştasın. Haritadan bir iş seç ya da yola çık.
      </IconText>
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
        const art = taskArt(task);
        return (
          <View
            key={task.id}
            style={[styles.task, { borderColor: theme.border, backgroundColor: running ? theme.surfaceAlt : 'transparent' }]}>
            <Row>
              <Badge glyph={art.glyph} tone={art.tone} size={22} />
              <Label size={13} bold={running} style={styles.flex} numberOfLines={1}>
                {art.text}
              </Label>
              <Label size={13} tone={running ? 'accent' : 'muted'} bold={running}>
                {running ? countdown(end - now) : `sırada · ${duration(end - start)}`}
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${art.text} iptal et`}
                hitSlop={10}
                onPress={() => cancel(task, running)}
                style={styles.cancel}>
                <Glyph name={UI.cancel} size={16} color={theme.textMuted} />
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
  queue: { gap: 4 },
  task: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, gap: 4 },
  cancel: { paddingLeft: 4 },
});
