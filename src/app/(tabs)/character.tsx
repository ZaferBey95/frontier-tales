import { Pressable, StyleSheet, View } from 'react-native';

import {
  ATTRIBUTES,
  ATTRIBUTE_ORDER,
  CLASSES,
  SLOTS,
  SLOT_ORDER,
  attributeBonuses,
  equipItem,
  getItem,
  maxHp,
  spendAttributePoint,
  unequipItem,
  xpToNext,
} from '@/game';
import { useGame } from '@/store/game';
import { Bar, Button, Card, Emoji, Label, Pill, Row, Screen, Section, Title } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { money, signed } from '@/ui/format';
import { itemStats } from '@/ui/item-stats';
import { radius, space, useTheme } from '@/ui/theme';

export default function CharacterScreen() {
  const game = useGame((s) => s.game);
  const act = useGame((s) => s.act);
  const resetGame = useGame((s) => s.resetGame);
  const theme = useTheme();
  if (!game) return null;

  const { character, stats } = game;
  const cls = CLASSES[character.classId];
  const bonuses = attributeBonuses(character);
  const bag = Object.entries(character.inventory).filter(([, count]) => count > 0);

  const reset = async () => {
    const sure = await confirm(
      'Oyunu sıfırla',
      'Karakterin ve tüm ilerlemen silinecek. Bu geri alınamaz.',
      'Sil ve baştan başla',
    );
    if (sure) resetGame();
  };

  return (
    <Screen>
      <Card>
        <Row gap={space.md}>
          <View style={[styles.portrait, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Emoji size={44}>🤠</Emoji>
          </View>
          <View style={styles.flex}>
            <Title size={24}>{character.name}</Title>
            <Label tone="muted">
              {cls.icon} {cls.name} · {character.level}. seviye
            </Label>
            <Label size={13} tone="muted">
              {cls.description}
            </Label>
          </View>
        </Row>
        <View style={styles.xp}>
          <Row>
            <Label size={13} tone="muted" style={styles.flex}>
              Tecrübe
            </Label>
            <Label size={13} tone="muted">
              {character.xp} / {xpToNext(character.level)}
            </Label>
          </Row>
          <Bar value={character.xp} max={xpToNext(character.level)} color={theme.xp} />
        </View>
      </Card>

      <Section
        title="Özellikler"
        right={character.attributePoints > 0 ? <Pill label={`${character.attributePoints} puan`} tone="primary" /> : undefined}>
        {character.attributePoints > 0 && (
          <Label size={13} tone="muted">
            Harcanmamış puanların var. + düğmesiyle bir özelliği güçlendir.
          </Label>
        )}
        <Card>
          {ATTRIBUTE_ORDER.map((attr) => {
            const def = ATTRIBUTES[attr];
            const base = character.attributes[attr];
            const bonus = bonuses[attr];
            return (
              <Row key={attr} gap={space.md} style={styles.attrRow}>
                <Emoji size={24}>{def.icon}</Emoji>
                <View style={styles.flex}>
                  <Label bold>
                    {def.name}: {Math.max(0, base + bonus)}
                  </Label>
                  <Label size={12} tone="muted">
                    {bonus !== 0 ? `Temel ${base}, eşya ve sınıftan ${signed(bonus)} · ` : ''}
                    {def.description}
                  </Label>
                </View>
                {character.attributePoints > 0 && (
                  <Button
                    small
                    label="+"
                    accessibilityLabel={`${def.name} artır`}
                    onPress={() => act((state, at) => spendAttributePoint(state, attr, at))}
                  />
                )}
              </Row>
            );
          })}
          <Label size={12} tone="muted">
            Kuvvet her puanda canını da artırır. Şu an en fazla {maxHp(character)} canın olabilir.
          </Label>
        </Card>
      </Section>

      <Section title="Üzerindekiler">
        {SLOT_ORDER.map((slot) => {
          const itemId = character.equipment[slot];
          const item = itemId ? getItem(itemId) : null;
          return (
            <Card key={slot}>
              <Row gap={space.md}>
                <Emoji size={26}>{item?.icon ?? SLOTS[slot].icon}</Emoji>
                <View style={styles.flex}>
                  <Label size={12} tone="muted">
                    {SLOTS[slot].name}
                  </Label>
                  <Label bold={!!item} tone={item ? 'default' : 'muted'}>
                    {item ? item.name : 'Boş'}
                  </Label>
                  {item && (
                    <Label size={12} tone="muted">
                      {itemStats(item).join(' · ')}
                    </Label>
                  )}
                </View>
                {item && (
                  <Button small variant="ghost" label="Çıkar" onPress={() => act((state, at) => unequipItem(state, slot, at))} />
                )}
              </Row>
            </Card>
          );
        })}
      </Section>

      <Section title="Çanta">
        {bag.length === 0 && <Label tone="muted">Çantan boş.</Label>}
        {bag.map(([itemId, count]) => {
          const item = getItem(itemId);
          const tooLow = character.level < item.level;
          return (
            <Card key={itemId}>
              <Row gap={space.md}>
                <Emoji size={26}>{item.icon}</Emoji>
                <View style={styles.flex}>
                  <Label bold>
                    {item.name}
                    {count > 1 ? ` ×${count}` : ''}
                  </Label>
                  <Label size={12} tone="muted">
                    {item.kind === 'equipment' ? itemStats(item).join(' · ') || item.description : item.description}
                  </Label>
                </View>
                {item.kind === 'equipment' && (
                  <Button
                    small
                    variant="secondary"
                    label={tooLow ? `Sv. ${item.level}` : 'Kuşan'}
                    disabled={tooLow}
                    onPress={() => act((state, at) => equipItem(state, itemId, at), `${item.name} kuşanıldı.`)}
                  />
                )}
              </Row>
            </Card>
          );
        })}
      </Section>

      <Section title="Sicil">
        <Card>
          <StatRow label="Tamamlanan iş" value={String(stats.jobsDone)} />
          <StatRow label="Kazanılan düello" value={String(stats.duelsWon)} />
          <StatRow label="Kaybedilen düello" value={String(stats.duelsLost)} />
          <StatRow label="Toplam kazanç" value={money(stats.moneyEarned)} />
        </Card>
      </Section>

      <Pressable accessibilityRole="button" onPress={reset} style={styles.reset}>
        <Label size={13} tone="danger" center>
          Oyunu sıfırla
        </Label>
      </Pressable>
    </Screen>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Row>
      <Label tone="muted" style={styles.flex}>
        {label}
      </Label>
      <Label bold>{value}</Label>
    </Row>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  portrait: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xp: { gap: 4 },
  attrRow: { paddingVertical: 4 },
  reset: { paddingVertical: space.md },
});
