"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, ArrowUp, Banknote, House, MessageSquare } from "lucide-react";
import { Wordmark } from "./logo";
import { SandboxNotice } from "./sandbox";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/send", label: "Send", icon: ArrowUp },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/cashout", label: "Cash out", icon: Banknote },
];

function NavLinks({ className }: { className: string }) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label={className === "rail-nav" ? "Sections" : "Primary"}>
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
      <Link href="/feedback" aria-current={pathname.startsWith("/feedback") ? "page" : undefined}>
        <MessageSquare size={18} strokeWidth={1.75} />
        Feedback
      </Link>
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <aside className="rail">
        <Wordmark inverse size={28} />
        <NavLinks className="rail-nav" />
        <p className="rail-foot">Testnet sandbox · not real money</p>
      </aside>
      <div className="workspace">
        <div className="scroll">
          <SandboxNotice />
          {children}
        </div>
        <NavLinks className="nav" />
      </div>
    </div>
  );
}
