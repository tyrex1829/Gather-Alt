"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMapStore } from "../../stores/map";
import { usePresenceStore } from "../../stores/presence";
import { useAuthStore } from "../../stores/auth";
import { connectSocket, getSocket, disconnectSocket } from "../../lib/ws";
import { getMap } from "../../lib/api";
import { useChatStore } from "../../stores/chat";

const TILE_SIZE = 32;

const statusColors: Record<string, string> = {
  available: "#34d399",
  busy: "#f87171",
  away: "#fbbf24",
  "in-meeting": "#a78bfa"
};

export function MapCanvas({ mapId }: { mapId: string }) {
  const currentMap = useMapStore((s) => s.currentMap);
  const setCurrentMap = useMapStore((s) => s.setCurrentMap);
  const user = useAuthStore((s) => s.user);
  const players = usePresenceStore((s) => s.players);
  const setPlayers = usePresenceStore((s) => s.setPlayers);
  const updatePlayer = usePresenceStore((s) => s.updatePlayer);
  const removePlayer = usePresenceStore((s) => s.removePlayer);
  const localPosition = usePresenceStore((s) => s.localPosition);
  const setLocalPosition = usePresenceStore((s) => s.setLocalPosition);
  const addMessage = useChatStore((s) => s.addMessage);
  const lastMoveRef = useRef(0);

  const userId = user?.id || user?._id || "";

  // Load map data
  useEffect(() => {
    getMap(mapId)
      .then((data) => {
        setCurrentMap(data.map);
        setLocalPosition(data.map.spawnPoint || { x: 1, y: 1 });
      })
      .catch(() => setCurrentMap(null));
  }, [mapId, setCurrentMap, setLocalPosition]);

  // Connect to WS and join room
  useEffect(() => {
    const socket = connectSocket();

    socket.emit("room:join", { mapId, characterId: "char_1" });

    socket.on("room:state", (payload) => {
      setPlayers(payload.players || []);
      const me = payload.players?.find((p: any) => p.userId === userId);
      if (me) setLocalPosition(me.position);
    });

    socket.on("player:joined", (player) => {
      updatePlayer(player);
    });

    socket.on("player:moved", ({ userId: uid, position, direction }) => {
      updatePlayer({ userId: uid, position, direction });
    });

    socket.on("player:left", ({ userId: uid }) => {
      removePlayer(uid);
    });

    socket.on("player:status:changed", ({ userId: uid, status }) => {
      updatePlayer({ userId: uid, status });
    });

    socket.on("chat:received", (msg) => {
      addMessage(msg);
    });

    return () => {
      socket.off("room:state");
      socket.off("player:joined");
      socket.off("player:moved");
      socket.off("player:left");
      socket.off("player:status:changed");
      socket.off("chat:received");
      disconnectSocket();
    };
  }, [mapId, userId, setPlayers, updatePlayer, removePlayer, setLocalPosition, addMessage]);

  // Keyboard movement with throttle
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!currentMap) return;
      const now = Date.now();
      if (now - lastMoveRef.current < 100) return;

      const dirs: Record<string, { dx: number; dy: number }> = {
        ArrowUp: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
        ArrowLeft: { dx: -1, dy: 0 },
        ArrowRight: { dx: 1, dy: 0 },
        w: { dx: 0, dy: -1 },
        s: { dx: 0, dy: 1 },
        a: { dx: -1, dy: 0 },
        d: { dx: 1, dy: 0 }
      };

      const dir = dirs[e.key];
      if (!dir) return;

      e.preventDefault();
      const next = { x: localPosition.x + dir.dx, y: localPosition.y + dir.dy };
      if (next.x < 0 || next.y < 0 || next.x >= currentMap.width || next.y >= currentMap.height) return;
      if (currentMap.collisionGrid?.[next.y]?.[next.x] === 1) return;

      lastMoveRef.current = now;
      setLocalPosition(next);
      const socket = getSocket();
      socket?.emit("player:move", { mapId, position: next, direction: e.key });
    },
    [currentMap, localPosition, mapId, setLocalPosition]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!currentMap) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/30">
        Loading map...
      </div>
    );
  }

  const tileColors: Record<string, string> = {
    wall: "#1a1a1a",
    floor: "#1f1f1f",
    desk: "#1a1a1a",
    chair: "#1a1a1a",
    door: "#2a2a2a",
    "meeting-room-floor": "#1c1c2a",
    "cafeteria-floor": "#1c2a1c",
    "poster-wall": "#1a1a1a",
    "spawn-point": "#1f1f1f"
  };

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      <div
        className="grid gap-px rounded-lg bg-white/[0.02] p-1"
        style={{
          gridTemplateColumns: `repeat(${currentMap.width}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${currentMap.height}, ${TILE_SIZE}px)`
        }}
      >
        {currentMap.tiles.flat().map((tile: any, idx: number) => {
          const x = idx % currentMap.width;
          const y = Math.floor(idx / currentMap.width);
          const isLocalPlayer = localPosition.x === x && localPosition.y === y;

          // Find remote player at this position
          let remotePlayer: any = null;
          for (const [pid, p] of players) {
            if (pid !== userId && p.position.x === x && p.position.y === y) {
              remotePlayer = p;
              break;
            }
          }

          const bg = tileColors[tile.type] || "#1f1f1f";
          const isBlocked = tile.type === "wall" || tile.type === "desk" || tile.type === "chair";

          return (
            <div
              key={idx}
              className="relative flex items-center justify-center"
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                backgroundColor: bg,
                borderRadius: 2
              }}
            >
              {isLocalPlayer && (
                <>
                  <div
                    className="absolute inset-0.5 rounded-sm"
                    style={{
                      backgroundColor: "rgba(217, 70, 239, 0.3)",
                      border: "1.5px solid rgba(217, 70, 239, 0.7)"
                    }}
                  />
                  <span className="relative z-10 text-[8px] font-bold text-white">You</span>
                </>
              )}
              {remotePlayer && !isLocalPlayer && (
                <>
                  <div
                    className="absolute inset-0.5 rounded-sm"
                    style={{
                      backgroundColor: "rgba(6, 182, 212, 0.25)",
                      border: `1.5px solid ${statusColors[remotePlayer.status] || "#06b6d4"}`
                    }}
                  />
                  <span className="relative z-10 text-[8px] font-bold text-cyan-300">
                    {remotePlayer.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
