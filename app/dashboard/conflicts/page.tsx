"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conflict, ConflictVote, Event, Band } from "@/lib/types";

type ConflictRow = Conflict & {
  band_event: Event;
  personal_event: Event;
};

export default function ConflictsPage() {
  const supabase = createClient();
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [votesByConflict, setVotesByConflict] = useState<Map<string, ConflictVote[]>>(new Map());
  const [memberCounts, setMemberCounts] = useState<Map<string, number>>(new Map());
  const [bandsById, setBandsById] = useState<Map<string, Band>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: conflictRows } = await supabase
      .from("conflicts")
      .select("*, band_event:events!conflicts_band_event_id_fkey(*), personal_event:events!conflicts_personal_event_id_fkey(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const rows = (conflictRows ?? []) as unknown as ConflictRow[];
    setConflicts(rows);

    const bandIds = [...new Set(rows.map((c) => c.band_event?.band_id).filter(Boolean))] as string[];
    if (bandIds.length > 0) {
      const { data: bandRows } = await supabase.from("bands").select("*").in("id", bandIds);
      setBandsById(new Map((bandRows ?? []).map((b) => [b.id, b])));

      const counts = new Map<string, number>();
      for (const bandId of bandIds) {
        const { count } = await supabase.from("band_members").select("id", { count: "exact", head: true }).eq("band_id", bandId);
        counts.set(bandId, count ?? 0);
      }
      setMemberCounts(counts);
    }

    const conflictIds = rows.map((c) => c.id);
    if (conflictIds.length > 0) {
      const { data: voteRows } = await supabase.from("conflict_votes").select("*").in("conflict_id", conflictIds);
      const map = new Map<string, ConflictVote[]>();
      for (const v of voteRows ?? []) {
        map.set(v.conflict_id, [...(map.get(v.conflict_id) ?? []), v]);
      }
      setVotesByConflict(map);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConflicts();
    const channel = supabase
      .channel("conflicts-watch")
      .on("postgres_changes", { event: "*", schema: "bandapa-main", table: "conflicts" }, fetchConflicts)
      .on("postgres_changes", { event: "*", schema: "bandapa-main", table: "conflict_votes" }, fetchConflicts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchConflicts]);

  async function castVote(conflictId: string, vote: "cancel" | "greenlit") {
    if (!userId) return;
    await supabase.from("conflict_votes").delete().eq("conflict_id", conflictId).eq("user_id", userId);
    await supabase.from("conflict_votes").insert({ conflict_id: conflictId, user_id: userId, vote });
    fetchConflicts();
  }

  async function dismiss(conflictId: string) {
    if (!confirm("Dismiss this conflict?")) return;
    await supabase.from("conflicts").update({ status: "cancelled" }).eq("id", conflictId);
    fetchConflicts();
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-on-surface-variant">Loading…</div>;
  }

  return (
    <div className="p-6 md:p-8 page-enter max-w-2xl">
      <h1 className="font-headline font-bold text-2xl text-obsidian mb-2">Schedule conflicts</h1>
      <p className="text-sm text-on-surface-variant mb-6">A personal event overlaps a band event — vote on what should happen.</p>

      {conflicts.length === 0 ? (
        <div className="card py-16 text-center text-sm text-on-surface-variant">No conflicts right now.</div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((c) => {
            const votes = votesByConflict.get(c.id) ?? [];
            const cancelCount = votes.filter((v) => v.vote === "cancel").length;
            const greenlitCount = votes.filter((v) => v.vote === "greenlit").length;
            const totalMembers = c.band_event?.band_id ? (memberCounts.get(c.band_event.band_id) ?? 0) : 0;
            const myVote = votes.find((v) => v.user_id === userId)?.vote;
            const band = c.band_event?.band_id ? bandsById.get(c.band_event.band_id) : undefined;

            return (
              <div key={c.id} className="card p-5 spring-row">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-on-surface-variant">{band?.name ?? "Band event"}</span>
                  <button onClick={() => dismiss(c.id)} className="text-xs text-on-surface-variant hover:text-error transition-colors">Dismiss</button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="rounded-lg border border-[#22d3ee]/30 bg-[#22d3ee]/5 p-3">
                    <p className="text-xs font-mono text-[#0891b2] mb-1">BAND EVENT</p>
                    <p className="text-sm font-medium text-obsidian">{c.band_event?.title}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(c.band_event?.start_time).toLocaleString()}</p>
                  </div>
                  <div className="text-center text-xs font-mono text-on-surface-variant">vs</div>
                  <div className="rounded-lg border border-chlorophyll/30 bg-chlorophyll/5 p-3">
                    <p className="text-xs font-mono text-chlorophyll-dark mb-1">PERSONAL EVENT</p>
                    <p className="text-sm font-medium text-obsidian">{c.personal_event?.title}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(c.personal_event?.start_time).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => castVote(c.id, "cancel")}
                    className={`flex-1 text-xs font-mono py-2 rounded-lg border transition-colors ${myVote === "cancel" ? "bg-error-container text-on-error-container border-error-container" : "bg-white text-on-surface-variant border-outline-variant"}`}
                  >
                    Cancel rehearsal
                  </button>
                  <button
                    onClick={() => castVote(c.id, "greenlit")}
                    className={`flex-1 text-xs font-mono py-2 rounded-lg border transition-colors ${myVote === "greenlit" ? "bg-chlorophyll text-obsidian border-chlorophyll" : "bg-white text-on-surface-variant border-outline-variant"}`}
                  >
                    Keep it
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-mist overflow-hidden flex">
                    <div className="h-full bg-error-container" style={{ width: `${totalMembers ? (cancelCount / totalMembers) * 100 : 0}%` }} />
                    <div className="h-full bg-chlorophyll" style={{ width: `${totalMembers ? (greenlitCount / totalMembers) * 100 : 0}%` }} />
                  </div>
                  <span className="font-mono">{greenlitCount}/{totalMembers} keep · {cancelCount} cancel</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
