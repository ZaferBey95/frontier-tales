import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { CLASSES, getNpc, type DuelRound, type LogEntry } from '@/game';
import { useGame } from '@/store/game';
import type { GlyphName } from '@/ui/art/glyphs';
import { Badge, Glyph } from '@/ui/art/icon';
import { CLASS_ART, UI, logArt, npcArt } from '@/ui/art/registry';
import { Bar, Card, Flourish, Label, Row, Screen, Title } from '@/ui/components';
import { Rewards } from '@/ui/rewards';
import { space, useTheme } from '@/ui/theme';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame((s) => s.game);
  const markLogRead = useGame((s) => s.markLogRead);
  const entry = game?.log.find((item) => item.id === id);

  useEffect(() => {
    if (entry && !entry.read) markLogRead(entry.id);
  }, [entry, markLogRead]);

  if (!entry || !game) {
    return (
      <Screen>
        <Label tone="muted">Bu rapor artık yok.</Label>
      </Screen>
    );
  }

  const art = logArt(entry);
  const date = new Date(entry.at);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <Screen>
      <Stack.Screen options={{ title: entry.duel ? 'Düello' : 'Rapor' }} />
      <Card>
        <View style={styles.hero}>
          {entry.duel ? (
            <DuelHeader entry={entry} classId={game.character.classId} />
          ) : (
            <Badge glyph={art.glyph} tone={art.tone} size={80} corner={art.corner} />
          )}
          <Title size={22} center>
            {entry.title}
          </Title>
          <Label size={12} tone="muted" center>
            {date.toLocaleDateString()} {time}
          </Label>
        </View>
        {entry.lines.map((line, index) => (
          <Label key={index} center tone="muted">
            {line}
          </Label>
        ))}
        {entry.rewards && (
          <>
            <Flourish />
            <View style={styles.rewards}>
              <Rewards rewards={entry.rewards} />
            </View>
          </>
        )}
      </Card>
      {entry.duel && <DuelRounds entry={entry} />}
    </Screen>
  );
}

function DuelHeader({ entry, classId }: { entry: LogEntry; classId: keyof typeof CLASSES }) {
  const duel = entry.duel!;
  const theme = useTheme();
  const enemy = npcArt(duel.npcId);
  const player = CLASS_ART[classId];
  const outcome = { win: UI.win, loss: UI.loss, draw: UI.draw }[duel.outcome];
  return (
    <Row gap={space.lg} style={styles.versus}>
      <Badge glyph="western-hat" tone={player.tone} size={64} shape="circle" />
      <View style={[styles.outcome, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Glyph name={outcome} size={30} color={duel.outcome === 'loss' ? theme.danger : theme.accent} />
      </View>
      <Badge glyph={enemy.glyph} tone={enemy.tone} size={64} shape="circle" />
    </Row>
  );
}

function DuelRounds({ entry }: { entry: LogEntry }) {
  const duel = entry.duel!;
  const theme = useTheme();
  const npc = getNpc(duel.npcId);
  const last = duel.rounds[duel.rounds.length - 1];

  return (
    <Card>
      <Title size={18}>Düello turları</Title>
      <Row gap={space.md}>
        <View style={styles.flex}>
          <Label size={12} tone="muted">
            Sen
          </Label>
          <Bar value={last?.playerHp ?? duel.startHp} max={duel.startHp} color={theme.hp} />
        </View>
        <View style={styles.flex}>
          <Label size={12} tone="muted">
            {npc.name}
          </Label>
          <Bar value={last?.npcHp ?? npc.hp} max={npc.hp} color={theme.hp} />
        </View>
      </Row>
      {duel.rounds.map((round, index) => (
        <RoundRow key={index} round={round} npcName={npc.name} />
      ))}
    </Card>
  );
}

function RoundRow({ round, npcName }: { round: DuelRound; npcName: string }) {
  const theme = useTheme();
  const mine = round.shooter === 'player';
  let glyph: GlyphName = UI.miss;
  let color = theme.textMuted;
  let text = mine ? 'Iskaladın.' : `${npcName} ıskaladı.`;
  if (round.hit && mine) {
    glyph = UI.hit;
    color = theme.accent;
    text = `Vurdun! -${round.damage} (${npcName}: ${round.npcHp})`;
  } else if (round.hit) {
    glyph = UI.wound;
    color = theme.danger;
    text = `${npcName} seni vurdu! -${round.damage} (Sen: ${Math.round(round.playerHp)})`;
  }
  return (
    <Row gap={space.sm}>
      <Label size={12} tone="muted" style={styles.round}>
        {round.round}.
      </Label>
      <Glyph name={glyph} size={18} color={color} />
      <Label size={14} style={styles.flex} tone={round.hit ? 'default' : 'muted'}>
        {text}
      </Label>
    </Row>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  hero: { alignItems: 'center', gap: space.sm },
  rewards: { alignItems: 'center' },
  versus: { justifyContent: 'center' },
  outcome: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  round: { width: 22, textAlign: 'right' },
});
