"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_USER } from "@/lib/demoAuth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState(DEMO_USER.password);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    setBusy(false);

    if (!response.ok) {
      const data = await response.json();
      setError(data.message || "Login failed");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,217,184,0.12),_transparent_34%),linear-gradient(180deg,_#08131b_0%,_#04090e_100%)] px-6 py-12 text-slate-100">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            Zenith Digital Twin
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white">
            Product-style digital twin demo
          </h1>
          <p className="mt-4 max-w-xl text-slate-300">
            This version includes a shared device model, historical readings,
            alert history, anomaly detection, simulation controls, and a 3D twin
            view.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-sm text-slate-400">Demo email</p>
              <p className="mt-2 font-mono text-cyan-100">{DEMO_USER.email}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-sm text-slate-400">Demo password</p>
              <p className="mt-2 font-mono text-cyan-100">{DEMO_USER.password}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/50 p-8">
          <h2 className="text-2xl font-semibold text-white">Login</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              placeholder="Email"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              placeholder="Password"
            />

            {error ? (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
