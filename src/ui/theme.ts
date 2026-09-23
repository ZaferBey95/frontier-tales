import { useColorScheme } from 'react-native';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryEdge: string;
  primaryText: string;
  accent: string;
  success: string;
  danger: string;
  hp: string;
  energy: string;
  xp: string;
  track: string;
  map: MapPalette;
}

export interface MapPalette {
  land: string;
  edge: string;
  grass: string;
  desert: string;
  rock: string;
  rockLight: string;
  rockShade: string;
  mountain: string;
  mountainShade: string;
  snow: string;
  tree: string;
  treeShade: string;
  trunk: string;
  water: string;
  waterLight: string;
  bank: string;
  road: string;
  rail: string;
  ink: string;
}

const light: Palette = {
  background: '#F2E6CB',
  surface: '#FBF4E2',
  surfaceAlt: '#EADBB8',
  border: '#D3BE93',
  text: '#2E1D10',
  textMuted: '#7A5E40',
  primary: '#9C3D1E',
  primaryEdge: '#6A2711',
  primaryText: '#FFF6E5',
  accent: '#A87412',
  success: '#4E7A2E',
  danger: '#B3261E',
  hp: '#B83A2E',
  energy: '#D49A1F',
  xp: '#4F74A8',
  track: '#E2D2AE',
  map: {
    land: '#EBD6A6',
    edge: '#B98F55',
    grass: '#A9B46E',
    desert: '#E7B26E',
    rock: '#C0673E',
    rockLight: '#D98A5A',
    rockShade: '#8E4222',
    mountain: '#A08D74',
    mountainShade: '#6F604F',
    snow: '#F7F1E3',
    tree: '#4F6B3A',
    treeShade: '#36502A',
    trunk: '#5B3B22',
    water: '#6E9CBE',
    waterLight: '#B3D2E6',
    bank: '#8C7A55',
    road: '#A07A50',
    rail: '#4A3626',
    ink: '#5A4027',
  },
};

const dark: Palette = {
  background: '#1B130D',
  surface: '#271C14',
  surfaceAlt: '#33251A',
  border: '#4A3825',
  text: '#F3E6CC',
  textMuted: '#B9A07E',
  primary: '#C9582E',
  primaryEdge: '#8A3515',
  primaryText: '#FFF6E5',
  accent: '#E0B04A',
  success: '#86AD60',
  danger: '#E4675C',
  hp: '#D9564A',
  energy: '#E3AE3A',
  xp: '#7C9FD4',
  track: '#3D2E20',
  map: {
    land: '#3A2B1D',
    edge: '#150E08',
    grass: '#4A5634',
    desert: '#6A4B2A',
    rock: '#8C4A2C',
    rockLight: '#A5603B',
    rockShade: '#5E2E19',
    mountain: '#5E5244',
    mountainShade: '#40372D',
    snow: '#CFC7B6',
    tree: '#3E5530',
    treeShade: '#2A3B20',
    trunk: '#3E2A18',
    water: '#3F6581',
    waterLight: '#7EA3BD',
    bank: '#2E2519',
    road: '#7A5E3E',
    rail: '#120C08',
    ink: '#C9AE84',
  },
};

export const palettes = { light, dark };

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const DISPLAY_FONT = 'Sancreek_400Regular';

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 14 } as const;
export const MAX_WIDTH = 720;
