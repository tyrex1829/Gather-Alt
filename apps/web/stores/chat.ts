"use client";

import { create } from "zustand";

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  recipientId?: string;
  timestamp: number;
};

type ChatState = {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] })
}));
