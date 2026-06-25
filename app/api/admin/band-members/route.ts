import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .single();
  return data ? adminClient : null;
}

// GET /api/admin/band-members?band_id=xxx
export async function GET(request: NextRequest) {
  const adminClient = await verifyAdmin();
  if (!adminClient) return Response.json({ error: "Forbidden" }, { status: 403 });

  const bandId = request.nextUrl.searchParams.get("band_id");
  if (!bandId) return Response.json({ error: "Missing band_id" }, { status: 400 });

  const { data, error } = await adminClient
    .from("band_members")
    .select("*, user:users(*)")
    .eq("band_id", bandId)
    .order("joined_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ members: data ?? [] });
}

// PATCH /api/admin/band-members — toggle admin
export async function PATCH(request: NextRequest) {
  const adminClient = await verifyAdmin();
  if (!adminClient) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { member_id, is_admin } = await request.json();
  const { error } = await adminClient
    .from("band_members")
    .update({ is_admin })
    .eq("id", member_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE /api/admin/band-members?member_id=xxx
export async function DELETE(request: NextRequest) {
  const adminClient = await verifyAdmin();
  if (!adminClient) return Response.json({ error: "Forbidden" }, { status: 403 });

  const memberId = request.nextUrl.searchParams.get("member_id");
  if (!memberId) return Response.json({ error: "Missing member_id" }, { status: 400 });

  const { error } = await adminClient
    .from("band_members")
    .delete()
    .eq("id", memberId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
