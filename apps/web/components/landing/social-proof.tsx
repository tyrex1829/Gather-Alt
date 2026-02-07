"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let frame: number;
    const duration = 1500;
    const start = Date.now();
    function animate() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats = [
  { label: "Teams onboarded", value: 2400, suffix: "+" },
  { label: "Messages sent", value: 180000, suffix: "+" },
  { label: "Uptime", value: 99.9, suffix: "%" }
];

export function SocialProof() {
  return (
    <section className="border-y border-white/[0.04] py-16">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-6 sm:flex-row sm:justify-between">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="text-center"
          >
            <div className="text-3xl font-semibold text-white">
              <CountUp target={stat.value} suffix={stat.suffix} />
            </div>
            <div className="mt-1 text-xs text-white/30">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
