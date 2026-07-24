"use client";

import { useState, useRef, useEffect } from "react";
import { Send, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export default function PromptInput({ onSend, onStop, isStreaming, disabled }: PromptInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto p-4">
        <div className="relative flex items-end gap-2 bg-muted rounded-2xl border border-input focus-within:border-primary/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={isStreaming || disabled}
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground px-4 py-3 outline-none resize-none text-sm max-h-[200px] disabled:opacity-50"
          />

          <div className="flex items-center gap-1.5 p-1.5">
            {isStreaming ? (
              <Button
                variant="destructive"
                size="icon"
                onClick={onStop}
                className="h-8 w-8 rounded-xl"
                title="Stop generating"
              >
                <StopCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSubmit}
                disabled={!input.trim() || disabled}
                className="h-8 w-8 rounded-xl"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Enter to send &middot; Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
