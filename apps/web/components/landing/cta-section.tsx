"use client";

import Link from "next/link";
import { SectionWrapper } from "./section-wrapper";

export function CTASection() {
  return (
    <SectionWrapper className="py-24 text-center">
      <h2 className="text-3xl font-semibold text-white sm:text-4xl">
        Ready to build your office?
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm text-white/35">
        Create your virtual workspace in seconds. Free to start, no credit card required.
      </p>
      <div className="mt-8">
        <Link
          href="/signup"
          className="inline-flex rounded-lg bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition"
        >
          Get started free
        </Link>
      </div>
    </SectionWrapper>
  );
}
