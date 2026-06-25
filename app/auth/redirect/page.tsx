import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // If a safe relative next URL was provided, go there directly
  if (next && next.startsWith("/")) {
    redirect(next);
  }

  const adminClient = createAdminClient();
  const { data: adminRow, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user!.id)
    .single();

  if (adminError && adminError.code !== "PGRST116") {
    console.error("[auth/redirect] admin_users query failed:", adminError);
  }

  if (adminRow) {
    redirect("/admin");
  }

  redirect("/dashboard");
}
