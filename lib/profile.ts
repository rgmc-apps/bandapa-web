import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

/**
 * bandapa-main.users has no insert trigger from auth.users (the only
 * existing trigger writes to public.profiles, an unrelated legacy table),
 * so the first authenticated request for a given user creates the row.
 */
export async function getOrCreateProfile(
  supabase: SupabaseClient,
  user: User
): Promise<Profile> {
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (existing) return existing as Profile;

  const meta = user.user_metadata ?? {};
  const fallbackUsername =
    (meta.username as string | undefined) ??
    `${user.email?.split("@")[0] ?? "user"}_${user.id.slice(0, 6)}`;

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      id: user.id,
      username: fallbackUsername.toLowerCase(),
      full_name: (meta.full_name as string | undefined) ?? null,
      first_name: (meta.first_name as string | undefined) ?? null,
      last_name: (meta.last_name as string | undefined) ?? null,
      contact_number: (meta.contact_number as string | undefined) ?? null,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create profile");
  }

  return created as Profile;
}
