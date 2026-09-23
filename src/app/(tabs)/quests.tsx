import { StyleSheet, View } from 'react-native';

import {
  acceptQuest,
  activeQuests,
  availableQuests,
  completedQuests,
  describeObjective,
  getItem,
  lockedByLevel,
  objectiveStatus,
  questReady,
  turnInQuest,
  xpWithPerk,
  type Character,
  type QuestDef,
} from '@/game';
import { useGame } from '@/store/game';
import { Button, Card, Emoji, Label, Pill, Row, Screen, Section, Title } from '@/ui/components';
import { money } from '@/ui/format';
import { space } from '@/ui/theme';

function rewardText(quest: QuestDef, character: Character): string {
  const parts: string[] = [];
  if (quest.rewards.money > 0) parts.push(`💰 ${money(quest.rewards.money)}`);
  const xp = xpWithPerk(character, quest.rewards.xp);
  if (xp > 0) parts.push(`⭐ ${xp} XP`);
  if (quest.rewards.itemId) {
    const item = getItem(quest.rewards.itemId);
    parts.push(`${item.icon} ${item.name}`);
  }
  return parts.join(' · ');
}

function QuestHeader({ quest }: { quest: QuestDef }) {
  return (
    <Row gap={space.md}>
      <Emoji size={30}>{quest.giverIcon}</Emoji>
      <View style={styles.flex}>
        <Title size={18}>{quest.title}</Title>
        <Label size={13} tone="muted">
          {quest.giver}
        </Label>
      </View>
    </Row>
  );
}

export default function QuestsScreen() {
  const game = useGame((s) => s.game);
  const act = useGame((s) => s.act);
  if (!game) return null;

  const active = activeQuests(game);
  const available = availableQuests(game);
  const locked = lockedByLevel(game);
  const done = completedQuests(game);

  return (
    <Screen>
      {active.length > 0 && (
        <Section title="Devam edenler">
          {active.map((quest) => {
            const ready = questReady(game, quest.id);
            return (
              <Card key={quest.id} highlight={ready}>
                <QuestHeader quest={quest} />
                <Label size={14} tone="muted">
                  “{quest.story}”
                </Label>
                <View style={styles.objectives}>
                  {quest.objectives.map((objective, index) => {
                    const status = objectiveStatus(game, quest.id, index);
                    return (
                      <Row key={index} gap={space.sm}>
                        <Label>{status.done ? '✅' : '⬜'}</Label>
                        <Label style={styles.flex} tone={status.done ? 'muted' : 'default'}>
                          {describeObjective(objective)}
                        </Label>
                        {status.target > 1 && (
                          <Label size={13} tone="muted">
                            {status.current}/{status.target}
                          </Label>
                        )}
                      </Row>
                    );
                  })}
                </View>
                <Label size={13} tone="accent">
                  Ödül: {rewardText(quest, game.character)}
                </Label>
                {ready ? (
                  <Button
                    label="Teslim et"
                    onPress={() => act((state, at) => turnInQuest(state, quest.id, at), `Görev tamamlandı: ${quest.title}`)}
                  />
                ) : null}
              </Card>
            );
          })}
        </Section>
      )}

      {available.length > 0 && (
        <Section title="Yeni görevler">
          {available.map((quest) => (
            <Card key={quest.id}>
              <QuestHeader quest={quest} />
              <Label size={14} tone="muted">
                “{quest.story}”
              </Label>
              <Label size={13} tone="accent">
                Ödül: {rewardText(quest, game.character)}
              </Label>
              <Button
                variant="secondary"
                label="Kabul et"
                onPress={() => act((state, at) => acceptQuest(state, quest.id, at), `Yeni görev: ${quest.title}`)}
              />
            </Card>
          ))}
        </Section>
      )}

      {locked.length > 0 && (
        <Section title="Yakında">
          {locked.map((quest) => (
            <Card key={quest.id}>
              <QuestHeader quest={quest} />
              <Pill label={`${quest.minLevel}. seviyede açılır`} tone="muted" />
            </Card>
          ))}
        </Section>
      )}

      {active.length === 0 && available.length === 0 && locked.length === 0 && (
        <Card>
          <Label center>🌅 Şimdilik yapılacak görev yok. Yeni hikâyeler yolda!</Label>
        </Card>
      )}

      {done.length > 0 && (
        <Section title={`Tamamlananlar (${done.length})`}>
          {done.map((quest) => (
            <Row key={quest.id} gap={space.sm}>
              <Label>✔️</Label>
              <Label tone="muted" style={styles.flex}>
                {quest.title} · {quest.giver}
              </Label>
            </Row>
          ))}
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  objectives: { gap: 4 },
});
