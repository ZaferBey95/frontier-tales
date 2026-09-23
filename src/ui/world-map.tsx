import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { LOCATIONS, LOCATION_ORDER, taskTimes, type GameState, type LocationId } from '@/game';

import { radius, useTheme } from './theme';

const ROADS: [LocationId, LocationId][] = [
  ['town', 'ranch'],
  ['town', 'river'],
  ['town', 'mine'],
  ['town', 'railroad'],
  ['town', 'canyon'],
  ['ranch', 'forest'],
  ['ranch', 'river'],
  ['mine', 'railroad'],
  ['railroad', 'canyon'],
];

const SCENERY: { emoji: string; x: number; y: number; size: number }[] = [
  { emoji: '⛰️', x: 68, y: 7, size: 22 },
  { emoji: '⛰️', x: 92, y: 9, size: 26 },
  { emoji: '⛰️', x: 94, y: 30, size: 20 },
  { emoji: '🌲', x: 5, y: 24, size: 16 },
  { emoji: '🌲', x: 26, y: 5, size: 16 },
  { emoji: '🌲', x: 4, y: 6, size: 14 },
  { emoji: '🌵', x: 44, y: 70, size: 16 },
  { emoji: '🌵', x: 58, y: 34, size: 14 },
  { emoji: '🌵', x: 78, y: 74, size: 16 },
  { emoji: '🌵', x: 9, y: 52, size: 14 },
  { emoji: '🌵', x: 88, y: 90, size: 14 },
  { emoji: '🐂', x: 40, y: 24, size: 13 },
];

const RIVER = 'M 0 58 C 12 62, 18 70, 26 80 S 40 96, 52 100';

/** Where the character is right now, moving smoothly while travelling. */
export function characterPosition(game: GameState, now: number): { x: number; y: number; to?: LocationId } {
  const first = taskTimes(game)[0];
  const here = LOCATIONS[game.character.locationId];
  if (!first || first.task.kind !== 'travel') return { x: here.x, y: here.y };
  const from = LOCATIONS[first.task.from];
  const to = LOCATIONS[first.task.to];
  const share = Math.min(1, Math.max(0, (now - first.start) / Math.max(1, first.end - first.start)));
  return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share, to: first.task.to };
}

export function WorldMap({
  game,
  now,
  onSelect,
}: {
  game: GameState;
  now: number;
  onSelect: (id: LocationId) => void;
}) {
  const theme = useTheme();
  const position = characterPosition(game, now);
  const destination = position.to ? LOCATIONS[position.to] : null;
  const travelling = !!destination;

  return (
    <View style={[styles.map, { backgroundColor: theme.mapLand, borderColor: theme.border }]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path d={RIVER} stroke={theme.mapWater} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        {ROADS.map(([a, b]) => (
          <Line
            key={`${a}-${b}`}
            x1={LOCATIONS[a].x}
            y1={LOCATIONS[a].y}
            x2={LOCATIONS[b].x}
            y2={LOCATIONS[b].y}
            stroke={theme.mapRoad}
            strokeWidth={0.7}
            strokeDasharray="2 1.5"
          />
        ))}
        {destination && (
          <Line
            x1={position.x}
            y1={position.y}
            x2={destination.x}
            y2={destination.y}
            stroke={theme.primary}
            strokeWidth={1.1}
            strokeDasharray="1.5 1.2"
          />
        )}
      </Svg>

      {SCENERY.map((item, index) => (
        <Text
          key={index}
          style={[styles.scenery, { left: `${item.x}%`, top: `${item.y}%`, fontSize: item.size }]}>
          {item.emoji}
        </Text>
      ))}

      {LOCATION_ORDER.map((id) => {
        const location = LOCATIONS[id];
        const here = !travelling && game.character.locationId === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={location.name}
            onPress={() => onSelect(id)}
            style={[styles.pin, { left: `${location.x}%`, top: `${location.y}%` }]}>
            <View
              style={[
                styles.pinCircle,
                {
                  backgroundColor: theme.surface,
                  borderColor: here ? theme.primary : position.to === id ? theme.accent : theme.border,
                  borderWidth: here || position.to === id ? 3 : 1.5,
                },
              ]}>
              <Text style={styles.pinEmoji}>{location.icon}</Text>
            </View>
            <Text
              numberOfLines={2}
              style={[styles.pinLabel, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}>
              {location.name}
            </Text>
          </Pressable>
        );
      })}

      <View
        style={[styles.marker, { left: `${position.x}%`, top: `${position.y}%`, backgroundColor: theme.primary }]}>
        <Text style={styles.markerEmoji}>🤠</Text>
      </View>
    </View>
  );
}

const PIN = 44;
const MARKER = 30;

const styles = StyleSheet.create({
  map: {
    width: '100%',
    maxWidth: 560,
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scenery: { position: 'absolute', opacity: 0.7, marginLeft: -8, marginTop: -8, pointerEvents: 'none' },
  pin: {
    position: 'absolute',
    width: 96,
    marginLeft: -48,
    marginTop: -PIN / 2,
    alignItems: 'center',
  },
  pinCircle: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEmoji: { fontSize: 22 },
  pinLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    marginLeft: PIN / 2 - 8,
    marginTop: -PIN / 2 - 10,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  markerEmoji: { fontSize: 18 },
});
