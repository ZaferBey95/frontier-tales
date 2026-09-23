import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { activeQuests, availableQuests, questReady } from '@/game';
import { useGame } from '@/store/game';
import { GameHeader } from '@/ui/game-header';
import { useTheme } from '@/ui/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, lineHeight: 24, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
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
        options={{ title: 'Harita', tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="character"
        options={{
          title: 'Karakter',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🤠" focused={focused} />,
          tabBarBadge: game.character.attributePoints > 0 ? game.character.attributePoints : undefined,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Görevler',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📜" focused={focused} />,
          tabBarBadge: questsWaiting > 0 ? questsWaiting : undefined,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Günlük',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📰" focused={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
    </Tabs>
  );
}
