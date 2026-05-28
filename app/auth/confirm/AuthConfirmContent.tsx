"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type Status = "loading" | "success" | "error";

export default function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as "email" | "recovery" | "invite" | "magiclink" | null;

    if (!tokenHash || !type) {
      setStatus("error");
      setErrorMessage("Invalid or missing confirmation link. Please try signing up again.");
      return;
    }

    const supabase = createClient();

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type })
      .then(({ error }) => {
        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
        } else {
          setStatus("success");
          setTimeout(() => router.push("/download"), 3000);
        }
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-low to-chlorophyll/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-glass">
            <Image
              src="/static/app-logo.png"
              alt="Bandapa"
              width={64}
              height={64}
              className="object-cover"
            />
          </div>
        </div>

        {/* Card — entrance on mount */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-outline-variant/40 shadow-modal p-8 text-center animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          {/* Keyed div: remounts on status change, firing the fade-in animation */}
          {status === "loading" && (
            <div key="loading" className="animate-fade-in-up">
              <div className="w-14 h-14 rounded-full bg-surface-mist flex items-center justify-center mx-auto mb-5">
                <div className="w-7 h-7 rounded-full border-2 border-chlorophyll-dark border-t-transparent animate-spin" />
              </div>
              <h1 className="text-xl font-headline font-bold text-obsidian mb-2">
                Confirming your account
              </h1>
              <p className="text-sm text-on-surface-variant">
                Just a moment while we verify your email…
              </p>
            </div>
          )}

          {status === "success" && (
            <div key="success" className="animate-fade-in-up">
              <div className="w-14 h-14 rounded-full bg-chlorophyll/20 flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-chlorophyll-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-headline font-bold text-obsidian mb-2">
                Email confirmed!
              </h1>
              <p className="text-sm text-on-surface-variant mb-6">
                Your account is ready. You can now open the Bandapa app and sign in.
              </p>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant justify-center">
                <div className="w-3 h-3 rounded-full border border-chlorophyll-dark border-t-transparent animate-spin" />
                Redirecting to download page…
              </div>
            </div>
          )}

          {status === "error" && (
            <div key="error" className="animate-fade-in-up">
              <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-on-error-container" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-headline font-bold text-obsidian mb-2">
                Confirmation failed
              </h1>
              <p className="text-sm text-on-surface-variant mb-6">
                {errorMessage || "This link may have expired. Please try again."}
              </p>
              <a href="/download" className="btn-secondary text-sm">
                Back to Bandapa
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          © {new Date().getFullYear()} Bandapa. All rights reserved.
        </p>
      </div>
    </div>
  );
}
