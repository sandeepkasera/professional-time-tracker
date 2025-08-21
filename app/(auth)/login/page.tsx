
// /app/(auth)/login/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, next }),
      headers: { "Content-Type": "application/json" },
    });

    setLoading(false);

    if (!res.ok) {
      try {
        const j = await res.json();
        setErr(j.error || "Login failed");
      } catch {
        setErr("Login failed");
      }
    } else {
      // ✅ the API already redirects with Set-Cookie
      window.location.href = next; 
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border p-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="w-full border p-2 rounded" disabled={loading}>
          {loading ? "…" : "Login"}
        </button>
      </form>
      <div className="mt-3 text-sm">
        <a className="underline" href="/signup">
          Create account
        </a>{" "}
        &middot;{" "}
        <a className="underline" href="/forgot-password">
          Forgot password?
        </a>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <LoginForm />
    </Suspense>
  );
}
