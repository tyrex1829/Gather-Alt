"use client";

import { useAuthStore } from "../../stores/auth";
import { usePresenceStore } from "../../stores/presence";
import { getSocket } from "../../lib/ws";
import { logout } from "../../lib/api";
import { LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const statuses = ["available", "busy", "away", "in-meeting"] as const;

const statusColors: Record<string, string> = {
  available: "bg-emerald-400",
  busy: "bg-red-400",
  away: "bg-amber-400",
  "in-meeting": "bg-violet-400"
};

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const players = usePresenceStore((s) => s.players);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const userId = user?.id || user?._id || "";
  const localPlayer = players.get(userId);
  const currentStatus = localPlayer?.status || "available";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function changeStatus(status: string) {
    const socket = getSocket();
    socket?.emit("player:status", { status });
    setOpen(false);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      clear();
    }
  }

  return (
    <div className="flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a] px-4">
      <div className="text-sm font-medium text-white/80">Gather</div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/5"
          >
            <span className={`h-2 w-2 rounded-full ${statusColors[currentStatus]}`} />
            {user?.name}
            <ChevronDown className="h-3 w-3" />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-white/10 bg-[#141414] py-1 shadow-xl">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                >
                  <span className={`h-2 w-2 rounded-full ${statusColors[s]}`} />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white/70"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
