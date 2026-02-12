import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Plus } from "lucide-react";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-border bg-surface sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold text-text-primary">
              Model<span className="text-ember">Blitz</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/benchmark/new">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4" />
                New Benchmark
              </Button>
            </Link>

            <span className="text-sm text-text-muted hidden sm:block">
              {user.email}
            </span>

            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
