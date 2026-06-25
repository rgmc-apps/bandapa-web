import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/profile";
import DashboardShell from "@/components/DashboardShell";

export const metadata = {
  title: "Bandapa | Dashboard",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOrCreateProfile(supabase, user);

  const adminClient = createAdminClient();
  const { data: adminRow } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .single();
  const isAdmin = !!adminRow;

  return (
    <DashboardShell displayName={profile.full_name || profile.username} email={user.email ?? ""} isAdmin={isAdmin}>
      {children}
    </DashboardShell>
  );
}
