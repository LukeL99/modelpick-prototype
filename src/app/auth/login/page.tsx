import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { SocialButtons } from "@/components/auth/social-buttons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Check if user is already authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const callbackError = params.error;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-void">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-text-primary">
              Model<span className="text-ember">Pick</span>
            </span>
          </Link>
          <h1 className="mt-6 text-xl font-semibold text-text-primary">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in to your account to continue
          </p>
        </div>

        <Card>
          <CardContent>
            {callbackError && (
              <div className="mb-4 p-3 rounded-lg bg-red-400/10 border border-red-400/20">
                <p className="text-sm text-red-400">
                  Authentication failed. Please try again.
                </p>
              </div>
            )}

            <SocialButtons />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-2 text-text-muted">or</span>
              </div>
            </div>

            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
