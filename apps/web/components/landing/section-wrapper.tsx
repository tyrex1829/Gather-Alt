"use client";

import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export function SectionWrapper({
  children,
  className,
  id
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn("mx-auto max-w-6xl px-6 py-20", className)}
    >
      {children}
    </motion.section>
  );
}
