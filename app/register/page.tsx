"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import WebGLNoise from "@/components/WebGLNoise";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="relative min-h-screen bg-[#0F1509] flex items-center justify-center p-4 overflow-hidden">
        <WebGLNoise className="absolute inset-0 w-full h-full" />
        <div className="w-full max-w-sm relative z-10 animate-fade-in-up text-center">
          <div className="w-16 h-16 rounded-full bg-chlorophyll/15 ring-1 ring-chlorophyll/30 flex items-center justify-center mx-auto mb-6">
            <span
              className="material-symbols-outlined text-chlorophyll"
              style={{ fontSize: "32px", fontVariationSettings: "'FILL' 1" }}
            >
              mark_email_read
            </span>
          </div>
          <h2 className="font-headline font-bold text-white text-2xl mb-3">Check your inbox</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            We sent a confirmation link to{" "}
            <span className="text-white/80 font-mono">{email}</span>.
            Open it to activate your account.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-chlorophyll font-mono text-sm hover:text-chlorophyll/80 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0F1509] flex items-center justify-center p-4 overflow-hidden">
      <WebGLNoise className="absolute inset-0 w-full h-full" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4 ring-1 ring-white/10">
            <Image src="/static/app-logo.png" alt="Bandapa" width={56} height={56} className="object-cover" />
          </div>
          <h1 className="font-headline font-bold text-white text-2xl tracking-tight">Create account</h1>
          <p className="text-white/40 text-sm mt-1 font-mono tracking-wider">JOIN BANDAPA</p>
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
                placeholder="Min. 6 characters"
                className="w-full bg-white/[0.08] border border-white/15 rounded-lg px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-chlorophyll focus:ring-2 focus:ring-chlorophyll/20 transition-all spring-input"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium tracking-wider text-white/50 mb-2 uppercase">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-chlorophyll hover:text-chlorophyll/80 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
