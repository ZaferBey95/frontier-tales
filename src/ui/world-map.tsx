// The illustrated region map: terrain drawn in SVG, with tappable location
// badges and the player's marker on top.

import { memo, useId } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { LOCATIONS, LOCATION_ORDER, taskTimes, type GameState, type LocationId } from '@/game';
import { createRng } from '@/game/rng';

import {
  CACTI,
  CREEK,
  MESAS,
  PEAKS,
  RAILROAD,
  RIVER,
  ROADS,
  TREES,
  beziersToSvg,
  locationPoint,
  roadControl,
} from './map-data';
import { GLYPHS, type GlyphName } from './art/glyphs';
import { Badge } from './art/icon';
import { LOCATION_ART } from './art/registry';
import { DISPLAY_FONT, radius, useTheme, type MapPalette } from './theme';

const SIZE = 1000;
const K = SIZE / 100;

function roadPath(a: LocationId, b: LocationId, bend: number): string {
  const p = locationPoint(a);
  const q = locationPoint(b);
  const c = roadControl(a, b, bend);
  return `M ${p.x * K} ${p.y * K} Q ${c.x * K} ${c.y * K} ${q.x * K} ${q.y * K}`;
}

function railPath(): string {
  return RAILROAD.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * K} ${p.y * K}`).join(' ');
}

const RIVER_PATH = beziersToSvg(RIVER, K);
const CREEK_PATH = beziersToSvg(CREEK, K);

function makeSpeckles(): { x: number; y: number; r: number }[] {
  const rng = createRng(11);
  return Array.from({ length: 220 }, () => ({ x: rng() * SIZE, y: rng() * SIZE, r: 1 + rng() * 2.2 }));
}

const SPECKLES = makeSpeckles();

function Glyph({ name, x, y, size, color, opacity = 1 }: { name: GlyphName; x: number; y: number; size: number; color: string; opacity?: number }) {
  const scale = size / 512;
  return (
    <G transform={`translate(${x - size / 2} ${y - size / 2}) scale(${scale})`} opacity={opacity}>
      <Path d={GLYPHS[name]} fill={color} />
    </G>
  );
}

function Peak({ x, base, w, h, snow, c }: { x: number; base: number; w: number; h: number; snow: boolean; c: MapPalette }) {
  const top = base - h;
  const mid = x + w * 0.06;
  return (
    <G>
      <Polygon points={`${x - w / 2},${base} ${x},${top} ${mid},${base}`} fill={c.mountain} />
      <Polygon points={`${x},${top} ${x + w / 2},${base} ${mid},${base}`} fill={c.mountainShade} />
      {snow && (
        <Polygon
          points={`${x - w * 0.13},${base - h * 0.7} ${x},${top} ${x + w * 0.14},${base - h * 0.68} ${x + w * 0.06},${base - h * 0.62} ${x},${base - h * 0.72} ${x - w * 0.06},${base - h * 0.6}`}
          fill={c.snow}
        />
      )}
      <Line x1={x - w / 2} y1={base} x2={x + w / 2} y2={base} stroke={c.mountainShade} strokeWidth={2} opacity={0.6} />
    </G>
  );
}

function Mesa({ x, base, w, h, c }: { x: number; base: number; w: number; h: number; c: MapPalette }) {
  const inset = w * 0.16;
  const left = x - w / 2;
  const right = x + w / 2;
  const top = base - h;
  return (
    <G>
      <Polygon points={`${left},${base} ${left + inset},${top} ${right - inset},${top} ${right},${base}`} fill={c.rock} />
      <Polygon points={`${x + w * 0.12},${top} ${right - inset},${top} ${right},${base} ${x + w * 0.18},${base}`} fill={c.rockShade} opacity={0.75} />
      <Line x1={left + inset} y1={top + 2} x2={right - inset} y2={top + 2} stroke={c.rockLight} strokeWidth={4} />
      <Line x1={left + inset * 0.6} y1={top + h * 0.4} x2={right - inset * 0.6} y2={top + h * 0.4} stroke={c.rockShade} strokeWidth={2.5} opacity={0.5} />
      <Line x1={left + inset * 0.3} y1={top + h * 0.72} x2={right - inset * 0.3} y2={top + h * 0.72} stroke={c.rockShade} strokeWidth={2.5} opacity={0.5} />
    </G>
  );
}

function Pine({ x, y, s, c }: { x: number; y: number; s: number; c: MapPalette }) {
  const layer = (dy: number, width: number, height: number) =>
    `${x - width / 2},${y + dy} ${x},${y + dy - height} ${x + width / 2},${y + dy}`;
  return (
    <G>
      <Rect x={x - s * 0.07} y={y} width={s * 0.14} height={s * 0.28} fill={c.trunk} />
      <Polygon points={layer(0, s, s * 0.62)} fill={c.tree} />
      <Polygon points={layer(-s * 0.3, s * 0.78, s * 0.56)} fill={c.tree} />
      <Polygon points={layer(-s * 0.58, s * 0.52, s * 0.5)} fill={c.tree} />
      <Polygon points={`${x},${y - s * 1.08} ${x + s / 2},${y} ${x},${y}`} fill={c.treeShade} opacity={0.55} />
    </G>
  );
}

function Compass({ x, y, c }: { x: number; y: number; c: MapPalette }) {
  const r = 46;
  return (
    <G opacity={0.85}>
      <Circle cx={x} cy={y} r={r} fill="none" stroke={c.ink} strokeWidth={2} />
      <Circle cx={x} cy={y} r={r - 7} fill="none" stroke={c.ink} strokeWidth={1} opacity={0.6} />
      <Polygon points={`${x},${y - r - 6} ${x + 9},${y} ${x},${y + r + 6} ${x - 9},${y}`} fill={c.ink} />
      <Polygon points={`${x - r - 6},${y} ${x},${y - 9} ${x + r + 6},${y} ${x},${y + 9}`} fill={c.ink} opacity={0.75} />
      <Polygon points={`${x},${y - r - 6} ${x + 9},${y} ${x},${y}`} fill={c.land} />
      <Circle cx={x} cy={y} r={5} fill={c.land} stroke={c.ink} strokeWidth={2} />
      <SvgText x={x} y={y - r - 12} fill={c.ink} fontSize={22} fontWeight="bold" textAnchor="middle">
        K
      </SvgText>
    </G>
  );
}

/** Everything that never moves. Memoised so the ticking clock does not redraw it. */
const Terrain = memo(function Terrain({ c, id }: { c: MapPalette; id: string }) {
  const vignette = `${id}v`;
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={vignette} cx="50%" cy="50%" r="72%">
          <Stop offset="0.55" stopColor={c.edge} stopOpacity={0} />
          <Stop offset="1" stopColor={c.edge} stopOpacity={0.55} />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={SIZE} height={SIZE} fill={c.land} />
      <Path
        d="M0 0 H480 C440 120 490 270 425 370 C360 480 220 530 90 565 C50 578 20 590 0 600 Z"
        fill={c.grass}
        opacity={0.55}
      />
      <Path
        d="M1000 390 C905 430 830 525 770 625 C705 730 565 770 475 830 C425 865 405 935 425 1000 H1000 Z"
        fill={c.desert}
        opacity={0.5}
      />
      {SPECKLES.map((dot, index) => (
        <Circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill={c.ink} opacity={0.07} />
      ))}

      {/* Water */}
      <Path d={RIVER_PATH} stroke={c.bank} strokeWidth={36} fill="none" opacity={0.35} strokeLinecap="round" />
      <Path d={RIVER_PATH} stroke={c.water} strokeWidth={22} fill="none" strokeLinecap="round" />
      <Path d={RIVER_PATH} stroke={c.waterLight} strokeWidth={5} fill="none" strokeDasharray="34 46" strokeLinecap="round" />
      <Path d={CREEK_PATH} stroke={c.water} strokeWidth={8} fill="none" strokeLinecap="round" />

      {/* Roads and railway */}
      {ROADS.map(([a, b, bend]) => (
        <G key={`${a}-${b}`}>
          <Path d={roadPath(a, b, bend)} stroke={c.road} strokeWidth={11} fill="none" opacity={0.3} strokeLinecap="round" />
          <Path d={roadPath(a, b, bend)} stroke={c.road} strokeWidth={3.5} fill="none" strokeDasharray="16 11" strokeLinecap="round" />
        </G>
      ))}
      <Path d={railPath()} stroke={c.rail} strokeWidth={17} fill="none" strokeDasharray="3 9" opacity={0.75} />
      <Path d={railPath()} stroke={c.rail} strokeWidth={9} fill="none" strokeLinejoin="round" />
      <Path d={railPath()} stroke={c.land} strokeWidth={4} fill="none" strokeLinejoin="round" />

      {/* Mountains, mesas and plants */}
      {[...PEAKS]
        .sort((a, b) => a.base - b.base)
        .map((peak, index) => (
          <Peak key={index} x={peak.x * K} base={peak.base * K} w={peak.width * K} h={peak.height * K} snow={peak.snow} c={c} />
        ))}
      {[...MESAS]
        .sort((a, b) => a.base - b.base)
        .map((mesa, index) => (
          <Mesa key={index} x={mesa.x * K} base={mesa.base * K} w={mesa.width * K} h={mesa.height * K} c={c} />
        ))}
      {TREES.map((tree, index) => (
        <Pine key={index} x={tree.x * K} y={tree.y * K} s={tree.size * K} c={c} />
      ))}
      {CACTI.map((cactus, index) => (
        <Glyph key={index} name="cactus" x={cactus.x * K} y={cactus.y * K} size={cactus.size * K} color={c.tree} opacity={0.85} />
      ))}
      <Glyph name="tumbleweed" x={610} y={660} size={30} color={c.ink} opacity={0.45} />
      <Glyph name="cow" x={375} y={265} size={40} color={c.ink} opacity={0.4} />
      <Glyph name="cow" x={165} y={455} size={30} color={c.ink} opacity={0.3} />

      <Compass x={95} y={895} c={c} />

      {/* Paper edges and frame */}
      <Rect x={0} y={0} width={SIZE} height={SIZE} fill={`url(#${vignette})`} />
      <Rect x={10} y={10} width={SIZE - 20} height={SIZE - 20} fill="none" stroke={c.ink} strokeWidth={4} />
      <Rect x={22} y={22} width={SIZE - 44} height={SIZE - 44} fill="none" stroke={c.ink} strokeWidth={1.5} opacity={0.6} />
      {[
        [22, 22],
        [SIZE - 22, 22],
        [22, SIZE - 22],
        [SIZE - 22, SIZE - 22],
      ].map(([x, y], index) => (
        <Polygon key={index} points={`${x},${y - 10} ${x + 10},${y} ${x},${y + 10} ${x - 10},${y}`} fill={c.ink} />
      ))}
    </Svg>
  );
});

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

