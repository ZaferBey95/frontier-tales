import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SELL_SHARE_BASE,
  SHOP_ITEMS,
  SLOTS,
  SLOT_ORDER,
  buyItem,
  canShop,
  equipItem,
  getItem,
  sellItem,
  sellPrice,
  type ItemDef,
} from '@/game';
import { useGame } from '@/store/game';
import { showToast } from '@/store/toast';
import { Badge } from '@/ui/art/icon';
import { UI } from '@/ui/art/registry';
import { Button, Card, Chip, Label, Pill, Row, Screen, Section } from '@/ui/components';
import { money, percent } from '@/ui/format';
import { GameHeader } from '@/ui/game-header';
import { ItemBadge, ItemStatsRow, RarityTag } from '@/ui/item-view';
import { space } from '@/ui/theme';

export default function ShopScreen() {
  const game = useGame((s) => s.game);
  const act = useGame((s) => s.act);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  if (!game) return null;

  const { character } = game;
  const open = canShop(game);
  const owned = Object.entries(character.inventory).filter(([, count]) => count > 0);

  const buy = (item: ItemDef) => {
    const result = act((state, at) => buyItem(state, item.id, at));
    if (!result?.ok) return;
    // Put it on straight away when that slot is empty.
    if (item.slot && !result.state.character.equipment[item.slot]) {
      act((state, at) => equipItem(state, item.id, at), `${item.name} alındı ve kuşanıldı.`);
    } else {
      showToast(`${item.name} çantana kondu.`, 'success');
    }
  };

  return (
    <Screen header={<GameHeader />}>
      <Stack.Screen options={{ title: 'Genel Mağaza' }} />
      <Card>
        <Row gap={space.md}>
          <Badge glyph={UI.shop} tone="leather" size={52} />
          <View style={styles.flex}>
            <Label bold>“Her şey satılır, dostum. Yeter ki paran olsun.”</Label>
            <Label size={13} tone="muted">
              Dükkân sahibi eşyaları fiyatının {percent(SELL_SHARE_BASE)} kadarına geri alır. Karizman yüksekse daha fazla öder.
            </Label>
          </View>
        </Row>
        {!open && (
          <Label tone="danger" size={14}>
            Dükkân Coyote Creek’te. Alışveriş için kasabada olmalısın.
          </Label>
        )}
      </Card>

      <Row gap={space.sm}>
        <Chip label="Satın al" selected={tab === 'buy'} onPress={() => setTab('buy')} />
        <Chip label={`Sat (${owned.length})`} selected={tab === 'sell'} onPress={() => setTab('sell')} />
      </Row>

      {tab === 'buy' &&
        SLOT_ORDER.map((slot) => (
          <Section key={slot} title={SLOTS[slot].name}>
            {SHOP_ITEMS.filter((item) => item.slot === slot).map((item) => {
              const tooLow = character.level < item.level;
              const tooPoor = character.money < (item.price ?? 0);
              const equipped = character.equipment[slot] === item.id;
              return (
                <Card key={item.id}>
                  <Row gap={space.md}>
                    <ItemBadge itemId={item.id} dimmed={tooLow} />
                    <View style={styles.flex}>
                      <Label bold>{item.name}</Label>
                      <Row gap={space.xs}>
                        <RarityTag itemId={item.id} />
                        <Pill label={`Sv. ${item.level}`} tone={tooLow ? 'danger' : 'muted'} />
                        {equipped && <Pill label="Üzerinde" tone="success" glyph={UI.done} />}
                      </Row>
                      <Label size={13} tone="muted">
                        {item.description}
                      </Label>
                    </View>
                  </Row>
                  <ItemStatsRow itemId={item.id} />
                  <Button
                    small
                    glyph={tooLow ? UI.locked : UI.money}
                    label={tooLow ? `${item.level}. seviyede açılır` : `Satın al · ${money(item.price ?? 0)}`}
                    disabled={!open || tooLow || tooPoor}
                    onPress={() => buy(item)}
                  />
                </Card>
              );
            })}
          </Section>
        ))}

      {tab === 'sell' && (
        <Section title="Çantan">
          {owned.length === 0 && <Label tone="muted">Çantan boş. İşlerden ganimet bulabilirsin.</Label>}
          {owned.map(([itemId, count]) => {
            const item = getItem(itemId);
            const price = sellPrice(character, item);
            return (
              <Card key={itemId}>
                <Row gap={space.md}>
                  <ItemBadge itemId={itemId} size={44} />
                  <View style={styles.flex}>
                    <Label bold>
                      {item.name} {count > 1 ? `×${count}` : ''}
                    </Label>
                    <Label size={13} tone="muted">
                      Tanesi {money(price)}
                    </Label>
                  </View>
                </Row>
                <Row gap={space.sm}>
                  <Button
                    small
                    variant="secondary"
                    label={`Sat · ${money(price)}`}
                    disabled={!open}
                    onPress={() => act((state, at) => sellItem(state, itemId, 1, at), `${item.name} satıldı.`)}
                    style={styles.flex}
                  />
                  {count > 1 && (
                    <Button
                      small
                      variant="secondary"
                      label={`Hepsini sat · ${money(price * count)}`}
                      disabled={!open}
                      onPress={() =>
                        act((state, at) => sellItem(state, itemId, count, at), `${count} ${item.name} satıldı.`)
                      }
                      style={styles.flex}
                    />
                  )}
                </Row>
              </Card>
            );
          })}
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  wrap: { flexWrap: 'wrap' },
});
