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
    <header className="border-b border-amber-200 bg-amber-50">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <Link href="/" className="w-fit rounded-lg text-xl font-extrabold tracking-tight text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
          Daktari
        </Link>
        <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center rounded-xl px-2 text-center text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 sm:px-3 sm:text-sm ${
                  active ? "bg-emerald-900 text-white" : "text-stone-800 hover:bg-amber-100"
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
