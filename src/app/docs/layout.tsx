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

const sidebarItems = [
  {
    label: "Overview",
    href: "/docs",
    icon: BookOpen,
  },
  {
    label: "Quick Start",
    href: "/docs/quickstart",
    icon: Zap,
  },
  {
    label: "API Reference",
    href: "/docs/api",
    icon: Server,
  },
  {
    label: "Authentication",
    href: "/docs/auth",
    icon: Shield,
  },
  {
    label: "Models",
    href: "/docs/models",
    icon: Grid3X3,
  },
  {
    label: "Features",
    href: "/docs/features",
    icon: Sparkles,
  },
  {
    label: "FAQ",
    href: "/docs/faq",
    icon: HelpCircle,
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">Back to App</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">Documentation</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/docs"
                ? pathname === "/docs"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
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

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">
            AI Gateway v0.1 &mdash; Chat UI + API
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-zinc-900/30">
        <div className="max-w-3xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
