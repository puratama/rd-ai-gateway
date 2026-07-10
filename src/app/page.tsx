"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import PromptInput from "@/components/PromptInput";
import { chatStream, getModels } from "@/lib/puter";
import { recordEvent } from "@/lib/analytics";
import type { Message, Conversation } from "@/types";

const STORAGE_KEY = "ai-gateway-conversations";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Storage full or unavailable
  }
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(() => {
    const initial = loadConversations();
    return initial.length > 0 ? initial[0].id : null;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [puterReady, setPuterReady] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const getCurrentMessages = useCallback((): Message[] => {
    return activeConversation?.messages || [];
  }, [activeConversation]);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = getCurrentMessages();
  });

  // Save conversations on change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  // Load models and check Puter
  useEffect(() => {
    async function init() {
      try {
        const models = await getModels();
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0].id);
        }
        setPuterReady(true);
      } catch {
        // Puter not ready yet
      }
    }
    init();
  }, []);

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

    recordEvent({
      type: "conversation_created",
      timestamp: now,
      model: selectedModel,
      conversationId: id,
    });
  }, [selectedModel]);

  const updateConversation = useCallback(
    (id: string, updates: Partial<Conversation>) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c))
      );
    },
    []
  );

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));

    recordEvent({
      type: "conversation_deleted",
      timestamp: Date.now(),
      conversationId: id,
    });
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedModel || isStreaming) return;

      // Baca messages terbaru dari ref untuk menghindari stale closure
      const currentMessages = messagesRef.current;

      // Create conversation if none active
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
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content,
        timestamp: msgTimestamp,
      };

      // Record message sent event
      recordEvent({
        type: "message_sent",
        timestamp: msgTimestamp,
        model: selectedModel,
        conversationId: convId,
        messageLength: content.length,
      });

      // Add user message
      const updatedMessages = [...currentMessages, userMessage];
      updateConversation(convId, {
        messages: updatedMessages,
        title:
          currentMessages.length === 0
            ? content.slice(0, 50) + (content.length > 50 ? "..." : "")
            : undefined,
      });

      // Siapkan messages untuk API
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Buat AbortController untuk stream
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsStreaming(true);
      setStreamingContent("");

      const assistantMessageId = uuidv4();

      await chatStream(
        apiMessages,
        selectedModel,
        {
          onText: (text) => {
            setStreamingContent((prev) => prev + text);
          },
          onDone: (fullText) => {
            const respTimestamp = Date.now();
            const assistantMessage: Message = {
              id: assistantMessageId,
              role: "assistant",
              content: fullText,
              timestamp: respTimestamp,
            };

            // Record message received event
            recordEvent({
              type: "message_received",
              timestamp: respTimestamp,
              model: selectedModel,
              conversationId: convId,
              messageLength: fullText.length,
            });

            // Gunakan setter function untuk menghindari stale closure
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      messages: [...c.messages, assistantMessage],
                      updatedAt: respTimestamp,
                    }
                  : c
              )
            );
            setStreamingContent("");
            setIsStreaming(false);
            abortControllerRef.current = null;
          },
          onError: (error) => {
            const errorMessage: Message = {
              id: assistantMessageId,
              role: "assistant",
              content: `Error: ${error.message}`,
              timestamp: Date.now(),
            };

            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      messages: [...c.messages, errorMessage],
                      updatedAt: Date.now(),
                    }
                  : c
              )
            );
            setStreamingContent("");
            setIsStreaming(false);
            abortControllerRef.current = null;
          },
        },
        abortController.signal
      );
    },
    [selectedModel, isStreaming, activeId, updateConversation]
  );

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  const currentMessages = getCurrentMessages();

  return (
    <div className="h-full flex flex-col bg-black">
      <Navbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeConversationId={activeId}
          onSelect={setActiveId}
          onNew={createNewConversation}
          onDelete={deleteConversation}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main className="flex-1 flex flex-col bg-zinc-900/30">
          <ChatArea
            messages={currentMessages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
          />

          <PromptInput
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
            disabled={!puterReady}
          />
        </main>
      </div>
    </div>
  );
}
