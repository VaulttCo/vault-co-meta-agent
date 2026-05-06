"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
  Megaphone,
  BarChart3,
  FileText,
  CheckSquare,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { MOCK_USERS } from "@/lib/auth/mock-users";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/auth/types";
import { useRouter } from "next/navigation";

const roleDescriptions: Record<string, string> = {
  admin: "Full access — generate, approve, launch, manage integrations",
  media_buyer: "Generate drafts, submit for approval, view analytics and reports",
  setter: "View clients and GHL workflow notes",
};

// ── Supabase login form ───────────────────────────────────────────────────────
function SupabaseLoginForm() {
  const { signInWithPassword, signInWithMagicLink } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);
    const { error: err } = await signInWithPassword(email, password);
    if (err) {
      setError(err);
      setIsLoading(false);
    } else {
      router.replace("/");
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError(null);
    const { error: err } = await signInWithMagicLink(email);
    setIsLoading(false);
    if (err) {
      setError(err);
    } else {
      setMagicSent(true);
    }
  }

  if (magicSent) {
    return (
      <div className="w-full">
        <div
          className="flex flex-col items-center gap-4 px-6 py-8 rounded-2xl text-center"
          style={{
            backgroundColor: "#0D1520",
            border: "1px solid rgba(34, 197, 94, 0.20)",
          }}
        >
          <CheckCircle2 size={32} style={{ color: "#22c55e" }} />
          <div>
            <p className="text-[15px] font-semibold" style={{ color: "#f8f8f7" }}>
              Magic link sent
            </p>
            <p className="text-[12px] mt-1.5" style={{ color: "#6b7a99" }}>
              Check your inbox at{" "}
              <span style={{ color: "#0081f2" }}>{email}</span>.
              Click the link to sign in — it expires in 1 hour.
            </p>
          </div>
          <button
            onClick={() => { setMagicSent(false); setEmail(""); }}
            className="text-[12px] underline"
            style={{ color: "#3d4f6e" }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Mode toggle */}
      <div
        className="flex rounded-xl overflow-hidden"
        style={{ border: "1px solid rgba(0, 129, 242, 0.15)" }}
      >
        <button
          onClick={() => { setMode("password"); setError(null); }}
          className="flex-1 py-2.5 text-[12px] font-semibold transition-colors"
          style={{
            backgroundColor: mode === "password" ? "rgba(0, 129, 242, 0.12)" : "transparent",
            color: mode === "password" ? "#0081f2" : "#6b7a99",
          }}
        >
          Password
        </button>
        <button
          onClick={() => { setMode("magic"); setError(null); }}
          className="flex-1 py-2.5 text-[12px] font-semibold transition-colors"
          style={{
            backgroundColor: mode === "magic" ? "rgba(0, 129, 242, 0.12)" : "transparent",
            color: mode === "magic" ? "#0081f2" : "#6b7a99",
          }}
        >
          Magic Link
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}
        className="space-y-3"
      >
        {/* Email */}
        <div className="relative">
          <Mail
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#3d4f6e" }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@vaultco.com"
            required
            autoComplete="email"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] focus:outline-none transition-colors"
            style={{
              backgroundColor: "#0D1520",
              border: "1px solid rgba(0, 129, 242, 0.15)",
              color: "#f8f8f7",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0, 129, 242, 0.40)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0, 129, 242, 0.15)"; }}
          />
        </div>

        {/* Password (password mode only) */}
        {mode === "password" && (
          <div className="relative">
            <Lock
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "#3d4f6e" }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] focus:outline-none transition-colors"
              style={{
                backgroundColor: "#0D1520",
                border: "1px solid rgba(0, 129, 242, 0.15)",
                color: "#f8f8f7",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0, 129, 242, 0.40)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0, 129, 242, 0.15)"; }}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.20)",
            }}
          >
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
            <p className="text-[12px]" style={{ color: "#ef4444" }}>{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !email || (mode === "password" && !password)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "#0081f2",
            color: "#fff",
          }}
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              {mode === "password" ? "Sign In" : "Send Magic Link"}
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      {/* Magic link hint */}
      {mode === "magic" && (
        <p className="text-[11px] text-center" style={{ color: "#3d4f6e" }}>
          A one-time sign-in link will be sent to your email. No password needed.
        </p>
      )}
    </div>
  );
}

