import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { taskTimes, type GameState, type LocationId } from '@/game';

import { Glyph } from '../art/icon';
import { radius, useTheme } from '../theme';
import { MapScene, supportsWebGL, type MapSceneState } from './scene';

export const MAP_3D_AVAILABLE = true;

function sceneState(game: GameState): MapSceneState {
  const first = taskTimes(game)[0];
  const trip =
    first && first.task.kind === 'travel'
      ? { from: first.task.from, to: first.task.to, start: first.start, end: first.end }
      : null;
  return {
    locationId: game.character.locationId,
    trip,
    classId: game.character.classId,
    horseId: game.character.equipment.horse,
  };
}

export function WorldMap3D({
  game,
  night,
  onSelect,
  onUnavailable,
}: {
  game: GameState;
  night: boolean;
  onSelect: (id: LocationId) => void;
  onUnavailable: () => void;
}) {
  const theme = useTheme();
  const host = useRef<View>(null);
  const sceneRef = useRef<MapScene | null>(null);
  const latest = useRef({ game, night, onSelect, onUnavailable });
  const focused = useIsFocused();

  useEffect(() => {
    latest.current = { game, night, onSelect, onUnavailable };
  });

  useEffect(() => {
    const element = host.current as unknown as HTMLElement | null;
    if (!element || !supportsWebGL()) {
      latest.current.onUnavailable();
      return;
    }
    let scene: MapScene;
    try {
      scene = new MapScene(element, {
        night: latest.current.night,
        onSelect: (id) => latest.current.onSelect(id),
      });
    } catch {
      latest.current.onUnavailable();
      return;
    }
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // These run after the scene is created in the same commit, so they also
  // hand it its first state.
  useEffect(() => {
    sceneRef.current?.setState(sceneState(game));
  }, [game]);

  useEffect(() => {
    sceneRef.current?.setNight(night);
  }, [night]);

  useEffect(() => {
    const update = () => sceneRef.current?.setActive(focused && !document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, [focused]);

  return (
    <View style={[styles.map, { borderColor: theme.map.ink }]}>
      <View ref={host} style={StyleSheet.absoluteFill} />
      <View style={styles.tools}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Karakterime git"
          onPress={() => sceneRef.current?.focusRider()}
          style={[styles.tool, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Glyph name="western-hat" size={20} color={theme.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Görünümü sıfırla"
          onPress={() => sceneRef.current?.resetView()}
          style={[styles.tool, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Glyph name="compass" size={20} color={theme.primary} />
        </Pressable>
      </View>
    </View>
  );
}

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
  tools: { position: 'absolute', right: 8, bottom: 8, gap: 8 },
  tool: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
