import { useId } from 'react';
import { View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { GLYPHS, type GlyphName } from './glyphs';
import { TONES, type ToneName } from './tones';

/** A bare icon in one colour. */
export function Glyph({ name, size = 18, color }: { name: GlyphName; size?: number; color: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path d={GLYPHS[name]} fill={color} />
    </Svg>
  );
}

export interface BadgeProps {
  glyph: GlyphName;
  tone: ToneName;
  size?: number;
  shape?: 'square' | 'circle';
  /** Small second badge in the lower right corner. */
  corner?: { glyph: GlyphName; tone: ToneName };
  dimmed?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** An icon on a coloured medallion, used for places, jobs, items and people. */
export function Badge({ glyph, tone, size = 44, shape = 'square', corner, dimmed, style }: BadgeProps) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const colors = TONES[tone];
  const cornerSize = Math.round(size * 0.46);

  return (
    <View style={[{ width: size, height: size, opacity: dimmed ? 0.45 : 1 }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.top} />
            <Stop offset="1" stopColor={colors.bottom} />
          </LinearGradient>
        </Defs>
        {shape === 'circle' ? (
          <>
            <Circle cx={50} cy={50} r={47} fill={`url(#${id})`} stroke={colors.rim} strokeWidth={4} />
            <Circle cx={50} cy={50} r={40} fill="none" stroke={colors.ink} strokeOpacity={0.18} strokeWidth={1.5} />
          </>
        ) : (
          <>
            <Rect x={2} y={2} width={96} height={96} rx={22} fill={`url(#${id})`} stroke={colors.rim} strokeWidth={4} />
            <Rect x={9} y={9} width={82} height={82} rx={16} fill="none" stroke={colors.ink} strokeOpacity={0.18} strokeWidth={1.5} />
          </>
        )}
        <G transform="translate(17 17) scale(0.129)">
          <Path d={GLYPHS[glyph]} fill={colors.ink} />
        </G>
      </Svg>
      {corner && (
        <View style={{ position: 'absolute', right: -cornerSize * 0.2, bottom: -cornerSize * 0.2 }}>
          <Badge glyph={corner.glyph} tone={corner.tone} size={cornerSize} shape="circle" />
        </View>
      )}
    </View>
  );
}
