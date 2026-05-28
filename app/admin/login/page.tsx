"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setError(signInError?.message ?? "Sign in failed.");
      setLoading(false);
      return;
    }

    // Verify admin status
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .single();

    if (!adminRow) {
      await supabase.auth.signOut();
      setError("Access denied. You are not an admin.");
      setLoading(false);
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-obsidian via-obsidian/95 to-obsidian/90 flex items-center justify-center p-4">
      {/* Background accent */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-chlorophyll/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-chlorophyll/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-glass mb-4">
            <Image src="/static/app-logo.png" alt="Bandapa" width={56} height={56} className="object-cover" />
          </div>
          <h1 className="font-headline font-bold text-white text-2xl tracking-tight">Bandapa Admin</h1>
          <p className="text-white/40 text-sm mt-1 font-mono tracking-wider">PORTAL ACCESS</p>
        </div>

        {/* Form card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-medium tracking-wider text-white/50 mb-2 uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@bandapa.com"
                className="w-full bg-white/8 border border-white/15 rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-chlorophyll focus:ring-2 focus:ring-chlorophyll/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium tracking-wider text-white/50 mb-2 uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/8 border border-white/15 rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-chlorophyll focus:ring-2 focus:ring-chlorophyll/20 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-error-container/50 border border-error-container rounded-lg px-4 py-3 text-on-error-container text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-chlorophyll text-obsidian font-headline font-bold py-3.5 rounded-xl hover:bg-primary-fixed active:bg-primary-fixed-dim active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-6 font-mono">
          Admin access only · © {new Date().getFullYear()} Bandapa
        </p>
      </div>
    </div>
  );
}
