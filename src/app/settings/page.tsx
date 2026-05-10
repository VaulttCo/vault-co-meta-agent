"use client";

import { useState, useEffect } from "react";
import {
  Link2,
  Key,
  Bell,
  Shield,
  User,
  ChevronRight,
  CheckCircle2,
  Sun,
  Moon,
  Bot,
  AlertCircle,
  ShieldCheck,
  Database,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import { PageHeader } from "@/components/ui/PageHeader";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/auth/types";
import type { Permissions } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getDataProvider } from "@/lib/data/data-provider";

const integrationSections = [
  {
    id: "integrations",
    title: "Platform Integrations",
    icon: Link2,
    color: "#0081f2",
    items: [
      { label: "Meta Business Manager", description: "Not connected — connect to enable ad performance reporting", status: "disconnected" },
      { label: "Meta Marketing API", description: "Not connected — required for campaign analytics and spend data", status: "disconnected" },
      { label: "GoHighLevel (GHL)", description: "Not connected — required for appointment and pipeline sync", status: "disconnected" },
      { label: "Google Analytics 4", description: "Not connected", status: "disconnected" },
    ],
  },
  {
    id: "api",
    title: "API Keys",
    icon: Key,
    color: "#ff8400",
    items: [
      { label: "Anthropic API", description: "claude-sonnet-4-6 · Live AI generation active", status: "connected" },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    color: "#a78bfa",
    items: [
      { label: "Agent Action Alerts", description: "Notify when agent takes autonomous action", status: "enabled" },
      { label: "Performance Alerts", description: "Notify when ROAS drops below threshold", status: "enabled" },
      { label: "Weekly Report", description: "Email summary every Monday", status: "enabled" },
      { label: "Budget Alerts", description: "Notify at 80% and 100% daily budget", status: "disabled" },
    ],
  },
];

const safetyRules = [
  "AI generates drafts and recommendations ONLY — it cannot publish campaigns, activate ads, increase budgets, send reports, or push GHL workflows without explicit human approval",
  `NEVER use phrases implying guaranteed insurance coverage: "insurance will cover it", "100% covered", "guaranteed approval"`,
  `NEVER use unverifiable superlative claims: "best roofer in [city]", "cheapest in [area]"`,
  "NEVER guarantee specific ROI, conversion rates, or lead volumes",
  "NEVER include discriminatory audience targeting (race, religion, national origin)",
  "ALL SMS sequences require explicit TCPA opt-in consent captured in the lead form",
  "ALL before/after creative must reference authentic client work only",
  `NEVER imply urgency that cannot be enforced ("only 5 spots left" unless enforced)`,
  `NEVER say "cheapest" for clients positioned as premium — wrong brand positioning`,
  "NEVER guarantee storm damage claim approval or insurance payout outcomes",
];

const PERMISSION_LABELS: { key: keyof Permissions; label: string }[] = [
  { key: "canGenerateCampaigns",   label: "Generate AI campaign drafts" },
  { key: "canApproveCampaigns",    label: "Approve campaign drafts" },
  { key: "canMarkReadyForMeta",    label: "Mark campaigns Ready for Meta" },
  { key: "canApproveCreatives",    label: "Approve creative assets" },
  { key: "canEditClients",         label: "Create and edit clients" },
  { key: "canConnectIntegrations", label: "Connect Meta & GHL integrations" },
  { key: "canManageSettings",      label: "Manage portal settings" },
  { key: "canViewInternalNotes",   label: "View internal strategy notes" },
];

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, permissions, signOut, can, isDemoMode } = useAuth();
  const [providerName, setProviderName] = useState<"mock" | "supabase">("mock");
  const supabaseConfigured = isSupabaseConfigured();
  // NEXT_PUBLIC_ vars are baked in at build time — read directly
  const aiProvider = (process.env.NEXT_PUBLIC_AI_PROVIDER ?? "mock") as "mock" | "anthropic" | "openai";
  const aiLive = aiProvider === "anthropic" || aiProvider === "openai";

  useEffect(() => {
    setProviderName(getDataProvider().name);
  }, []);

  const roleColor = user ? ROLE_COLORS[user.role] : "#6b7a99";
  const roleLabel = user ? ROLE_LABELS[user.role] : "";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, integrations, and agent configuration"
      />

      {/* System Status Summary */}
      <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
          <Database size={14} className="text-[#0081f2]" />
          <span className="text-sm font-semibold text-[#f8f8f7]">System Status</span>
        </div>
        <div className="divide-y divide-[rgba(0,129,242,0.08)]">
          {[
            {
              label: "Data Provider",
              value: providerName === "supabase" ? "Supabase Live" : "Mock (local)",
              ok: providerName === "supabase",
            },
            {
              label: "AI Provider",
              value: aiLive ? `Anthropic Live (claude-haiku-4-5)` : "Mock Mode",
              ok: aiLive,
            },
            {
              label: "Storage Provider",
              value: providerName === "supabase" ? "Supabase Live" : "Mock (local)",
              ok: providerName === "supabase",
            },
            {
              label: "Auth Provider",
              value: isDemoMode ? "Demo / Internal Mode" : "Supabase Auth Live",
              ok: !isDemoMode,
              warn: isDemoMode,
            },
            {
              label: "Meta Ads",
              value: "Not Connected",
              ok: false,
            },
            {
              label: "GoHighLevel",
              value: "Not Connected",
              ok: false,
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-5 py-3"
            >
              <span className="text-[12px] text-[#6b7a99]">{row.label}</span>
              <span
                className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                  row.ok ? "text-[#22c55e]" : row.warn ? "text-[#f59e0b]" : "text-[#3d4f6e]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    row.ok ? "bg-[#22c55e]" : row.warn ? "bg-[#f59e0b]" : "bg-[#3d4f6e]"
                  }`}
                />
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current User & Role */}
      {user && (
        <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
            <User size={14} className="text-[#0081f2]" />
            <span className="text-sm font-semibold text-[#f8f8f7]">Account &amp; Role</span>
          </div>

          {/* User profile row */}
          <div className="px-5 py-4 flex items-center gap-4 border-b border-[rgba(0, 129, 242, 0.15)]">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[14px] font-bold text-[#05070B]"
              style={{ backgroundColor: roleColor }}
            >
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#f8f8f7]">{user.name}</div>
              <div className="text-xs text-[#6b7a99]">{user.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                style={{
                  color: roleColor,
                  backgroundColor: `${roleColor}15`,
                  borderColor: `${roleColor}30`,
                }}
              >
                {roleLabel}
              </span>
              <button
                onClick={signOut}
                className="px-3 py-1.5 text-xs font-medium text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#ef4444] hover:border-[#ef4444]/30 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Permissions grid */}
          {permissions && (
            <div className="px-5 py-4">
              <div className="text-[10px] font-bold text-[#3d4f6e] uppercase tracking-widest mb-3">
                Role Permissions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_LABELS.map(({ key, label }) => {
                  const allowed = permissions[key];
                  return (
                    <div key={key} className="flex items-center gap-2 text-[12px]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: allowed ? "#22c55e" : "rgba(61, 79, 110, 0.5)" }} />
                      <span className={allowed ? "text-[#6b7a99]" : "text-[#3d4f6e]"}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg">
                <ShieldCheck size={12} className="text-[#6b7a99] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#3d4f6e] leading-snug">
                  Role permissions protect client accounts from unapproved campaign launches, budget changes, and workflow pushes. Only Admins can approve final campaign launch or mark campaigns Ready for Meta.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account (legacy Vault Co block — only shown to admin) */}
      {can("canManageSettings") && (
      <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <User size={14} className="text-[#0081f2]" />
          <span className="text-sm font-semibold text-[#f8f8f7]">Agency Account</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-[#0081f2]/20 bg-[#0f1a28]">
            <Image
              src="/vaultco-logo.png"
              alt="Vault Co"
              width={48}
              height={48}
              className="object-cover scale-[1.5] translate-y-[-4px]"
            />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#f8f8f7]">Vault Co</div>
            <div className="text-xs text-[#6b7a99]">nick@anuagency.info</div>
          </div>
          <button className="px-3 py-1.5 text-xs font-medium text-[#6b7a99] border border-[rgba(0, 129, 242, 0.15)] rounded-lg hover:text-[#f8f8f7] hover:border-[rgba(0, 129, 242, 0.25)] transition-colors">
            Edit Profile
          </button>
        </div>
      </div>
      )}

      {/* Appearance */}
      <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
          {theme === "dark"
            ? <Moon size={14} className="text-[#a78bfa]" />
            : <Sun size={14} className="text-[#ff8400]" />
          }
          <span className="text-sm font-semibold text-[#f8f8f7]">Appearance</span>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-[#f8f8f7] font-medium">Theme Mode</div>
            <div className="text-xs text-[#6b7a99] mt-0.5">
              Currently:{" "}
              <span className="text-[#f8f8f7]">
                {theme === "dark" ? "Dark (Premium)" : "Light"}
              </span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border rounded-lg transition-colors"
            style={{
              color: theme === "dark" ? "#ff8400" : "#a78bfa",
              borderColor: theme === "dark" ? "rgba(201,168,76,0.2)" : "rgba(167,139,250,0.2)",
              backgroundColor: theme === "dark" ? "rgba(201,168,76,0.08)" : "rgba(167,139,250,0.08)",
            }}
          >
            {theme === "dark"
              ? <><Sun size={13} />Switch to Light</>
              : <><Moon size={13} />Switch to Dark</>
            }
          </button>
        </div>
      </div>

      {/* AI Provider */}
      <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
          <Bot size={14} className="text-[#0081f2]" />
          <span className="text-sm font-semibold text-[#f8f8f7]">Veronica AI Provider Status</span>
          {aiLive ? (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-[#22c55e] bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              Live — {aiProvider === "anthropic" ? "Anthropic" : "OpenAI"}
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-[#6b7a99] bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3d4f6e]" />
              Mock Mode Active
            </span>
          )}
        </div>
        <div className="p-5 space-y-4">
          {aiLive ? (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#22c55e]/5 border border-[#22c55e]/15 rounded-lg">
              <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#6b7a99] leading-snug">
                <span className="text-[#22c55e] font-semibold">Veronica is live.</span>{" "}
                Using{" "}
                <span className="font-mono text-[#f8f8f7]">{aiProvider === "anthropic" ? "claude-haiku-4-5" : "gpt-4o"}</span>{" "}
                for campaign generation, intelligence extraction, creative analysis, and report drafting.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#3d4f6e]/10 border border-[#3d4f6e]/20 rounded-lg">
              <AlertCircle size={13} className="text-[#6b7a99] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#6b7a99] leading-snug">
                <span className="text-[#f8f8f7] font-semibold">Veronica is running in mock mode.</span>{" "}
                Set{" "}
                <span className="font-mono text-[#f8f8f7]">NEXT_PUBLIC_AI_PROVIDER=anthropic</span> in Vercel env vars and redeploy to enable live generation.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {[
              {
                label: "AI_PROVIDER=mock",
                desc: "Deterministic templates — no API key needed",
                active: aiProvider === "mock",
              },
              {
                label: "AI_PROVIDER=anthropic",
                desc: "claude-haiku-4-5 via Anthropic API — requires ANTHROPIC_API_KEY",
                active: aiProvider === "anthropic",
              },
              {
                label: "AI_PROVIDER=openai",
                desc: "gpt-4o via OpenAI API with JSON mode — requires OPENAI_API_KEY",
                active: aiProvider === "openai",
              },
            ].map((opt) => (
              <div
                key={opt.label}
                className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
                  opt.active
                    ? "bg-[#0081f2]/5 border-[#0081f2]/20"
                    : "bg-[#0f1a28] border-[rgba(0, 129, 242, 0.15)]"
                }`}
              >
                {opt.active ? (
                  <CheckCircle2 size={12} className="text-[#0081f2] flex-shrink-0 mt-0.5" />
                ) : (
                  <span className="w-3 h-3 rounded-full border border-[#3d4f6e] flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div
                    className={`text-[12px] font-mono font-semibold ${
                      opt.active ? "text-[#0081f2]" : "text-[#6b7a99]"
                    }`}
                  >
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-[#3d4f6e] mt-0.5">{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg">
            <div className="text-[10px] font-semibold text-[#3d4f6e] uppercase tracking-wider mb-2">
              To add an API key
            </div>
            <div className="space-y-1.5">
              {[
                "Open .env.local at the project root",
                "Paste your key: ANTHROPIC_API_KEY=sk-ant-... or OPENAI_API_KEY=sk-...",
                "Set AI_PROVIDER=anthropic or AI_PROVIDER=openai",
                "Restart npm run dev — environment variables require a server restart",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-[#6b7a99]">
                  <span className="w-4 h-4 rounded bg-[rgba(0, 129, 242, 0.15)] text-[#3d4f6e] text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Provider */}
      <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
          <Database size={14} className="text-[#a78bfa]" />
          <span className="text-sm font-semibold text-[#f8f8f7]">Data Provider</span>
          {providerName === "supabase" ? (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-[#22c55e] bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              Supabase Active
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-[#6b7a99] bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3d4f6e]" />
              Mock Mode Active
            </span>
          )}
        </div>
        <div className="p-5 space-y-4">
          {/* Status rows */}
          <div className="space-y-2">
            {[
              {
                label: "Active Provider",
                value: providerName === "supabase" ? "Supabase" : "Mock (in-memory)",
                ok: providerName === "supabase",
              },
              {
                label: "NEXT_PUBLIC_SUPABASE_URL",
                value: supabaseConfigured ? "Set" : "Missing",
                ok: supabaseConfigured,
              },
              {
                label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
                value: supabaseConfigured ? "Set" : "Missing",
                ok: supabaseConfigured,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-2.5 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg"
              >
                <span className="text-[12px] font-mono text-[#6b7a99]">{row.label}</span>
                <span
                  className={`text-[11px] font-semibold ${
                    row.ok ? "text-[#22c55e]" : "text-[#f59e0b]"
                  }`}
                >
                  {row.ok ? <CheckCircle2 size={12} className="inline mr-1" /> : null}
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {providerName !== "supabase" && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-lg">
              <AlertCircle size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-[#6b7a99] leading-snug">
                <span className="text-[#f59e0b] font-semibold">Mock mode: </span>
                Data resets on page refresh. Add{" "}
                <span className="font-mono text-[#f8f8f7]">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
                <span className="font-mono text-[#f8f8f7]">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to{" "}
                <span className="font-mono text-[#a78bfa]">.env.local</span> to enable persistent storage.
              </div>
            </div>
          )}

          {providerName === "supabase" && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#22c55e]/5 border border-[#22c55e]/15 rounded-lg">
              <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#6b7a99] leading-snug">
                <span className="text-[#22c55e] font-semibold">Supabase connected. </span>
                Client profiles, intelligence, campaign drafts, creative assets, and reports persist to the database.
              </p>
            </div>
          )}

          <div className="px-4 py-3 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg">
            <div className="text-[10px] font-semibold text-[#3d4f6e] uppercase tracking-wider mb-2">
              To connect Supabase
            </div>
            <div className="space-y-1.5">
              {[
                "Create a project at supabase.com",
                "Run the SQL schema from docs/database-schema.md",
                "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
                "Restart npm run dev — the provider switches automatically",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-[#6b7a99]">
                  <span className="w-4 h-4 rounded bg-[rgba(0, 129, 242, 0.15)] text-[#3d4f6e] text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {providerName !== "supabase" && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#3d4f6e]/10 border border-[#3d4f6e]/20 rounded-lg">
              <RotateCcw size={12} className="text-[#6b7a99] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#3d4f6e] leading-snug">
                Mock data resets on each hard page refresh. Campaign drafts and intelligence are saved to{" "}
                <span className="text-[#6b7a99]">localStorage</span> and persist across soft navigations, but are cleared if the browser storage is cleared.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Production Readiness */}
      <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
          <ShieldCheck size={14} className="text-[#ff8400]" />
          <span className="text-sm font-semibold text-[#f8f8f7]">Production Readiness</span>
          <span className="ml-auto text-[11px] text-[#6b7a99]">Before giving client access</span>
        </div>
        <div className="p-5 space-y-3">
          {/* Demo auth notice — always shown */}
          <div className="flex items-start gap-3 px-4 py-3 bg-[#ff8400]/8 border border-[#ff8400]/20 rounded-lg">
            <AlertCircle size={13} className="text-[#ff8400] flex-shrink-0 mt-0.5" />
            <div className="text-[12px] text-[#6b7a99] leading-snug">
              <span className="text-[#ff8400] font-semibold">Demo auth mode active. </span>
              Replace with Supabase Auth before giving access to clients. See{" "}
              <span className="font-mono text-[#f8f8f7]">docs/vercel-deployment.md</span> for steps.
            </div>
          </div>

          {/* Mock data provider notice */}
          {providerName !== "supabase" && (
            <div className="flex items-start gap-3 px-4 py-3 bg-[#f59e0b]/8 border border-[#f59e0b]/20 rounded-lg">
              <AlertCircle size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-[#6b7a99] leading-snug">
                <span className="text-[#f59e0b] font-semibold">Mock data mode active. </span>
                Connect Supabase before relying on saved client data. Add{" "}
                <span className="font-mono text-[#f8f8f7]">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
                <span className="font-mono text-[#f8f8f7]">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>{" "}
                to your environment variables.
              </div>
            </div>
          )}

          {/* AI provider status */}
          {aiLive ? (
            <div className="flex items-start gap-3 px-4 py-3 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-lg">
              <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-[#6b7a99] leading-snug">
                <span className="text-[#22c55e] font-semibold">Veronica AI is live. </span>
                Using Anthropic claude-haiku-4-5 for campaign generation, intelligence extraction, creative analysis, and report drafting.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 px-4 py-3 bg-[#3d4f6e]/15 border border-[#3d4f6e]/30 rounded-lg">
              <AlertCircle size={13} className="text-[#6b7a99] flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-[#6b7a99] leading-snug">
                <span className="text-[#f8f8f7] font-semibold">Veronica is running in mock mode. </span>
                Set <span className="font-mono text-[#f8f8f7]">AI_PROVIDER=anthropic</span> and <span className="font-mono text-[#f8f8f7]">ANTHROPIC_API_KEY</span> in Vercel env vars to enable live generation.
              </div>
            </div>
          )}

          {/* Storage status */}
          {providerName === "supabase" ? (
            <div className="flex items-start gap-3 px-4 py-3 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-lg">
              <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-[#6b7a99] leading-snug">
                <span className="text-[#22c55e] font-semibold">Supabase Storage active. </span>
                Uploaded creative assets and client files persist to Supabase Storage.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 px-4 py-3 bg-[#3d4f6e]/15 border border-[#3d4f6e]/30 rounded-lg">
              <AlertCircle size={13} className="text-[#6b7a99] flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-[#6b7a99] leading-snug">
                <span className="text-[#f8f8f7] font-semibold">Mock storage mode active. </span>
                Uploaded files may not persist. Connect Supabase Storage before accepting client file uploads.
              </div>
            </div>
          )}

          <div className="px-4 py-3 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg">
            <div className="text-[11px] text-[#6b7a99] leading-snug">
              See{" "}
              <span className="font-mono text-[#0081f2]">docs/deployment-checklist.md</span>{" "}
              for the full pre-deployment checklist before pushing to production.
            </div>
          </div>
        </div>
      </div>

      {/* Safety Rules */}
      <div className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
          <ShieldCheck size={14} className="text-[#f59e0b]" />
          <span className="text-sm font-semibold text-[#f8f8f7]">Veronica Safety Rules</span>
          <span className="ml-auto text-[11px] text-[#6b7a99]">Enforced by system prompt</span>
        </div>
        <div className="p-5 space-y-2">
          {safetyRules.map((rule, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-2.5 bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] rounded-lg"
            >
              <span className="w-4 h-4 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[9px] font-bold text-[#f59e0b] flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-[11px] text-[#6b7a99] leading-snug">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations / API Keys / Notifications */}
      {integrationSections.map((section) => (
        <div key={section.id} className="bg-[#0D1520] border border-[rgba(0, 129, 242, 0.15)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(0, 129, 242, 0.15)]">
            <section.icon size={14} style={{ color: section.color }} />
            <span className="text-sm font-semibold text-[#f8f8f7]">{section.title}</span>
          </div>
          <div className="divide-y divide-[rgba(0, 129, 242, 0.15)]/60">
            {section.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-[#0f1a28]/50 transition-colors"
              >
                <div>
                  <div className="text-sm text-[#f8f8f7] font-medium">{item.label}</div>
                  <div className="text-xs text-[#6b7a99] mt-0.5">{item.description}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {(item.status === "connected" || item.status === "enabled") && (
                    <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e]">
                      <CheckCircle2 size={12} />
                      {item.status}
                    </span>
                  )}
                  {(item.status === "disconnected" || item.status === "disabled") && (
                    <span className="text-[11px] text-[#3d4f6e]">{item.status}</span>
                  )}
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#0f1a28] border border-[rgba(0, 129, 242, 0.15)] text-[#6b7a99] hover:text-[#f8f8f7] transition-colors">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Danger zone */}
      <div className="bg-[#0D1520] border border-[#ef4444]/15 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={14} className="text-[#ef4444]" />
          <span className="text-sm font-semibold text-[#ef4444]">Danger Zone</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#f8f8f7] font-medium">Disable Veronica</div>
            <div className="text-xs text-[#6b7a99] mt-0.5">Stop all autonomous actions immediately</div>
          </div>
          <button className="px-3 py-1.5 text-xs font-semibold text-[#ef4444] border border-[#ef4444]/25 rounded-lg hover:bg-[#ef4444]/8 transition-colors">
            Disable Veronica
          </button>
        </div>
      </div>
    </div>
  );
}
