"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import WebGLNoise from "@/components/WebGLNoise";

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
          const next = searchParams.get("next");
          const dest = next && next.startsWith("/") ? next : "/download";
          setTimeout(() => router.push(dest), 3000);
        }
      });
  }, [searchParams, router]);

  return (
    <div className="relative min-h-screen bg-[#0F1509] flex items-center justify-center p-4 overflow-hidden">
      <WebGLNoise className="absolute inset-0 w-full h-full" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden ring-1 ring-white/10">
            <Image
              src="/static/app-logo.png"
              alt="Bandapa"
              width={64}
              height={64}
              className="object-cover"
            />
          </div>
        </div>

        <div
          className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-8 text-center animate-fade-in-up"
          style={{ animationDelay: "60ms" }}
        >
          {status === "loading" && (
            <div key="loading" className="animate-fade-in-up">
              <div className="w-14 h-14 rounded-full bg-white/8 flex items-center justify-center mx-auto mb-5">
                <div className="w-7 h-7 rounded-full border-2 border-chlorophyll border-t-transparent animate-spin" />
              </div>
              <h1 className="text-xl font-headline font-bold text-white mb-2">
                Confirming your account
              </h1>
              <p className="text-sm text-white/50">
                Just a moment while we verify your email…
              </p>
            </div>
          )}

          {status === "success" && (
            <div key="success" className="animate-fade-in-up">
              <div className="w-14 h-14 rounded-full bg-chlorophyll/15 ring-1 ring-chlorophyll/30 flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-chlorophyll" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-headline font-bold text-white mb-2">
                Email confirmed
              </h1>
              <p className="text-sm text-white/50 mb-6">
                Your account is ready. You can now open the Bandapa app and sign in.
              </p>
              <div className="flex items-center gap-2 text-xs text-white/40 justify-center font-mono">
                <div className="w-3 h-3 rounded-full border border-chlorophyll border-t-transparent animate-spin" />
                Redirecting to download page…
              </div>
            </div>
          )}

          {status === "error" && (
            <div key="error" className="animate-fade-in-up">
              <div className="w-14 h-14 rounded-full bg-error-container/30 ring-1 ring-error-container flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-on-error-container" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-xl font-headline font-bold text-white mb-2">
                Confirmation failed
              </h1>
              <p className="text-sm text-white/50 mb-6">
                {errorMessage || "This link may have expired. Please try again."}
              </p>
              <a
                href="/download"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/15 text-white/70 hover:text-white hover:border-white/30 rounded-xl text-sm font-mono transition-all duration-200"
              >
                Back to Bandapa
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-white/25 mt-6 font-mono">
          © {new Date().getFullYear()} Bandapa. All rights reserved.
        </p>
      </div>
    </div>
  );
}
