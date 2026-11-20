"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, ArrowUp, Banknote, House } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/send", label: "Send", icon: ArrowUp },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/cashout", label: "Cash out", icon: Banknote },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app">
      <div className="scroll">{children}</div>
      <nav className="nav" aria-label="Primary">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const current = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} aria-current={current ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.75} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
