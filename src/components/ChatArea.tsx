"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import MessageBubble from "./MessageBubble";
import type { Message } from "@/types";

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
}

export default function ChatArea({ messages, isStreaming, streamingContent }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-200 mb-2">
            AI Gateway
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Access hundreds of AI models through one unified interface.
            Powered by <span className="text-emerald-400">Puter.js</span>.
            No API keys needed — just start chatting.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              GPT-4
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Claude
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Gemini
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              500+ models
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingContent,
              timestamp: 0,
            }}
            isStreaming
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
