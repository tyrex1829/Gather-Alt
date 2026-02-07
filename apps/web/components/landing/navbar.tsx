"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 z-50 w-full border-b border-white/[0.04] bg-[#0a0a0a]/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold text-white">
          Gather
        </Link>
        <div className="hidden items-center gap-6 sm:flex">
          <a href="#features" className="text-xs text-white/50 hover:text-white/80 transition">
            Features
          </a>
          <a href="#how-it-works" className="text-xs text-white/50 hover:text-white/80 transition">
            How it works
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs text-white/50 hover:text-white/80 transition"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-medium text-black hover:bg-white/90 transition"
          >
            Get started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
