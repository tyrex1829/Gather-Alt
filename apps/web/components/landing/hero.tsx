"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { AnimatedGrid } from "./animated-grid";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      <AnimatedGrid />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Badge>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Now in public beta
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl"
        >
          Your team&apos;s
          <span className="block text-white/50">virtual office.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mt-6 max-w-xl text-base text-white/40 leading-relaxed"
        >
          Proximity-first collaboration for teams that want presence,
          spontaneity, and culture &mdash; without the friction.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <Link
            href="/signup"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 transition"
          >
            Get started free
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-lg border border-white/10 px-5 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white/80 transition"
          >
            See how it works
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
