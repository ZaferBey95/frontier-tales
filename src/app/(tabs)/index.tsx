import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  LOCATIONS,
  LOCATION_ORDER,
  distance,
  isTravelling,
  projectedLocation,
  startTravel,
  taskTimes,
  travelMs,
  type LocationId,
} from '@/game';
import { useNow } from '@/hooks/use-now';
import { useGame } from '@/store/game';
import { Badge } from '@/ui/art/icon';
import { LOCATION_ART, UI } from '@/ui/art/registry';
import { Button, Card, IconText, Label, Pill, Row, Screen, Section } from '@/ui/components';
import { countdown, duration } from '@/ui/format';
import { space, useTheme } from '@/ui/theme';
import { WorldMap } from '@/ui/world-map';

export default function MapScreen() {
  const game = useGame((s) => s.game);
  const act = useGame((s) => s.act);
  const theme = useTheme();
  const now = useNow();
  if (!game) return null;

  const openLocation = (id: LocationId) => router.push({ pathname: '/location/[id]', params: { id } });
  const here = LOCATIONS[game.character.locationId];
  const travelling = isTravelling(game);
  const trip = travelling ? taskTimes(game)[0] : null;
  const from = projectedLocation(game);
  const sorted = [...LOCATION_ORDER].sort((a, b) => distance(from, a) - distance(from, b));

  return (
    <Screen>
      <Card>
        {trip && trip.task.kind === 'travel' ? (
          <Row gap={space.md}>
            <Badge glyph={LOCATION_ART[trip.task.to].glyph} tone={LOCATION_ART[trip.task.to].tone} size={44} corner={{ glyph: UI.travel, tone: 'gold' }} />
            <View style={styles.flex}>
              <Label bold>Yoldasın: {LOCATIONS[trip.task.to].name}</Label>
              <Label size={13} tone="muted">
                Varışa {countdown(trip.end - now)} kaldı
              </Label>
            </View>
          </Row>
        ) : (
          <Row gap={space.md}>
            <Badge glyph={LOCATION_ART[here.id].glyph} tone={LOCATION_ART[here.id].tone} size={44} />
            <View style={styles.flex}>
              <Label bold>Buradasın: {here.name}</Label>
              <Label size={13} tone="muted" numberOfLines={2}>
                {here.description}
              </Label>
            </View>
            <Button small label="Aç" onPress={() => openLocation(here.id)} />
          </Row>
        )}
      </Card>

      <WorldMap game={game} now={now} onSelect={openLocation} />

      <Section title="Yerler">
        {sorted.map((id) => {
          const location = LOCATIONS[id];
          const isHere = !travelling && game.character.locationId === id;
          const planned = from === id && !isHere;
          const ms = travelMs(game.character, from, id);
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${location.name} ayrıntıları`}
              onPress={() => openLocation(id)}
              style={({ pressed }) => [
                styles.place,
                { backgroundColor: theme.surface, borderColor: isHere ? theme.primary : theme.border, opacity: pressed ? 0.8 : 1 },
              ]}>
              <Badge glyph={LOCATION_ART[id].glyph} tone={LOCATION_ART[id].tone} size={44} shape="circle" />
              <View style={styles.flex}>
                <Label bold>{location.name}</Label>
                {isHere ? (
                  <Pill label="Buradasın" tone="primary" glyph={UI.done} />
                ) : planned ? (
                  <Pill label="Oraya gidiyorsun" tone="accent" glyph={UI.travel} />
                ) : (
                  <IconText glyph={UI.travel} tone="muted" size={13}>
                    {duration(ms)}
                  </IconText>
                )}
              </View>
              {!isHere && !planned && (
                <Button
                  small
                  variant="secondary"
                  glyph={UI.travel}
                  label="Git"
                  onPress={() => act((state, at) => startTravel(state, id, at), `Yola çıktın: ${location.name}`)}
                />
              )}
            </Pressable>
          );
        })}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: 12,
    padding: space.md,
  },
});
