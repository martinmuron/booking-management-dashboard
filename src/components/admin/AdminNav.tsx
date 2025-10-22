"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Home" },
  { href: "/admin/manual-sync", label: "Manual Sync" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/nuki", label: "Nuki" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Nick & Jenny</p>
          <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
