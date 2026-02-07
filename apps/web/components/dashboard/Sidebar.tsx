"use client";

import { useState } from "react";
import { useOrgStore } from "../../stores/org";
import { useMapStore } from "../../stores/map";
import { createOrg, joinOrg, getOrgs, getOrgMembers, getMaps, createMap } from "../../lib/api";
import { Plus, Users, Map, ChevronDown, LogIn, Copy, Check } from "lucide-react";

const statusColors: Record<string, string> = {
  available: "bg-emerald-400",
  busy: "bg-red-400",
  away: "bg-amber-400",
  "in-meeting": "bg-violet-400"
};

export function Sidebar({ onEnterMap }: { onEnterMap: (mapId: string) => void }) {
  const orgs = useOrgStore((s) => s.orgs);
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const members = useOrgStore((s) => s.members);
  const setOrgs = useOrgStore((s) => s.setOrgs);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);
  const setMembers = useOrgStore((s) => s.setMembers);
  const addOrg = useOrgStore((s) => s.addOrg);
  const maps = useMapStore((s) => s.maps);
  const setMaps = useMapStore((s) => s.setMaps);
  const addMap = useMapStore((s) => s.addMap);

  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showJoinOrg, setShowJoinOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMapId, setCopiedMapId] = useState<string | null>(null);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName || !orgSlug) return;
    try {
      const data = await createOrg(orgName, orgSlug);
      addOrg(data.org);
      await selectOrg(data.org);
      setOrgName("");
      setOrgSlug("");
      setShowCreateOrg(false);
    } catch {}
  }

  async function handleJoinOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!joinSlug) return;
    try {
      const data = await joinOrg(joinSlug);
      addOrg(data.org);
      await selectOrg(data.org);
      setJoinSlug("");
      setShowJoinOrg(false);
    } catch {}
  }

  async function selectOrg(org: any) {
    setCurrentOrg(org);
    setShowOrgSwitcher(false);
    try {
      const [membersData, mapsData] = await Promise.all([
        getOrgMembers(org._id),
        getMaps(org._id)
      ]);
      setMembers(membersData.members);
      setMaps(mapsData.maps);
    } catch {}
  }

  async function handleCreateMap() {
    if (!currentOrg || creating) return;
    setCreating(true);
    const size = 12;
    const tiles = Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => {
        const isBorder = x === 0 || y === 0 || x === size - 1 || y === size - 1;
        return { type: isBorder ? "wall" : "floor" };
      })
    );
    try {
      const data = await createMap({
        organizationId: currentOrg._id,
        name: "Office " + (maps.length + 1),
        width: size,
        height: size,
        tiles,
        spawnPoint: { x: 1, y: 1 },
        rooms: []
      });
      const map = data.map;
      addMap({ _id: map._id, name: map.name, width: map.width, height: map.height, spawnPoint: map.spawnPoint, organizationId: map.organizationId });
    } catch {}
    setCreating(false);
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/[0.06] bg-[#0a0a0a]">
      {/* Org switcher */}
      <div className="border-b border-white/[0.06] p-3">
        <button
          onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/5"
        >
          <span className="truncate">{currentOrg?.name || "Select organization"}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-white/40" />
        </button>
        {currentOrg && (
          <div className="mt-1.5 flex items-center gap-1 rounded-md bg-white/[0.03] px-2 py-1">
            <span className="text-[10px] text-white/25">Invite slug:</span>
            <code className="flex-1 truncate text-[10px] text-white/50">{currentOrg.slug}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentOrg.slug);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 rounded p-0.5 text-white/25 hover:bg-white/5 hover:text-white/50"
              title="Copy slug to share"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        )}
        {showOrgSwitcher && (
          <div className="mt-1 space-y-0.5">
            {orgs.map((org) => (
              <button
                key={org._id}
                onClick={() => selectOrg(org)}
                className="w-full rounded-md px-2 py-1 text-left text-xs text-white/60 hover:bg-white/5 hover:text-white/80"
              >
                {org.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 border-b border-white/[0.06] p-2">
        <button
          onClick={() => { setShowCreateOrg(!showCreateOrg); setShowJoinOrg(false); }}
          className="flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white/70"
        >
          <Plus className="h-3 w-3" /> Create
        </button>
        <button
          onClick={() => { setShowJoinOrg(!showJoinOrg); setShowCreateOrg(false); }}
          className="flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white/70"
        >
          <LogIn className="h-3 w-3" /> Join
        </button>
      </div>

      {/* Create org form */}
      {showCreateOrg && (
        <form onSubmit={handleCreateOrg} className="border-b border-white/[0.06] p-3 space-y-2">
          <input className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white/80 placeholder:text-white/30" placeholder="Org name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <input className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white/80 placeholder:text-white/30" placeholder="Slug (e.g. my-team)" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} />
          <button className="w-full rounded-md bg-white/10 py-1.5 text-xs text-white/80 hover:bg-white/15">Create Org</button>
        </form>
      )}

      {/* Join org form */}
      {showJoinOrg && (
        <form onSubmit={handleJoinOrg} className="border-b border-white/[0.06] p-3 space-y-2">
          <input className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white/80 placeholder:text-white/30" placeholder="Org slug" value={joinSlug} onChange={(e) => setJoinSlug(e.target.value)} />
          <button className="w-full rounded-md bg-white/10 py-1.5 text-xs text-white/80 hover:bg-white/15">Join Org</button>
        </form>
      )}

      {/* Maps */}
      {currentOrg && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                <Map className="mr-1 inline h-3 w-3" /> Maps
              </span>
              <button onClick={handleCreateMap} disabled={creating} className="rounded p-0.5 text-white/30 hover:bg-white/5 hover:text-white/50">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-0.5">
              {maps.map((m) => (
                <div key={m._id} className="group flex items-center gap-0.5">
                  <button
                    onClick={() => onEnterMap(m._id)}
                    className="flex-1 rounded-md px-2 py-1.5 text-left text-xs text-white/60 hover:bg-white/5 hover:text-white/80"
                  >
                    {m.name}
                  </button>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/join/${currentOrg!.slug}/${m._id}`;
                      navigator.clipboard.writeText(link);
                      setCopiedMapId(m._id);
                      setTimeout(() => setCopiedMapId(null), 1500);
                    }}
                    className="shrink-0 rounded p-1 opacity-0 group-hover:opacity-100 text-white/25 hover:bg-white/5 hover:text-white/50 transition-opacity"
                    title="Copy invite link"
                  >
                    {copiedMapId === m._id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              ))}
              {maps.length === 0 && (
                <p className="px-2 text-[10px] text-white/20">No maps yet</p>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="p-3">
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-white/30">
              <Users className="mr-1 inline h-3 w-3" /> Members
            </span>
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m._id} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white/60">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColors[m.status] || "bg-gray-400"}`} />
                  <span className="truncate">{m.name}</span>
                </div>
              ))}
              {members.length === 0 && (
                <p className="px-2 text-[10px] text-white/20">No members</p>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
