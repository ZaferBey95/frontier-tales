import { Sancreek_400Regular, useFonts } from '@expo-google-fonts/sancreek';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { useGame } from '@/store/game';
import { DISPLAY_FONT, palettes } from '@/ui/theme';
import { ToastHost } from '@/ui/toast-host';

SplashScreen.preventAutoHideAsync();

/** Resolves finished tasks every second and whenever the app comes back. */
function useGameClock() {
  useEffect(() => {
    const tick = () => useGame.getState().tick();
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = palettes[scheme];
  const [fontsLoaded, fontError] = useFonts({ [DISPLAY_FONT]: Sancreek_400Regular });
  const hydrated = useGame((s) => s.hydrated);
  const ready = (fontsLoaded || !!fontError) && hydrated;
  useGameClock();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.background,
      card: theme.surface,
      border: theme.border,
      text: theme.text,
      primary: theme.primary,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.primary,
          headerTitleStyle: { fontFamily: DISPLAY_FONT, color: theme.text },
          contentStyle: { backgroundColor: theme.background },
          headerBackTitle: 'Geri',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ headerShown: false }} />
        <Stack.Screen name="location/[id]" options={{ title: '' }} />
        <Stack.Screen name="shop" options={{ title: 'Genel Mağaza' }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Rapor' }} />
      </Stack>
      <ToastHost />
    </ThemeProvider>
  );
}
