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
  setPlayers: (players: Player[]) => void;
  updatePlayer: (player: Partial<Player> & { userId: string }) => void;
  removePlayer: (userId: string) => void;
  setLocalPosition: (pos: { x: number; y: number }) => void;
};

export const usePresenceStore = create<PresenceState>()((set) => ({
  players: new Map(),
  localPosition: { x: 1, y: 1 },
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
          ...update
        } as Player);
      }
      return { players: next };
    }),
  removePlayer: (userId) =>
    set((s) => {
      const next = new Map(s.players);
      next.delete(userId);
      return { players: next };
    }),
  setLocalPosition: (pos) => set({ localPosition: pos })
}));
