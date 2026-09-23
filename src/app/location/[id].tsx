import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ATTRIBUTES,
  ATTRIBUTE_ORDER,
  DUEL_ENERGY,
  JOB_DURATIONS,
  JOB_DURATION_ORDER,
  LOCATIONS,
  REST_ENERGY,
  REST_HP_SHARE,
  REST_MS,
  duel,
  estimateJob,
  estimateWinChance,
  isTravelling,
  jobsAt,
  npcsAt,
  projectedLocation,
  restCost,
  startJob,
  startRest,
  startTravel,
  travelMs,
  vitalsAt,
  type Character,
  type GameState,
  type JobDef,
  type JobDurationId,
  type LocationId,
  type NpcDef,
} from '@/game';
import { useNow } from '@/hooks/use-now';
import { useGame } from '@/store/game';
import { Badge } from '@/ui/art/icon';
import { ATTRIBUTE_ART, LOCATION_ART, UI, jobArt, npcArt } from '@/ui/art/registry';
import { Button, Card, Chip, Label, Pill, Row, Screen, Section, Title } from '@/ui/components';
import { duration, money, percent, signed } from '@/ui/format';
import { GameHeader } from '@/ui/game-header';
import { ItemChip } from '@/ui/rewards';
import { space, useTheme } from '@/ui/theme';