export function WorldMap({ game, now, onSelect }: { game: GameState; now: number; onSelect: (id: LocationId) => void }) {
  const theme = useTheme();
  const id = `m${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const position = characterPosition(game, now);
  const destination = position.to ? LOCATIONS[position.to] : null;
  const travelling = !!destination;

  return (
    <View style={[styles.map, { backgroundColor: theme.map.land, borderColor: theme.map.ink }]}>
      <Terrain c={theme.map} id={id} />

      {destination && (
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Line
            x1={position.x}
            y1={position.y}
            x2={destination.x}
            y2={destination.y}
            stroke={theme.primary}
            strokeWidth={0.9}
            strokeDasharray="1.6 1.2"
            strokeLinecap="round"
          />
        </Svg>
      )}

      <View style={[styles.title, { backgroundColor: theme.surface, borderColor: theme.map.ink }]}>
        <Text style={[styles.titleText, { color: theme.map.ink }]}>Coyote Creek Bölgesi</Text>
      </View>

      {LOCATION_ORDER.map((locationId) => {
        const location = LOCATIONS[locationId];
        const art = LOCATION_ART[locationId];
        const here = !travelling && game.character.locationId === locationId;
        const target = position.to === locationId;
        // Keep labels inside the frame near the left and right edges.
        const edge = location.x > 78 ? styles.pinRight : location.x < 18 ? styles.pinLeft : null;
        return (
          <Pressable
            key={locationId}
            accessibilityRole="button"
            accessibilityLabel={location.name}
            onPress={() => onSelect(locationId)}
            style={[styles.pin, edge, { left: `${location.x}%`, top: `${location.y}%` }]}>
            <View
              style={[
                styles.ring,
                { borderColor: here ? theme.primary : target ? theme.accent : 'transparent' },
              ]}>
              <Badge glyph={art.glyph} tone={art.tone} size={PIN} shape="circle" />
            </View>
            <Text
              numberOfLines={2}
              style={[styles.pinLabel, { color: theme.primaryText, backgroundColor: theme.map.ink }]}>
              {location.name}
            </Text>
          </Pressable>
        );
      })}

      <View style={[styles.marker, { left: `${position.x}%`, top: `${position.y}%` }]}>
        <Badge glyph="western-hat" tone="gold" size={MARKER} shape="circle" />
      </View>
    </View>
  );
}

const PIN = 46;
const PIN_WIDTH = 110;
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
  title: {
    position: 'absolute',
    left: '24%',
    top: '3.2%',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 4,
  },
  titleText: { fontFamily: DISPLAY_FONT, fontSize: 13 },
  pin: {
    position: 'absolute',
    width: PIN_WIDTH,
    marginLeft: -PIN_WIDTH / 2,
    marginTop: -(PIN + 6) / 2,
    alignItems: 'center',
  },
  pinLeft: { marginLeft: -(PIN + 6) / 2, alignItems: 'flex-start' },
  pinRight: { marginLeft: -PIN_WIDTH + (PIN + 6) / 2, alignItems: 'flex-end' },
  ring: { borderWidth: 3, borderRadius: 999, padding: 0 },
  pinLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
    marginLeft: PIN / 2 - 6,
    marginTop: -PIN / 2 - 16,
    pointerEvents: 'none',
    borderRadius: MARKER / 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
