"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Band } from "@/lib/types";
import Modal from "@/components/Modal";
import ImageCropper from "@/components/ImageCropper";
import { setTransitionBand } from "@/lib/transition-store";

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
  const router = useRouter();
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [otherGenres, setOtherGenres] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
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

  function navigateToBand(band: Band) {
    setTransitionBand({ id: band.id, name: band.name, image_url: band.image_url, genres: band.genres as string[] });

    const href = `/dashboard/bands/${band.id}`;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (typeof document === "undefined" || !document.startViewTransition || reducedMotion) {
      router.push(href);
      return;
    }

    document.startViewTransition(() => { router.push(href); });
  }

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
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleCropDone(file: File, preview: string) {
    setImageFile(file);
    setImagePreview(preview);
    setCropSrc(null);
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
        created_by: user.id,
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
          <p className="text-sm text-on-surface-variant mt-0.5">{loading ? "" : `${bands.length} total`}</p>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-5 spring-row" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl band-skeleton shrink-0" />
                <div className="h-4 band-skeleton rounded-md flex-1" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-5 w-16 band-skeleton rounded-full" />
                <div className="h-5 w-12 band-skeleton rounded-full" style={{ animationDelay: "120ms" }} />
              </div>
            </div>
          ))}
        </div>
      ) : bands.length === 0 ? (
        <div className="card py-14 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-surface-mist flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "26px" }}>groups</span>
          </div>
          <h3 className="font-headline font-semibold text-obsidian mb-1.5">No bands yet</h3>
          <p className="text-sm text-on-surface-variant mb-6 max-w-[260px] mx-auto">Create a band or join one with an invite code from a bandmate.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/dashboard/bands/join" className="btn-secondary">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>key</span>
              Join with code
            </Link>
            <button onClick={openCreate} className="btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
              Create band
            </button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bands.map((band, i) => (
            <button
              key={band.id}
              onClick={() => navigateToBand(band)}
              className="card overflow-hidden hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 spring-row text-left w-full group"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Banner */}
              <div className="relative h-24 shrink-0">
                {band.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={band.banner_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-chlorophyll/10 to-surface-mist" />
                )}
                {/* Cover photo overlapping banner */}
                <div
                  className="absolute -bottom-5 left-4 w-11 h-11 rounded-xl ring-2 ring-white bg-surface-mist overflow-hidden flex items-center justify-center shadow-sm"
                  style={{ viewTransitionName: `band-cover-${band.id}` }}
                >
                  {band.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={band.image_url} alt={band.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>groups</span>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="pt-7 px-4 pb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3
                    className="font-headline font-semibold text-obsidian truncate"
                    style={{ viewTransitionName: `band-name-${band.id}` }}
                  >
                    {band.name}
                  </h3>
                  <span
                    className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-on-surface-variant/70 transition-colors shrink-0"
                    style={{ fontSize: "18px" }}
                  >
                    chevron_right
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(band.genres as string[]).slice(0, 3).map((g) => (
                    <span key={g} className="text-xs font-mono px-2 py-0.5 rounded-full bg-chlorophyll/10 text-chlorophyll-dark border border-chlorophyll/20">{g}</span>
                  ))}
                  {(band.genres as string[]).length > 3 && (
                    <span className="text-xs font-mono px-2 py-0.5 text-on-surface-variant/50">
                      +{(band.genres as string[]).length - 3}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal title="Create Band" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-xl bg-surface-mist overflow-hidden shrink-0 flex items-center justify-center border border-outline-variant hover:border-primary transition-colors group relative"
            >
              {imagePreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: "18px" }}>crop</span>
                  </div>
                </>
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontSize: "24px" }}>add_a_photo</span>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            <div>
              <p className="text-sm font-medium text-obsidian">Band photo</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Optional · click to upload and crop</p>
            </div>
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

      {/* Cover photo cropper */}
      <Modal title="Crop photo" open={!!cropSrc} onClose={() => setCropSrc(null)}>
        {cropSrc && (
          <ImageCropper
            src={cropSrc}
            aspect={1}
            outputWidth={400}
            label="Drag to reposition · scroll to zoom"
            onCrop={handleCropDone}
            onCancel={() => setCropSrc(null)}
          />
        )}
      </Modal>
    </div>
  );
}
