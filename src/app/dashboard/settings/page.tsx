"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye, EyeOff, KeyRound, ShieldCheck, CreditCard, Package, Mail,
  BarChart3, Save, Loader2, Layers, Zap, CheckCircle2, XCircle,
  ShoppingBag, Circle, ExternalLink,
} from "lucide-react";

type FieldKey = "current" | "next" | "confirm";
type TabId = "security" | "payments" | "printful" | "printify" | "general" | "email" | "analytics" | "google_merchant";
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
  { id: "general",  label: "Provider", icon: Layers },
  { id: "printful", label: "Printful API", icon: Package },
  { id: "printify", label: "Printify API", icon: Package },
  { id: "email",    label: "Email", icon: Mail },
  { id: "analytics",label: "Analytics", icon: BarChart3 },
  { id: "google_merchant", label: "Google Merchant", icon: ShoppingBag },
];

const SECTION_INFO: Record<IntegrationSection, { title: string; description: string; fields: FieldConfig[] }> = {
  general: {
    title: "Print-on-Demand provider",
    description: "Choose which fulfillment service powers your store. Switching to 'Both' merges products from Printful and Printify on your shop pages.",
    fields: [
      {
        key: "pod_provider",
        label: "Active provider",
        helper: "Printful, Printify, or Both.",
        options: ["printful", "printify", "both"],
      },
    ],
  },
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
  printify: {
    title: "Printify API settings",
    description: "Connection details used to sync products and create fulfillment orders with Printify.",
    fields: [
      { key: "printify_api_key", label: "Printify API Key", secret: true, helper: "Personal access token from Printify → My Profile → Connections → API access token." },
      { key: "printify_shop_id", label: "Printify Shop ID(s)", helper: "Leave blank to use ALL shops automatically. To use specific shops, enter one ID or comma-separated IDs (e.g. 12345, 67890)." },
      { key: "printify_webhook_secret", label: "Webhook Secret", secret: true, helper: "Auto-filled by the \"Register webhooks\" button below — verifies incoming Printify shipment/tracking events." },
    ],
  },
  email: {
    title: "Email settings",
    description: "Sender identity and provider credentials used for order confirmations and account emails.",
    fields: [
      { key: "email_api_key", label: "Email API Key", secret: true, helper: "API key for your transactional email provider." },
      { key: "email_from_address", label: "From Email Address", placeholder: "orders@yourdomain.com" },
      { key: "email_from_name", label: "From Name", placeholder: "Veliova" },
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
  google_merchant: {
    title: "Google Merchant Center",
    description: "Credentials used to publish products to Google Shopping through the Content API. Products sync automatically whenever a row changes in the products table.",
    fields: [
      { key: "google_merchant_id", label: "Merchant ID", helper: "Found in the top-right of Google Merchant Center.", placeholder: "123456789" },
      { key: "google_merchant_client_email", label: "Service account email", helper: "The service account granted access under Merchant Center, Settings, Users.", placeholder: "sync@project.iam.gserviceaccount.com" },
      { key: "google_merchant_private_key", label: "Service account private key", secret: true, helper: "The private_key value from the service account JSON key file, including the BEGIN and END lines." },
      { key: "supabase_webhook_secret", label: "Webhook secret", secret: true, helper: "Shared secret that authenticates incoming Supabase webhooks. Generate with: openssl rand -hex 32" },
    ],
  },
};

const EMPTY_SECTION_MAP = { payments: {}, general: {}, printful: {}, printify: {}, email: {}, analytics: {}, google_merchant: {} } as Record<IntegrationSection, Record<string, string>>;

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
    general:  { kind: "idle" },
    printful: { kind: "idle" },
    printify: { kind: "idle" },
    email: { kind: "idle" },
    analytics: { kind: "idle" },
    google_merchant: { kind: "idle" },
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const applySettings = useCallback((settings: Partial<Record<IntegrationSection, Record<string, string>>>) => {
    const nextValues = { payments: {}, general: {}, printful: {}, printify: {}, email: {}, analytics: {}, google_merchant: {} } as Record<IntegrationSection, Record<string, string>>;
    const nextPlaceholders = { payments: {}, general: {}, printful: {}, printify: {}, email: {}, analytics: {}, google_merchant: {} } as Record<IntegrationSection, Record<string, string>>;

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

  const [webhookStatus, setWebhookStatus] = useState<Status>({ kind: "idle" });

  const registerPrintifyWebhooks = async () => {
    setWebhookStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/admin/printify-webhooks", { method: "POST" });
      const json = await res.json();
      if (!res.ok && !json.shops) throw new Error(json.error ?? "Failed to register webhooks.");

      const failed = (json.shops ?? []).filter((s: { error?: string }) => s.error);
      if (failed.length > 0) {
        setWebhookStatus({ kind: "error", message: `Registered with errors on ${failed.length} shop(s): ${failed[0].error}` });
      } else {
        setWebhookStatus({ kind: "success", message: `Webhooks registered for ${json.shops?.length ?? 0} shop(s) → ${json.webhookUrl}` });
      }

      // Re-fetch so the masked Webhook Secret field reflects what was just stored.
      const refreshRes = await fetch("/api/app-settings");
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        applySettings(refreshJson.settings ?? {});
      }
    } catch (err) {
      setWebhookStatus({ kind: "error", message: err instanceof Error ? err.message : "Failed to register webhooks." });
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
          webhookStatus={webhookStatus}
          onRegisterWebhooks={registerPrintifyWebhooks}
        />
      )}

      {activeTab === "google_merchant" && <MerchantGuide />}
    </div>
  );
}

