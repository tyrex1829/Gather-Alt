"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [token, router]);

  if (!ready) return null;
  return <>{children}</>;
}
