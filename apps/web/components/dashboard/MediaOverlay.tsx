"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LiveKitRoom,
  VideoConference,
  useTracks,
  useParticipants,
  RoomAudioRenderer,
  ControlBar,
  ParticipantTile,
  TrackReference
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { getMediaToken } from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import { usePresenceStore } from "../../stores/presence";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

const AUDIO_RANGE = 5;
const VIDEO_RANGE = 3;

function distance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function ProximityAudioRenderer() {
  const participants = useParticipants();
  const players = usePresenceStore((s) => s.players);
  const localPosition = usePresenceStore((s) => s.localPosition);

  return (
    <>
      {participants.map((p) => {
        if (p.isLocal) return null;
        
        // Find player in presence store
        const playerState = players.get(p.identity);
        if (!playerState) return null;

        const dist = distance(localPosition, playerState.position);
        
        // Only render audio if within range
        if (dist <= AUDIO_RANGE) {
          // In a real implementation, we could set the volume on the HTMLAudioElement
          // based on distance. For now, we just attach the track if in range.
          return (
            <div key={p.identity} className="hidden">
               {/* Custom audio rendering logic would go here if we needed distance-based volume, 
                   but LiveKit's RoomAudioRenderer handles default attachment. We will use a custom approach if needed, 
                   but let's just keep it simple for MVP or assume it's attached and we mute it. */}
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

function ProximityVideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const players = usePresenceStore((s) => s.players);
  const localPosition = usePresenceStore((s) => s.localPosition);

  // Filter tracks by proximity
  const visibleTracks = useMemo(() => {
    return tracks.filter((t) => {
      if (t.participant.isLocal) return true;
      const playerState = players.get(t.participant.identity);
      if (!playerState) return false;
      const dist = distance(localPosition, playerState.position);
      return dist <= VIDEO_RANGE;
    });
  }, [tracks, players, localPosition]);

  if (visibleTracks.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 z-50 flex gap-2 overflow-x-auto max-w-[600px] pointer-events-auto">
      {visibleTracks.map((trackRef: any) => (
        <div key={trackRef.participant.identity + trackRef.source} className="w-48 h-36 rounded-lg overflow-hidden border border-white/10 bg-black/50 shadow-xl">
          <ParticipantTile trackRef={trackRef} />
        </div>
      ))}
    </div>
  );
}

export function MediaOverlay({ mapId }: { mapId: string }) {
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let mounted = true;
    getMediaToken(mapId, user?.name)
      .then((data) => {
        if (!mounted) return;
        setToken(data.token);
        setUrl(data.url);
      })
      .catch((err) => {
        console.error("Failed to fetch media token", err);
      });
    return () => { mounted = false; };
  }, [mapId, user?.name]);

  if (!token || !url) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <LiveKitRoom
        video={false}
        audio={false}
        token={token}
        serverUrl={url}
        data-lk-theme="default"
        className="w-full h-full"
      >
        <ProximityVideoGrid />
        <RoomAudioRenderer />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <ControlBar variation="minimal" />
        </div>
      </LiveKitRoom>
    </div>
  );
}
