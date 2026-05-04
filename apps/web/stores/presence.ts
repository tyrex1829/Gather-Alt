"use client";

import { create } from "zustand";

type Player = {
  userId: string;
  name: string;
  characterId?: string;
  position: { x: number; y: number };
  status: string;
  direction?: string;
};

type PresenceState = {
  players: Map<string, Player>;
  localPosition: { x: number; y: number };
  localDirection: string;
  localIsSitting: boolean;
  setPlayers: (players: Player[]) => void;
  updatePlayer: (player: Partial<Player> & { userId: string }) => void;
  removePlayer: (userId: string) => void;
  setLocalPosition: (pos: { x: number; y: number }) => void;
  setLocalDirection: (dir: string) => void;
  setLocalIsSitting: (sitting: boolean) => void;
};

export const usePresenceStore = create<PresenceState>()((set) => ({
  players: new Map(),
  localPosition: { x: 1, y: 1 },
  localDirection: "ArrowDown",
  localIsSitting: false,
  setPlayers: (players) =>
    set({ players: new Map(players.map((p) => [p.userId, p])) }),
  updatePlayer: (update) =>
    set((s) => {
      const next = new Map(s.players);
      const existing = next.get(update.userId);
      if (existing) {
        next.set(update.userId, { ...existing, ...update });
      } else {
        next.set(update.userId, {
          name: "",
          position: { x: 0, y: 0 },
          status: "available",
          isSitting: false,
          ...update
        } as Player & { isSitting?: boolean });
      }
      return { players: next };
    }),
  removePlayer: (userId) =>
    set((s) => {
      const next = new Map(s.players);
      next.delete(userId);
      return { players: next };
    }),
  setLocalPosition: (pos) => set({ localPosition: pos }),
  setLocalDirection: (dir) => set({ localDirection: dir }),
  setLocalIsSitting: (sitting) => set({ localIsSitting: sitting })
}));
