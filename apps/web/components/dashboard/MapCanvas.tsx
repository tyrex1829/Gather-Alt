"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useMapStore } from "../../stores/map";
import { usePresenceStore } from "../../stores/presence";
import { useAuthStore } from "../../stores/auth";
import { connectSocket, getSocket, disconnectSocket } from "../../lib/ws";
import { getMap, getMapMessages, updateMap } from "../../lib/api";
import { useChatStore } from "../../stores/chat";
import { Edit2, Save, X } from "lucide-react";
import { CharacterSprite } from "./CharacterSprite";

const TILE_SIZE = 32;

const statusColors: Record<string, string> = {
  available: "#34d399",
  busy: "#f87171",
  away: "#fbbf24",
  "in-meeting": "#a78bfa"
};

const tileTypes = [
  { type: "floor", color: "#18181b", label: "Floor" },
  { type: "wall", color: "#27272a", label: "Wall" },
  { type: "desk", color: "#78716c", label: "Desk" },
  { type: "chair", color: "#a1a1aa", label: "Chair" },
  { type: "door", color: "#3f3f46", label: "Door" },
  { type: "spawn-point", color: "#18181b", label: "Spawn" },
  { type: "meeting-room-floor", color: "#1e1b4b", label: "Meeting" },
  { type: "cafeteria-floor", color: "#14532d", label: "Cafeteria" }
];

