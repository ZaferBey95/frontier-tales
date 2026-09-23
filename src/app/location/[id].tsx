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
  getItem,
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
import { Button, Card, Chip, Emoji, Label, Pill, Row, Screen, Section, Title } from '@/ui/components';
import { duration, money, percent, signed } from '@/ui/format';
import { GameHeader } from '@/ui/game-header';
import { space } from '@/ui/theme';

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
          <Emoji size={44}>{location.icon}</Emoji>
          <View style={styles.flex}>
            <Title size={22}>{location.name}</Title>
            <Label tone="muted">{location.description}</Label>
          </View>
        </Row>
        {here ? (
          <Pill label="Buradasın" tone="primary" />
        ) : heading ? (
          <Pill label="Oraya gidiyorsun" tone="accent" />
        ) : (
          <Button
            label={`Buraya git · 🐎 ${duration(travelMs(game.character, projectedLocation(game), location.id))}`}
            onPress={() => act((state, at) => startTravel(state, location.id, at), `Yola çıktın: ${location.name}`)}
          />
        )}
      </Card>

      {location.services.includes('shop') && (
        <Card>
          <Row>
            <Emoji size={28}>🏪</Emoji>
            <View style={styles.flex}>
              <Label bold>Genel Mağaza</Label>
              <Label size={13} tone="muted">
                Şapka, giysi, silah ve binek. Ganimetlerini de burada satabilirsin.
              </Label>
            </View>
          </Row>
          <Button
            variant="secondary"
            label={here ? 'Mağazaya gir' : 'Mağazaya girmek için buraya gel'}
            disabled={!here}
            onPress={() => router.push('/shop')}
          />
        </Card>
      )}

      {location.services.includes('hotel') && (
        <Card>
          <Row>
            <Emoji size={28}>🛏️</Emoji>
            <View style={styles.flex}>
              <Label bold>Otel</Label>
              <Label size={13} tone="muted">
                {duration(REST_MS)} dinlen: +{REST_ENERGY} enerji, +{percent(REST_HP_SHARE)} can.
              </Label>
            </View>
          </Row>
          <Button
            variant="secondary"
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
              label={`${JOB_DURATIONS[d].label} · ⚡${JOB_DURATIONS[d].energy}`}
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
            onStart={() =>
              act(
                (state, at) => startJob(state, job.id, durationId, at),
                `Sıraya eklendi: ${job.name}`,
              )
            }
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
  const estimate = estimateJob(character, job, durationId);
  const helpful = ATTRIBUTE_ORDER.filter((attr) => (job.weights[attr] ?? 0) > 0)
    .sort((a, b) => (job.weights[b] ?? 0) - (job.weights[a] ?? 0))
    .map((attr) => `${ATTRIBUTES[attr].icon} ${ATTRIBUTES[attr].name}`);

  let label = here ? 'Başla' : 'Git ve başla';
  if (!estimate.canDo) label = 'Becerin henüz yetmiyor';
  else if (energy < estimate.energy) label = 'Enerjin yetmiyor';

  return (
    <Card>
      <Row gap={space.md}>
        <Emoji size={30}>{job.icon}</Emoji>
        <View style={styles.flex}>
          <Label bold>{job.name}</Label>
          <Label size={13} tone="muted">
            {job.description}
          </Label>
        </View>
      </Row>
      <Label size={13} tone="muted">
        İşe yarayan: {helpful.join(', ')}
      </Label>
      <Row gap={space.xs} style={styles.wrap}>
        <Pill label={`İş puanı ${signed(estimate.points)}`} tone={estimate.canDo ? 'success' : 'danger'} />
        <Pill label={`💰 ~${money(estimate.money)}`} tone="accent" />
        <Pill label={`⭐ ${estimate.xp} XP`} />
        <Pill label={`⚡ ${estimate.energy}`} />
        {job.danger > 0 && <Pill label={`🩹 ${percent(estimate.injuryChance)}`} tone="danger" />}
      </Row>
      {job.drops.length > 0 && (
        <Label size={13} tone="muted">
          Bulunabilir: {job.drops.map((drop) => `${getItem(drop.itemId).icon} ${getItem(drop.itemId).name}`).join(', ')}
        </Label>
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
  const hpBucket = Math.floor(hp / 5) * 5;
  const character = game.character;
  const chance = useMemo(() => estimateWinChance(character, Math.max(1, hpBucket), npc), [character, hpBucket, npc]);
  const busy = game.queue.length > 0;

  let label = `Düello et · ⚡${DUEL_ENERGY}`;
  if (!here) label = 'Düello için buraya gel';
  else if (busy) label = 'Önce sıradaki işlerini bitir';

  return (
    <Card>
      <Row gap={space.md}>
        <Emoji size={32}>{npc.icon}</Emoji>
        <View style={styles.flex}>
          <Label bold>{npc.name}</Label>
          <Label size={13} tone="muted">
            Sv. {npc.level} · ❤️ {npc.hp}
          </Label>
        </View>
      </Row>
      <Label size={13} tone="muted">
        {npc.description}
      </Label>
      <Row gap={space.xs} style={styles.wrap}>
        <Pill label={`💰 ${money(npc.moneyMin)}–${money(npc.moneyMax)}`} tone="accent" />
        <Pill label={`⭐ ${npc.xp} XP`} />
        <Pill
          label={`Kazanma şansı ~${percent(chance)}`}
          tone={chance >= 0.7 ? 'success' : chance >= 0.4 ? 'accent' : 'danger'}
        />
      </Row>
      <Button small label={label} disabled={!here || busy} onPress={onDuel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  wrap: { flexWrap: 'wrap' },
});
