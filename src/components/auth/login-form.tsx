"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type AuthMode = "password" | "magic-link";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ember/10 text-ember">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary">
          Check your email
        </h3>
        <p className="text-sm text-text-secondary">
          We sent a sign-in link to{" "}
          <span className="font-medium text-text-primary">{email}</span>
        </p>
        <button
          onClick={() => {
            setMagicLinkSent(false);
            setMode("password");
          }}
          className="text-sm text-ember hover:text-ember-hover transition-colors"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-text-secondary"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full px-3 py-2.5 rounded-lg bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ember/50 focus:border-ember transition-colors"
        />
      </div>

      {mode === "password" && (
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text-secondary"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="w-full px-3 py-2.5 rounded-lg bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ember/50 focus:border-ember transition-colors"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        className="w-full"
      >
        {mode === "password" ? "Sign In" : "Send Magic Link"}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "password" ? "magic-link" : "password");
            setError(null);
          }}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          {mode === "password"
            ? "Use magic link instead"
            : "Use password instead"}
        </button>
      </div>

      <p className="text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/signup"
          className="text-ember hover:text-ember-hover transition-colors font-medium"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
