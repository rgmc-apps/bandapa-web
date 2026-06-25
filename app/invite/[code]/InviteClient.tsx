"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import WebGLNoise from "@/components/WebGLNoise";
import type { Band } from "@/lib/types";

interface InviteClientProps {
  code: string;
  band: Band | null;
  userId: string | null;
  isMember: boolean;
}

export default function InviteClient({
  code,
  band,
  userId,
  isMember,
}: InviteClientProps) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const inviteUrl = `/invite/${code}`;

  async function handleAccept() {
    // Not logged in → send to login with redirect back here
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(inviteUrl)}`);
      return;
    }

    if (!band) return;
    setJoining(true);
    setError("");

    const supabase = createClient();
    const { error: joinError } = await supabase
      .from("band_members")
      .insert({ band_id: band.id, user_id: userId, is_admin: false });

    if (joinError) {
      setError(
        joinError.code === "23505"
          ? "You're already a member of this band."
          : joinError.message
      );
      setJoining(false);
      return;
    }

    router.push(`/dashboard/bands/${band.id}`);
  }

  function handleDecline() {
    router.push(userId ? "/dashboard" : "/");
  }

  // ── Invalid code ─────────────────────────────────────────────────────
  if (!band) {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10">
            <span className="material-symbols-outlined text-white/25" style={{ fontSize: "28px" }}>
              link_off
            </span>
          </div>
          <h1 className="font-headline font-bold text-white text-2xl mb-3">Invalid invite link</h1>
          <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-[28ch] mx-auto">
            This invite code doesn&apos;t match any band. It may have been changed or is no longer active.
          </p>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-mono text-chlorophyll hover:text-chlorophyll/80 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>arrow_back</span>
            Go home
          </a>
        </div>
      </Shell>
    );
  }

  // ── Already a member ─────────────────────────────────────────────────
  if (isMember) {
    return (
      <Shell>
        <BandHeader band={band} />
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-center gap-1.5 py-2">
            <span className="material-symbols-outlined text-chlorophyll" style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="text-sm font-mono text-chlorophyll/80">You&apos;re already a member</span>
          </div>
          <a
            href={`/dashboard/bands/${band.id}`}
            className="block w-full py-3.5 bg-chlorophyll text-obsidian-deep text-center font-headline font-bold rounded-xl text-sm hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Open band page →
          </a>
          <button
            onClick={handleDecline}
            className="w-full py-2.5 text-white/35 font-mono text-sm hover:text-white/55 transition-colors"
          >
            Go to dashboard
          </button>
        </div>
      </Shell>
    );
  }

  // ── Main invite view (logged in or not) ──────────────────────────────
  return (
    <Shell>
      <BandHeader band={band} />

      {!userId && (
        <p className="text-center text-white/30 text-xs font-mono mt-4">
          You&apos;ll be asked to sign in before joining.
        </p>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 bg-error-container/30 border border-error-container/40 rounded-lg px-4 py-3 text-on-error-container text-sm">
          <span className="material-symbols-outlined text-base shrink-0">error</span>
          {error}
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        <button
          onClick={handleAccept}
          disabled={joining}
          className="w-full py-3.5 bg-chlorophyll text-obsidian-deep font-headline font-bold rounded-xl text-sm hover:opacity-90 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {joining ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />
              Joining…
            </>
          ) : (
            "Accept invitation →"
          )}
        </button>
        <button
          onClick={handleDecline}
          className="w-full py-3 border border-white/10 text-white/45 hover:text-white/65 hover:border-white/20 rounded-xl text-sm font-mono transition-all active:scale-[0.97]"
        >
          Decline
        </button>
      </div>
    </Shell>
  );
}

// ── Shared layout ─────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0F1509] flex items-center justify-center p-4 overflow-hidden">
      <WebGLNoise className="absolute inset-0 w-full h-full" />
      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        <a href="/" className="flex items-center justify-center gap-2.5 mb-10">
          <Image src="/static/app-logo.png" alt="Bandapa" width={32} height={32} className="object-contain" />
          <span className="font-headline font-bold text-white text-lg tracking-tight">Bandapa</span>
        </a>
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-7 backdrop-blur-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Band header ───────────────────────────────────────────────────────

function BandHeader({ band }: { band: Band }) {
  const genres = band.genres as string[];
  return (
    <div>
      <p className="text-center font-mono text-[11px] text-white/35 uppercase tracking-[0.15em] mb-4">
        Band invitation
      </p>
      <div className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
        <div className="w-14 h-14 rounded-xl bg-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
          {band.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={band.image_url} alt={band.name} className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-white/25" style={{ fontSize: "26px", fontVariationSettings: "'FILL' 1" }}>
              groups
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-white text-lg leading-tight truncate">{band.name}</p>
          {genres.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {genres.slice(0, 3).map((g) => (
                <span key={g} className="px-2 py-0.5 rounded-full bg-white/[0.06] text-white/35 text-[10px] font-mono border border-white/[0.06]">
                  {g}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/30 font-mono mt-1">No genres listed</p>
          )}
        </div>
      </div>
    </div>
  );
}
