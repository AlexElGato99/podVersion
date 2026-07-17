"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye, EyeOff, KeyRound, ShieldCheck, CreditCard, Package, Mail,
  BarChart3, Save, Loader2,
} from "lucide-react";

type FieldKey = "current" | "next" | "confirm";
type TabId = "security" | "payments" | "printful" | "email" | "analytics";
type IntegrationSection = Exclude<TabId, "security">;

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | { kind: "loading" };

interface FieldConfig {
  key: string;
  label: string;
  /** Real secret (API key/token) — masked on read, blank-on-save keeps existing value. */
  secret?: boolean;
  helper?: string;
  placeholder?: string;
  /** Renders as a <select> instead of a text input. */
  options?: string[];
}

const TABS: { id: TabId; label: string; icon: typeof ShieldCheck }[] = [
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "printful", label: "Printful API", icon: Package },
  { id: "email", label: "Email", icon: Mail },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const SECTION_INFO: Record<IntegrationSection, { title: string; description: string; fields: FieldConfig[] }> = {
  payments: {
    title: "Payment settings",
    description: "Credentials used to process checkout payments through PayPal.",
    fields: [
      { key: "paypal_client_id", label: "PayPal Client ID", helper: "From your PayPal Developer Dashboard app." },
      { key: "paypal_client_secret", label: "PayPal Client Secret", secret: true },
      {
        key: "paypal_environment",
        label: "Environment",
        helper: "Sandbox for testing, Live for real payments.",
        options: ["sandbox", "live"],
      },
    ],
  },
  printful: {
    title: "Printful API settings",
    description: "Connection details used to sync products, prices and fulfillment orders with Printful.",
    fields: [
      { key: "printful_api_key", label: "Printful API Key", secret: true, helper: "Bearer token from Printful → Settings → Stores → API." },
      { key: "printful_store_id", label: "Printful Store ID" },
      { key: "printful_webhook_secret", label: "Webhook Secret", secret: true, helper: "Optional — validates incoming Printful webhook requests." },
    ],
  },
  email: {
    title: "Email settings",
    description: "Sender identity and provider credentials used for order confirmations and account emails.",
    fields: [
      { key: "email_api_key", label: "Email API Key", secret: true, helper: "API key for your transactional email provider." },
      { key: "email_from_address", label: "From Email Address", placeholder: "orders@yourdomain.com" },
      { key: "email_from_name", label: "From Name", placeholder: "PrintDrop" },
      { key: "email_support_address", label: "Support / Reply-To Email", placeholder: "support@yourdomain.com" },
    ],
  },
  analytics: {
    title: "Analytics settings",
    description: "Tracking identifiers used to measure store traffic and conversions.",
    fields: [
      { key: "ga_measurement_id", label: "Google Analytics Measurement ID", placeholder: "G-XXXXXXXXXX" },
      { key: "gtm_container_id", label: "Google Tag Manager ID", placeholder: "GTM-XXXXXXX" },
      { key: "meta_pixel_id", label: "Meta (Facebook) Pixel ID" },
      { key: "meta_conversions_token", label: "Meta Conversions API Access Token", secret: true },
    ],
  },
};

