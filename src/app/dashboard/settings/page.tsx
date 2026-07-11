"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

type FieldKey = "current" | "next" | "confirm";

const RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Contains a number", test: (v: string) => /\d/.test(v) },
  {
    label: "Contains an uppercase letter",
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    label: "Contains a symbol",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
];

export default function SettingsPage() {
  const [values, setValues] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [visible, setVisible] = useState<Record<FieldKey, boolean>>({
    current: false,
    next: false,
    confirm: false,
  });
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "error"; message: string }
    | { kind: "success"; message: string }
    | { kind: "loading" }
  >({ kind: "idle" });

  const passedRules = RULES.map((r) => r.test(values.next));
  const allPassed = passedRules.every(Boolean);
  const matches = values.next.length > 0 && values.next === values.confirm;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.current) {
      setStatus({ kind: "error", message: "Enter your current password." });
      return;
    }
    if (!allPassed) {
      setStatus({
        kind: "error",
        message: "New password does not meet all requirements.",
      });
      return;
    }
    if (!matches) {
      setStatus({
        kind: "error",
        message: "New password and confirmation do not match.",
      });
      return;
    }

    setStatus({ kind: "loading" });
    await new Promise((r) => setTimeout(r, 600));
    setStatus({
      kind: "success",
      message: "Password updated successfully.",
    });
    setValues({ current: "", next: "", confirm: "" });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent-dark)] dark:text-green-400 shrink-0">
          <ShieldCheck size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Account security
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Update your admin password. Use a strong, unique password you do not
            reuse elsewhere.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <KeyRound size={16} className="text-[var(--text-muted)]" />
          Change password
        </div>

        <PasswordField
          label="Current password"
          value={values.current}
          onChange={(v) => setValues({ ...values, current: v })}
          visible={visible.current}
          onToggle={() =>
            setVisible({ ...visible, current: !visible.current })
          }
          autoComplete="current-password"
        />

        <PasswordField
          label="New password"
          value={values.next}
          onChange={(v) => setValues({ ...values, next: v })}
          visible={visible.next}
          onToggle={() => setVisible({ ...visible, next: !visible.next })}
          autoComplete="new-password"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {RULES.map((rule, i) => (
            <RuleRow key={rule.label} label={rule.label} passed={passedRules[i]} />
          ))}
        </div>

        <PasswordField
          label="Confirm new password"
          value={values.confirm}
          onChange={(v) => setValues({ ...values, confirm: v })}
          visible={visible.confirm}
          onToggle={() =>
            setVisible({ ...visible, confirm: !visible.confirm })
          }
          autoComplete="new-password"
          hint={
            values.confirm.length > 0
              ? matches
                ? "Passwords match"
                : "Passwords do not match"
              : undefined
          }
          hintTone={
            values.confirm.length > 0
              ? matches
                ? "ok"
                : "error"
              : "muted"
          }
        />

        {status.kind === "error" && (
          <div className="text-xs font-medium px-3 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {status.message}
          </div>
        )}
        {status.kind === "success" && (
          <div className="text-xs font-medium px-3 py-2 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {status.message}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setValues({ current: "", next: "", confirm: "" });
              setStatus({ kind: "idle" });
            }}
            disabled={status.kind === "loading"}
          >
            Reset
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={status.kind === "loading"}
          >
            {status.kind === "loading" ? "Saving..." : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  hint,
  hintTone = "muted",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete?: string;
  hint?: string;
  hintTone?: "ok" | "error" | "muted";
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="input-base pr-10"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {hint && (
        <span
          className={
            hintTone === "ok"
              ? "text-[11px] text-green-600 dark:text-green-400"
              : hintTone === "error"
              ? "text-[11px] text-red-600 dark:text-red-400"
              : "text-[11px] text-[var(--text-muted)]"
          }
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function RuleRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span
        className={
          passed
            ? "w-3.5 h-3.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center text-[10px] font-bold"
            : "w-3.5 h-3.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] flex items-center justify-center text-[10px] font-bold border border-[var(--border)]"
        }
        aria-hidden
      >
        {passed ? "✓" : ""}
      </span>
      <span
        className={
          passed
            ? "text-[var(--text-secondary)]"
            : "text-[var(--text-muted)]"
        }
      >
        {label}
      </span>
    </div>
  );
}
