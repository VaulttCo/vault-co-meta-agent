"use client";

import Image from "next/image";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { MOCK_USERS } from "@/lib/auth/mock-users";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/auth/types";

const roleDescriptions: Record<string, string> = {
  admin: "Full access — generate, approve, launch, manage integrations",
  media_buyer: "Generate drafts, submit for approval, view analytics and reports",
  setter: "View clients and GHL workflow notes",
  client_viewer: "View approved reports only",
};

export default function LoginPage() {
  const { signInAs, isDemoMode } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{
        backgroundColor: "#05070B",
        backgroundImage: `
          radial-gradient(circle at 15% 20%, rgba(0, 129, 242, 0.10), transparent 34%),
          radial-gradient(circle at 85% 18%, rgba(255, 132, 0, 0.10), transparent 26%),
          radial-gradient(circle at 50% 65%, rgba(18, 46, 94, 0.18), transparent 42%)
        `,
      }}
    >
      {/* Logo + brand */}
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
          {/* "INTERNAL GROWTH PORTAL" badge — matches onboarding portal style */}
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
            className="text-[28px] font-bold tracking-wide"
            style={{
              fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
              color: "#f8f8f7",
            }}
          >
            Vault Co Command Center
          </h1>
          <p
            className="text-[13px] mt-1"
            style={{ color: "#6b7a99" }}
          >
            Powered by{" "}
            <span style={{ color: "#ff8400", fontWeight: 600 }}>Veronica</span>
            {" "}— AI Growth Operator
          </p>
        </div>
      </div>

      {/* Demo mode notice */}
      {isDemoMode && (
        <div className="w-full max-w-md mb-5">
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
              Supabase auth is not configured. Select a demo user to preview role-based access. No data is sent anywhere.
            </p>
          </div>
        </div>
      )}

      {/* User cards */}
      <div className="w-full max-w-md space-y-3">
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
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
              style={{ backgroundColor: user.color, color: "#05070B" }}
            >
              {user.initials}
            </div>

            {/* Info */}
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
                {roleDescriptions[user.role]}
              </div>
            </div>

            {/* Arrow */}
            <span
              className="text-[16px] transition-colors flex-shrink-0 group-hover:text-[#0081f2]"
              style={{ color: "#3d4f6e" }}
            >
              →
            </span>
          </button>
        ))}
      </div>

      {/* Safety notice */}
      <div className="w-full max-w-md mt-7">
        <div
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: "rgba(0, 129, 242, 0.04)",
            border: "1px solid rgba(0, 129, 242, 0.12)",
          }}
        >
          <ShieldCheck size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#6b7a99" }} />
          <p className="text-[11px] leading-snug" style={{ color: "#3d4f6e" }}>
            Role permissions protect client accounts from unapproved campaign launches, budget changes, and workflow pushes.
            Only Admins can approve final campaign launch or mark campaigns Ready for Meta.
          </p>
        </div>
      </div>

      <p className="text-[11px] mt-6" style={{ color: "#3d4f6e" }}>
        Vault Co — Internal Portal · Veronica by Vault Co · Role-based access control active
      </p>
    </div>
  );
}
