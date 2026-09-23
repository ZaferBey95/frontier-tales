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
import { Button, Card, Emoji, Label, Pill, Row, Screen, Section } from '@/ui/components';
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
          <Row>
            <Emoji size={28}>🐎</Emoji>
            <View style={styles.flex}>
              <Label bold>Yoldasın: {LOCATIONS[trip.task.to].name}</Label>
              <Label size={13} tone="muted">
                Varışa {countdown(trip.end - now)} kaldı
              </Label>
            </View>
          </Row>
        ) : (
          <Row>
            <Emoji size={28}>{here.icon}</Emoji>
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
              <Emoji size={26}>{location.icon}</Emoji>
              <View style={styles.flex}>
                <Label bold>{location.name}</Label>
                {isHere ? (
                  <Pill label="Buradasın" tone="primary" />
                ) : planned ? (
                  <Pill label="Oraya gidiyorsun" tone="accent" />
                ) : (
                  <Label size={13} tone="muted">
                    🐎 {duration(ms)}
                  </Label>
                )}
              </View>
              {!isHere && !planned && (
                <Button
                  small
                  variant="secondary"
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
