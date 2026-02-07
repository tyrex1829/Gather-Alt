"use client";

import { motion } from "framer-motion";
import { SectionWrapper } from "./section-wrapper";

const steps = [
  {
    number: "01",
    title: "Create your office",
    description: "Set up an organization and design your virtual floor plan in seconds."
  },
  {
    number: "02",
    title: "Invite your team",
    description: "Share your org slug and teammates join with one click."
  },
  {
    number: "03",
    title: "Work together",
    description: "Move around, see presence, chat, and collaborate in real-time."
  }
];

export function HowItWorks() {
  return (
    <SectionWrapper id="how-it-works">
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">
          How it works
        </h2>
        <p className="mt-3 text-sm text-white/35">
          Up and running in under a minute.
        </p>
      </div>
      <div className="grid gap-8 sm:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="text-center sm:text-left"
          >
            <div className="mb-3 text-xs font-medium text-white/15">
              {step.number}
            </div>
            <h3 className="text-sm font-medium text-white/80">{step.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/35">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
}
