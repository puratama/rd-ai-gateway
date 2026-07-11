"use client";

import { PanelLeftClose, PanelLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDelete,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "h-full bg-card border-r border-border flex flex-col transition-all duration-200",
        collapsed ? "w-0 overflow-hidden" : "w-64"
      )}
    >
      <div className="p-3 flex items-center justify-between border-b border-border">
        {!collapsed && (
          <>
            <Button size="sm" className="gap-2" onClick={onNew}>
              <Plus className="w-4 h-4" /> New Chat
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {!collapsed && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors",
                conv.id === activeConversationId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              onClick={() => onSelect(conv.id)}
            >
              <span className="text-sm truncate flex-1">
                {conv.title || "New conversation"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </nav>
      )}

      {collapsed && (
        <div className="p-2 flex flex-col items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="w-8 h-8">
            <PanelLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNew} className="w-8 h-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </aside>
  );
}