interface MerchantStatus {
  checks: {
    merchantId: boolean;
    serviceAccountEmail: boolean;
    privateKey: boolean;
    webhookSecret: boolean;
    productsTable: boolean;
  };
  productsRowCount: number | null;
  ready: boolean;
  webhookUrl: string;
}

const CHECK_LABELS: { key: keyof MerchantStatus["checks"]; label: string; hint: string }[] = [
  { key: "merchantId", label: "Merchant ID saved", hint: "Step 1" },
  { key: "serviceAccountEmail", label: "Service account email saved", hint: "Step 2" },
  { key: "privateKey", label: "Private key saved", hint: "Step 2" },
  { key: "webhookSecret", label: "Webhook secret saved", hint: "Step 3" },
  { key: "productsTable", label: "products table exists in Supabase", hint: "Step 4" },
];

/**
 * Setup walkthrough for the Merchant Center sync. Reads a readiness endpoint so
 * the admin can see which steps are still outstanding rather than guessing.
 */
function MerchantGuide() {
  const [status, setStatus] = useState<MerchantStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/merchant-status");
      if (res.ok) setStatus(await res.json());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyUrl = () => {
    if (!status?.webhookUrl) return;
    navigator.clipboard.writeText(status.webhookUrl).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">How this integration works</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
          When a row in the Supabase <code className="font-mono">products</code> table is created, updated
          or deleted, Supabase calls this site&apos;s webhook. The webhook maps the row onto Google&apos;s
          apparel schema and pushes it to Merchant Center through the Content API, so listings stay in
          step with the catalogue without any manual feed uploads.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Setup status</span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            {loading ? "Checking..." : "Re-check"}
          </button>
        </div>

        {status ? (
          <ul className="space-y-2">
            {CHECK_LABELS.map(({ key, label, hint }) => {
              const ok = status.checks[key];
              return (
                <li key={key} className="flex items-center gap-2 text-xs">
                  {ok
                    ? <CheckCircle2 size={13} className="shrink-0 text-green-600 dark:text-green-400" />
                    : <Circle size={13} className="shrink-0 text-[var(--text-muted)]" />}
                  <span className={ok ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}>{label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{hint}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">{loading ? "Checking..." : "Status unavailable."}</p>
        )}

        {status && status.checks.productsTable && (
          <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)]">
            {status.productsRowCount} row{status.productsRowCount === 1 ? "" : "s"} in the products table.
            {status.productsRowCount === 0 && " Nothing will sync until it is populated."}
          </p>
        )}
      </div>

      <MerchantSyncPanel />

      <ol className="space-y-4">
        <GuideStep n={1} title="Create the Merchant Center account">
          Create an account at Google Merchant Center and verify your store domain. Copy the Merchant ID
          shown in the top-right corner into the field above.
        </GuideStep>

        <GuideStep n={2} title="Create a service account">
          In Google Cloud Console, enable the Content API for Shopping, create a service account, and
          download its JSON key. Paste <code className="font-mono">client_email</code> and{" "}
          <code className="font-mono">private_key</code> into the fields above. Then in Merchant Center,
          under Settings, Users, add that service account email with Standard access or higher.
        </GuideStep>

        <GuideStep n={3} title="Set a webhook secret">
          Generate one with <code className="font-mono">openssl rand -hex 32</code> and save it above.
          The webhook rejects any request that does not present it, so the endpoint stays closed until
          this is set.
        </GuideStep>

        <GuideStep n={4} title="Create the products table">
          Run <code className="font-mono">supabase-products-merchant-sync.sql</code> in the Supabase SQL
          editor. This store reads products live from Printify, so the table does not exist yet and the
          webhook has nothing to watch until it does.
        </GuideStep>

        <GuideStep n={5} title="Point Supabase at the webhook">
          <span className="block mb-2">
            In Supabase, under Database, Webhooks, create a hook on <code className="font-mono">public.products</code>{" "}
            for Insert, Update and Delete events, sending a POST request to this URL with an{" "}
            <code className="font-mono">x-webhook-secret</code> header matching the secret above.
          </span>
          <span className="flex items-center gap-2 flex-wrap">
            <code className="font-mono text-[11px] px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] break-all">
              {status?.webhookUrl ?? "/api/webhooks/supabase-products"}
            </code>
            <button
              type="button"
              onClick={copyUrl}
              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </span>
        </GuideStep>

        <GuideStep n={6} title="Populate the table">
          Rows do not appear on their own. Insert one row per size and colour variant, each sharing an{" "}
          <code className="font-mono">item_group_id</code>, since Google treats every variant as its own
          product. The SQL file includes a ready-made upsert statement.
        </GuideStep>
      </ol>

      <div className="pt-4 border-t border-[var(--border)] space-y-2">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          A successful sync means Google accepted the item, not that it is approved for serving. Review
          disapprovals under Products, Diagnostics in Merchant Center; they can take up to a few days
          to appear.
        </p>
        <a
          href="https://merchants.google.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--purple)] hover:underline"
        >
          Open Google Merchant Center
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

interface SyncProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ offerId: string; message: string }>;
}

/**
 * Pushes the whole catalogue to Merchant Center in chunks, driven from the
 * browser so each request stays inside the serverless time limit and the admin
 * sees progress rather than a request that appears to hang.
 */
function MerchantSyncPanel() {
  const [phase, setPhase] = useState<"idle" | "counting" | "syncing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const preview = async () => {
    setPhase("counting");
    setMessage("");
    setProgress(null);
    try {
      const res = await fetch("/api/admin/merchant-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Preview failed.");
      setPhase("idle");
      setMessage(
        `${json.total} variants across ${json.productCount} products are ready to send` +
          (json.skippedCount ? `. ${json.skippedCount} skipped.` : ".")
      );
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof Error ? err.message : "Preview failed.");
    }
  };

  const runSync = async () => {
    setPhase("syncing");
    setMessage("");
    const totals: SyncProgress = { total: 0, processed: 0, succeeded: 0, failed: 0, errors: [] };
    let offset = 0;

    try {
      // Keep requesting the next chunk until the server reports it is done.
      for (let guard = 0; guard < 200; guard++) {
        const res = await fetch("/api/admin/merchant-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset, chunkSize: 500 }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Sync failed.");

        totals.total = json.total;
        totals.processed += json.processed;
        totals.succeeded += json.succeeded;
        totals.failed += json.failed;
        if (json.errors?.length) totals.errors.push(...json.errors);
        setProgress({ ...totals, errors: totals.errors.slice(0, 10) });

        if (json.done) break;
        offset = json.nextOffset;
      }

      setPhase("done");
      setMessage(
        `Sent ${totals.succeeded} of ${totals.total} variants to Merchant Center` +
          (totals.failed ? `, ${totals.failed} rejected.` : ".")
      );
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof Error ? err.message : "Sync failed.");
    }
  };

  const busy = phase === "syncing" || phase === "counting";
  const pct = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Sync catalogue to Google</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
          Sends every sellable size and colour from the live Printify catalogue straight to Merchant
          Center in batches. Run this for the initial upload and again whenever products change.
        </p>
      </div>

      {progress && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full bg-green-600 dark:bg-green-500 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>{progress.processed} of {progress.total} variants</span>
            <span>{progress.succeeded} accepted{progress.failed > 0 ? `, ${progress.failed} rejected` : ""}</span>
          </div>
        </div>
      )}

      {message && (
        <div className={`text-xs font-medium px-3 py-2 rounded-lg ${
          phase === "error"
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : phase === "done"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
        }`}>
          {message}
        </div>
      )}

      {progress && progress.errors.length > 0 && (
        <ul className="text-[11px] text-[var(--text-muted)] space-y-1 max-h-32 overflow-y-auto">
          {progress.errors.map((e, i) => (
            <li key={i} className="font-mono break-all">{e.offerId}: {e.message}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={preview}
          disabled={busy}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          {phase === "counting" ? <Loader2 size={12} className="animate-spin" /> : null}
          Preview count
        </button>
        <button
          type="button"
          onClick={runSync}
          disabled={busy}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-none bg-[var(--purple)] text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {phase === "syncing" ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {phase === "syncing" ? "Syncing..." : "Sync now"}
        </button>
      </div>
    </div>
  );
}

function GuideStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-[11px] font-semibold text-[var(--text-secondary)]">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">{children}</div>
      </div>
    </li>
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
  webhookStatus,
  onRegisterWebhooks,
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
  webhookStatus?: Status;
  onRegisterWebhooks?: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; shops?: Array<{ id: number; title: string; sales_channel: string }> } | null>(null);

  const testPrintify = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/test-printify");
      const json = await res.json();
      if (!res.ok) {
        setTestResult({ ok: false, message: json.error ?? "Connection failed." });
      } else {
        setTestResult({
          ok: true,
          message: `Connected! Active shop: "${json.active_shop_name}" (ID: ${json.active_shop_id})${
            json.product_count !== null ? ` · ${json.product_count} products` : ""
          }.`,
          shops: json.all_shops,
        });
      }
    } catch (e) {
      setTestResult({ ok: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };
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

      {testResult && (
        <div className={`text-xs font-medium px-3 py-2 rounded-lg space-y-1 ${
          testResult.ok
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        }`}>
          <div className="flex items-start gap-2">
            {testResult.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : <XCircle size={13} className="mt-0.5 shrink-0" />}
            {testResult.message}
          </div>
          {testResult.ok && testResult.shops && testResult.shops.length > 1 && (
            <div className="pl-5 space-y-0.5">
              <div className="font-semibold mb-1">All shops on this account:</div>
              {testResult.shops.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="font-mono">{s.id}</span>
                  <span>—</span>
                  <span>{s.title}</span>
                  <span className="opacity-60">({s.sales_channel})</span>
                </div>
              ))}
              <div className="opacity-70 pt-1">Enter the Shop ID of the store you want to use in the field above, then save.</div>
            </div>
          )}
        </div>
      )}

      {webhookStatus && webhookStatus.kind === "error" && (
        <div className="text-xs font-medium px-3 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {webhookStatus.message}
        </div>
      )}
      {webhookStatus && webhookStatus.kind === "success" && (
        <div className="text-xs font-medium px-3 py-2 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {webhookStatus.message}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {section === "printify" && (
          <>
            <button
              type="button"
              onClick={testPrintify}
              disabled={testing}
              className="mr-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              {testing ? "Testing…" : "Test connection"}
            </button>
            <button
              type="button"
              onClick={onRegisterWebhooks}
              disabled={webhookStatus?.kind === "loading"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              title="Registers Printify webhooks so order shipment/tracking updates flow back into this dashboard."
            >
              {webhookStatus?.kind === "loading" ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              {webhookStatus?.kind === "loading" ? "Registering…" : "Register webhooks"}
            </button>
          </>
        )}
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
  // When a secret is already saved (placeholder is the masked value like "••••xxxx")
  // and the user hasn't started typing a replacement, show a fixed mask in the
  // field so it's visually obvious the key is set — not an empty box.
  const isSaved = field.secret && placeholder !== "Not set" && placeholder !== "";
  const [editing, setEditing] = useState(false);

  // Reset editing state whenever placeholder changes (e.g. after a save + refresh)
  useEffect(() => { setEditing(false); }, [placeholder]);

  const inputClasses =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500 pr-20";

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
          {/* Saved-state display: show a masked input + "Change" button */}
          {isSaved && !editing ? (
            <>
              <input
                type="text"
                readOnly
                value="••••••••••••••••"
                className={inputClasses + " text-[var(--text-muted)] cursor-default select-none"}
              />
              <button
                type="button"
                onClick={() => { setEditing(true); onChange(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 h-7 text-xs font-semibold rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Change
              </button>
            </>
          ) : (
            <>
              <input
                type={field.secret && !revealed ? "password" : "text"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={isSaved && editing ? "Enter new value to replace…" : placeholder}
                autoComplete="off"
                spellCheck={false}
                autoFocus={editing}
                className={inputClasses}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSaved && editing && (
                  <button
                    type="button"
                    onClick={() => { setEditing(false); onChange(""); }}
                    className="px-2 h-7 text-xs font-semibold rounded-md bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Cancel — keep existing key"
                  >
                    Cancel
                  </button>
                )}
                {field.secret && (
                  <button
                    type="button"
                    onClick={onToggleReveal}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    aria-label={revealed ? "Hide value" : "Show value"}
                  >
                    {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {field.helper && <span className="text-[11px] text-[var(--text-muted)] block">{field.helper}</span>}
      {field.secret && (
        <span className="text-[11px] text-[var(--text-muted)] block">
          {isSaved
            ? (editing ? "Type a new value to replace the saved key, or click Cancel to keep it." : `Saved — ends in ${placeholder.replace(/•/g, "")}. Click Change to replace it.`)
            : "No key saved yet."}
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
