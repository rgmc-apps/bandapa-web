import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event } from "@/lib/types";

/**
 * No DB trigger creates `conflicts` rows automatically. Call this right after
 * inserting a personal event to detect overlap with the user's band events
 * (via the `get_overlapping_events` RPC) and report a conflict if found.
 */
export async function detectAndReportConflicts(
  supabase: SupabaseClient,
  userId: string,
  personalEvent: Event
) {
  const { data: memberRows } = await supabase
    .from("band_members")
    .select("band_id")
    .eq("user_id", userId);

  const bandIds = (memberRows ?? []).map((r) => r.band_id);
  if (bandIds.length === 0) return;

  const { data: overlapping } = await supabase.rpc("get_overlapping_events", {
    p_user_id: userId,
    p_start: personalEvent.start_time,
    p_end: personalEvent.end_time,
    p_band_ids: bandIds,
  });

  const bandEvents = ((overlapping ?? []) as Event[]).filter(
    (e) => e.id !== personalEvent.id && e.band_id !== null
  );

  for (const bandEvent of bandEvents) {
    await supabase.from("conflicts").insert({
      band_event_id: bandEvent.id,
      personal_event_id: personalEvent.id,
      reported_by: userId,
    });
  }
}
