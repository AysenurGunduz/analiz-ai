"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSearch, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Analiz", icon: Sparkles },
  { href: "/sorgu-kontrol", label: "Sorgu Kontrolü", icon: FileSearch },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition",
              active
                ? "bg-white/8 text-ink"
                : "text-muted hover:bg-white/5 hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
