import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/store/toast';

import { MAX_WIDTH, space, useTheme } from './theme';

const VISIBLE_MS = 3500;

export function ToastHost() {
  const { id, message, kind, hide } = useToast();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [id, message, hide]);

  if (!message) return null;
  const background = kind === 'error' ? theme.danger : kind === 'success' ? theme.success : theme.text;
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 72 }]}>
      <Pressable onPress={hide} accessibilityRole="alert" style={[styles.toast, { backgroundColor: background }]}>
        <Text style={[styles.text, { color: theme.background }]}>{message}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg, pointerEvents: 'box-none' },
  toast: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    borderRadius: 12,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  text: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