const EMPTY_SECTION_MAP = { payments: {}, printful: {}, email: {}, analytics: {} } as Record<IntegrationSection, Record<string, string>>;

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
  const [activeTab, setActiveTab] = useState<TabId>("security");

  const [fieldValues, setFieldValues] = useState(EMPTY_SECTION_MAP);
  const [placeholders, setPlaceholders] = useState(EMPTY_SECTION_MAP);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [sectionStatus, setSectionStatus] = useState<Record<IntegrationSection, Status>>({
    payments: { kind: "idle" },
    printful: { kind: "idle" },
    email: { kind: "idle" },
    analytics: { kind: "idle" },
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const applySettings = useCallback((settings: Partial<Record<IntegrationSection, Record<string, string>>>) => {
    const nextValues = { payments: {}, printful: {}, email: {}, analytics: {} } as Record<IntegrationSection, Record<string, string>>;
    const nextPlaceholders = { payments: {}, printful: {}, email: {}, analytics: {} } as Record<IntegrationSection, Record<string, string>>;

    (Object.keys(SECTION_INFO) as IntegrationSection[]).forEach((section) => {
      const fetched = settings[section] ?? {};
      SECTION_INFO[section].fields.forEach((field) => {
        if (field.secret) {
          nextValues[section][field.key] = "";
          nextPlaceholders[section][field.key] = fetched[field.key] || "Not set";
        } else {
          nextValues[section][field.key] = fetched[field.key] ?? "";
          nextPlaceholders[section][field.key] = field.placeholder ?? "";
        }
      });
    });

    setFieldValues(nextValues);
    setPlaceholders(nextPlaceholders);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/app-settings");
        if (res.ok) {
          const json = await res.json();
          applySettings(json.settings ?? {});
        }
      } finally {
        setSettingsLoaded(true);
      }
    })();
  }, [applySettings]);

  const setField = (section: IntegrationSection, key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const saveSection = async (section: IntegrationSection) => {
    setSectionStatus((prev) => ({ ...prev, [section]: { kind: "loading" } }));
    try {
      const res = await fetch("/api/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data: fieldValues[section] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save settings.");

      setSectionStatus((prev) => ({ ...prev, [section]: { kind: "success", message: "Settings saved." } }));

      // Re-fetch so masked placeholders reflect what was just stored.
      const refreshRes = await fetch("/api/app-settings");
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        applySettings(refreshJson.settings ?? {});
      }
    } catch (err) {
      setSectionStatus((prev) => ({
        ...prev,
        [section]: { kind: "error", message: err instanceof Error ? err.message : "Failed to save settings." },
      }));
    }
  };

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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent-dark)] dark:text-green-400 shrink-0">
          <ShieldCheck size={18} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            General settings
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Manage account security and the API keys that power payments, fulfillment, email and analytics.
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-[var(--bg-tertiary)] rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === id
                ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "security" && (
      <form onSubmit={onSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-sm p-6 space-y-5">
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
      )}

      {activeTab !== "security" && (
        <IntegrationTab
          section={activeTab}
          fields={SECTION_INFO[activeTab].fields}
          title={SECTION_INFO[activeTab].title}
          description={SECTION_INFO[activeTab].description}
          values={fieldValues[activeTab]}
          placeholders={placeholders[activeTab]}
          status={sectionStatus[activeTab]}
          loaded={settingsLoaded}
          revealed={revealed}
          onToggleReveal={(key) =>
            setRevealed((prev) => ({ ...prev, [key]: !prev[key] }))
          }
          onChange={(key, value) => setField(activeTab, key, value)}
          onSave={() => saveSection(activeTab)}
        />
      )}
    </div>
  );
}

function IntegrationTab({
  section,
  fields,
  title,
  description,
  values,
  placeholders,
  status,
  loaded,
  revealed,
  onToggleReveal,
  onChange,
  onSave,
}: {
  section: IntegrationSection;
  fields: FieldConfig[];
  title: string;
  description: string;
  values: Record<string, string>;
  placeholders: Record<string, string>;
  status: Status;
  loaded: boolean;
  revealed: Record<string, boolean>;
  onToggleReveal: (key: string) => void;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {fields.map((field) => {
          const revealKey = `${section}.${field.key}`;
          return (
            <IntegrationField
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              placeholder={placeholders[field.key] ?? ""}
              revealed={!!revealed[revealKey]}
              onChange={(v) => onChange(field.key, v)}
              onToggleReveal={() => onToggleReveal(revealKey)}
            />
          );
        })}
      </div>

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

      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          className="btn-primary"
          onClick={onSave}
          disabled={status.kind === "loading" || !loaded}
        >
          {status.kind === "loading" ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save size={14} /> Save changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function IntegrationField({
  field,
  value,
  placeholder,
  revealed,
  onChange,
  onToggleReveal,
}: {
  field: FieldConfig;
  value: string;
  placeholder: string;
  revealed: boolean;
  onChange: (v: string) => void;
  onToggleReveal: () => void;
}) {
  const inputClasses =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10";

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{field.label}</span>

      {field.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select…</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          <input
            type={field.secret && !revealed ? "password" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            className={inputClasses}
          />
          {field.secret && (
            <button
              type="button"
              onClick={onToggleReveal}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              aria-label={revealed ? "Hide value" : "Show value"}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      )}

      {field.helper && <span className="text-[11px] text-[var(--text-muted)] block">{field.helper}</span>}
      {field.secret && (
        <span className="text-[11px] text-[var(--text-muted)] block">
          {placeholder === "Not set" ? "Not set." : `Currently set (${placeholder}). Leave blank to keep it.`}
        </span>
      )}
    </label>
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
