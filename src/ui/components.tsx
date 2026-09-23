import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { DISPLAY_FONT, MAX_WIDTH, radius, space, useTheme } from './theme';

type Tone = 'default' | 'muted' | 'accent' | 'success' | 'danger' | 'primary';

function useToneColor(tone: Tone): string {
  const theme = useTheme();
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
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled, small, style, accessibilityLabel }: ButtonProps) {
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
          borderColor: variant === 'secondary' ? theme.border : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}>
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

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
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
      <Text style={[styles.chipText, { color: selected ? theme.primaryText : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, tone = 'default' }: { label: string; tone?: Tone }) {
  const theme = useTheme();
  const color = useToneColor(tone);
  return (
    <View style={[styles.pill, { backgroundColor: theme.surfaceAlt }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Row style={styles.sectionHeader}>
        <Title size={18} style={styles.flex}>
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

export function Emoji({ children, size = 22, style }: { children: string; size?: number; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontSize: size, lineHeight: Math.round(size * 1.25) }, style]}>{children}</Text>;
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  center: { textAlign: 'center' },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 34, paddingHorizontal: space.md },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonTextSmall: { fontSize: 14 },
  barTrack: { width: '100%', overflow: 'hidden' },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  section: { gap: space.sm },
  sectionHeader: { marginTop: space.sm },
  sectionBody: { gap: space.sm },
  screenContent: { padding: space.lg, paddingBottom: space.xl * 2, alignItems: 'center' },
  screenInner: { width: '100%', maxWidth: MAX_WIDTH, gap: space.lg },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
});
