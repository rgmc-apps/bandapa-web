import { createClient } from "@/lib/supabase/server";
import InviteClient from "./InviteClient";
import type { Band } from "@/lib/types";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const supabase = await createClient();

  const { data } = await supabase.rpc("get_band_by_invite_code", {
    p_code: upperCode,
  });
  const band: Band | null = (Array.isArray(data) ? data[0] : data) ?? null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isMember = false;
  if (user && band) {
    const { data: row } = await supabase
      .from("band_members")
      .select("id")
      .eq("band_id", band.id)
      .eq("user_id", user.id)
      .single();
    isMember = !!row;
  }

  return (
    <InviteClient
      code={upperCode}
      band={band}
      userId={user?.id ?? null}
      isMember={isMember}
    />
  );
}
