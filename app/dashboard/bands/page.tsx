"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Band } from "@/lib/types";
import Modal from "@/components/Modal";

const GENRE_LIST = [
  "Rock", "Pop", "Jazz", "Hip-Hop", "R&B", "Electronic",
  "Classical", "Country", "Reggae", "Blues", "Metal", "Indie",
  "Folk", "Latin", "Punk", "Alternative", "Funk", "Gospel",
];

type CreateForm = {
  name: string;
  description: string;
  date_formed: string;
  label: string;
  spotify_url: string;
};

const emptyForm: CreateForm = { name: "", description: "", date_formed: "", label: "", spotify_url: "" };

export default function BandsPage() {
  const supabase = createClient();
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [otherGenres, setOtherGenres] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBands = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: memberRows } = await supabase
      .from("band_members")
      .select("band_id")
      .eq("user_id", user.id);
    const bandIds = (memberRows ?? []).map((r) => r.band_id).filter(Boolean);
    if (!bandIds.length) {
      setBands([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("bands").select("*").in("id", bandIds);
    setBands(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchBands(); }, [fetchBands]);

  function openCreate() {
    setForm(emptyForm);
    setSelectedGenres(new Set());
    setOtherGenres("");
    setImageFile(null);
    setImagePreview(null);
    setError("");
    setCreateOpen(true);
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const genres = [
      ...selectedGenres,
      ...otherGenres.split(",").map((g) => g.trim()).filter(Boolean),
    ];

    const { data: band, error: insertErr } = await supabase
      .from("bands")
      .insert({
        name: form.name.trim(),
        description: form.description || null,
        genres,
        date_formed: form.date_formed || new Date().toISOString().slice(0, 10),
        label: form.label || null,
        spotify_url: form.spotify_url || null,
        owner_id: user.id,
      })
      .select("*")
      .single();

    if (insertErr || !band) {
      setError(insertErr?.message ?? "Failed to create band.");
      setSaving(false);
      return;
    }

    if (imageFile) {
      const ext = imageFile.name.split(".").pop() ?? "jpg";
      const path = `${band.id}/cover.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("band-images").upload(path, imageFile, { upsert: true });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from("band-images").getPublicUrl(path);
        await supabase.from("bands").update({ image_url: pub.publicUrl }).eq("id", band.id);
      }
    }

    await supabase.from("band_members").insert({ band_id: band.id, user_id: user.id, is_admin: true });

    setCreateOpen(false);
    setSaving(false);
    fetchBands();
  }

  return (
    <div className="p-6 md:p-8 page-enter">
      <Link
        href="/dashboard/conflicts"
        className="flex items-center justify-between card p-3.5 mb-5 hover:bg-surface-mist/40 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-obsidian">
          <span className="material-symbols-outlined text-error" style={{ fontSize: "18px" }}>warning</span>
          Schedule conflicts
        </span>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "18px" }}>chevron_right</span>
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline font-bold text-2xl text-obsidian">Your bands</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{bands.length} total</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/bands/join" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>key</span>
            Join
          </Link>
          <button onClick={openCreate} className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
            Create
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-on-surface-variant">Loading…</div>
      ) : bands.length === 0 ? (
        <div className="card py-16 text-center text-sm text-on-surface-variant">
          No bands yet. Create one or join with an invite code.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bands.map((band, i) => (
            <Link
              key={band.id}
              href={`/dashboard/bands/${band.id}`}
              className="card p-5 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 spring-row"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-surface-mist overflow-hidden shrink-0 flex items-center justify-center">
                  {band.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={band.image_url} alt={band.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: "22px" }}>groups</span>
                  )}
                </div>
                <h3 className="font-headline font-semibold text-obsidian truncate">{band.name}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {band.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-xs font-mono px-2 py-0.5 rounded-full bg-chlorophyll/10 text-chlorophyll-dark border border-chlorophyll/20">{g}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal title="Create Band" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-xl bg-surface-mist overflow-hidden shrink-0 flex items-center justify-center"
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "24px" }}>add_a_photo</span>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            <p className="text-xs text-on-surface-variant">Band photo (optional)</p>
          </div>

          <div>
            <label className="label-field">Band name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. The Wanderers" />
          </div>

          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field min-h-[64px] resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="label-field">Genres</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_LIST.map((genre) => {
                const checked = selectedGenres.has(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-colors ${
                      checked ? "bg-chlorophyll text-obsidian border-chlorophyll" : "bg-white text-on-surface-variant border-outline-variant"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
            <input
              className="input-field mt-2"
              placeholder="Other genres, comma-separated"
              value={otherGenres}
              onChange={(e) => setOtherGenres(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Date formed</label>
              <input type="date" className="input-field" value={form.date_formed} onChange={(e) => setForm({ ...form, date_formed: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Record label</label>
              <input className="input-field" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label-field">Spotify artist URL</label>
            <input className="input-field" value={form.spotify_url} onChange={(e) => setForm({ ...form, spotify_url: e.target.value })} placeholder="https://open.spotify.com/artist/…" />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? "Creating…" : "Create Band"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
