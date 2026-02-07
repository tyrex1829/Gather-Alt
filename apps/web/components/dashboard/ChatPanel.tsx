"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../../stores/chat";
import { useAuthStore } from "../../stores/auth";
import { getSocket } from "../../lib/ws";
import { Send } from "lucide-react";

export function ChatPanel({ mapId }: { mapId: string }) {
  const messages = useChatStore((s) => s.messages);
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const userId = user?.id || user?._id || "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const socket = getSocket();
    socket?.emit("chat:send", { mapId, content: input.trim() });
    setInput("");
  }

  return (
    <div className="flex h-full flex-col border-l border-white/[0.06] bg-[#0a0a0a]">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <span className="text-xs font-medium text-white/40">Chat</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map((msg) => {
          const isMe = msg.senderId === userId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <span className="text-[10px] text-white/30 mb-0.5">
                {isMe ? "You" : msg.senderName}
              </span>
              <div
                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${
                  isMe
                    ? "bg-white/10 text-white/80"
                    : "bg-white/[0.04] text-white/70"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-1 border-t border-white/[0.06] p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:border-white/10 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md p-1.5 text-white/30 hover:bg-white/5 hover:text-white/60"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
