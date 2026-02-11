"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Sign Out</span>
    </Button>
  );
}
