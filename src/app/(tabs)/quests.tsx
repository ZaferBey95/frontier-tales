import { StyleSheet, View } from 'react-native';

import {
  acceptQuest,
  activeQuests,
  availableQuests,
  completedQuests,
  describeObjective,
  lockedByLevel,
  objectiveStatus,
  questReady,
  turnInQuest,
  xpWithPerk,
  type Character,
  type QuestDef,
} from '@/game';
import { useGame } from '@/store/game';
import { Badge, Glyph } from '@/ui/art/icon';
import { GIVER_ART, UI } from '@/ui/art/registry';
import { Button, Card, Flourish, IconText, Label, Pill, Row, Screen, Section, Title } from '@/ui/components';
import { Rewards } from '@/ui/rewards';
import { space, useTheme } from '@/ui/theme';

function questRewards(quest: QuestDef, character: Character) {
  return {
    money: quest.rewards.money,
    xp: xpWithPerk(character, quest.rewards.xp),
    items: quest.rewards.itemId ? [{ itemId: quest.rewards.itemId, count: 1 }] : [],
  };
}

function QuestHeader({ quest, dimmed }: { quest: QuestDef; dimmed?: boolean }) {
  const art = GIVER_ART[quest.giverId];
  return (
    <Row gap={space.md}>
      <Badge glyph={art.glyph} tone={art.tone} size={48} shape="circle" dimmed={dimmed} />
      <View style={styles.flex}>
        <Title size={19}>{quest.title}</Title>
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
  const theme = useTheme();
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
                        <View
                          style={[
                            styles.check,
                            {
                              borderColor: status.done ? theme.success : theme.border,
                              backgroundColor: status.done ? theme.success : 'transparent',
                            },
                          ]}>
                          {status.done && <Glyph name={UI.done} size={14} color={theme.surface} />}
                        </View>
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
                <Flourish />
                <Rewards rewards={questRewards(quest, game.character)} />
                {ready ? (
                  <Button
                    glyph={UI.win}
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
              <Flourish />
              <Rewards rewards={questRewards(quest, game.character)} />
              <Button
                variant="secondary"
                glyph={UI.quest}
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
              <QuestHeader quest={quest} dimmed />
              <Pill label={`${quest.minLevel}. seviyede açılır`} tone="muted" glyph={UI.locked} />
            </Card>
          ))}
        </Section>
      )}

      {active.length === 0 && available.length === 0 && locked.length === 0 && (
        <Card>
          <Row gap={space.md}>
            <Badge glyph="sunset" tone="rust" size={48} shape="circle" />
            <Label style={styles.flex}>Şimdilik yapılacak görev yok. Yeni hikâyeler yolda!</Label>
          </Row>
        </Card>
      )}

      {done.length > 0 && (
        <Section title={`Tamamlananlar (${done.length})`}>
          {done.map((quest) => (
            <IconText key={quest.id} glyph={UI.done} tone="muted" iconColor={theme.success}>
              {quest.title} · {quest.giver}
            </IconText>
          ))}
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  objectives: { gap: 6 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
