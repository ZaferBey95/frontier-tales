import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { GlyphName } from './art/glyphs';
import { Glyph } from './art/icon';
import { DISPLAY_FONT, MAX_WIDTH, radius, space, useTheme, type Palette } from './theme';

export type Tone = 'default' | 'muted' | 'accent' | 'success' | 'danger' | 'primary';

function toneColor(theme: Palette, tone: Tone): string {
  switch (tone) {
    case 'muted':
      return theme.textMuted;
    case 'accent':
      return theme.accent;
    case 'success':
      return theme.success;
    case 'danger':
      return theme.danger;
    case 'primary':
      return theme.primary;
    default:
      return theme.text;
  }
}

export function useToneColor(tone: Tone): string {
  return toneColor(useTheme(), tone);
}

interface LabelProps extends TextProps {
  tone?: Tone;
  size?: number;
  bold?: boolean;
  center?: boolean;
}

export function Label({ tone = 'default', size = 15, bold, center, style, ...rest }: LabelProps) {
  const color = useToneColor(tone);
  return (
    <Text
      style={[
        { color, fontSize: size, lineHeight: Math.round(size * 1.35) },
        bold && styles.bold,
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

export function Title({ tone = 'default', size = 22, center, style, ...rest }: LabelProps) {
  const color = useToneColor(tone);
  return (
    <Text
      style={[
        { color, fontSize: size, lineHeight: Math.round(size * 1.3), fontFamily: DISPLAY_FONT },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

/** A small icon followed by text, e.g. a coin and an amount. */
export function IconText({
  glyph,
  children,
  tone = 'default',
  size = 14,
  bold,
  iconColor,
}: {
  glyph: GlyphName;
  children: ReactNode;
  tone?: Tone;
  size?: number;
  bold?: boolean;
  iconColor?: string;
}) {
  const color = useToneColor(tone);
  return (
    <View style={styles.iconText}>
      <Glyph name={glyph} size={Math.round(size * 1.1)} color={iconColor ?? color} />
      <Label size={size} tone={tone} bold={bold}>
        {children}
      </Label>
    </View>
  );
}

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: highlight ? theme.accent : theme.border },
        highlight && styles.cardHighlight,
        style,
      ]}>
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  small?: boolean;
  glyph?: GlyphName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled, small, glyph, style, accessibilityLabel }: ButtonProps) {
  const theme = useTheme();
  const background: Record<ButtonVariant, string> = {
    primary: theme.primary,
    secondary: theme.surfaceAlt,
    ghost: 'transparent',
    danger: theme.danger,
  };
  const foreground: Record<ButtonVariant, string> = {
    primary: theme.primaryText,
    secondary: theme.text,
    ghost: theme.primary,
    danger: theme.primaryText,
  };
  const edge: Record<ButtonVariant, string> = {
    primary: theme.primaryEdge,
    secondary: theme.border,
    ghost: 'transparent',
    danger: theme.primaryEdge,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: background[variant],
          borderColor: edge[variant],
          borderBottomWidth: variant === 'ghost' ? 0 : pressed ? 1 : 3,
          marginTop: pressed && variant !== 'ghost' ? 2 : 0,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {glyph && <Glyph name={glyph} size={small ? 15 : 18} color={foreground[variant]} />}
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: foreground[variant] }]}>{label}</Text>
    </Pressable>
  );
}

export function Bar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const theme = useTheme();
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <View style={[styles.barTrack, { height, backgroundColor: theme.track, borderRadius: height / 2 }]}>
      <View style={{ width: `${share * 100}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export function Chip({ label, selected, onPress, glyph }: { label: string; selected: boolean; onPress: () => void; glyph?: GlyphName }) {
  const theme = useTheme();
  const color = selected ? theme.primaryText : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
      {glyph && <Glyph name={glyph} size={13} color={selected ? theme.primaryText : theme.energy} />}
    </Pressable>
  );
}

export function Pill({ label, tone = 'default', glyph, glyphColor }: { label: string; tone?: Tone; glyph?: GlyphName; glyphColor?: string }) {
  const theme = useTheme();
  const color = toneColor(theme, tone);
  return (
    <View style={[styles.pill, { backgroundColor: theme.surfaceAlt }]}>
      {glyph && <Glyph name={glyph} size={12} color={glyphColor ?? color} />}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

/** A thin rule with a small diamond, like the flourishes on old posters. */
export function Flourish() {
  const theme = useTheme();
  return (
    <View style={styles.flourish}>
      <View style={[styles.flourishLine, { backgroundColor: theme.border }]} />
      <Svg width={12} height={12} viewBox="0 0 12 12">
        <Path d="M6 0 L12 6 L6 12 L0 6 Z" fill={theme.accent} />
      </Svg>
      <View style={[styles.flourishLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Row style={styles.sectionHeader}>
        <Title size={19} style={styles.flex}>
          {title}
        </Title>
        {right}
      </Row>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function Screen({ children, header, contentStyle }: { children: ReactNode; header?: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      {header}
      <ScrollView contentContainerStyle={[styles.screenContent, contentStyle]} keyboardShouldPersistTaps="handled">
        <View style={styles.screenInner}>{children}</View>
      </ScrollView>
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  center: { textAlign: 'center' },
  iconText: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
  },
  cardHighlight: { borderWidth: 2 },
  button: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: space.md },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonTextSmall: { fontSize: 14 },
  barTrack: { width: '100%', overflow: 'hidden' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flourish: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flourishLine: { flex: 1, height: 1 },
  section: { gap: space.sm },
  sectionHeader: { marginTop: space.sm },
  sectionBody: { gap: space.sm },
  screenContent: { padding: space.lg, paddingBottom: space.xl * 2, alignItems: 'center' },
  screenInner: { width: '100%', maxWidth: MAX_WIDTH, gap: space.lg },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
});
