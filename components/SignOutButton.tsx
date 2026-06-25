"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SignOutButtonProps {
  className?: string;
}

export default function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("bandapa_remember");
    sessionStorage.removeItem("bandapa_session");
    router.push("/login");
  }

  return (
    <button onClick={handleSignOut} className={className}>
      Sign out
    </button>
  );
}
