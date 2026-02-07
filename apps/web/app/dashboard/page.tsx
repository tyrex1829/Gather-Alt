"use client";

import { useEffect } from "react";
import { useAuthStore } from "../../stores/auth";
import { useOrgStore } from "../../stores/org";
import { useMapStore } from "../../stores/map";
import { useChatStore } from "../../stores/chat";
import { getOrgs, getOrgMembers, getMaps } from "../../lib/api";
import { TopBar } from "../../components/dashboard/TopBar";
import { Sidebar } from "../../components/dashboard/Sidebar";
import { MapCanvas } from "../../components/dashboard/MapCanvas";
import { ChatPanel } from "../../components/dashboard/ChatPanel";

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const setOrgs = useOrgStore((s) => s.setOrgs);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);
  const setMembers = useOrgStore((s) => s.setMembers);
  const setMaps = useMapStore((s) => s.setMaps);
  const currentMapId = useMapStore((s) => s.currentMapId);
  const setCurrentMapId = useMapStore((s) => s.setCurrentMapId);
  const setCurrentMap = useMapStore((s) => s.setCurrentMap);
  const clearMessages = useChatStore((s) => s.clearMessages);

  useEffect(() => {
    if (!token) return;
    getOrgs()
      .then(async (data) => {
        setOrgs(data.orgs);
        if (data.orgs.length > 0) {
          const org = data.orgs[0];
          setCurrentOrg(org);
          const [membersData, mapsData] = await Promise.all([
            getOrgMembers(org._id),
            getMaps(org._id)
          ]);
          setMembers(membersData.members);
          setMaps(mapsData.maps);
        }
      })
      .catch(() => {});
  }, [token, setOrgs, setCurrentOrg, setMembers, setMaps]);

  function handleEnterMap(mapId: string) {
    clearMessages();
    setCurrentMap(null);
    setCurrentMapId(mapId);
  }

  return (
    <div className="flex h-screen flex-col text-white">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onEnterMap={handleEnterMap} />
        <div className="flex flex-1">
          <div className="flex-1">
            {currentMapId ? (
              <MapCanvas mapId={currentMapId} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-white/30">Select a map from the sidebar to enter</p>
                  <p className="mt-1 text-xs text-white/15">
                    Or create a new org and map to get started
                  </p>
                </div>
              </div>
            )}
          </div>
          {currentMapId && (
            <div className="w-72">
              <ChatPanel mapId={currentMapId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