// ── Demo role-picker (local dev only) ─────────────────────────────────────────
function DemoRolePicker() {
  const { signInAs } = useAuth();

  return (
    <div className="w-full space-y-3">
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-1 px-1"
        style={{ color: "#3d4f6e" }}
      >
        Select a user to sign in
      </div>

      {MOCK_USERS.map((user) => (
        <button
          key={user.id}
          onClick={() => signInAs(user.id)}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all text-left group"
          style={{
            backgroundColor: "#0D1520",
            border: "1px solid rgba(0, 129, 242, 0.15)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(0, 129, 242, 0.30)";
            (e.currentTarget as HTMLElement).style.backgroundColor = "#0f1a28";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(0, 129, 242, 0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(0, 129, 242, 0.15)";
            (e.currentTarget as HTMLElement).style.backgroundColor = "#0D1520";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
            style={{ backgroundColor: user.color, color: "#05070B" }}
          >
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-semibold" style={{ color: "#f8f8f7" }}>
                {user.name}
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                style={{
                  color: ROLE_COLORS[user.role],
                  backgroundColor: `${ROLE_COLORS[user.role]}18`,
                  borderColor: `${ROLE_COLORS[user.role]}30`,
                }}
              >
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <div className="text-[11px] truncate" style={{ color: "#6b7a99" }}>
              {roleDescriptions[user.role] ?? ""}
            </div>
          </div>
          <span
            className="text-[16px] transition-colors flex-shrink-0 group-hover:text-[#0081f2]"
            style={{ color: "#3d4f6e" }}
          >
            →
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Veronica brand panel (right side on desktop) ──────────────────────────────
function VeronicaPanel() {
  const features = [
    { icon: Brain,       label: "Client Intelligence",               desc: "AI-extracted client profiles, brand tone, and offer positioning." },
    { icon: Megaphone,   label: "Campaign Drafts",                   desc: "Anthropic-powered Meta ad copy, creative direction, and lead forms." },
    { icon: RefreshCw,   label: "Meta + GHL Read-Only Sync",         desc: "Live performance data pulled from Meta Ads and GoHighLevel." },
    { icon: BarChart3,   label: "Reports + Performance Intelligence", desc: "Weekly Veronica-prepared client reports with actionable insights." },
    { icon: CheckSquare, label: "Human Approval Gates Active",       desc: "All drafts require human review before anything reaches Meta." },
    { icon: FileText,    label: "Approval-Ready Growth Plans",       desc: "Structured recommendations reviewed and approved by your team." },
  ];

  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full px-10 py-12 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #060d1a 0%, #091525 60%, #0a1c30 100%)",
        borderLeft: "1px solid rgba(0, 129, 242, 0.12)",
      }}
    >
      {/* Decorative glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 80% 10%, rgba(0, 129, 242, 0.12), transparent 40%),
            radial-gradient(circle at 20% 80%, rgba(255, 132, 0, 0.07), transparent 35%),
            radial-gradient(circle at 50% 50%, rgba(18, 46, 94, 0.20), transparent 55%)
          `,
        }}
      />

      {/* Top section */}
      <div className="relative z-10">
        {/* Live badge */}
        <div className="flex items-center gap-2 mb-8">
          <span
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
            style={{
              color: "#22c55e",
              backgroundColor: "rgba(34, 197, 94, 0.08)",
              border: "1px solid rgba(34, 197, 94, 0.20)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            Online · Monitoring 24/7
          </span>
        </div>

        {/* Veronica headline */}
        <h2
          className="text-[32px] font-bold leading-tight mb-2"
          style={{
            fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
            color: "#f8f8f7",
          }}
        >
          Veronica Internal<br />Growth Portal
        </h2>
        <p className="text-[13px] mb-8" style={{ color: "#6b7a99" }}>
          AI Growth Operator by{" "}
          <span style={{ color: "#ff8400", fontWeight: 600 }}>Vault Co</span>
        </p>

        {/* Feature list */}
        <div className="space-y-4">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  backgroundColor: "rgba(0, 129, 242, 0.10)",
                  border: "1px solid rgba(0, 129, 242, 0.18)",
                }}
              >
                <Icon size={14} style={{ color: "#0081f2" }} />
              </div>
              <div>
                <div className="text-[12px] font-semibold" style={{ color: "#f8f8f7" }}>
                  {label}
                </div>
                <div className="text-[11px] leading-snug mt-0.5" style={{ color: "#4a5d7e" }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom read-only safety note */}
      <div className="relative z-10 mt-8">
        <div
          className="px-4 py-3.5 rounded-xl"
          style={{
            backgroundColor: "rgba(0, 129, 242, 0.05)",
            border: "1px solid rgba(0, 129, 242, 0.14)",
          }}
        >
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#0081f2" }} />
            <p className="text-[11px] leading-snug" style={{ color: "#4a5d7e" }}>
              <span className="font-semibold" style={{ color: "#6b7a99" }}>Read-only safety: </span>
              Veronica can analyze, recommend, and draft. She cannot publish campaigns, change budgets, send SMS, or push workflows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { isDemoMode } = useAuth();

  return (
    <div
      className="min-h-screen flex items-stretch relative overflow-hidden"
      style={{ backgroundColor: "#05070B" }}
    >
      {/* ── Left column: login card ── */}
      <div
        className="w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative overflow-y-auto"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 20%, rgba(0, 129, 242, 0.10), transparent 34%),
            radial-gradient(circle at 85% 18%, rgba(255, 132, 0, 0.10), transparent 26%),
            radial-gradient(circle at 50% 65%, rgba(18, 46, 94, 0.18), transparent 42%)
          `,
        }}
      >
        <div className="w-full max-w-[400px]">
          {/* Logo + header */}
          <div className="mb-8 flex flex-col items-center gap-5">
            <div className="w-[140px] h-[38px] relative">
              <Image
                src="/vaultco-logo.png"
                alt="Vault Co"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span
                  className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{
                    color: "#0081f2",
                    backgroundColor: "rgba(0, 129, 242, 0.08)",
                    border: "1px solid rgba(0, 129, 242, 0.20)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  Internal Growth Portal
                </span>
              </div>
              <h1
                className="text-[26px] sm:text-[28px] font-bold tracking-wide"
                style={{
                  fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
                  color: "#f8f8f7",
                }}
              >
                Vault Co Command Center
              </h1>
              <p className="text-[13px] mt-1" style={{ color: "#6b7a99" }}>
                Powered by{" "}
                <span style={{ color: "#ff8400", fontWeight: 600 }}>Veronica</span>
                {" "}— AI Growth Operator
              </p>
            </div>
          </div>

          {/* Demo mode notice */}
          {isDemoMode && (
            <div className="mb-5">
              <div
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: "rgba(255, 132, 0, 0.05)",
                  border: "1px solid rgba(255, 132, 0, 0.18)",
                }}
              >
                <Sparkles size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#ff8400" }} />
                <p className="text-[12px] leading-snug" style={{ color: "#6b7a99" }}>
                  <span className="font-semibold" style={{ color: "#ff8400" }}>Demo Mode — </span>
                  NEXT_PUBLIC_AUTH_MODE=demo is active. Select a demo user to preview role-based access.
                  This mode is disabled in production.
                </p>
              </div>
            </div>
          )}

          {/* Auth form or demo picker */}
          {isDemoMode ? <DemoRolePicker /> : <SupabaseLoginForm />}

          {/* Safety notice */}
          <div className="mt-7">
            <div
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: "rgba(0, 129, 242, 0.04)",
                border: "1px solid rgba(0, 129, 242, 0.12)",
              }}
            >
              <ShieldCheck size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#6b7a99" }} />
              <p className="text-[11px] leading-snug" style={{ color: "#3d4f6e" }}>
                {isDemoMode
                  ? "Role permissions protect client accounts from unapproved campaign launches, budget changes, and workflow pushes. Only Admins can approve final campaign launch or mark campaigns Ready for Meta."
                  : "Access is restricted to approved Vault Co team members. Contact your admin if you need an account or have forgotten your password."}
              </p>
            </div>
          </div>

          <p className="text-[11px] mt-6 text-center" style={{ color: "#3d4f6e" }}>
            Vault Co — Internal Portal · Veronica by Vault Co · Role-based access control active
          </p>
        </div>
      </div>

      {/* ── Right column: Veronica brand panel (desktop only) ── */}
      <div className="hidden lg:flex flex-1">
        <VeronicaPanel />
      </div>
    </div>
  );
}
