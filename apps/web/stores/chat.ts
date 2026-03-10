"use client";

import { create } from "zustand";

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  recipientId?: string;
  type?: "direct" | "room";
  mentions?: string[];
  createdAt?: string;
  timestamp: number;
};

type ChatState = {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) =>
    set((s) => {
      if (s.messages.some((m) => m.id === msg.id)) return s;
      return { messages: [...s.messages, msg] };
    }),
  clearMessages: () => set({ messages: [] })
}));
