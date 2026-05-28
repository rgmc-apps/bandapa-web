"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";
import Modal from "@/components/Modal";

type AnnouncementForm = { title: string; body: string; is_active: boolean };

const empty: AnnouncementForm = { title: "", body: "", is_active: true };

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError("");
    setModalOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setForm({ title: item.title, body: item.body, is_active: item.is_active });
    setError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    let err;
    if (editing) {
      ({ error: err } = await supabase.from("announcements").update(form).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("announcements").insert(form));
    }

    if (err) { setError(err.message); setSaving(false); return; }
    setModalOpen(false);
    fetchItems();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement? Users will no longer see it.")) return;
    await supabase.from("announcements").delete().eq("id", id);
    fetchItems();
  }

  async function toggleActive(item: Announcement) {
    await supabase.from("announcements").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchItems();
  }

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-obsidian">Announcements</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {items.filter((i) => i.is_active).length} active · {items.length} total
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Announcement
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 bg-chlorophyll/10 border border-chlorophyll/25 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-chlorophyll/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-chlorophyll-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-obsidian">App Notification</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Active announcements are shown to all app users via real-time notifications. Deactivate an announcement to stop showing it.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-on-surface-variant">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-5xl mb-4">📢</div>
          <p className="text-sm text-on-surface-variant mb-4">No announcements yet.</p>
          <button className="btn-primary" onClick={openCreate}>Create your first announcement</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`card p-5 ${!item.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-4">
                {/* Active indicator */}
                <button
                  onClick={() => toggleActive(item)}
                  className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                    item.is_active
                      ? "bg-chlorophyll-dark border-chlorophyll-dark"
                      : "bg-transparent border-outline"
                  }`}
                  title={item.is_active ? "Click to deactivate" : "Click to activate"}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="font-headline font-semibold text-obsidian text-base">{item.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-mono rounded-full border ${
                      item.is_active
                        ? "bg-chlorophyll/10 text-chlorophyll-dark border-chlorophyll/20"
                        : "bg-surface-mist text-on-surface-variant border-outline-variant/50"
                    }`}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">{item.body}</p>
                  <time className="text-xs font-mono text-on-surface-variant/60 mt-2 block">
                    {new Date(item.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </time>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(item)} className="p-2 hover:bg-surface-mist rounded-lg text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-error-container hover:text-on-error-container rounded-lg text-on-surface-variant transition-colors" title="Delete">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={editing ? "Edit Announcement" : "New Announcement"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="label-field">Title *</label>
            <input
              className="input-field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. App Update v1.2 — New Features"
            />
          </div>
          <div>
            <label className="label-field">Message *</label>
            <textarea
              className="input-field min-h-[120px] resize-y"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write your announcement here. This will be shown to all app users…"
            />
          </div>
          <div className="flex items-center gap-3 p-3.5 bg-surface-mist rounded-lg">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                form.is_active ? "bg-chlorophyll-dark" : "bg-outline-variant"
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                form.is_active ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
            <div>
              <p className="text-sm font-medium text-obsidian">Publish immediately</p>
              <p className="text-xs text-on-surface-variant">When active, this announcement is visible to all app users.</p>
            </div>
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !form.title || !form.body}
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Publish"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
