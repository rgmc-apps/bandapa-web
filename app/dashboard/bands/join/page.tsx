"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Band } from "@/lib/types";

function JoinBandForm() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();

  const [code, setCode] = useState(params.get("code")?.toUpperCase() ?? "");
  const [preview, setPreview] = useState<Band | null>(null);
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function handleLookup() {
    if (code.trim().length < 6) return;
    setChecking(true);
    setError("");
    setPreview(null);

    const { data, error: rpcError } = await supabase.rpc("get_band_by_invite_code", { p_code: code.trim().toUpperCase() });

    if (rpcError || !data) {
      setError("No band found with that invite code.");
      setChecking(false);
      return;
    }

    setPreview(Array.isArray(data) ? data[0] : data);
    setChecking(false);
  }

  async function handleJoin() {
    if (!preview) return;
    setJoining(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setJoining(false); return; }

    const { error: joinError } = await supabase
      .from("band_members")
      .insert({ band_id: preview.id, user_id: user.id, is_admin: false });

    if (joinError) {
      setError(joinError.code === "23505" ? "You're already a member of this band." : joinError.message);
      setJoining(false);
      return;
    }

    router.push(`/dashboard/bands/${preview.id}`);
  }

  return (
    <div className="p-6 md:p-8 page-enter max-w-md mx-auto">
      <h1 className="font-headline font-bold text-2xl text-obsidian mb-2">Join a band</h1>
      <p className="text-sm text-on-surface-variant mb-6">Enter the 6-character invite code shared by your band.</p>

      <div className="card p-6 space-y-4">
        <div className="flex gap-2">
          <input
            className="input-field font-mono uppercase tracking-widest text-center text-lg"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setPreview(null); }}
            placeholder="ABC123"
          />
          <button className="btn-secondary shrink-0" onClick={handleLookup} disabled={checking || code.trim().length < 6}>
            {checking ? "…" : "Find"}
          </button>
        </div>

        {error && <p className="text-error text-sm">{error}</p>}

        {preview && (
          <div className="border border-outline-variant/50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-mist overflow-hidden shrink-0 flex items-center justify-center">
              {preview.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.image_url} alt={preview.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary" style={{ fontSize: "22px" }}>groups</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-semibold text-obsidian truncate">{preview.name}</p>
              <p className="text-xs text-on-surface-variant truncate">{preview.genres?.join(", ") || "No genres listed"}</p>
            </div>
          </div>
        )}

        <button className="btn-primary w-full justify-center" onClick={handleJoin} disabled={!preview || joining}>
          {joining ? "Joining…" : "Join band"}
        </button>
      </div>
    </div>
  );
}

export default function JoinBandPage() {
  return (
    <Suspense>
      <JoinBandForm />
    </Suspense>
  );
}
