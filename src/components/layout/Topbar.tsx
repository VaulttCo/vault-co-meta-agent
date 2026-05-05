"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Sun, Moon, ChevronDown, LogOut, User, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/auth/types";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Client performance overview" },
  "/clients": { title: "Clients", subtitle: "Manage your roofing & construction clients" },
  "/campaigns": { title: "Campaigns", subtitle: "Active Meta campaigns across all clients" },
  "/analytics": { title: "Analytics", subtitle: "Lead generation & performance insights" },
  "/creatives": { title: "Creatives", subtitle: "Ad creative assets & templates" },
  "/ai-agent": { title: "Veronica", subtitle: "AI Growth Operator — Campaign strategy, client intelligence, creative analysis, and approval-ready growth plans." },
  "/reports": { title: "Reports", subtitle: "Monthly client performance reports" },
  "/approvals": { title: "Approvals", subtitle: "Pending items awaiting review" },
  "/settings": { title: "Settings", subtitle: "Account & integration settings" },
};

export function Topbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, can } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const key = Object.keys(pageTitles).find((k) =>
    k === "/" ? pathname === "/" : pathname === k || pathname.startsWith(k + "/")
  ) ?? "/";
  const page = pageTitles[key];
  const isLight = theme === "light";

  const roleColor = user ? ROLE_COLORS[user.role] : "#5a6278";
  const roleLabel = user ? ROLE_LABELS[user.role] : "";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="h-[68px] flex items-center justify-between px-6 border-b border-[#1c2438] flex-shrink-0"
      style={{ backgroundColor: "var(--t-header-bg)" }}
    >
      <div>
        <h1 className="text-[15px] font-semibold text-[#eef1f8] tracking-tight">{page?.title}</h1>
        <p className="text-[11px] text-[#5a6278]">{page?.subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search size={13} className="absolute left-3 text-[#5a6278]" />
          <input
            type="text"
            placeholder="Search clients, campaigns..."
            className="w-52 pl-8 pr-3 py-1.5 bg-[#131720] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#5a6278] focus:outline-none focus:border-[#18b8f0]/40 transition-colors"
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-[#1c2438] bg-[#131720] text-[#5a6278] hover:text-[#eef1f8] hover:border-[#263050] transition-all"
        >
          {isLight ? <Moon size={13} /> : <Sun size={13} />}
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-[#1c2438] bg-[#131720] text-[#5a6278] hover:text-[#eef1f8] hover:border-[#263050] transition-all">
          <Bell size={13} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#f07820] rounded-full"></span>
        </button>

        {/* GHL connection */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#131720] border border-[#1c2438] text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0"></span>
          <span className="text-[#5a6278]">GHL</span>
          <span className="text-[#eef1f8] font-medium">Connected</span>
        </div>

        {/* Meta connection */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#131720] border border-[#1c2438] text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#18b8f0] flex-shrink-0"></span>
          <span className="text-[#5a6278]">Meta</span>
          <span className="text-[#eef1f8] font-medium">Connected</span>
        </div>

        {/* User dropdown */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-[#131720] border border-[#1c2438] rounded-lg hover:border-[#263050] transition-colors"
            >
              <div
                className="w-5.5 h-5.5 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-[#0d0e12] flex-shrink-0"
                style={{ backgroundColor: roleColor }}
              >
                {user.initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-[11px] font-semibold text-[#eef1f8] leading-tight max-w-[100px] truncate">{user.name}</div>
              </div>
              <ChevronDown size={11} className={`text-[#5a6278] transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-[220px] bg-[#0c0f15] border border-[#1c2438] rounded-xl shadow-xl z-50 overflow-hidden">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-[#1c2438]">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-[#0d0e12] flex-shrink-0"
                      style={{ backgroundColor: roleColor }}
                    >
                      {user.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#eef1f8] truncate">{user.name}</div>
                      <div className="text-[10px] text-[#5a6278] truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{
                        color: roleColor,
                        backgroundColor: `${roleColor}15`,
                        borderColor: `${roleColor}30`,
                      }}
                    >
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <div className="px-3 py-1">
                    <div className="text-[9px] font-bold text-[#3d4460] uppercase tracking-widest">Permissions</div>
                  </div>
                  <div className="px-3 pb-2 space-y-0.5">
                    {[
                      { label: "Generate campaigns", allowed: can("canGenerateCampaigns") },
                      { label: "Approve campaigns", allowed: can("canApproveCampaigns") },
                      { label: "Mark Ready for Meta", allowed: can("canMarkReadyForMeta") },
                      { label: "Manage integrations", allowed: can("canConnectIntegrations") },
                    ].map(({ label, allowed }) => (
                      <div key={label} className="flex items-center gap-2 text-[11px]">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${allowed ? "bg-[#22c55e]" : "bg-[#3d4460]"}`} />
                        <span className={allowed ? "text-[#5a6278]" : "text-[#3d4460]"}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#1c2438] py-1">
                  {can("canViewSettings") && (
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-[12px] text-[#5a6278] hover:text-[#eef1f8] hover:bg-[#131720] transition-colors"
                    >
                      <User size={12} />
                      Account & Settings
                    </Link>
                  )}
                  <button
                    onClick={() => { signOut(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[#5a6278] hover:text-[#ef4444] hover:bg-[#ef4444]/5 transition-colors"
                  >
                    <LogOut size={12} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
