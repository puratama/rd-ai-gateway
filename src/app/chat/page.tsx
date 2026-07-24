"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import AppShell from "@/components/layout/AppShell";
import ChatArea from "@/components/ChatArea";
import PromptInput from "@/components/PromptInput";
import ModelSelector from "@/components/ModelSelector";
import { chatStream, getModels } from "@/lib/puter";
import { recordEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message, Conversation } from "@/types";

function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("xperimne-api-key") || "";
}

function normalizeConv(raw: { id: string; title: string; model: string; messages: unknown; createdAt: string | number; updatedAt: string | number }): Conversation {
  return {
    id: raw.id,
    title: raw.title,
    model: raw.model,
    messages: Array.isArray(raw.messages) ? (raw.messages as Message[]) : [],
    createdAt: typeof raw.createdAt === "string" ? new Date(raw.createdAt).getTime() : raw.createdAt,
    updatedAt: typeof raw.updatedAt === "string" ? new Date(raw.updatedAt).getTime() : raw.updatedAt,
  };
}

async function apiFetch(path: string, init?: RequestInit) {
  const key = getApiKey();
  if (!key) return null;
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...(init?.headers || {}) },
  });
  if (!res.ok) return null;
  return res.json();
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [puterReady, setPuterReady] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    apiFetch("/api/conversations").then((data) => {
      if (Array.isArray(data)) {
        const convs = data.map(normalizeConv);
        setConversations(convs);
        if (convs.length > 0) setActiveId(convs[0].id);
      }
    });
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const getCurrentMessages = useCallback((): Message[] => {
    return activeConversation?.messages || [];
  }, [activeConversation]);

  useEffect(() => {
    messagesRef.current = getCurrentMessages();
  });

  useEffect(() => {
    async function init() {
      try {
        const models = await getModels();
        if (models.length > 0 && !selectedModel) setSelectedModel(models[0].id);
        setPuterReady(true);
      } catch {}
    }
    init();
  }, [selectedModel]);

  const createNewConversation = useCallback(() => {
    const id = uuidv4();
    const now = Date.now();
    const newConv: Conversation = {
      id,
      title: "New conversation",
      messages: [],
      model: selectedModel,
      createdAt: now,
      updatedAt: now,
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    setStreamingContent("");
    setIsStreaming(false);

    apiFetch("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ id, title: newConv.title, model: selectedModel, messages: [] }),
    });

    recordEvent({
      type: "conversation_created",
      timestamp: now,
      model: selectedModel,
      conversationId: id,
    });
  }, [selectedModel]);

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c)));

    const body: Record<string, unknown> = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.messages !== undefined) body.messages = updates.messages;
    if (updates.model !== undefined) body.model = updates.model;
    if (Object.keys(body).length > 0) apiFetch(`/api/conversations/${id}`, { method: "PUT", body: JSON.stringify(body) });
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
    apiFetch(`/api/conversations/${id}`, { method: "DELETE" });
    recordEvent({ type: "conversation_deleted", timestamp: Date.now(), conversationId: id });
  }, []);

  const handleSend = useCallback(async (content: string) => {
    if (!selectedModel || isStreaming) return;

    const currentMessages = messagesRef.current;
    let convId = activeId;

    if (!convId) {
      const newConv: Conversation = {
        id: uuidv4(),
        title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
        messages: [],
        model: selectedModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(newConv.id);
      convId = newConv.id;
    }

    const msgTimestamp = Date.now();
    const userMessage: Message = { id: uuidv4(), role: "user", content, timestamp: msgTimestamp };

    recordEvent({
      type: "message_sent",
      timestamp: msgTimestamp,
      model: selectedModel,
      conversationId: convId,
      messageLength: content.length,
    });

    const updatedMessages = [...currentMessages, userMessage];
    updateConversation(convId, {
      messages: updatedMessages,
      title: currentMessages.length === 0 ? content.slice(0, 50) + (content.length > 50 ? "..." : "") : undefined,
    });

    const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }));

    setIsStreaming(true);
    setStreamingContent("");
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let fullContent = "";
      await chatStream(
        apiMessages,
        selectedModel,
        {
          onText: (chunk: string) => {
            fullContent += chunk;
            setStreamingContent(fullContent);
          },
          onDone: () => {},
          onError: (err: Error) => {
            throw err;
          },
        },
        controller.signal
      );

      const assistantMessage: Message = { id: uuidv4(), role: "assistant", content: fullContent, timestamp: Date.now() };
      updateConversation(convId, { messages: [...updatedMessages, assistantMessage] });

      recordEvent({
        type: "message_received",
        timestamp: Date.now(),
        model: selectedModel,
        conversationId: convId,
        messageLength: fullContent.length,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        updateConversation(convId, {
          messages: [
            ...updatedMessages,
            { id: uuidv4(), role: "assistant", content: "Sorry, something went wrong. Please try again.", timestamp: Date.now() },
          ],
        });
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  }, [selectedModel, isStreaming, activeId, updateConversation]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  const currentMessages = getCurrentMessages();

  return (
    <AppShell variant="user">
      <div className="h-full flex">
        <aside className={cn("h-full bg-card border-r border-border flex flex-col transition-all duration-200 shrink-0", sidebarCollapsed ? "w-0 overflow-hidden" : "w-64")}>
          <div className="p-3 flex items-center justify-between border-b border-border">
            {!sidebarCollapsed && (
              <>
                <Button size="sm" className="gap-2" onClick={createNewConversation}>
                  <Plus className="w-4 h-4" /> New Chat
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(true)}>
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {!sidebarCollapsed && (
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors",
                    conv.id === activeId ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setActiveId(conv.id)}
                >
                  <span className="text-sm truncate flex-1">{conv.title || "New conversation"}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </nav>
          )}

          {sidebarCollapsed && (
            <div className="p-2 flex flex-col items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(false)} className="w-8 h-8">
                <PanelLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={createNewConversation} className="w-8 h-8">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              {sidebarCollapsed && (
                <Button variant="ghost" size="icon-sm" onClick={() => setSidebarCollapsed(false)}>
                  <PanelLeft className="w-4 h-4" />
                </Button>
              )}
              <span className="text-sm font-medium truncate">{activeConversation?.title || "New Chat"}</span>
            </div>
            <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
          </header>

          <ChatArea messages={currentMessages} isStreaming={isStreaming} streamingContent={streamingContent} />
          <PromptInput onSend={handleSend} onStop={handleStop} isStreaming={isStreaming} disabled={!puterReady} />
        </div>
      </div>
    </AppShell>
  );
}
