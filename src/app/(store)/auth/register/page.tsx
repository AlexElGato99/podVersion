"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
      },
    });
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center max-w-sm">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Check your email</h2>
          <p className="text-zinc-500 text-sm mb-6">
            We&apos;ve sent a confirmation link to <strong className="text-zinc-600">{form.email}</strong>. Click the link to activate your account.
          </p>
          <Link href="/auth/login" className="btn-primary">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute bottom-1/3 -right-32 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-brand-600" />
            <span className="text-2xl font-bold gradient-text">PrintDrop</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-zinc-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Join thousands of happy customers
          </p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              icon={<User className="h-4 w-4" />}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              icon={<Mail className="h-4 w-4" />}
              required
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPass ? "text" : "password"}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                icon={<Lock className="h-4 w-4" />}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-9 text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              label="Confirm Password"
              type={showPass ? "text" : "password"}
              placeholder="Re-enter password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              icon={<Lock className="h-4 w-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full justify-center mt-2"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-brand-600 hover:text-brand-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
