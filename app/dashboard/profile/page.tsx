"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Band } from "@/lib/types";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? "");

    const { data: profileRow } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (profileRow) {
      setProfile(profileRow);
      setFullName(profileRow.full_name ?? "");
    }

    const { data: memberRows } = await supabase
      .from("band_members")
      .select("band_id")
      .eq("user_id", user.id);
    const bandIds = (memberRows ?? []).map((r) => r.band_id).filter(Boolean);
    const { data: bandsData } = bandIds.length
      ? await supabase.from("bands").select("*").in("id", bandIds)
      : { data: [] };
    setBands((bandsData ?? []) as Band[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSaveName() {
    if (!profile) return;
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("users").update({ full_name: fullName }).eq("id", profile.id);
    if (err) setError(err.message);
    else setProfile({ ...profile, full_name: fullName });
    setSaving(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateErr } = await supabase
      .from("users")
      .update({ display_picture: pub.publicUrl })
      .eq("id", profile.id);

    if (updateErr) setError(updateErr.message);
    else setProfile({ ...profile, display_picture: pub.publicUrl });
    setUploading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading || !profile) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">Loading…</div>;
  }

  return (
    <div className="p-6 md:p-8 page-enter max-w-2xl">
      <h1 className="font-headline font-bold text-2xl text-obsidian mb-6">Profile</h1>

      <div className="card p-6 mb-6 flex items-center gap-5">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-mist shrink-0 group"
          disabled={uploading}
        >
          {profile.display_picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.display_picture} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center font-headline font-bold text-xl text-primary">
              {(profile.full_name || profile.username).charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 bg-obsidian/0 group-hover:bg-obsidian/40 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: "20px" }}>
              photo_camera
            </span>
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-lg text-obsidian truncate">{profile.full_name || profile.username}</p>
          <p className="font-mono text-xs text-on-surface-variant truncate">@{profile.username}</p>
          <p className="font-mono text-xs text-on-surface-variant truncate">{email}</p>
        </div>
      </div>

      <div className="card p-6 mb-6 space-y-4">
        <div>
          <label className="label-field">Display name</label>
          <div className="flex gap-2">
            <input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            <button className="btn-primary" onClick={handleSaveName} disabled={saving || fullName === (profile.full_name ?? "")}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        {error && <p className="text-error text-sm">{error}</p>}
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-headline font-semibold text-sm text-obsidian mb-3">My bands</h2>
        {bands.length === 0 ? (
          <p className="text-sm text-on-surface-variant">You haven&apos;t joined a band yet.</p>
        ) : (
          <ul className="space-y-2">
            {bands.map((band) => (
              <li key={band.id}>
                <Link href={`/dashboard/bands/${band.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-mist transition-colors">
                  <span className="text-sm font-medium text-obsidian">{band.name}</span>
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "18px" }}>chevron_right</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/dashboard/venues" className="card p-4 mb-6 flex items-center justify-between hover:bg-surface-mist transition-colors">
        <span className="text-sm font-medium text-obsidian">Manage venues</span>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "18px" }}>chevron_right</span>
      </Link>

      <button onClick={handleSignOut} className="btn-danger w-full justify-center">
        Sign out
      </button>
    </div>
  );
}
