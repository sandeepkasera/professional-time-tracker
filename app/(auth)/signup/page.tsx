// /app/(auth)/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    setLoading(false);
    if (res.ok) router.push("/");
    else {
      const j = await res.json();
      setErr(j.error || "Signup failed");
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="First name" value={form.firstName} onChange={(e)=>setForm({...form, firstName: e.target.value})}/>
        <input className="w-full border p-2 rounded" placeholder="Last name" value={form.lastName} onChange={(e)=>setForm({...form, lastName: e.target.value})}/>
        <input className="w-full border p-2 rounded" placeholder="Email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})}/>
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})}/>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="w-full border p-2 rounded" disabled={loading}>{loading ? "…" : "Sign up"}</button>
      </form>
      <div className="mt-3 text-sm">
        <a className="underline" href="/login">Already have an account?</a>
      </div>
    </main>
  );
}
