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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0e12] px-4 py-16">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="w-[120px] h-[32px] relative">
          <Image
            src="/vaultco-logo.png"
            alt="Vault Co"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="text-center">
          <h1 className="text-[20px] font-bold text-[#eef1f8] tracking-tight">Vault Co Portal</h1>
          <p className="text-[13px] text-[#5a6278] mt-0.5">Powered by Veronica — Internal Operations</p>
        </div>
      </div>

      {/* Demo mode notice */}
      {isDemoMode && (
        <div className="w-full max-w-md mb-5">
          <div className="flex items-start gap-2.5 px-4 py-3 bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-xl">
            <Sparkles size={13} className="text-[#c9a84c] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#5a6278] leading-snug">
              <span className="text-[#c9a84c] font-semibold">Demo Mode — </span>
              Supabase auth is not configured. Select a demo user to preview role-based access. No data is sent anywhere.
            </p>
          </div>
        </div>
      )}

      {/* User cards */}
      <div className="w-full max-w-md space-y-3">
        <div className="text-[10px] font-semibold text-[#3d4460] uppercase tracking-widest mb-1 px-1">
          Select a user to sign in
        </div>

        {MOCK_USERS.map((user) => (
          <button
            key={user.id}
            onClick={() => signInAs(user.id)}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-[#0c0f15] border border-[#1c2438] rounded-xl hover:border-[#263050] hover:bg-[#131720] transition-all text-left group"
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-[#0d0e12]"
              style={{ backgroundColor: user.color }}
            >
              {user.initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[13px] font-semibold text-[#eef1f8]">{user.name}</span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                  style={{
                    color: ROLE_COLORS[user.role],
                    backgroundColor: `${ROLE_COLORS[user.role]}15`,
                    borderColor: `${ROLE_COLORS[user.role]}30`,
                  }}
                >
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <div className="text-[11px] text-[#5a6278] truncate">{roleDescriptions[user.role]}</div>
            </div>

            {/* Arrow */}
            <span className="text-[#3d4460] group-hover:text-[#5a6278] text-[16px] transition-colors flex-shrink-0">→</span>
          </button>
        ))}
      </div>

      {/* Safety copy */}
      <div className="w-full max-w-md mt-7">
        <div className="flex items-start gap-2.5 px-4 py-3 bg-[#131720] border border-[#1c2438] rounded-xl">
          <ShieldCheck size={13} className="text-[#5a6278] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#3d4460] leading-snug">
            Role permissions protect client accounts from unapproved campaign launches, budget changes, and workflow pushes. Only Admins can approve final campaign launch or mark campaigns Ready for Meta.
          </p>
        </div>
      </div>

      <p className="text-[11px] text-[#3d4460] mt-6">
        Vault Co — Internal Portal · Role-based access control active
      </p>
    </div>
  );
}
