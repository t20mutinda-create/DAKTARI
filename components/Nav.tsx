"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Check an animal" },
  { href: "/cases", label: "Cases" },
  { href: "/map", label: "Outbreak map" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-stone-200 bg-white">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3"
      >
        <Link href="/" className="text-lg font-bold tracking-tight text-emerald-800">
          Daktari
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  active ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
