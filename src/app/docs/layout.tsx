"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Zap,
  Grid3X3,
  Sparkles,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Server,
  Shield,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { label: "Overview", href: "/docs", icon: BookOpen },
  { label: "Quick Start", href: "/docs/quickstart", icon: Zap },
  { label: "API Reference", href: "/docs/api", icon: Server },
  { label: "Authentication", href: "/docs/auth", icon: Shield },
  { label: "Models", href: "/docs/models", icon: Grid3X3 },
  { label: "Features", href: "/docs/features", icon: Sparkles },
  { label: "FAQ", href: "/docs/faq", icon: HelpCircle },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell variant="user">
      <div className="h-full flex">
        {/* Docs sub-sidebar */}
        <aside className="w-56 border-r border-border bg-card/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to App
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">Documentation</span>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/docs" ? pathname === "/docs" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground">AI Gateway v0.1</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-10">{children}</div>
        </main>
      </div>
    </AppShell>
  );
}
