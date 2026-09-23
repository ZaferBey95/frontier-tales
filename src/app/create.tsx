import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLASSES, CLASS_ORDER, NAME_MAX, validateName, type ClassId } from '@/game';
import { useGame } from '@/store/game';
import { Badge } from '@/ui/art/icon';
import { CLASS_ART } from '@/ui/art/registry';
import { Button, Card, Flourish, Label, Screen, Title } from '@/ui/components';
import { radius, space, useTheme } from '@/ui/theme';

export default function CreateCharacterScreen() {
  const game = useGame((s) => s.game);
  const startGame = useGame((s) => s.startGame);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [classId, setClassId] = useState<ClassId | null>(null);
  const [touched, setTouched] = useState(false);

  if (game) return <Redirect href="/" />;

  const nameError = validateName(name);
  const canStart = !nameError && classId !== null;

  return (
    <Screen contentStyle={{ paddingTop: insets.top + space.xl }}>
      <View style={styles.hero}>
        <Badge glyph="western-hat" tone="rust" size={96} shape="circle" />
        <Title size={36} center>
          Frontier Tales
        </Title>
        <Flourish />
        <Label tone="muted" center>
          Vahşi Batı’nın tozlu yollarında kendi hikâyeni yaz. Çalış, keşfet, düello yap ve efsaneye dönüş.
        </Label>
      </View>

      <Card>
        <Label bold>Adın ne, yabancı?</Label>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={() => setTouched(true)}
          placeholder="Örneğin: Kara Murat"
          placeholderTextColor={theme.textMuted}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="Karakter adı"
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        {touched && nameError ? (
          <Label size={13} tone="danger">
            {nameError}
          </Label>
        ) : null}
      </Card>

      <View style={styles.classes}>
        <Label bold>Sınıfını seç</Label>
        {CLASS_ORDER.map((id) => {
          const cls = CLASSES[id];
          const selected = classId === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setClassId(id)}
              style={[
                styles.classCard,
                {
                  backgroundColor: selected ? theme.surfaceAlt : theme.surface,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}>
              <Badge glyph={CLASS_ART[id].glyph} tone={CLASS_ART[id].tone} size={52} />
              <View style={styles.classText}>
                <Title size={18}>{cls.name}</Title>
                <Label size={14} tone="muted">
                  {cls.description}
                </Label>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button
        label="Maceraya başla"
        disabled={!canStart}
        onPress={() => {
          setTouched(true);
          if (!nameError && classId) startGame(name, classId);
        }}
      />
      <Label size={12} tone="muted" center>
        Oyun kaydın bu cihazda saklanır.
      </Label>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 17,
  },
  classes: { gap: space.sm },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: space.md,
  },
  classText: { flex: 1, gap: 2 },
});
