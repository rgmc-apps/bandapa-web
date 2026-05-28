"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import WebGLNoise from "@/components/WebGLNoise";

export default function LoginPage() {
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

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/auth/redirect");
  }

  return (
    <div className="relative min-h-screen bg-[#0F1509] flex items-center justify-center p-4 overflow-hidden">
      <WebGLNoise className="absolute inset-0 w-full h-full" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4 ring-1 ring-white/10">
            <Image src="/static/app-logo.png" alt="Bandapa" width={56} height={56} className="object-cover" />
          </div>
          <h1 className="font-headline font-bold text-white text-2xl tracking-tight">Welcome back</h1>
          <p className="text-white/40 text-sm mt-1 font-mono tracking-wider">SIGN IN TO BANDAPA</p>
        </div>

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
                placeholder="you@example.com"
                className="w-full bg-white/[0.08] border border-white/15 rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-chlorophyll focus:ring-2 focus:ring-chlorophyll/20 transition-all spring-input"
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
                className="w-full bg-white/[0.08] border border-white/15 rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-chlorophyll focus:ring-2 focus:ring-chlorophyll/20 transition-all spring-input"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-error-container/50 border border-error-container rounded-lg px-4 py-3 text-on-error-container text-sm">
                <span className="material-symbols-outlined text-base flex-shrink-0">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-chlorophyll text-obsidian font-headline font-bold py-3.5 rounded-xl hover:bg-primary-fixed active:bg-primary-fixed-dim active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 spring-btn"
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

        <p className="text-center text-white/40 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-chlorophyll hover:text-chlorophyll/80 font-medium transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
