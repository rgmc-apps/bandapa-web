export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import InviteClient from "./InviteClient";
import type { Band } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_band_by_invite_code", {
    p_code: code.toUpperCase(),
  });
  const band: Band | null = (Array.isArray(data) ? data[0] : data) ?? null;

  if (!band) {
    return { title: "Invalid invite — Bandapa" };
  }

  const genres = (band.genres as string[]).slice(0, 3).join(", ");
  const description = genres
    ? `${band.name} plays ${genres}. Join them on Bandapa.`
    : `You've been invited to join ${band.name} on Bandapa.`;

  return {
    title: `Join ${band.name} on Bandapa`,
    description,
    openGraph: {
      title: `Join ${band.name} on Bandapa`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Join ${band.name} on Bandapa`,
      description,
    },
  };
}

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
