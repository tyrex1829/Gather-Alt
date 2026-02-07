"use client";

export function AnimatedGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-grid mask-fade-bottom absolute inset-0 opacity-40" />
    </div>
  );
}
