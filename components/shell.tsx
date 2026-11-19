"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Banknote, House, Send } from "lucide-react";
import { Brand } from "./brand";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/send", label: "Send", icon: Send },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/cashout", label: "Cash", icon: Banknote },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app">
      <div className="scroll">
        <header className="topbar">
          <Brand />
          <span className="pill">Testnet</span>
        </header>
        {children}
      </div>
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
