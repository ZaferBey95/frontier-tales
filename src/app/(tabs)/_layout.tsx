import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { activeQuests, availableQuests, questReady } from '@/game';
import { useGame } from '@/store/game';
import type { GlyphName } from '@/ui/art/glyphs';
import { Glyph } from '@/ui/art/icon';
import { UI } from '@/ui/art/registry';
import { GameHeader } from '@/ui/game-header';
import { useTheme } from '@/ui/theme';

function tabIcon(name: GlyphName) {
  function TabIcon({ color }: { color: ColorValue }) {
    return <Glyph name={name} size={24} color={color} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  const game = useGame((s) => s.game);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!game) return <Redirect href="/create" />;

  const unread = game.log.filter((entry) => !entry.read).length;
  const questsWaiting =
    activeQuests(game).filter((quest) => questReady(game, quest.id)).length + availableQuests(game).length;

  return (
    <Tabs
      screenOptions={{
        header: () => <GameHeader safeTop />,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 64 + insets.bottom },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
        tabBarBadgeStyle: { backgroundColor: theme.primary, color: theme.primaryText },
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Harita', tabBarIcon: tabIcon(UI.map) }}
      />
      <Tabs.Screen
        name="character"
        options={{
          title: 'Karakter',
          tabBarIcon: tabIcon(UI.character),
          tabBarBadge: game.character.attributePoints > 0 ? game.character.attributePoints : undefined,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Görevler',
          tabBarIcon: tabIcon(UI.quest),
          tabBarBadge: questsWaiting > 0 ? questsWaiting : undefined,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Günlük',
          tabBarIcon: tabIcon(UI.log),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
    </Tabs>
  );
}
