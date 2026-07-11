"use client";

import Link from "next/link";
import { PanelLeft, BookOpen, BarChart3, DollarSign, Key, LayoutDashboard } from "lucide-react";
import ModelSelector from "./ModelSelector";
import ThemeToggle from "./ThemeToggle";

interface NavbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
}

export default function Navbar({
  sidebarCollapsed,
  onToggleSidebar,
  selectedModel,
  onModelSelect,
}: NavbarProps) {
  return (
    <header className="h-12 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        {sidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-200">AI Gateway</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Admin
        </Link>

        <Link
          href="/keys"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Key className="w-3.5 h-3.5" />
          Keys
        </Link>

        <Link
          href="/pricing"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <DollarSign className="w-3.5 h-3.5" />
          Pricing
        </Link>

        <Link
          href="/analytics"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Analytics
        </Link>

        <Link
          href="/docs"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Docs
        </Link>

        <ModelSelector selectedModel={selectedModel} onSelect={onModelSelect} />
        <div className="w-px h-5 bg-zinc-800" />
        <ThemeToggle />
      </div>
    </header>
  );
}