const tileColors: Record<string, string> = {
  wall: "#27272a",
  floor: "#18181b",
  desk: "#78716c",
  chair: "#a1a1aa",
  door: "#3f3f46",
  "meeting-room-floor": "#1e1b4b",
  "cafeteria-floor": "#14532d",
  "poster-wall": "#831843",
  "spawn-point": "#18181b"
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
  const localDirection = usePresenceStore((s) => s.localDirection);
  const setLocalDirection = usePresenceStore((s) => s.setLocalDirection);
  const localIsSitting = usePresenceStore((s) => s.localIsSitting);
  const setLocalIsSitting = usePresenceStore((s) => s.setLocalIsSitting);
  const addMessage = useChatStore((s) => s.addMessage);
  const setMessages = useChatStore((s) => s.setMessages);
  const lastMoveRef = useRef(0);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedTileType, setSelectedTileType] = useState("wall");
  const [isSaving, setIsSaving] = useState(false);
  const [localMapTiles, setLocalMapTiles] = useState<any[][] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [adjacentChair, setAdjacentChair] = useState<{x: number, y: number} | null>(null);

  const userId = user?.id || user?._id || "";

  // Load map data
  useEffect(() => {
    getMap(mapId)
      .then((data) => {
        setCurrentMap(data.map);
        setLocalMapTiles(data.map.tiles);
        setLocalPosition(data.map.spawnPoint || { x: 1, y: 1 });
      })
      .catch(() => setCurrentMap(null));
  }, [mapId, setCurrentMap, setLocalPosition]);

  useEffect(() => {
    getMapMessages(mapId, undefined, 100)
      .then((data) => {
        const history = (data.messages || []).map((msg: any) => ({
          id: msg.id || msg._id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          content: msg.content,
          recipientId: msg.recipientId || undefined,
          type: msg.type,
          mentions: msg.mentions || [],
          createdAt: msg.createdAt,
          timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now()
        }));
        setMessages(history);
      })
      .catch(() => {
        setMessages([]);
      });
  }, [mapId, setMessages]);

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

    socket.on("player:status-changed", ({ userId: uid, status }) => {
      updatePlayer({ userId: uid, status });
    });
    
    socket.on("player:status:changed", ({ userId: uid, status }) => {
      updatePlayer({ userId: uid, status });
    });

    socket.on("player:sat", ({ userId: uid }) => {
      updatePlayer({ userId: uid, isSitting: true } as any);
    });

    socket.on("player:stood", ({ userId: uid }) => {
      updatePlayer({ userId: uid, isSitting: false } as any);
    });

    socket.on("chat:received", (msg) => {
      addMessage({
        ...msg,
        timestamp: msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now())
      });
    });

    return () => {
      socket.off("room:state");
      socket.off("player:joined");
      socket.off("player:moved");
      socket.off("player:left");
      socket.off("player:status-changed");
      socket.off("player:status:changed");
      socket.off("player:sat");
      socket.off("player:stood");
      socket.off("chat:received");
      disconnectSocket();
    };
  }, [mapId, userId, setPlayers, updatePlayer, removePlayer, setLocalPosition, addMessage]);

  // Check if adjacent to chair
  useEffect(() => {
    if (!currentMap || isEditing) {
      setAdjacentChair(null);
      return;
    }
    const { x, y } = localPosition;
    const adjacent = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];
    let found = null;
    for (const { dx, dy } of adjacent) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < currentMap.width && ny < currentMap.height) {
        if (currentMap.tiles[ny][nx].type === "chair") {
          found = { x: nx, y: ny };
          break;
        }
      }
    }
    setAdjacentChair(found);
  }, [localPosition, currentMap, isEditing]);

  // Keyboard movement with throttle
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!currentMap || isEditing) return;
      
      // Sit/Stand interaction
      if (e.key.toLowerCase() === "e") {
        if (localIsSitting) {
          setLocalIsSitting(false);
          const socket = getSocket();
          socket?.emit("player:stand", { mapId });
        } else if (adjacentChair) {
          setLocalIsSitting(true);
          const socket = getSocket();
          socket?.emit("player:sit", { mapId, chairId: `${adjacentChair.x},${adjacentChair.y}` });
        }
        return;
      }

      if (localIsSitting) return; // Cannot move while sitting

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
      
      // Update direction even if blocked
      setLocalDirection(e.key);
      const socket = getSocket();
      
      if (next.x < 0 || next.y < 0 || next.x >= currentMap.width || next.y >= currentMap.height) {
        socket?.emit("player:move", { mapId, position: localPosition, direction: e.key });
        return;
      }
      if (currentMap.collisionGrid?.[next.y]?.[next.x] === 1) {
        socket?.emit("player:move", { mapId, position: localPosition, direction: e.key });
        return;
      }

      lastMoveRef.current = now;
      setLocalPosition(next);
      socket?.emit("player:move", { mapId, position: next, direction: e.key });
    },
    [currentMap, localPosition, mapId, setLocalPosition, setLocalDirection, isEditing, localIsSitting, adjacentChair, setLocalIsSitting]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleTileDraw = (x: number, y: number) => {
    if (!isEditing || !localMapTiles) return;
    setLocalMapTiles((prev) => {
      if (!prev) return prev;
      const next = prev.map((row) => [...row]);
      next[y][x] = { ...next[y][x], type: selectedTileType };
      return next;
    });
  };

  const handleSaveMap = async () => {
    if (!localMapTiles) return;
    setIsSaving(true);
    try {
      const { map } = await updateMap(mapId, { tiles: localMapTiles });
      setCurrentMap(map);
      setLocalMapTiles(map.tiles);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save map", err);
      setLocalMapTiles(currentMap?.tiles || null);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentMap || !localMapTiles) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/30">
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-auto p-4 bg-[#0a0a0a]">
      {/* Interaction Prompt */}
      {!isEditing && (adjacentChair || localIsSitting) && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-black/80 px-4 py-2 rounded-full border border-white/10 text-white shadow-xl flex items-center gap-3">
          <kbd className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono font-bold">E</kbd>
          <span className="text-sm font-medium">
            {localIsSitting ? "Stand Up" : "Sit Down"}
          </span>
        </div>
      )}

      {/* Map Editor Toolbar */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20 transition-colors shadow-lg border border-white/5"
          >
            <Edit2 className="h-4 w-4" /> Edit Map
          </button>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg bg-[#111] p-3 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
              <span className="text-sm font-medium text-white/80">Map Editor</span>
              <button onClick={() => {
                setIsEditing(false);
                setLocalMapTiles(currentMap.tiles);
              }} className="text-white/40 hover:text-white/80">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {tileTypes.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setSelectedTileType(t.type)}
                  className={`flex items-center gap-2 rounded p-1.5 text-xs transition-colors ${
                    selectedTileType === t.type ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" : "hover:bg-white/5 text-white/60 border border-transparent"
                  }`}
                >
                  <div className="h-4 w-4 rounded-sm border border-white/20" style={{ backgroundColor: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>

            <button 
              onClick={handleSaveMap}
              disabled={isSaving}
              className="mt-2 flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <div
        className="grid gap-px rounded-lg bg-white/[0.02] p-1 shadow-2xl"
        style={{
          gridTemplateColumns: `repeat(${currentMap.width}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${currentMap.height}, ${TILE_SIZE}px)`,
          cursor: isEditing ? "crosshair" : "default"
        }}
        onMouseLeave={() => setIsDragging(false)}
        onMouseUp={() => setIsDragging(false)}
      >
        {localMapTiles.flat().map((tile: any, idx: number) => {
          const x = idx % currentMap.width;
          const y = Math.floor(idx / currentMap.width);
          const isLocalPlayer = localPosition.x === x && localPosition.y === y;

          let remotePlayer: any = null;
          for (const [pid, p] of players) {
            if (pid !== userId && p.position.x === x && p.position.y === y) {
              remotePlayer = p;
              break;
            }
          }

          const bg = tileColors[tile.type] || "#18181b";

          return (
            <div
              key={idx}
              onMouseDown={() => {
                if (isEditing) {
                  setIsDragging(true);
                  handleTileDraw(x, y);
                }
              }}
              onMouseEnter={() => {
                if (isEditing && isDragging) {
                  handleTileDraw(x, y);
                }
              }}
              className="relative flex items-center justify-center transition-colors"
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                backgroundColor: bg,
                borderRadius: 2
              }}
            >
              {tile.type === "spawn-point" && (
                <div className="absolute inset-2 rounded-full bg-cyan-500/20 border border-cyan-500/50" />
              )}
              {isLocalPlayer && !isEditing && (
                <div 
                  className="absolute inset-0 z-20 overflow-visible transition-transform duration-200"
                  style={{ transform: localIsSitting ? 'translateY(6px)' : 'translateY(0)' }}
                >
                  <CharacterSprite
                    name={user?.name || "You"}
                    direction={localDirection}
                    status={user?.status || "available"}
                    isLocal
                  />
                </div>
              )}
              {remotePlayer && !isLocalPlayer && !isEditing && (
                <div 
                  className="absolute inset-0 z-20 overflow-visible transition-transform duration-200"
                  style={{ transform: (remotePlayer as any).isSitting ? 'translateY(6px)' : 'translateY(0)' }}
                >
                  <CharacterSprite
                    name={remotePlayer.name}
                    direction={remotePlayer.direction}
                    status={remotePlayer.status}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
