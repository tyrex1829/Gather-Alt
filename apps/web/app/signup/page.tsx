"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signup } from "../../lib/api";
import { useAuthStore } from "../../stores/auth";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await signup(email, password, name);
      setAuth(data.token, data.user);
      router.push(returnTo || "/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h1 className="text-2xl font-semibold">Create Account</h1>
      <p className="mt-2 text-sm text-white/60">Spin up your first office space.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/90 placeholder:text-white/40" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/90 placeholder:text-white/40" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/90 placeholder:text-white/40" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black">Sign up</button>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-md px-6 py-20">
        <Suspense>
          <SignupForm />
        </Suspense>
      </div>
    </main>
  );
}
