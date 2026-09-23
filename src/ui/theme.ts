import { useColorScheme } from 'react-native';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accent: string;
  success: string;
  danger: string;
  hp: string;
  energy: string;
  xp: string;
  track: string;
  mapLand: string;
  mapRoad: string;
  mapWater: string;
}

const light: Palette = {
  background: '#F2E6CB',
  surface: '#FBF4E2',
  surfaceAlt: '#EADBB8',
  border: '#D3BE93',
  text: '#2E1D10',
  textMuted: '#7A5E40',
  primary: '#9C3D1E',
  primaryText: '#FFF6E5',
  accent: '#A87412',
  success: '#4E7A2E',
  danger: '#B3261E',
  hp: '#B83A2E',
  energy: '#D49A1F',
  xp: '#4F74A8',
  track: '#E2D2AE',
  mapLand: '#E9D3A4',
  mapRoad: '#B8976A',
  mapWater: '#7FA7C4',
};

const dark: Palette = {
  background: '#1B130D',
  surface: '#271C14',
  surfaceAlt: '#33251A',
  border: '#4A3825',
  text: '#F3E6CC',
  textMuted: '#B9A07E',
  primary: '#C9582E',
  primaryText: '#FFF6E5',
  accent: '#E0B04A',
  success: '#86AD60',
  danger: '#E4675C',
  hp: '#D9564A',
  energy: '#E3AE3A',
  xp: '#7C9FD4',
  track: '#3D2E20',
  mapLand: '#3A2A1B',
  mapRoad: '#6E5436',
  mapWater: '#3F6581',
};

export const palettes = { light, dark };

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const DISPLAY_FONT = 'Sancreek_400Regular';

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 14 } as const;
export const MAX_WIDTH = 720;
