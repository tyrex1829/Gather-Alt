"use client";

import { motion } from "framer-motion";
import { SectionWrapper } from "./section-wrapper";

export function Showcase() {
  return (
    <SectionWrapper className="py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-white/[0.06]"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="ml-3 text-[10px] text-white/20">gather.app/dashboard</span>
        </div>

        {/* Mock content */}
        <div className="flex bg-[#0c0c0c]">
          {/* Sidebar mock */}
          <div className="w-40 border-r border-white/[0.04] p-3">
            <div className="mb-3 h-3 w-20 rounded bg-white/[0.06]" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-24 rounded bg-white/[0.04]" />
              <div className="h-2.5 w-16 rounded bg-white/[0.04]" />
              <div className="h-2.5 w-28 rounded bg-white/[0.04]" />
            </div>
            <div className="mt-4 mb-2 h-2 w-14 rounded bg-white/[0.06]" />
            <div className="space-y-1">
              {["available", "busy", "away"].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        s === "available"
                          ? "#34d399"
                          : s === "busy"
                          ? "#f87171"
                          : "#fbbf24"
                    }}
                  />
                  <div className="h-2 w-16 rounded bg-white/[0.04]" />
                </div>
              ))}
            </div>
          </div>

          {/* Map mock */}
          <div className="flex-1 p-4">
            <div className="grid grid-cols-8 gap-px">
              {Array.from({ length: 64 }, (_, i) => {
                const x = i % 8;
                const y = Math.floor(i / 8);
                const isBorder = x === 0 || y === 0 || x === 7 || y === 7;
                const isPlayer1 = x === 3 && y === 3;
                const isPlayer2 = x === 5 && y === 4;
                return (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center rounded-sm"
                    style={{
                      backgroundColor: isBorder
                        ? "#1a1a1a"
                        : isPlayer1
                        ? "rgba(217, 70, 239, 0.2)"
                        : isPlayer2
                        ? "rgba(6, 182, 212, 0.15)"
                        : "#1f1f1f",
                      border: isPlayer1
                        ? "1px solid rgba(217,70,239,0.5)"
                        : isPlayer2
                        ? "1px solid rgba(6,182,212,0.4)"
                        : "none"
                    }}
                  >
                    {isPlayer1 && (
                      <span className="text-[6px] font-bold text-fuchsia-300">
                        You
                      </span>
                    )}
                    {isPlayer2 && (
                      <span className="text-[6px] font-bold text-cyan-300">
                        A
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat mock */}
          <div className="w-36 border-l border-white/[0.04] p-3">
            <div className="mb-3 h-2 w-10 rounded bg-white/[0.06]" />
            <div className="space-y-2">
              <div className="rounded-md bg-white/[0.03] px-2 py-1.5">
                <div className="mb-1 h-1.5 w-8 rounded bg-white/[0.08]" />
                <div className="h-1.5 w-20 rounded bg-white/[0.04]" />
              </div>
              <div className="ml-auto rounded-md bg-white/[0.06] px-2 py-1.5">
                <div className="mb-1 h-1.5 w-6 rounded bg-white/[0.08]" />
                <div className="h-1.5 w-16 rounded bg-white/[0.04]" />
              </div>
              <div className="rounded-md bg-white/[0.03] px-2 py-1.5">
                <div className="mb-1 h-1.5 w-10 rounded bg-white/[0.08]" />
                <div className="h-1.5 w-24 rounded bg-white/[0.04]" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </SectionWrapper>
  );
}
