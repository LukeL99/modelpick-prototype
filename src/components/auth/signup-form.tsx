"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const validate = (): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setConfirmationSent(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (confirmationSent) {
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
          We sent a confirmation link to{" "}
          <span className="font-medium text-text-primary">{email}</span>
        </p>
        <p className="text-sm text-text-muted">
          Click the link in your email to confirm your account and sign in.
        </p>
        <Link
          href="/auth/login"
          className="inline-block text-sm text-ember hover:text-ember-hover transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="signup-email"
          className="block text-sm font-medium text-text-secondary"
        >
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full px-3 py-2.5 rounded-lg bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ember/50 focus:border-ember transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="signup-password"
          className="block text-sm font-medium text-text-secondary"
        >
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Min. 8 characters"
          className="w-full px-3 py-2.5 rounded-lg bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ember/50 focus:border-ember transition-colors"
        />
        {password.length > 0 && password.length < 8 && (
          <p className="text-xs text-red-400">
            Password must be at least 8 characters
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="signup-confirm"
          className="block text-sm font-medium text-text-secondary"
        >
          Confirm password
        </label>
        <input
          id="signup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Confirm your password"
          className="w-full px-3 py-2.5 rounded-lg bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ember/50 focus:border-ember transition-colors"
        />
        {confirmPassword.length > 0 && password !== confirmPassword && (
          <p className="text-xs text-red-400">Passwords do not match</p>
        )}
      </div>

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
        Create Account
      </Button>

      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-ember hover:text-ember-hover transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