export default function LocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame((s) => s.game);
  const act = useGame((s) => s.act);
  const now = useNow(5000);
  const [durationId, setDurationId] = useState<JobDurationId>('short');

  const location = LOCATIONS[id as LocationId];
  if (!game || !location) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Bulunamadı' }} />
        <Label>Böyle bir yer yok.</Label>
      </Screen>
    );
  }

  const art = LOCATION_ART[location.id];
  const travelling = isTravelling(game);
  const here = !travelling && game.character.locationId === location.id;
  const heading = projectedLocation(game) === location.id && !here;
  const jobs = jobsAt(location.id);
  const npcs = npcsAt(location.id);
  const vitals = vitalsAt(game, now);

  return (
    <Screen header={<GameHeader />}>
      <Stack.Screen options={{ title: location.name }} />

      <Card>
        <Row gap={space.md}>
          <Badge glyph={art.glyph} tone={art.tone} size={64} />
          <View style={styles.flex}>
            <Title size={22}>{location.name}</Title>
            <Label tone="muted">{location.description}</Label>
          </View>
        </Row>
        {here ? (
          <Pill label="Buradasın" tone="primary" glyph="check-mark" />
        ) : heading ? (
          <Pill label="Oraya gidiyorsun" tone="accent" glyph={UI.travel} />
        ) : (
          <Button
            glyph={UI.travel}
            label={`Buraya git · ${duration(travelMs(game.character, projectedLocation(game), location.id))}`}
            onPress={() => act((state, at) => startTravel(state, location.id, at), `Yola çıktın: ${location.name}`)}
          />
        )}
      </Card>

      {location.services.includes('shop') && (
        <Card>
          <Row gap={space.md}>
            <Badge glyph={UI.shop} tone="leather" size={44} />
            <View style={styles.flex}>
              <Label bold>Genel Mağaza</Label>
              <Label size={13} tone="muted">
                Şapka, giysi, silah ve binek. Ganimetlerini de burada satabilirsin.
              </Label>
            </View>
          </Row>
          <Button
            variant="secondary"
            label={here ? 'Mağazaya gir' : 'Mağaza için kasabada olmalısın'}
            disabled={!here}
            onPress={() => router.push('/shop')}
          />
        </Card>
      )}

      {location.services.includes('hotel') && (
        <Card>
          <Row gap={space.md}>
            <Badge glyph={UI.rest} tone="sky" size={44} />
            <View style={styles.flex}>
              <Label bold>Otel</Label>
              <Label size={13} tone="muted">
                {duration(REST_MS)} dinlen: +{REST_ENERGY} enerji, +{percent(REST_HP_SHARE)} can.
              </Label>
            </View>
          </Row>
          <Button
            variant="secondary"
            glyph={UI.money}
            label={`Oda tut · ${money(restCost(game.character.level))}`}
            onPress={() => act((state, at) => startRest(state, at), 'Otelde bir oda tuttun.')}
          />
        </Card>
      )}

      <Section title="İşler">
        <Row gap={space.xs} style={styles.wrap}>
          {JOB_DURATION_ORDER.map((d) => (
            <Chip
              key={d}
              label={`${JOB_DURATIONS[d].label} · ${JOB_DURATIONS[d].energy}`}
              glyph={UI.energy}
              selected={durationId === d}
              onPress={() => setDurationId(d)}
            />
          ))}
        </Row>
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            character={game.character}
            durationId={durationId}
            here={projectedLocation(game) === location.id}
            energy={vitals.energy}
            onStart={() => act((state, at) => startJob(state, job.id, durationId, at), `Sıraya eklendi: ${job.name}`)}
          />
        ))}
      </Section>

      {npcs.length > 0 && (
        <Section title="Düello">
          {npcs.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              game={game}
              here={here}
              hp={vitals.hp}
              onDuel={() => {
                const result = act((state, at) => duel(state, npc.id, at));
                if (result?.ok && result.logId) router.push({ pathname: '/report/[id]', params: { id: result.logId } });
              }}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

function JobCard({
  job,
  character,
  durationId,
  here,
  energy,
  onStart,
}: {
  job: JobDef;
  character: Character;
  durationId: JobDurationId;
  here: boolean;
  energy: number;
  onStart: () => void;
}) {
  const theme = useTheme();
  const estimate = estimateJob(character, job, durationId);
  const art = jobArt(job.id, job.locationId);
  const helpful = ATTRIBUTE_ORDER.filter((attr) => (job.weights[attr] ?? 0) > 0).sort(
    (a, b) => (job.weights[b] ?? 0) - (job.weights[a] ?? 0),
  );

  let label = here ? 'Başla' : 'Git ve başla';
  if (!estimate.canDo) label = 'Becerin henüz yetmiyor';
  else if (energy < estimate.energy) label = 'Enerjin yetmiyor';

  return (
    <Card>
      <Row gap={space.md}>
        <Badge glyph={art.glyph} tone={art.tone} size={52} dimmed={!estimate.canDo} />
        <View style={styles.flex}>
          <Label bold>{job.name}</Label>
          <Label size={13} tone="muted">
            {job.description}
          </Label>
        </View>
      </Row>
      <Row gap={space.xs} style={styles.wrap}>
        {helpful.map((attr) => (
          <Pill key={attr} label={ATTRIBUTES[attr].name} glyph={ATTRIBUTE_ART[attr].glyph} tone="muted" />
        ))}
        <Pill label={`İş puanı ${signed(estimate.points)}`} tone={estimate.canDo ? 'success' : 'danger'} />
      </Row>
      <Row gap={space.xs} style={styles.wrap}>
        <Pill label={`~${money(estimate.money)}`} glyph={UI.money} glyphColor={theme.accent} />
        <Pill label={`${estimate.xp} XP`} glyph={UI.xp} glyphColor={theme.xp} />
        <Pill label={`${estimate.energy}`} glyph={UI.energy} glyphColor={theme.energy} />
        {job.danger > 0 && (
          <Pill label={`Yaralanma ${percent(estimate.injuryChance)}`} glyph={UI.injury} tone="danger" />
        )}
      </Row>
      {job.drops.length > 0 && (
        <View style={styles.drops}>
          <Label size={12} tone="muted">
            Bulunabilir:
          </Label>
          {job.drops.map((drop) => (
            <ItemChip key={drop.itemId} itemId={drop.itemId} size={20} />
          ))}
        </View>
      )}
      <Button small label={label} disabled={!estimate.canDo || energy < estimate.energy} onPress={onStart} />
    </Card>
  );
}

function NpcCard({
  npc,
  game,
  here,
  hp,
  onDuel,
}: {
  npc: NpcDef;
  game: GameState;
  here: boolean;
  hp: number;
  onDuel: () => void;
}) {
  const theme = useTheme();
  const hpBucket = Math.floor(hp / 5) * 5;
  const character = game.character;
  const chance = useMemo(() => estimateWinChance(character, Math.max(1, hpBucket), npc), [character, hpBucket, npc]);
  const busy = game.queue.length > 0;
  const art = npcArt(npc.id);

  let label = `Düello et · ${DUEL_ENERGY} enerji`;
  if (!here) label = 'Düello için buraya gel';
  else if (busy) label = 'Önce sıradaki işlerini bitir';

  return (
    <Card>
      <Row gap={space.md}>
        <Badge glyph={art.glyph} tone={art.tone} size={56} shape="circle" />
        <View style={styles.flex}>
          <Label bold>{npc.name}</Label>
          <Row gap={space.xs}>
            <Pill label={`Sv. ${npc.level}`} tone="muted" />
            <Pill label={`${npc.hp}`} glyph={UI.hp} glyphColor={theme.hp} />
          </Row>
        </View>
      </Row>
      <Label size={13} tone="muted">
        {npc.description}
      </Label>
      <Row gap={space.xs} style={styles.wrap}>
        <Pill label={`${money(npc.moneyMin)}–${money(npc.moneyMax)}`} glyph={UI.money} glyphColor={theme.accent} />
        <Pill label={`${npc.xp} XP`} glyph={UI.xp} glyphColor={theme.xp} />
        <Pill
          label={`Kazanma şansı ~${percent(chance)}`}
          glyph={UI.win}
          tone={chance >= 0.7 ? 'success' : chance >= 0.4 ? 'accent' : 'danger'}
        />
      </Row>
      <Button small glyph={UI.draw} label={label} disabled={!here || busy} onPress={onDuel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  wrap: { flexWrap: 'wrap' },
  drops: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
});
