"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "../../../../stores/auth";
import { useOrgStore } from "../../../../stores/org";
import { useMapStore } from "../../../../stores/map";
import { joinOrg, getOrgMembers, getMaps } from "../../../../lib/api";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams<{ orgSlug: string; mapId: string }>();
  const token = useAuthStore((s) => s.token);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);
  const addOrg = useOrgStore((s) => s.addOrg);
  const setMembers = useOrgStore((s) => s.setMembers);
  const setMaps = useMapStore((s) => s.setMaps);
  const setCurrentMapId = useMapStore((s) => s.setCurrentMapId);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      // Not logged in — send to signup with a return URL
      const returnUrl = `/join/${params.orgSlug}/${params.mapId}`;
      router.replace(`/signup?returnTo=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Logged in — join the org, then redirect to dashboard with map open
    async function doJoin() {
      try {
        const data = await joinOrg(params.orgSlug);
        const org = data.org;
        addOrg(org);
        setCurrentOrg(org);

        const [membersData, mapsData] = await Promise.all([
          getOrgMembers(org._id),
          getMaps(org._id)
        ]);
        setMembers(membersData.members);
        setMaps(mapsData.maps);
        setCurrentMapId(params.mapId);
        router.replace("/dashboard");
      } catch (err: any) {
        setError(err.message || "Failed to join organization");
        setStatus("error");
      }
    }

    doJoin();
  }, [token, params.orgSlug, params.mapId, router, addOrg, setCurrentOrg, setMembers, setMaps, setCurrentMapId]);

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Go to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center text-white">
      <div className="text-center">
        <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        <p className="text-sm text-white/40">Joining workspace...</p>
      </div>
    </main>
  );
}
