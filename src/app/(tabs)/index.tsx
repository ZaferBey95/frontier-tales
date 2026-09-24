import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

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
import { Button, Card, Chip, IconText, Label, Pill, Row, Screen, Section } from '@/ui/components';
import { countdown, duration } from '@/ui/format';
import { MAP_3D_AVAILABLE, WorldMap3D } from '@/ui/map3d/world-map-3d';
import { space, useTheme } from '@/ui/theme';
import { WorldMap } from '@/ui/world-map';

export default function MapScreen() {
  const game = useGame((s) => s.game);
  const act = useGame((s) => s.act);
  const mapMode = useGame((s) => s.mapMode);
  const setMapMode = useGame((s) => s.setMapMode);
  const theme = useTheme();
  const night = useColorScheme() === 'dark';
  const now = useNow();
  const [webglFailed, setWebglFailed] = useState(false);
  if (!game) return null;

  const can3D = MAP_3D_AVAILABLE && !webglFailed;
  const show3D = can3D && mapMode === '3d';

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

      {can3D && (
        <Row gap={space.xs} style={styles.modes}>
          <Chip label="3D harita" glyph={UI.map} selected={mapMode === '3d'} onPress={() => setMapMode('3d')} />
          <Chip label="Düz harita" selected={mapMode === '2d'} onPress={() => setMapMode('2d')} />
        </Row>
      )}
      {show3D ? (
        <View style={styles.mapBlock}>
          <WorldMap3D game={game} night={night} onSelect={openLocation} onUnavailable={() => setWebglFailed(true)} />
          <Label size={12} tone="muted" center>
            Döndürmek için sürükle, yakınlaştırmak için iki parmakla sıkıştır. Bir yere dokunarak aç.
          </Label>
        </View>
      ) : (
        <WorldMap game={game} now={now} onSelect={openLocation} />
      )}

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
  modes: { justifyContent: 'flex-end', marginBottom: -space.sm },
  mapBlock: { gap: space.xs },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: 12,
    padding: space.md,
  },
});
