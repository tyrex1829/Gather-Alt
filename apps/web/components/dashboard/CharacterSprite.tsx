export function CharacterSprite({
  name,
  direction = "ArrowDown",
  status = "available",
  isLocal = false
}: {
  name: string;
  direction?: string;
  status?: string;
  isLocal?: boolean;
}) {
  const statusColors: Record<string, string> = {
    available: "#34d399",
    busy: "#f87171",
    away: "#fbbf24",
    "in-meeting": "#a78bfa"
  };

  const statusColor = statusColors[status] || "#34d399";
  const initials = name?.[0]?.toUpperCase() || "?";
  
  // Base styling for the sprite
  const headColor = isLocal ? "#e879f9" : "#22d3ee"; // fuchsia-400 vs cyan-400
  const bodyColor = isLocal ? "#d946ef" : "#06b6d4"; // fuchsia-500 vs cyan-500

  // Calculate eye positions based on direction
  // ArrowUp, ArrowDown, ArrowLeft, ArrowRight, w, a, s, d
  let leftEye = { top: "30%", left: "25%" };
  let rightEye = { top: "30%", right: "25%" };
  let showEyes = true;

  if (direction === "ArrowUp" || direction === "w") {
    showEyes = false;
  } else if (direction === "ArrowLeft" || direction === "a") {
    leftEye = { top: "30%", left: "15%" };
    showEyes = "left";
  } else if (direction === "ArrowRight" || direction === "d") {
    rightEye = { top: "30%", right: "15%" };
    showEyes = "right";
  }

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Name tag and status */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5 whitespace-nowrap z-20">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-[8px] font-bold text-white drop-shadow-md">
          {isLocal ? "You" : name}
        </span>
      </div>

      {/* Character Sprite */}
      <div className="relative w-[20px] h-[24px] flex flex-col items-center justify-end z-10">
        {/* Head */}
        <div 
          className="w-4 h-4 rounded-full absolute top-0 z-20 border border-black/20 shadow-sm"
          style={{ backgroundColor: headColor }}
        >
          {showEyes !== false && (
            <>
              {(showEyes === true || showEyes === "left") && (
                <div 
                  className="absolute w-1 h-1 bg-black/60 rounded-full" 
                  style={leftEye}
                />
              )}
              {(showEyes === true || showEyes === "right") && (
                <div 
                  className="absolute w-1 h-1 bg-black/60 rounded-full" 
                  style={rightEye}
                />
              )}
            </>
          )}
        </div>
        
        {/* Body */}
        <div 
          className="w-5 h-[14px] rounded-t-lg rounded-b-sm absolute bottom-0 z-10 border border-black/20 shadow-sm"
          style={{ backgroundColor: bodyColor }}
        />
      </div>
    </div>
  );
}
