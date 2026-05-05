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
    color: "#18b8f0",
    items: [
      { label: "Meta Business Manager", description: "Ad account connected · Account #110482930", status: "connected" },
      { label: "Meta Marketing API", description: "v20.0 · All 4 client ad accounts linked", status: "connected" },
      { label: "GoHighLevel (GHL)", description: "4 location IDs connected · Webhooks active", status: "connected" },
      { label: "Google Analytics 4", description: "Not connected", status: "disconnected" },
    ],
  },
  {
    id: "api",
    title: "API Keys",
    icon: Key,
    color: "#f07820",
    items: [
      { label: "Anthropic API", description: "claude-sonnet-4-6 · Last used: 2 min ago", status: "connected" },
      { label: "Meta Marketing API", description: "v20.0 · Token expires in 47 days", status: "connected" },
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
  const { user, permissions, signOut, can } = useAuth();
  const [providerName, setProviderName] = useState<"mock" | "supabase">("mock");
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    setProviderName(getDataProvider().name);
  }, []);

  const roleColor = user ? ROLE_COLORS[user.role] : "#5a6278";
  const roleLabel = user ? ROLE_LABELS[user.role] : "";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, integrations, and agent configuration"
      />

      {/* Current User & Role */}
      {user && (
        <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1c2438]">
            <User size={14} className="text-[#18b8f0]" />
            <span className="text-sm font-semibold text-[#eef1f8]">Account &amp; Role</span>
          </div>

          {/* User profile row */}
          <div className="px-5 py-4 flex items-center gap-4 border-b border-[#1c2438]">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[14px] font-bold text-[#0d0e12]"
              style={{ backgroundColor: roleColor }}
            >
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#eef1f8]">{user.name}</div>
              <div className="text-xs text-[#5a6278]">{user.email}</div>
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
                className="px-3 py-1.5 text-xs font-medium text-[#5a6278] border border-[#1c2438] rounded-lg hover:text-[#ef4444] hover:border-[#ef4444]/30 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Permissions grid */}
          {permissions && (
            <div className="px-5 py-4">
              <div className="text-[10px] font-bold text-[#3d4460] uppercase tracking-widest mb-3">
                Role Permissions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_LABELS.map(({ key, label }) => {
                  const allowed = permissions[key];
                  return (
                    <div key={key} className="flex items-center gap-2 text-[12px]">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${allowed ? "bg-[#22c55e]" : "bg-[#2a2e42]"}`} />
                      <span className={allowed ? "text-[#5a6278]" : "text-[#3d4460]"}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-[#131720] border border-[#1c2438] rounded-lg">
                <ShieldCheck size={12} className="text-[#5a6278] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#3d4460] leading-snug">
                  Role permissions protect client accounts from unapproved campaign launches, budget changes, and workflow pushes. Only Admins can approve final campaign launch or mark campaigns Ready for Meta.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account (legacy Vault Co block — only shown to admin) */}
      {can("canManageSettings") && (
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <User size={14} className="text-[#18b8f0]" />
          <span className="text-sm font-semibold text-[#eef1f8]">Agency Account</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-[#18b8f0]/20 bg-[#131720]">
            <Image
              src="/vaultco-logo.png"
              alt="Vault Co"
              width={48}
              height={48}
              className="object-cover scale-[1.5] translate-y-[-4px]"
            />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#eef1f8]">Vault Co</div>
            <div className="text-xs text-[#5a6278]">nick@anuagency.info</div>
          </div>
          <button className="px-3 py-1.5 text-xs font-medium text-[#5a6278] border border-[#1c2438] rounded-lg hover:text-[#eef1f8] hover:border-[#263050] transition-colors">
            Edit Profile
          </button>
        </div>
      </div>
      )}

      {/* Appearance */}
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1c2438]">
          {theme === "dark"
            ? <Moon size={14} className="text-[#a78bfa]" />
            : <Sun size={14} className="text-[#c9a84c]" />
          }
          <span className="text-sm font-semibold text-[#eef1f8]">Appearance</span>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-[#eef1f8] font-medium">Theme Mode</div>
            <div className="text-xs text-[#5a6278] mt-0.5">
              Currently:{" "}
              <span className="text-[#eef1f8]">
                {theme === "dark" ? "Dark (Premium)" : "Light"}
              </span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border rounded-lg transition-colors"
            style={{
              color: theme === "dark" ? "#c9a84c" : "#a78bfa",
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
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1c2438]">
          <Bot size={14} className="text-[#18b8f0]" />
          <span className="text-sm font-semibold text-[#eef1f8]">Veronica AI Provider Status</span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-[#5a6278] bg-[#131720] border border-[#1c2438] rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3d4460]" />
            Mock Mode Active
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2.5 px-4 py-3 bg-[#3d4460]/10 border border-[#3d4460]/20 rounded-lg">
            <AlertCircle size={13} className="text-[#5a6278] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#5a6278] leading-snug">
              <span className="text-[#eef1f8] font-semibold">Veronica is running in mock mode.</span>{" "}
              Set{" "}
              <span className="font-mono text-[#eef1f8]">AI_PROVIDER=anthropic</span> or{" "}
              <span className="font-mono text-[#eef1f8]">AI_PROVIDER=openai</span> in{" "}
              <span className="font-mono text-[#18b8f0]">.env.local</span> and restart to enable
              live generation.
            </p>
          </div>

          <div className="space-y-2">
            {[
              {
                label: "AI_PROVIDER=mock",
                desc: "Deterministic templates — no API key needed",
                active: true,
              },
              {
                label: "AI_PROVIDER=anthropic",
                desc: "claude-sonnet-4-6 via Anthropic API — requires ANTHROPIC_API_KEY",
                active: false,
              },
              {
                label: "AI_PROVIDER=openai",
                desc: "gpt-4o via OpenAI API with JSON mode — requires OPENAI_API_KEY",
                active: false,
              },
            ].map((opt) => (
              <div
                key={opt.label}
                className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
                  opt.active
                    ? "bg-[#18b8f0]/5 border-[#18b8f0]/20"
                    : "bg-[#131720] border-[#1c2438]"
                }`}
              >
                {opt.active ? (
                  <CheckCircle2 size={12} className="text-[#18b8f0] flex-shrink-0 mt-0.5" />
                ) : (
                  <span className="w-3 h-3 rounded-full border border-[#3d4460] flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div
                    className={`text-[12px] font-mono font-semibold ${
                      opt.active ? "text-[#18b8f0]" : "text-[#5a6278]"
                    }`}
                  >
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-[#3d4460] mt-0.5">{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 bg-[#131720] border border-[#1c2438] rounded-lg">
            <div className="text-[10px] font-semibold text-[#3d4460] uppercase tracking-wider mb-2">
              To add an API key
            </div>
            <div className="space-y-1.5">
              {[
                "Open .env.local at the project root",
                "Paste your key: ANTHROPIC_API_KEY=sk-ant-... or OPENAI_API_KEY=sk-...",
                "Set AI_PROVIDER=anthropic or AI_PROVIDER=openai",
                "Restart npm run dev — environment variables require a server restart",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-[#5a6278]">
                  <span className="w-4 h-4 rounded bg-[#1c2438] text-[#3d4460] text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
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
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1c2438]">
          <Database size={14} className="text-[#a78bfa]" />
          <span className="text-sm font-semibold text-[#eef1f8]">Data Provider</span>
          <span
            className={`ml-auto flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 border text-[#5a6278] bg-[#131720] border-[#1c2438]`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#3d4460]" />
            Mock Mode Active
          </span>
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
                className="flex items-center justify-between px-4 py-2.5 bg-[#131720] border border-[#1c2438] rounded-lg"
              >
                <span className="text-[12px] font-mono text-[#5a6278]">{row.label}</span>
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
              <div className="text-[12px] text-[#5a6278] leading-snug">
                <span className="text-[#f59e0b] font-semibold">Mock mode: </span>
                Data resets on page refresh. Add{" "}
                <span className="font-mono text-[#eef1f8]">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
                <span className="font-mono text-[#eef1f8]">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to{" "}
                <span className="font-mono text-[#a78bfa]">.env.local</span> to enable persistent storage.
              </div>
            </div>
          )}

          {providerName === "supabase" && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#22c55e]/5 border border-[#22c55e]/15 rounded-lg">
              <CheckCircle2 size={13} className="text-[#22c55e] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#5a6278] leading-snug">
                <span className="text-[#22c55e] font-semibold">Supabase connected. </span>
                Client profiles, intelligence, campaign drafts, creative assets, and reports persist to the database.
              </p>
            </div>
          )}

          <div className="px-4 py-3 bg-[#131720] border border-[#1c2438] rounded-lg">
            <div className="text-[10px] font-semibold text-[#3d4460] uppercase tracking-wider mb-2">
              To connect Supabase
            </div>
            <div className="space-y-1.5">
              {[
                "Create a project at supabase.com",
                "Run the SQL schema from docs/database-schema.md",
                "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
                "Restart npm run dev — the provider switches automatically",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-[#5a6278]">
                  <span className="w-4 h-4 rounded bg-[#1c2438] text-[#3d4460] text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {providerName !== "supabase" && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#3d4460]/10 border border-[#3d4460]/20 rounded-lg">
              <RotateCcw size={12} className="text-[#5a6278] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#3d4460] leading-snug">
                Mock data resets on each hard page refresh. Campaign drafts and intelligence are saved to{" "}
                <span className="text-[#5a6278]">localStorage</span> and persist across soft navigations, but are cleared if the browser storage is cleared.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Production Readiness */}
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1c2438]">
          <ShieldCheck size={14} className="text-[#f07820]" />
          <span className="text-sm font-semibold text-[#eef1f8]">Production Readiness</span>
          <span className="ml-auto text-[11px] text-[#5a6278]">Before giving client access</span>
        </div>
        <div className="p-5 space-y-3">
          {/* Demo auth notice — always shown */}
          <div className="flex items-start gap-3 px-4 py-3 bg-[#f07820]/8 border border-[#f07820]/20 rounded-lg">
            <AlertCircle size={13} className="text-[#f07820] flex-shrink-0 mt-0.5" />
            <div className="text-[12px] text-[#5a6278] leading-snug">
              <span className="text-[#f07820] font-semibold">Demo auth mode active. </span>
              Replace with Supabase Auth before giving access to clients. See{" "}
              <span className="font-mono text-[#eef1f8]">docs/vercel-deployment.md</span> for steps.
            </div>
          </div>

          {/* Mock data provider notice */}
          {providerName !== "supabase" && (
            <div className="flex items-start gap-3 px-4 py-3 bg-[#f59e0b]/8 border border-[#f59e0b]/20 rounded-lg">
              <AlertCircle size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-[#5a6278] leading-snug">
                <span className="text-[#f59e0b] font-semibold">Mock data mode active. </span>
                Connect Supabase before relying on saved client data. Add{" "}
                <span className="font-mono text-[#eef1f8]">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
                <span className="font-mono text-[#eef1f8]">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>{" "}
                to your environment variables.
              </div>
            </div>
          )}

          {/* Mock AI notice */}
          <div className="flex items-start gap-3 px-4 py-3 bg-[#3d4460]/15 border border-[#3d4460]/30 rounded-lg">
            <AlertCircle size={13} className="text-[#5a6278] flex-shrink-0 mt-0.5" />
            <div className="text-[12px] text-[#5a6278] leading-snug">
              <span className="text-[#eef1f8] font-semibold">Veronica is running in mock mode. </span>
              Add AI keys to enable live generation. Set{" "}
              <span className="font-mono text-[#eef1f8]">AI_PROVIDER=anthropic</span> and{" "}
              <span className="font-mono text-[#eef1f8]">ANTHROPIC_API_KEY</span> in{" "}
              <span className="font-mono text-[#18b8f0]">.env.local</span>.
            </div>
          </div>

          {/* Mock storage notice */}
          <div className="flex items-start gap-3 px-4 py-3 bg-[#3d4460]/15 border border-[#3d4460]/30 rounded-lg">
            <AlertCircle size={13} className="text-[#5a6278] flex-shrink-0 mt-0.5" />
            <div className="text-[12px] text-[#5a6278] leading-snug">
              <span className="text-[#eef1f8] font-semibold">Mock storage mode active. </span>
              Uploaded files may not persist. Connect Supabase Storage (see{" "}
              <span className="font-mono text-[#eef1f8]">docs/storage-setup.md</span>) before
              accepting client file uploads.
            </div>
          </div>

          <div className="px-4 py-3 bg-[#131720] border border-[#1c2438] rounded-lg">
            <div className="text-[11px] text-[#5a6278] leading-snug">
              See{" "}
              <span className="font-mono text-[#18b8f0]">docs/deployment-checklist.md</span>{" "}
              for the full pre-deployment checklist before pushing to production.
            </div>
          </div>
        </div>
      </div>

      {/* Safety Rules */}
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1c2438]">
          <ShieldCheck size={14} className="text-[#f59e0b]" />
          <span className="text-sm font-semibold text-[#eef1f8]">Veronica Safety Rules</span>
          <span className="ml-auto text-[11px] text-[#5a6278]">Enforced by system prompt</span>
        </div>
        <div className="p-5 space-y-2">
          {safetyRules.map((rule, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-2.5 bg-[#131720] border border-[#1c2438] rounded-lg"
            >
              <span className="w-4 h-4 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[9px] font-bold text-[#f59e0b] flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-[11px] text-[#5a6278] leading-snug">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations / API Keys / Notifications */}
      {integrationSections.map((section) => (
        <div key={section.id} className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1c2438]">
            <section.icon size={14} style={{ color: section.color }} />
            <span className="text-sm font-semibold text-[#eef1f8]">{section.title}</span>
          </div>
          <div className="divide-y divide-[#1c2438]/60">
            {section.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-[#131720]/50 transition-colors"
              >
                <div>
                  <div className="text-sm text-[#eef1f8] font-medium">{item.label}</div>
                  <div className="text-xs text-[#5a6278] mt-0.5">{item.description}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {(item.status === "connected" || item.status === "enabled") && (
                    <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e]">
                      <CheckCircle2 size={12} />
                      {item.status}
                    </span>
                  )}
                  {(item.status === "disconnected" || item.status === "disabled") && (
                    <span className="text-[11px] text-[#3d4460]">{item.status}</span>
                  )}
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#131720] border border-[#1c2438] text-[#5a6278] hover:text-[#eef1f8] transition-colors">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Danger zone */}
      <div className="bg-[#0c0f15] border border-[#ef4444]/15 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={14} className="text-[#ef4444]" />
          <span className="text-sm font-semibold text-[#ef4444]">Danger Zone</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#eef1f8] font-medium">Disable Veronica</div>
            <div className="text-xs text-[#5a6278] mt-0.5">Stop all autonomous actions immediately</div>
          </div>
          <button className="px-3 py-1.5 text-xs font-semibold text-[#ef4444] border border-[#ef4444]/25 rounded-lg hover:bg-[#ef4444]/8 transition-colors">
            Disable Veronica
          </button>
        </div>
      </div>
    </div>
  );
}
