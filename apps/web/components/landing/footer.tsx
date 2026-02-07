"use client";

import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" }
    ]
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Status", href: "#" }
    ]
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" }
    ]
  }
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-medium text-white/40">{col.title}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-white/25 hover:text-white/50 transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex items-center justify-between border-t border-white/[0.04] pt-6">
          <span className="text-[10px] text-white/20">
            &copy; {new Date().getFullYear()} Gather. All rights reserved.
          </span>
          <div className="flex gap-4">
            <span className="text-[10px] text-white/15">Twitter</span>
            <span className="text-[10px] text-white/15">GitHub</span>
            <span className="text-[10px] text-white/15">Discord</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
