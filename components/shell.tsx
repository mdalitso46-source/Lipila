"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";

const tabs = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/send", label: "Send", icon: SendIcon },
  { href: "/swap", label: "Swap", icon: SwapIcon },
  { href: "/cashout", label: "Cash", icon: CashIcon },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <span className="chip">Testnet</span>
      </header>
      <div style={{ flex: 1 }}>{children}</div>
      <nav className="tabs" aria-label="Primary">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const current = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} aria-current={current ? "page" : undefined}>
              <Icon />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 8.2 9 3l6 5.2V15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.2Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3.5 9h11M10 4.5 14.5 9 10 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 6.5h10M11 3.5 14 6.5 11 9.5M14 11.5H4M7 8.5 4 11.5 7 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="4.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="9" r="1.7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
