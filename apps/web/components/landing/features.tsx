"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  MessageSquare,
  Users,
  Shield,
  Zap,
  Layout
} from "lucide-react";
import { SectionWrapper } from "./section-wrapper";

const features = [
  {
    icon: MapPin,
    title: "Spatial presence",
    description: "See where your teammates are on a 2D map in real-time."
  },
  {
    icon: MessageSquare,
    title: "Instant messaging",
    description: "Room-wide broadcast or private DMs, all in context."
  },
  {
    icon: Users,
    title: "Team awareness",
    description: "Live status indicators show who's available, busy, or away."
  },
  {
    icon: Shield,
    title: "Secure by default",
    description: "JWT auth, rate limiting, CORS lockdown, and helmet headers."
  },
  {
    icon: Zap,
    title: "Real-time engine",
    description: "WebSocket-powered with Redis pub/sub for horizontal scaling."
  },
  {
    icon: Layout,
    title: "Custom offices",
    description: "Design your own floor plans with walls, desks, and rooms."
  }
];

export function Features() {
  return (
    <SectionWrapper id="features">
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">
          Everything you need
        </h2>
        <p className="mt-3 text-sm text-white/35">
          Built for teams who value presence and spontaneity.
        </p>
      </div>
      <div className="grid gap-px rounded-xl border border-white/[0.06] bg-white/[0.03] sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="p-6"
          >
            <feature.icon className="mb-3 h-5 w-5 text-white/25" />
            <h3 className="text-sm font-medium text-white/80">
              {feature.title}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-white/35">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}
