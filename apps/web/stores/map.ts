"use client";

import { create } from "zustand";

type MapSummary = {
  _id: string;
  name: string;
  width: number;
  height: number;
  spawnPoint: { x: number; y: number };
  organizationId: string;
};

type MapFull = MapSummary & {
  tiles: any[][];
  collisionGrid?: number[][];
  rooms?: any[];
};

type MapState = {
  maps: MapSummary[];
  currentMapId: string | null;
  currentMap: MapFull | null;
  setMaps: (maps: MapSummary[]) => void;
  setCurrentMapId: (id: string | null) => void;
  setCurrentMap: (map: MapFull | null) => void;
  addMap: (map: MapSummary) => void;
};

export const useMapStore = create<MapState>()((set) => ({
  maps: [],
  currentMapId: null,
  currentMap: null,
  setMaps: (maps) => set({ maps }),
  setCurrentMapId: (id) => set({ currentMapId: id }),
  setCurrentMap: (map) => set({ currentMap: map }),
  addMap: (map) => set((s) => ({ maps: [...s.maps, map] }))
}));
