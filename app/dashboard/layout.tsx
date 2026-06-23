import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <DashboardShell displayName={profile.full_name || profile.username} email={user.email ?? ""}>
      {children}
    </DashboardShell>
  );
}
