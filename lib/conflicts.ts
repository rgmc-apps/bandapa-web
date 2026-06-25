import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event } from "@/lib/types";

export type MemberConflictRow = {
  member_user_id: string;
  member_name: string;
  conflicting_event_id: string;
  conflicting_event_title: string;
  conflicting_band_id: string | null;
  conflicting_band_name: string | null;
};

async function conflictExists(
  supabase: SupabaseClient,
  bandEventId: string,
  personalEventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("conflicts")
    .select("id")
    .eq("band_event_id", bandEventId)
    .eq("personal_event_id", personalEventId)
    .maybeSingle();
  return !!data;
}

/**
 * Call after inserting a personal event. Finds overlapping band events across
 * all the user's bands and records a conflict row for each new pair.
 */
export async function detectPersonalEventConflicts(
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
    if (await conflictExists(supabase, bandEvent.id, personalEvent.id)) continue;
    await supabase.from("conflicts").insert({
      band_event_id: bandEvent.id,
      personal_event_id: personalEvent.id,
      reported_by: userId,
    });
  }
}

/**
 * Call after inserting a band event. Uses the `find_band_event_conflicts` RPC
 * (SECURITY DEFINER) to check all band members' personal events and cross-band
 * events, then records a conflict row for each new pair.
 */
export async function detectBandEventConflicts(
  supabase: SupabaseClient,
  bandEvent: Event
) {
  if (!bandEvent.band_id) return;

  const { data: rows } = await supabase.rpc("find_band_event_conflicts", {
    p_band_id: bandEvent.band_id,
    p_start: bandEvent.start_time,
    p_end: bandEvent.end_time,
    p_exclude_event_id: bandEvent.id,
  });

  for (const row of ((rows ?? []) as MemberConflictRow[])) {
    if (await conflictExists(supabase, bandEvent.id, row.conflicting_event_id)) continue;
    await supabase.from("conflicts").insert({
      band_event_id: bandEvent.id,
      personal_event_id: row.conflicting_event_id,
      reported_by: row.member_user_id,
    });
  }
}

/** @deprecated Use detectPersonalEventConflicts */
export const detectAndReportConflicts = detectPersonalEventConflicts;
