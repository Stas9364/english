"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Trash2, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAdminChat } from "@/hooks/use-admin-chat";
import { cn } from "@/lib/utils";

export function AdminChatWidget() {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, inputValue, setInputValue, loading, streamingText, error, clearChat, handleSubmit, stopGeneration } =
    useAdminChat();

  useEffect(() => {
    if (!open) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages, streamingText]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 z-40 size-12 rounded-full shadow-lg"
          aria-label="Open chat"
        >
          <MessageCircle className="size-6" />
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-background/80 backdrop-blur-md"
        className="inset-0 left-0 top-0 h-full w-full max-w-none translate-x-0 translate-y-0 flex min-h-0 flex-col overflow-hidden rounded-none border-0 p-0"
        title="Your own chat"
      >
        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-semibold">Your own chat</h2>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  aria-label="Clear chat"
                  onClick={clearChat}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4"
          >
            {messages.length === 0 && !loading && (
              <p className="text-muted-foreground text-sm">
                Send a message to start the conversation.
              </p>
            )}
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <span className="font-medium text-xs opacity-80">
                    {m.role === "user" ? "You" : "Gemma"}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap wrap-break-word">
                    {m.text}
                  </p>
                </div>
              ))}
              {(loading || streamingText) && (
                <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="font-medium text-xs opacity-80">Gemma</span>
                  <p className="mt-0.5 whitespace-pre-wrap wrap-break-word">
                    {streamingText ? (
                      streamingText
                    ) : (
                      <span className="inline-flex gap-0.5" aria-hidden>
                        <span
                          className="animate-[typing-dot_1.4s_ease-in-out_infinite]"
                          style={{ animationDelay: "0ms" }}
                        >
                          .
                        </span>
                        <span
                          className="animate-[typing-dot_1.4s_ease-in-out_infinite]"
                          style={{ animationDelay: "0.2s" }}
                        >
                          .
                        </span>
                        <span
                          className="animate-[typing-dot_1.4s_ease-in-out_infinite]"
                          style={{ animationDelay: "0.4s" }}
                        >
                          .
                        </span>
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>

          <footer className="shrink-0 border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
                disabled={loading}
                className="min-w-0 flex-1"
                autoFocus
              />
              {loading ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={stopGeneration}
                  aria-label="Stop generation"
                >
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" disabled={!inputValue.trim()} aria-label="Send">
                  <Send className="size-4" />
                </Button>
              )}
            </form>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
