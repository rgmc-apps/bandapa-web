"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Band, BandMember, Event, Profile } from "@/lib/types";
import Modal from "@/components/Modal";
import ImageCropper from "@/components/ImageCropper";
import { getTransitionBand, setTransitionBand } from "@/lib/transition-store";

type CropTarget = { src: string; target: "cover" | "banner" } | null;

type MemberRow = BandMember & { user: Profile };

type BandEvent = Event & { venue: { id: string; name: string } | null };

type ConflictRow = {
  id: string;
  status: "pending" | "cancelled" | "greenlit";
  created_at: string;
  band_event: { id: string; title: string; start_time: string; end_time: string } | null;
  personal_event: { id: string; title: string; owner_id: string } | null;
};

type BandPhoto = {
  id: string;
  url: string;
  uploaded_by: string | null;
  created_at: string;
};

type BandLogEntry = {
  id: string;
  action: "joined" | "removed" | "quit";
  created_at: string;
  user_id: string | null;
  actor_id: string | null;
  subject: { id: string; full_name: string | null; username: string; avatar_url: string | null } | null;
  agent: { id: string; full_name: string | null; username: string } | null;
};

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

const EVENT_TYPE_LABELS: Record<string, string> = {
  band_rehearsal: "Rehearsal",
  studio_recording: "Recording",
  hangout: "Hangout",
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function BandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const router = useRouter();

  const cached = getTransitionBand();

  const [band, setBand] = useState<Band | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [events, setEvents] = useState<BandEvent[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [photos, setPhotos] = useState<BandPhoto[]>([]);
  const [bandLog, setBandLog] = useState<BandLogEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
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
  const sliderRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

    const { data: eventRows } = await supabase
      .from("events")
      .select("*, venue:venue_id(id, name)")
      .eq("band_id", id)
      .order("start_time", { ascending: false });
    const fetchedEvents = (eventRows ?? []) as unknown as BandEvent[];
    setEvents(fetchedEvents);

    if (fetchedEvents.length > 0) {
      const eventIds = fetchedEvents.map(e => e.id);
      const { data: conflictRows } = await supabase
        .from("conflicts")
        .select("id, status, created_at, band_event:band_event_id(id, title, start_time, end_time), personal_event:personal_event_id(id, title, owner_id)")
        .in("band_event_id", eventIds)
        .order("created_at", { ascending: false });
      setConflicts((conflictRows ?? []) as unknown as ConflictRow[]);
    } else {
      setConflicts([]);
    }

    const { data: photoRows } = await supabase
      .from("band_photos")
      .select("id, url, uploaded_by, created_at")
      .eq("band_id", id)
      .order("created_at", { ascending: true });
    setPhotos((photoRows ?? []) as BandPhoto[]);

    const { data: logRows } = await supabase
      .from("band_log")
      .select("id, action, created_at, user_id, actor_id, subject:user_id(id, full_name, username, avatar_url), agent:actor_id(id, full_name, username)")
      .eq("band_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    setBandLog((logRows ?? []) as unknown as BandLogEntry[]);

    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    fetchData();
    return () => { setTransitionBand(null); };
  }, [fetchData]);

  const myMembership = members.find((m) => m.user_id === currentUserId);
  const isOwner = band?.created_by === currentUserId;
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
    await supabase.from("band_log").insert({ band_id: id, user_id: memberRow.user_id, action: "removed", actor_id: currentUserId });
    await supabase.from("band_members").delete().eq("id", memberRow.id);
    fetchData();
  }

  async function handleLeave() {
    if (!myMembership) return;
    if (!confirm("Leave this band?")) return;
    await supabase.from("band_log").insert({ band_id: id, user_id: currentUserId, action: "quit", actor_id: currentUserId });
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

  function goToSlide(idx: number) {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * idx, behavior: "smooth" });
    setSlideIdx(idx);
  }

  function handleSliderScroll() {
    const el = sliderRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== slideIdx) setSlideIdx(idx);
  }

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    e.target.value = "";
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${id}/gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("band-images")
      .upload(filename, file, { contentType: file.type, upsert: false });
    if (!uploadErr) {
      const { data: { publicUrl } } = supabase.storage.from("band-images").getPublicUrl(filename);
      await supabase.from("band_photos").insert({ band_id: id, url: publicUrl, uploaded_by: currentUserId });
      const { data: photoRows } = await supabase
        .from("band_photos").select("id, url, uploaded_by, created_at")
        .eq("band_id", id).order("created_at", { ascending: true });
      setPhotos((photoRows ?? []) as BandPhoto[]);
    }
    setUploadingPhoto(false);
  }

  async function handleDeletePhoto(photo: BandPhoto) {
    if (!confirm("Delete this photo?")) return;
    setDeletingPhoto(true);
    const marker = "/band-images/";
    const idx = photo.url.indexOf(marker);
    const storagePath = idx >= 0 ? photo.url.slice(idx + marker.length) : "";
    if (storagePath) await supabase.storage.from("band-images").remove([storagePath]);
    await supabase.from("band_photos").delete().eq("id", photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setLightboxIdx(null);
    setDeletingPhoto(false);
  }

  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setLightboxIdx(null); return; }
      if (e.key === "ArrowLeft")
        setLightboxIdx(prev => prev !== null ? Math.max(0, prev - 1) : prev);
      if (e.key === "ArrowRight")
        setLightboxIdx(prev => prev !== null ? Math.min(photos.length - 1, prev + 1) : prev);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxIdx, photos.length]);

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

  const lightboxPhoto = lightboxIdx !== null ? (photos[lightboxIdx] ?? null) : null;

  const now = new Date();
  const currentEvents = events.filter(e => new Date(e.start_time) <= now && new Date(e.end_time) >= now);
  const upcomingEvents = events
    .filter(e => new Date(e.start_time) > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const pastEvents = events
    .filter(e => new Date(e.end_time) < now)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const activeConflicts = conflicts.filter(c => c.status === "pending");
  const resolvedConflicts = conflicts.filter(c => c.status !== "pending");

  function formatEventDate(ev: BandEvent): string {
    const start = new Date(ev.start_time);
    const end = new Date(ev.end_time);
    const dateStr = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    if (ev.is_all_day) return `${dateStr} · All day`;
    const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${dateStr} · ${startTime} – ${endTime}`;
  }

  function getMemberName(ownerId: string): string {
    const m = members.find(m => m.user_id === ownerId);
    return m ? (m.user.full_name || `@${m.user.username}`) : "A member";
  }

  function renderEventRow(ev: BandEvent, kind: "current" | "upcoming" | "past") {
    const isPast = kind === "past";
    const isCurrent = kind === "current";
    return (
      <div
        key={ev.id}
        className={`flex items-start gap-3 px-3 py-2.5 rounded-lg ${
          isCurrent
            ? "bg-primary/5 ring-1 ring-primary/15"
            : isPast
            ? "opacity-55"
            : "hover:bg-surface-mist/60 transition-colors"
        }`}
      >
        {isCurrent && (
          <span className="relative flex h-2 w-2 shrink-0 mt-[7px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`text-sm font-medium truncate ${isPast ? "text-on-surface-variant" : "text-obsidian"}`}>
              {ev.title}
            </p>
            {EVENT_TYPE_LABELS[ev.event_type] && (
              <span className="text-[9px] font-mono px-1.5 py-[2px] rounded-full bg-surface-mist text-on-surface-variant shrink-0">
                {EVENT_TYPE_LABELS[ev.event_type]}
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">{formatEventDate(ev)}</p>
          {ev.venue?.name && (
            <p className="text-xs text-on-surface-variant/60 mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: "11px" }}>location_on</span>
              {ev.venue.name}
            </p>
          )}
        </div>
      </div>
    );
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
                  {(m.is_admin || m.user_id === band?.created_by) && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary-container/30 text-primary">
                      {m.user_id === band?.created_by ? "Owner" : "Admin"}
                    </span>
                  )}
                  {isAdmin && m.user_id !== currentUserId && m.user_id !== band?.created_by && (
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
                  {isAdmin && !m.is_admin && m.user_id !== currentUserId && m.user_id !== band?.created_by && (
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

      {/* Photos */}
      <div className="card overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline font-semibold text-sm text-obsidian">
            Photos{photos.length > 0 && <span className="font-mono font-normal text-xs text-on-surface-variant ml-2">{photos.length}</span>}
          </h2>
          {isAdmin && (
            <label className={`cursor-pointer flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-outline-variant/60 text-on-surface-variant hover:bg-surface-mist transition-colors ${uploadingPhoto ? "opacity-50 pointer-events-none" : ""}`}>
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                {uploadingPhoto ? "hourglass_empty" : "add_photo_alternate"}
              </span>
              {uploadingPhoto ? "Uploading…" : "Add photo"}
              <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoPick} disabled={uploadingPhoto} />
            </label>
          )}
        </div>

        {loading && photos.length === 0 ? (
          <div className="aspect-video bg-surface-mist animate-pulse" />
        ) : photos.length === 0 ? (
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-on-surface-variant/25" style={{ fontSize: "32px" }}>photo_library</span>
            <p className="text-sm text-on-surface-variant mt-2">{isAdmin ? "Add the first photo of your band." : "No photos yet."}</p>
          </div>
        ) : (
          <div className="relative">
            {/* Scrollable track */}
            <div
              ref={sliderRef}
              className="flex overflow-x-scroll snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}
              onScroll={handleSliderScroll}
            >
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="shrink-0 w-full snap-center aspect-video relative cursor-zoom-in overflow-hidden bg-obsidian/5"
                  onClick={() => setLightboxIdx(i)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Band photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            {/* Prev arrow */}
            {slideIdx > 0 && (
              <button
                onClick={() => goToSlide(slideIdx - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                aria-label="Previous photo"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_left</span>
              </button>
            )}

            {/* Next arrow */}
            {slideIdx < photos.length - 1 && (
              <button
                onClick={() => goToSlide(slideIdx + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                aria-label="Next photo"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
              </button>
            )}

            {/* Dots */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 pointer-events-auto ${i === slideIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxPhoto.url}
            alt="Band photo"
            className="max-w-full max-h-full object-contain select-none"
            onClick={e => e.stopPropagation()}
          />

          {/* Close */}
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
          </button>

          {/* Prev */}
          {lightboxIdx! > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? Math.max(0, i - 1) : i); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
              aria-label="Previous"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>chevron_left</span>
            </button>
          )}

          {/* Next */}
          {lightboxIdx! < photos.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? Math.min(photos.length - 1, i + 1) : i); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
              aria-label="Next"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>chevron_right</span>
            </button>
          )}

          {/* Counter + delete */}
          <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-4">
            <span className="text-white/60 text-xs font-mono">{(lightboxIdx! + 1)} / {photos.length}</span>
            {isAdmin && (
              <button
                onClick={e => { e.stopPropagation(); handleDeletePhoto(lightboxPhoto); }}
                disabled={deletingPhoto}
                className="flex items-center gap-1.5 text-xs font-mono text-white/60 hover:text-error transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>delete</span>
                {deletingPhoto ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Schedule */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline font-semibold text-sm text-obsidian">Schedule</h2>
          {events.length > 0 && (
            <span className="text-xs font-mono text-on-surface-variant">{events.length} total</span>
          )}
        </div>

        {loading && events.length === 0 ? (
          <div className="space-y-2">
            {[0, 1].map(i => (
              <div key={i} className="h-12 band-skeleton rounded-lg" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-6 text-center">
            <span className="material-symbols-outlined text-on-surface-variant/30" style={{ fontSize: "28px" }}>calendar_today</span>
            <p className="text-sm text-on-surface-variant mt-2">No scheduled events yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {currentEvents.length > 0 && (
              <section>
                <p className="text-[10px] font-mono font-semibold text-primary uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                  Now
                </p>
                <div className="space-y-1.5">{currentEvents.map(ev => renderEventRow(ev, "current"))}</div>
              </section>
            )}

            {upcomingEvents.length > 0 && (
              <section>
                <p className="text-[10px] font-mono font-semibold text-on-surface-variant/50 uppercase tracking-[0.08em] mb-2">
                  Upcoming · {upcomingEvents.length}
                </p>
                <div className="space-y-1.5">{upcomingEvents.map(ev => renderEventRow(ev, "upcoming"))}</div>
              </section>
            )}

            {pastEvents.length > 0 && (
              <section>
                <button
                  className="text-[10px] font-mono font-semibold text-on-surface-variant/50 uppercase tracking-[0.08em] flex items-center gap-1 w-full hover:text-on-surface-variant transition-colors mb-2"
                  onClick={() => setShowPastEvents(p => !p)}
                >
                  Past · {pastEvents.length}
                  <span className="material-symbols-outlined ml-auto" style={{ fontSize: "14px" }}>
                    {showPastEvents ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {showPastEvents && (
                  <div className="space-y-1.5">{pastEvents.map(ev => renderEventRow(ev, "past"))}</div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline font-semibold text-sm text-obsidian">Conflicts</h2>
            {activeConflicts.length > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 bg-error/10 text-error rounded-full">
                {activeConflicts.length} pending
              </span>
            )}
          </div>

          <div className="space-y-5">
            {activeConflicts.length > 0 && (
              <section>
                <p className="text-[10px] font-mono font-semibold text-error/70 uppercase tracking-[0.08em] mb-2.5">
                  Active · {activeConflicts.length}
                </p>
                <div className="space-y-2">
                  {activeConflicts.map(c => (
                    <div key={c.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-error/20 bg-error/5">
                      <span className="material-symbols-outlined text-error/70 shrink-0 mt-0.5" style={{ fontSize: "16px" }}>warning</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-obsidian">
                          {getMemberName(c.personal_event?.owner_id ?? "")} has a scheduling conflict
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                          <span className="font-medium">{c.band_event?.title ?? "Band event"}</span>
                          {" overlaps with "}
                          <span className="font-medium">{c.personal_event?.title ?? "personal event"}</span>
                        </p>
                        {c.band_event?.start_time && (
                          <p className="text-xs text-on-surface-variant/60 mt-1">
                            {new Date(c.band_event.start_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                            {" · "}
                            {timeAgo(c.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {resolvedConflicts.length > 0 && (
              <section>
                <p className="text-[10px] font-mono font-semibold text-on-surface-variant/50 uppercase tracking-[0.08em] mb-2.5">
                  Resolved · {resolvedConflicts.length}
                </p>
                <div className="space-y-1.5">
                  {resolvedConflicts.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                      <span
                        className={`material-symbols-outlined shrink-0 ${c.status === "greenlit" ? "text-primary" : "text-on-surface-variant/40"}`}
                        style={{ fontSize: "16px" }}
                      >
                        {c.status === "greenlit" ? "check_circle" : "cancel"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-on-surface-variant truncate">
                          <span className="font-medium text-obsidian">{c.band_event?.title ?? "Event"}</span>
                          {" · "}
                          {getMemberName(c.personal_event?.owner_id ?? "")}
                        </p>
                        {c.band_event?.start_time && (
                          <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
                            {new Date(c.band_event.start_time).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-[2px] rounded-full shrink-0 ${
                        c.status === "greenlit"
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-mist text-on-surface-variant"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* Activity log */}
      {bandLog.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-headline font-semibold text-sm text-obsidian mb-3">Activity</h2>
          <div className="divide-y divide-outline-variant/20">
            {bandLog.map(entry => {
              const name = entry.subject?.full_name || (entry.subject ? `@${entry.subject.username}` : "Someone");
              const agentName = entry.agent?.full_name || (entry.agent ? `@${entry.agent.username}` : null);
              const isJoined = entry.action === "joined";
              const isRemoved = entry.action === "removed";
              return (
                <div key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isJoined ? "bg-primary/10" : isRemoved ? "bg-error/10" : "bg-surface-mist"
                  }`}>
                    <span className={`material-symbols-outlined ${isJoined ? "text-primary" : isRemoved ? "text-error" : "text-on-surface-variant"}`} style={{ fontSize: "14px" }}>
                      {isJoined ? "person_add" : isRemoved ? "person_remove" : "logout"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-obsidian leading-snug">
                      <span className="font-medium">{name}</span>
                      {isJoined && " joined the band"}
                      {entry.action === "quit" && " left the band"}
                      {isRemoved && (
                        <> was removed{agentName && entry.actor_id !== entry.user_id && <> by <span className="font-medium">{agentName}</span></>}</>
                      )}
                    </p>
                    <p className="text-[10px] font-mono text-on-surface-variant/50 mt-0.5">{timeAgo(entry.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
