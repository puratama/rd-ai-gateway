"use client";

import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderUserContent = (content: string) =>
    content.split("\n").map((line, i) => (
      <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
    ));

  return (
    <div className={cn("flex items-start gap-3 group", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className={cn("flex-1 max-w-[85%]", isUser && "flex justify-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-primary/10 text-foreground rounded-tr-md"
              : "bg-muted/50 text-foreground rounded-tl-md border border-border"
          )}
        >
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap">{renderUserContent(message.content)}</div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
              )}
            </div>
          )}
        </div>

        {!isUser && message.content && !isStreaming && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 ml-1 h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}
