// /app/(auth)/reset-password/page.tsx
"use client";

import { useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
      headers: { "Content-Type": "application/json" },
    });
    setMsg(res.ok ? "Password updated. You can log in now." : "Reset failed.");
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Reset password</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Reset token" value={token} onChange={(e)=>setToken(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="New password" type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
        <button className="w-full border p-2 rounded">Update</button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </main>
  );
}
