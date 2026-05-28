"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import WebGLNoise from "@/components/WebGLNoise";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const supabase = createClient();

  async function handleGoogleSignIn() {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError("");

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

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
          {/* Google sign-up */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full bg-white text-[#1f1f1f] font-medium py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mb-5 spring-btn text-sm"
          >
            {googleLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-[#1f1f1f]/20 border-t-[#1f1f1f] animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs font-mono">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email / password form */}
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
              disabled={loading || googleLoading}
              className="w-full bg-chlorophyll text-obsidian font-headline font-bold py-3.5 rounded-xl hover:bg-primary-fixed active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 spring-btn"
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
