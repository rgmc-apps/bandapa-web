import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export default async function AuthRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  const { data: adminRow, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user!.id)
    .single();

  if (adminError && adminError.code !== "PGRST116") {
    // PGRST116 = no rows found (expected for non-admins)
    // Anything else = bad service role key, network failure, wrong schema, etc.
    console.error("[auth/redirect] admin_users query failed:", adminError);
  }

  if (adminRow) {
    redirect("/admin");
  }

  redirect("/home");
}
