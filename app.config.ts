import type { ConfigContext, ExpoConfig } from 'expo/config';

// GitHub Pages serves the web build from /<repo>/, so the deploy workflow sets
// EXPO_BASE_URL=/frontier-tales. Local development leaves it empty.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
