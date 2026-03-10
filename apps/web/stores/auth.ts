"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type User = {
  id?: string;
  _id?: string;
  email: string;
  name: string;
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User, refreshToken?: string | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, user, refreshToken = null) => set({ token, user, refreshToken }),
      clear: () => set({ token: null, refreshToken: null, user: null })
    }),
    { name: "gather-auth" }
  )
);
