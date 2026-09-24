// The 3D map uses WebGL through the browser, so the native app keeps the 2D
// map for now. This file stands in for world-map-3d.web.tsx on iOS/Android.

import type { GameState, LocationId } from '@/game';

export const MAP_3D_AVAILABLE = false;

export function WorldMap3D(_props: {
  game: GameState;
  night: boolean;
  onSelect: (id: LocationId) => void;
  onUnavailable: () => void;
}) {
  return null;
}
