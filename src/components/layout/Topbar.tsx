"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Sun, Moon, ChevronDown, LogOut, User, ShieldCheck, Menu } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { usePlans } from "@/components/PlanProvider";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/auth/types";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Command Center", subtitle: "Vault Co Internal Growth Portal — Client performance overview" },
  "/clients": { title: "Clients", subtitle: "Manage your roofing & construction clients" },
  "/campaigns": { title: "Campaigns", subtitle: "Active Meta campaigns across all clients" },
  "/analytics": { title: "Analytics", subtitle: "Lead generation & performance insights" },
  "/creatives": { title: "Creatives", subtitle: "Ad creative assets & templates" },
  "/ai-agent": { title: "Veronica Console", subtitle: "AI Growth Operator — Campaign strategy, client intelligence, creative analysis, and approval-ready growth plans." },
  "/reports": { title: "Reports", subtitle: "Monthly client performance reports — prepared by Veronica" },
  "/approvals": { title: "Approvals", subtitle: "Pending items awaiting human review" },
  "/settings": { title: "Settings", subtitle: "Account, integrations & AI provider settings" },
};

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
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

  const { plans } = usePlans();
  const pendingCount = plans.filter((p) => p.status === "needs_review").length;

  const roleColor = user ? ROLE_COLORS[user.role] : "#6b7a99";
  const roleLabel = user ? ROLE_LABELS[user.role] : "";

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
      className="h-[68px] flex items-center justify-between px-4 sm:px-6 flex-shrink-0 border-b gap-3"
      style={{
        backgroundColor: "var(--t-header-bg)",
        borderColor: "var(--t-border-nav)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-all"
          style={{
            border: "1px solid var(--t-border)",
            backgroundColor: "var(--t-input-bg)",
            color: "var(--t-muted)",
          }}
          aria-label="Open menu"
        >
          <Menu size={15} />
        </button>

        <div className="min-w-0">
          <h1
            className="text-[15px] sm:text-[16px] font-bold tracking-wide truncate"
            style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
          >
            {page?.title}
          </h1>
          <p className="text-[11px] truncate hidden sm:block" style={{ color: "var(--t-muted)" }}>
            {page?.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          style={{
            border: "1px solid var(--t-border)",
            backgroundColor: "var(--t-input-bg)",
            color: "var(--t-muted)",
          }}
        >
          {isLight ? <Moon size={13} /> : <Sun size={13} />}
        </button>

        {/* Notifications */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          title={pendingCount > 0 ? `${pendingCount} pending approval${pendingCount !== 1 ? "s" : ""}` : "Notifications"}
          style={{
            border: "1px solid var(--t-border)",
            backgroundColor: "var(--t-input-bg)",
            color: "var(--t-muted)",
          }}
        >
          <Bell size={13} />
          {pendingCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#ff8400] rounded-full" />
          )}
        </button>

        {/* User dropdown */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg transition-colors"
              style={{
                backgroundColor: "var(--t-input-bg)",
                border: "1px solid var(--t-border)",
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ backgroundColor: roleColor, color: "#05070B" }}
              >
                {user.initials}
              </div>
              <div className="hidden sm:block text-left">
                <div
                  className="text-[11px] font-semibold leading-tight max-w-[100px] truncate"
                  style={{ color: "var(--t-text)" }}
                >
                  {user.name}
                </div>
              </div>
              <ChevronDown
                size={11}
                className={`transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                style={{ color: "var(--t-muted)" }}
              />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-[220px] rounded-xl z-50 overflow-hidden"
                style={{
                  backgroundColor: "var(--t-sidebar-bg)",
                  border: "1px solid rgba(0, 129, 242, 0.18)",
                  boxShadow: "var(--t-dropdown-shadow)",
                }}
              >
                {/* User info header */}
                <div
                  className="px-4 py-3 border-b"
                  style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: roleColor, color: "#05070B" }}
                    >
                      {user.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold truncate" style={{ color: "#f8f8f7" }}>
                        {user.name}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: "#6b7a99" }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{
                        color: roleColor,
                        backgroundColor: `${roleColor}18`,
                        borderColor: `${roleColor}30`,
                      }}
                    >
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {/* Permissions */}
                <div className="py-1">
                  <div className="px-3 py-1">
                    <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#3d4f6e" }}>
                      Permissions
                    </div>
                  </div>
                  <div className="px-3 pb-2 space-y-0.5">
                    {[
                      { label: "Generate campaigns", allowed: can("canGenerateCampaigns") },
                      { label: "Approve campaigns", allowed: can("canApproveCampaigns") },
                      { label: "Mark Ready for Meta", allowed: can("canMarkReadyForMeta") },
                      { label: "Manage integrations", allowed: can("canConnectIntegrations") },
                    ].map(({ label, allowed }) => (
                      <div key={label} className="flex items-center gap-2 text-[11px]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${allowed ? "bg-[#22c55e]" : ""}`}
                          style={!allowed ? { backgroundColor: "#3d4f6e" } : {}}
                        />
                        <span style={{ color: allowed ? "#6b7a99" : "#3d4f6e" }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t py-1" style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}>
                  {can("canViewSettings") && (
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-[12px] transition-colors"
                      style={{ color: "#6b7a99" }}
                    >
                      <User size={12} />
                      Account &amp; Settings
                    </Link>
                  )}
                  <button
                    onClick={() => { void signOut(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] transition-colors"
                    style={{ color: "#6b7a99" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#6b7a99"; }}
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
