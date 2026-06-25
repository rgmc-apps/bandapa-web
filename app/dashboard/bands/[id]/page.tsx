"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Band, BandMember, Profile } from "@/lib/types";
import Modal from "@/components/Modal";
import ImageCropper from "@/components/ImageCropper";
import { getTransitionBand, setTransitionBand } from "@/lib/transition-store";

type CropTarget = { src: string; target: "cover" | "banner" } | null;

type MemberRow = BandMember & { user: Profile };

const GENRE_LIST = [
  "Rock", "Pop", "Jazz", "Hip-Hop", "R&B", "Electronic",
  "Classical", "Country", "Reggae", "Blues", "Metal", "Indie",
  "Folk", "Latin", "Punk", "Alternative", "Funk", "Gospel",
];

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "photo_camera" },
  { key: "facebook",  label: "Facebook",  icon: "group"        },
  { key: "x",        label: "X",          icon: "tag"          },
  { key: "youtube",  label: "YouTube",    icon: "smart_display" },
  { key: "tiktok",   label: "TikTok",     icon: "music_video"  },
  { key: "soundcloud", label: "SoundCloud", icon: "cloud"      },
  { key: "website",  label: "Website",    icon: "language"     },
] as const;

export default function BandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const router = useRouter();

  const cached = getTransitionBand();

  const [band, setBand] = useState<Band | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", label: "", spotify_url: "", date_formed: "" });
  const [editGenres, setEditGenres] = useState<Set<string>>(new Set());
  const [editOtherGenres, setEditOtherGenres] = useState("");
  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>({});
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data: bandRow } = await supabase.from("bands").select("*").eq("id", id).single();
    setBand(bandRow);

    const { data: memberRows } = await supabase
      .from("band_members")
      .select("*, user:users(*)")
      .eq("band_id", id)
      .order("joined_at", { ascending: true });
    setMembers((memberRows ?? []) as unknown as MemberRow[]);

    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    fetchData();
    return () => { setTransitionBand(null); };
  }, [fetchData]);

  const myMembership = members.find((m) => m.user_id === currentUserId);
  const isOwner = band?.owner_id === currentUserId;
  const isAdmin = isOwner || (myMembership?.is_admin ?? false);

  const displayName = band?.name ?? cached?.name ?? "";
  const displayCoverUrl = band?.image_url ?? cached?.image_url ?? null;
  const displayGenres = (band?.genres as string[] | undefined) ?? cached?.genres ?? [];

  function toggleEditGenre(genre: string) {
    setEditGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  }

  function openEdit() {
    if (!band) return;
    setEditForm({
      name: band.name,
      description: band.description ?? "",
      label: band.label ?? "",
      spotify_url: band.spotify_url ?? "",
      date_formed: band.date_formed ?? "",
    });
    const knownSet = new Set(GENRE_LIST);
    const known = (band.genres as string[]).filter((g) => knownSet.has(g));
    const other = (band.genres as string[]).filter((g) => !knownSet.has(g));
    setEditGenres(new Set(known));
    setEditOtherGenres(other.join(", "));
    setEditSocialLinks(band.social_links ?? {});
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditBannerFile(null);
    setEditBannerPreview(null);
    setError("");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!band) return;
    setSaving(true);
    setError("");

    let image_url = band.image_url;
    let banner_url = band.banner_url;

    if (editImageFile) {
      const ext = editImageFile.name.split(".").pop() ?? "jpg";
      const path = `${band.id}/cover.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("band-images").upload(path, editImageFile, { upsert: true });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from("band-images").getPublicUrl(path);
        image_url = pub.publicUrl;
      }
    }

    if (editBannerFile) {
      const ext = editBannerFile.name.split(".").pop() ?? "jpg";
      const path = `${band.id}/banner.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("band-images").upload(path, editBannerFile, { upsert: true });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from("band-images").getPublicUrl(path);
        banner_url = pub.publicUrl;
      }
    }

    const genres = [
      ...editGenres,
      ...editOtherGenres.split(",").map((g) => g.trim()).filter(Boolean),
    ];

    // Strip empty social link values before saving
    const social_links = Object.fromEntries(
      Object.entries(editSocialLinks).filter(([, v]) => v.trim() !== "")
    );

    const { error: err } = await supabase
      .from("bands")
      .update({
        name: editForm.name,
        description: editForm.description || null,
        label: editForm.label || null,
        spotify_url: editForm.spotify_url || null,
        date_formed: editForm.date_formed || null,
        genres,
        social_links,
        image_url,
        banner_url,
      })
      .eq("id", band.id);

    if (err) { setError(err.message); setSaving(false); return; }
    setEditOpen(false);
    setSaving(false);
    fetchData();
  }

  async function handleRemoveMember(memberRow: MemberRow) {
    if (!confirm(`Remove ${memberRow.user.full_name || memberRow.user.username} from the band?`)) return;
    await supabase.from("band_members").delete().eq("id", memberRow.id);
    fetchData();
  }

  async function handleLeave() {
    if (!myMembership) return;
    if (!confirm("Leave this band?")) return;
    await supabase.from("band_members").delete().eq("id", myMembership.id);
    router.push("/dashboard/bands");
  }

  async function handleToggleAdmin(member: MemberRow) {
    const action = member.is_admin ? "Remove admin from" : "Make admin";
    if (!confirm(`${action} ${member.user.full_name || member.user.username}?`)) return;
    await supabase.from("band_members").update({ is_admin: !member.is_admin }).eq("id", member.id);
    fetchData();
  }

  function copyInviteCode() {
    if (!band) return;
    navigator.clipboard.writeText(band.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleShare() {
    if (!band) return;
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const url = `${origin}/invite/${band.invite_code}`;
    if (navigator.share) {
      navigator.share({ title: band.name, text: `Join ${band.name} on Bandapa`, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 1500);
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => setCropTarget({ src: reader.result as string, target: "cover" });
    reader.readAsDataURL(file);
  }

  function handleBannerPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => setCropTarget({ src: reader.result as string, target: "banner" });
    reader.readAsDataURL(file);
  }

  function handleCropDone(file: File, preview: string) {
    if (!cropTarget) return;
    if (cropTarget.target === "cover") {
      setEditImageFile(file);
      setEditImagePreview(preview);
    } else {
      setEditBannerFile(file);
      setEditBannerPreview(preview);
    }
    setCropTarget(null);
  }

  if (loading && !cached && !band) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">Loading…</div>;
  }

  const displayImage = editImagePreview ?? band?.image_url ?? null;
  const displayBanner = editBannerPreview ?? band?.banner_url ?? null;

  const socialLinks = band?.social_links ?? {};
  const filledSocials = SOCIAL_PLATFORMS.filter((p) => socialLinks[p.key]);
  const hasLinks = !!band?.spotify_url || filledSocials.length > 0;

  return (
    <div className="p-6 md:p-8 page-enter max-w-3xl">
      <div className="card mb-6 overflow-hidden">
        {/* Banner */}
        <div className="relative h-44">
          {band?.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={band.banner_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-chlorophyll/20 to-surface-mist" />
          )}

          <div className="absolute top-3 right-3 flex gap-2">
            {band && (
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-obsidian hover:bg-white transition-colors font-medium shadow-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>share</span>
                {copiedShare ? "Copied!" : "Share"}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-obsidian hover:bg-white transition-colors font-medium shadow-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>edit</span>
                Edit band
              </button>
            )}
          </div>

          <div className="absolute -bottom-10 left-6">
            <div
              className="w-20 h-20 rounded-2xl ring-4 ring-white bg-surface-mist overflow-hidden flex items-center justify-center shadow-md"
              style={{ viewTransitionName: `band-cover-${id}` }}
            >
              {displayCoverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayCoverUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-primary" style={{ fontSize: "32px" }}>groups</span>
              )}
            </div>
          </div>
        </div>

        {/* Band info */}
        <div className="pt-14 px-6 pb-6">
          <h1
            className="font-headline font-bold text-2xl text-obsidian"
            style={{ viewTransitionName: `band-name-${id}` }}
          >
            {displayName}
          </h1>

          {band ? (
            <p className="text-sm text-on-surface-variant mt-1">{band.description || "No description yet."}</p>
          ) : (
            <div className="h-4 band-skeleton rounded w-3/4 mt-2" />
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {displayGenres.map((g, i) => (
              <span
                key={g}
                className="genre-pill-enter text-xs font-mono px-2 py-0.5 rounded-full bg-chlorophyll/10 text-chlorophyll-dark border border-chlorophyll/20"
                style={{ animationDelay: `${180 + i * 50}ms` }}
              >
                {g}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-5 pt-5 border-t border-outline-variant">
            <div>
              <p className="label-field">Formed</p>
              {band ? (
                <p className="text-obsidian">{band.date_formed || "—"}</p>
              ) : (
                <div className="h-4 band-skeleton rounded w-20 mt-1" />
              )}
            </div>
            <div>
              <p className="label-field">Label</p>
              {band ? (
                <p className="text-obsidian">{band.label || "—"}</p>
              ) : (
                <div className="h-4 band-skeleton rounded w-24 mt-1" />
              )}
            </div>
            <div className="col-span-2">
              <p className="label-field">Invite code</p>
              {band ? (
                <button onClick={copyInviteCode} className="flex items-center gap-1.5 font-mono text-chlorophyll-dark hover:underline">
                  {band.invite_code}
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{copied ? "check" : "content_copy"}</span>
                </button>
              ) : (
                <div className="h-4 band-skeleton rounded w-32 mt-1" />
              )}
            </div>
          </div>

          {/* Social links */}
          {hasLinks && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-outline-variant/50">
              {band?.spotify_url && (
                <a
                  href={band.spotify_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-surface-mist border border-outline-variant text-on-surface-variant hover:border-chlorophyll-dark hover:text-chlorophyll-dark transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>headphones</span>
                  Spotify
                </a>
              )}
              {filledSocials.map((p, i) => (
                <a
                  key={p.key}
                  href={socialLinks[p.key]}
                  target="_blank"
                  rel="noreferrer"
                  className="genre-pill-enter inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-surface-mist border border-outline-variant text-on-surface-variant hover:border-chlorophyll-dark hover:text-chlorophyll-dark transition-colors"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{p.icon}</span>
                  {p.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-headline font-semibold text-sm text-obsidian mb-3">
          Members {members.length > 0 && `(${members.length})`}
        </h2>
        {loading && members.length === 0 ? (
          <ul className="space-y-2">
            {[0, 1].map((i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5 spring-row" style={{ animationDelay: `${300 + i * 60}ms` }}>
                <div className="w-8 h-8 rounded-full band-skeleton shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 band-skeleton rounded w-32 mb-1.5" />
                  <div className="h-3 band-skeleton rounded w-20" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {members.map((m, i) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-mist/60 transition-colors spring-row"
                style={{ animationDelay: `${300 + i * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-mist overflow-hidden flex items-center justify-center shrink-0">
                    {m.user.display_picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.user.display_picture} alt={m.user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-mono text-xs text-primary">{(m.user.full_name || m.user.username).charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-obsidian">{m.user.full_name || m.user.username}</p>
                    <p className="text-xs text-on-surface-variant">@{m.user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(m.is_admin || m.user_id === band?.owner_id) && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary-container/30 text-primary">
                      {m.user_id === band?.owner_id ? "Owner" : "Admin"}
                    </span>
                  )}
                  {isAdmin && m.user_id !== currentUserId && m.user_id !== band?.owner_id && (
                    <button
                      onClick={() => handleToggleAdmin(m)}
                      className="p-1.5 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                      title={m.is_admin ? "Remove admin" : "Make admin"}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                        {m.is_admin ? "shield_with_heart" : "shield_person"}
                      </span>
                    </button>
                  )}
                  {isAdmin && !m.is_admin && m.user_id !== currentUserId && m.user_id !== band?.owner_id && (
                    <button
                      onClick={() => handleRemoveMember(m)}
                      className="p-1.5 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>person_remove</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {myMembership && !isOwner && (
        <button onClick={handleLeave} className="btn-danger">Leave band</button>
      )}

      <Modal title="Edit Band" open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="p-6 space-y-4">
          {/* Banner upload */}
          <div>
            <label className="label-field">Banner image</label>
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="relative w-full h-28 rounded-xl overflow-hidden bg-surface-mist flex items-center justify-center border border-outline-variant hover:border-primary transition-colors group"
            >
              {displayBanner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayBanner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 via-chlorophyll/10 to-surface-mist flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary" style={{ fontSize: "28px" }}>add_photo_alternate</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">Change banner</span>
              </div>
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerPick} />
          </div>

          {/* Cover photo */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-mist shrink-0 flex items-center justify-center border border-outline-variant hover:border-primary transition-colors group"
            >
              {displayImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary" style={{ fontSize: "24px" }}>add_a_photo</span>
              )}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            <p className="text-xs text-on-surface-variant">Band display picture</p>
          </div>

          <div>
            <label className="label-field">Band name</label>
            <input className="input-field" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>

          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field min-h-[64px] resize-y" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>

          {/* Genre picker */}
          <div>
            <label className="label-field">Genres</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_LIST.map((genre) => {
                const checked = editGenres.has(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleEditGenre(genre)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-colors ${
                      checked
                        ? "bg-chlorophyll text-obsidian border-chlorophyll"
                        : "bg-white text-on-surface-variant border-outline-variant hover:border-chlorophyll-dark"
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
              value={editOtherGenres}
              onChange={(e) => setEditOtherGenres(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Date formed</label>
              <input type="date" className="input-field" value={editForm.date_formed} onChange={(e) => setEditForm({ ...editForm, date_formed: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Record label</label>
              <input className="input-field" value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label-field">Spotify URL</label>
            <input className="input-field" value={editForm.spotify_url} onChange={(e) => setEditForm({ ...editForm, spotify_url: e.target.value })} placeholder="https://open.spotify.com/artist/…" />
          </div>

          {/* Social links */}
          <div>
            <label className="label-field">Social links</label>
            <div className="space-y-2">
              {SOCIAL_PLATFORMS.map((p) => (
                <div key={p.key} className="flex items-center gap-2.5">
                  <span className="w-[88px] text-xs font-mono text-on-surface-variant shrink-0 flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{p.icon}</span>
                    {p.label}
                  </span>
                  <input
                    className="input-field"
                    value={editSocialLinks[p.key] ?? ""}
                    onChange={(e) =>
                      setEditSocialLinks((prev) => ({ ...prev, [p.key]: e.target.value }))
                    }
                    placeholder="https://…"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      </Modal>

      {/* Crop modal — sits on top of the edit modal */}
      <Modal
        title={cropTarget?.target === "banner" ? "Crop banner" : "Crop photo"}
        open={!!cropTarget}
        onClose={() => setCropTarget(null)}
      >
        {cropTarget && (
          <ImageCropper
            src={cropTarget.src}
            aspect={cropTarget.target === "banner" ? 4 : 1}
            outputWidth={cropTarget.target === "banner" ? 1200 : 400}
            label={cropTarget.target === "banner"
              ? "Drag to reposition · scroll to zoom"
              : "Drag to reposition your photo · scroll to zoom"}
            onCrop={handleCropDone}
            onCancel={() => setCropTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}
