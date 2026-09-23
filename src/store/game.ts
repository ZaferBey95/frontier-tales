// The one place the UI talks to the engine. The save lives on the device
// (AsyncStorage, which is localStorage on the web).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  markLogRead,
  migrateSave,
  needsSettle,
  newGame,
  settle,
  type ActionResult,
  type ClassId,
  type GameState,
} from '@/game';

import { showToast } from './toast';

type Action = (state: GameState, now: number) => ActionResult;

interface GameStore {
  game: GameState | null;
  hydrated: boolean;
  startGame: (name: string, classId: ClassId) => void;
  /** Runs an engine action, stores the result and shows errors as a toast. */
  act: (action: Action, successMessage?: string) => ActionResult | null;
  /** Resolves tasks that have finished. Called every second. */
  tick: () => void;
  markLogRead: (entryId?: string) => void;
  resetGame: () => void;
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      game: null,
      hydrated: false,
      startGame: (name, classId) => {
        const seed = Math.floor(Math.random() * 2 ** 32);
        set({ game: newGame(name, classId, Date.now(), seed) });
      },
      act: (action, successMessage) => {
        const game = get().game;
        if (!game) return null;
        const result = action(game, Date.now());
        if (result.ok) {
          set({ game: result.state });
          if (successMessage) showToast(successMessage, 'success');
        } else {
          showToast(result.error, 'error');
        }
        return result;
      },
      tick: () => {
        const game = get().game;
        const now = Date.now();
        if (game && needsSettle(game, now)) set({ game: settle(game, now) });
      },
      markLogRead: (entryId) => {
        const game = get().game;
        if (!game) return;
        const next = markLogRead(game, entryId);
        if (next !== game) set({ game: next });
      },
      resetGame: () => set({ game: null }),
    }),
    {
      name: 'frontier-tales-save',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ game: state.game }),
      merge: (persisted, current) => {
        const saved = (persisted as { game?: unknown } | undefined)?.game;
        return { ...current, game: saved ? migrateSave(saved) : null };
      },
      onRehydrateStorage: () => () => {
        useGame.setState({ hydrated: true });
      },
    },
  ),
);
