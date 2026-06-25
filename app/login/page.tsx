"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function applyRemember(remember: boolean) {
  if (remember) {
    localStorage.setItem("bandapa_remember", "true");
    sessionStorage.removeItem("bandapa_session");
  } else {
    localStorage.setItem("bandapa_remember", "false");
    sessionStorage.setItem("bandapa_session", "1");
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleGoogleSignIn() {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError("");

    // Persist the preference so SessionGuard can apply it after the OAuth redirect
    localStorage.setItem("bandapa_remember_pending", remember ? "true" : "false");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const redirectTo = next
      ? `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`
      : `${siteUrl}/auth/callback`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    let email = identifier.trim();
    if (!email.includes("@")) {
      const { data: resolvedEmail, error: rpcError } = await supabase
        .schema("public")
        .rpc("get_email_by_username", { uname: email.toLowerCase() });

      if (rpcError || !resolvedEmail) {
        setError("No account found with that username.");
        setLoading(false);
        return;
      }
      email = resolvedEmail as string;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    applyRemember(remember);
    router.push(next || "/auth/redirect");
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

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs font-mono">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-medium tracking-wider text-white/50 mb-2 uppercase">
                Email or Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="you@example.com or username"
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

            {/* Keep me signed in */}
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <button
                type="button"
                role="checkbox"
                aria-checked={remember}
                onClick={() => setRemember((v) => !v)}
                className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-all duration-150 ${
                  remember
                    ? "bg-chlorophyll border-chlorophyll"
                    : "bg-transparent border-white/25 group-hover:border-white/40"
                }`}
              >
                {remember && (
                  <span
                    className="material-symbols-outlined text-obsidian"
                    style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1, 'wght' 700" }}
                  >
                    check
                  </span>
                )}
              </button>
              <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
                Keep me signed in
              </span>
            </label>

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
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="text-chlorophyll hover:text-chlorophyll/80 font-medium transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F1509] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-chlorophyll border-t-transparent animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
