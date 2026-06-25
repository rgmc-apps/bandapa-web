import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  // Verify the caller is an authenticated admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: adminRow } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .single();
  if (!adminRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Use admin client to bypass RLS on both tables
  const [{ data: users }, { data: memberships }] = await Promise.all([
    adminClient
      .from("users")
      .select("id, username, full_name, display_picture, created_at")
      .order("created_at", { ascending: false }),
    adminClient.from("band_members").select("user_id"),
  ]);

  const bandCountMap: Record<string, number> = {};
  for (const m of memberships ?? []) {
    bandCountMap[m.user_id] = (bandCountMap[m.user_id] ?? 0) + 1;
  }

  const artists = (users ?? []).map((u) => ({
    ...u,
    band_count: bandCountMap[u.id] ?? 0,
  }));

  return NextResponse.json({ artists });
}
