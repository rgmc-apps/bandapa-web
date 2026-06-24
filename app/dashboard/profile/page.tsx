"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Band } from "@/lib/types";

const BAND_ROLES = ["Vocalist", "Guitarist", "Bassist", "Drummer", "Keyboardist", "Pianist", "Violinist", "DJ", "Producer", "Sound Engineer", "Manager"];
const GENRES = ["Rock", "Pop", "Jazz", "Blues", "Metal", "Hip-Hop", "R&B", "Electronic", "Classical", "Folk", "Country", "Latin", "Punk", "Indie", "Alternative", "Reggae", "Soul", "Funk"];
const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "photo_camera" },
  { key: "facebook", label: "Facebook", icon: "group" },
  { key: "tiktok", label: "TikTok", icon: "music_video" },
  { key: "youtube", label: "YouTube", icon: "play_circle" },
  { key: "spotify", label: "Spotify", icon: "library_music" },
  { key: "twitter", label: "X / Twitter", icon: "tag" },
];

function TagPicker({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            selected.includes(opt)
              ? "bg-primary text-white border-primary"
              : "bg-surface-mist text-on-surface-variant border-outline-variant/40 hover:border-primary/50"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // editable fields
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bandRoles, setBandRoles] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? "");

    const { data: profileRow } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (profileRow) {
      setProfile(profileRow);
      setUsername(profileRow.username ?? "");
      setFullName(profileRow.full_name ?? "");
      setBandRoles(profileRow.band_roles ?? []);
      setGenres(profileRow.genres ?? []);
      setSocialLinks(profileRow.social_links ?? {});
      setCity(profileRow.city ?? "");
      setCountry(profileRow.country ?? "");
    }

    const { data: memberRows } = await supabase.from("band_members").select("band_id").eq("user_id", user.id);
    const bandIds = (memberRows ?? []).map((r) => r.band_id).filter(Boolean);
    const { data: bandsData } = bandIds.length
      ? await supabase.from("bands").select("*").in("id", bandIds)
      : { data: [] };
    setBands((bandsData ?? []) as Band[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: err } = await supabase.from("users").update({
      username: username.trim(),
      full_name: fullName.trim() || null,
      band_roles: bandRoles,
      genres,
      social_links: Object.fromEntries(Object.entries(socialLinks).filter(([, v]) => v.trim())),
      city: city.trim() || null,
      country: country.trim() || null,
    }).eq("id", profile.id);

    if (err) {
      setError(err.code === "23505" ? "That username is already taken." : err.message);
    } else {
      setProfile({ ...profile, username: username.trim(), full_name: fullName.trim() || null, band_roles: bandRoles, genres, social_links: socialLinks, city: city.trim() || null, country: country.trim() || null });
      setSuccess("Profile saved.");
      setTimeout(() => setSuccess(""), 3000);
    }
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
    if (uploadErr) { setError(uploadErr.message); setUploading(false); return; }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateErr } = await supabase.from("users").update({ display_picture: pub.publicUrl }).eq("id", profile.id);
    if (updateErr) setError(updateErr.message);
    else setProfile({ ...profile, display_picture: pub.publicUrl });
    setUploading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isDirty = profile && (
    username !== (profile.username ?? "") ||
    fullName !== (profile.full_name ?? "") ||
    city !== (profile.city ?? "") ||
    country !== (profile.country ?? "") ||
    JSON.stringify(bandRoles) !== JSON.stringify(profile.band_roles ?? []) ||
    JSON.stringify(genres) !== JSON.stringify(profile.genres ?? []) ||
    JSON.stringify(socialLinks) !== JSON.stringify(profile.social_links ?? {})
  );

  if (loading || !profile) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">Loading…</div>;
  }

  return (
    <div className="p-6 md:p-8 page-enter max-w-2xl">
      <h1 className="font-headline font-bold text-2xl text-obsidian mb-6">Profile</h1>

      {/* Avatar + identity */}
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
          {(profile.city || profile.country) && (
            <p className="text-xs text-on-surface-variant mt-0.5">
              {[profile.city, profile.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Basic info */}
      <div className="card p-6 mb-6 space-y-4">
        <h2 className="font-headline font-semibold text-sm text-obsidian">Basic info</h2>

        <div>
          <label className="label-field">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm select-none">@</span>
            <input
              className="input-field pl-7 font-mono"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
              placeholder="username"
              maxLength={32}
            />
          </div>
        </div>

        <div>
          <label className="label-field">Display name</label>
          <input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">City</label>
            <input className="input-field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Manila" />
          </div>
          <div>
            <label className="label-field">Country</label>
            <input className="input-field" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Philippines" />
          </div>
        </div>
      </div>

      {/* Artist info */}
      <div className="card p-6 mb-6 space-y-5">
        <h2 className="font-headline font-semibold text-sm text-obsidian">Artist info</h2>

        <div>
          <label className="label-field mb-2">Band roles</label>
          <TagPicker options={BAND_ROLES} selected={bandRoles} onChange={setBandRoles} />
        </div>

        <div>
          <label className="label-field mb-2">Genres</label>
          <TagPicker options={GENRES} selected={genres} onChange={setGenres} />
        </div>
      </div>

      {/* Social links */}
      <div className="card p-6 mb-6 space-y-4">
        <h2 className="font-headline font-semibold text-sm text-obsidian">Social media</h2>
        {SOCIAL_PLATFORMS.map(({ key, label, icon }) => (
          <div key={key}>
            <label className="label-field">{label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant" style={{ fontSize: "18px" }}>
                {icon}
              </span>
              <input
                className="input-field pl-9"
                value={socialLinks[key] ?? ""}
                onChange={(e) => setSocialLinks({ ...socialLinks, [key]: e.target.value })}
                placeholder={`${label} profile URL`}
              />
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-error text-sm mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 mb-4">{success}</p>}

      <button
        className="btn-primary w-full justify-center mb-6"
        onClick={handleSave}
        disabled={saving || !isDirty}
      >
        {saving ? "Saving…" : "Save profile"}
      </button>

      {/* My bands */}
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
