"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Users,
  Megaphone,
  Bot,
  ImageIcon,
  BarChart3,
  FileText,
  CheckSquare,
  Settings,
  Sparkles,
  LogOut,
  ClipboardList,
  ListChecks,
  X,
  Mic2,
  TrendingUp,
  ArrowLeft,
  Layers,
  Trophy,
  Calculator,
  RefreshCw,
  PhoneCall,
  MessageSquare,
  BookOpen,
  Repeat2,
  CalendarCheck,
  Activity,
  Brain,
  Lightbulb,
  Network,
  Wrench,
} from "lucide-react";
import { usePlans } from "@/components/PlanProvider";
import { useAuth } from "@/components/AuthProvider";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/auth/types";
import type { Permissions } from "@/lib/auth/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: keyof Permissions;
}

// ── Veronica portal nav ───────────────────────────────────────────────────────
const veronicaNavItems: NavItem[] = [
  { label: "Vault Memory",      href: "/vault-memory",      icon: Brain,       permission: "canViewStrategyData" },
  { label: "Workforce",         href: "/workforce",         icon: Network,     permission: "canViewStrategyData" },
  { label: "Recommendations",   href: "/recommendations",   icon: Lightbulb,   permission: "canViewApprovals" },
  { label: "Draft Queue",       href: "/drafts",            icon: MessageSquare, permission: "canViewApprovals" },
  { label: "System Proposals",  href: "/proposals",         icon: Wrench,      permission: "canViewApprovals" },
  { label: "Veronica Overview", href: "/ai-agent",         icon: Bot,         permission: "canViewAiBuilder" },
  { label: "Veronica Console",  href: "/ai-agent/console", icon: Sparkles,    permission: "canViewAiBuilder" },
  { label: "Clients",           href: "/clients",           icon: Users,       permission: "canViewClients"   },
  { label: "Operator Queue",    href: "/operator-queue",    icon: ListChecks,  permission: "canViewAiBuilder" },
  { label: "Approvals",         href: "/approvals",         icon: CheckSquare, permission: "canViewApprovals" },
  { label: "Reports",           href: "/reports",           icon: FileText,    permission: "canViewReports"   },
  { label: "Campaigns",         href: "/campaigns",         icon: Megaphone,   permission: "canViewCampaigns" },
  { label: "Creatives",         href: "/creatives",         icon: ImageIcon,   permission: "canViewCreatives" },
  { label: "Analytics",         href: "/analytics",         icon: BarChart3,   permission: "canViewAnalytics" },
];

const settingsItem: NavItem = {
  label: "Settings", href: "/settings", icon: Settings, permission: "canViewSettings",
};

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { plans, hasLoaded } = usePlans();
  const { user, permissions, signOut } = useAuth();

  const pendingDrafts = hasLoaded
    ? plans.filter((p) => p.status === "needs_review").length
    : 0;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // Exact match for /ai-agent so the overview and console don't both highlight
    if (href === "/ai-agent") return pathname === "/ai-agent";
    if (href === "/revenue-dashboard") return pathname === "/revenue-dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const roleColor = user ? ROLE_COLORS[user.role] : "#6b7a99";
  const roleLabel = user ? ROLE_LABELS[user.role] : "";

  // ── Determine portal context ─────────────────────────────────────────────
  const isRevenueDashboard = pathname.startsWith("/revenue-dashboard");
  const isVictoria = pathname.startsWith("/victoria");

  const portalLabel = isRevenueDashboard
    ? "Revenue Dashboard"
    : isVictoria
    ? "Victoria AI"
    : "Vault Co Veronica";

  const showSettings = permissions?.canViewSettings ?? false;

  // ── Shared: Back to Command Hub link ─────────────────────────────────────
  const backToHub = (
    <Link
      href="/"
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all mb-1"
      style={{ color: "rgba(201,168,76,0.65)", border: "1px solid transparent" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "rgba(201,168,76,0.90)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(201,168,76,0.06)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.16)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "rgba(201,168,76,0.65)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
        (e.currentTarget as HTMLElement).style.borderColor = "transparent";
      }}
    >
      <ArrowLeft size={13} className="flex-shrink-0" />
      <span>Command Hub</span>
    </Link>
  );

  // ── Shared: nav item renderer ─────────────────────────────────────────────
  function NavLink({ label, href, icon: Icon }: { label: string; href: string; icon: React.ElementType }) {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${active ? "text-[#f8f8f7]" : ""}`}
        style={
          active
            ? { backgroundColor: "rgba(0,129,242,0.12)", border: "1px solid rgba(0,129,242,0.20)", color: "#f8f8f7" }
            : { color: "rgba(107,122,153,0.85)", border: "1px solid transparent" }
        }
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "#f8f8f7"; }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(107,122,153,0.85)"; }}
      >
        <Icon size={15} className="flex-shrink-0" style={{ color: active ? "#0081f2" : undefined }} />
        <span className="truncate">{label}</span>
        {(label === "Veronica Overview" || label === "Veronica Console") && (
          <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
            style={{ color: "#ff8400", backgroundColor: "rgba(255,132,0,0.10)", border: "1px solid rgba(255,132,0,0.20)" }}>
            <Sparkles size={7} />AI
          </span>
        )}
        {label === "Approvals" && pendingDrafts > 0 && (
          <span className="ml-auto flex items-center text-[9px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
            style={{ color: "#ff8400", backgroundColor: "rgba(255,132,0,0.10)", border: "1px solid rgba(255,132,0,0.20)" }}>
            {pendingDrafts}
          </span>
        )}
      </Link>
    );
  }

  // ── Shared: decorative coming-soon item ───────────────────────────────────
  function ComingSoonItem({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-default select-none"
        style={{ color: "rgba(107,122,153,0.40)" }}>
        <Icon size={15} className="flex-shrink-0" />
        <span className="truncate">{label}</span>
        <span className="ml-auto flex-shrink-0 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{ color: "rgba(107,122,153,0.55)", backgroundColor: "rgba(61,79,110,0.12)", border: "1px solid rgba(61,79,110,0.18)" }}>
          Soon
        </span>
      </div>
    );
  }

  // ── Shared: section header ────────────────────────────────────────────────
  function SectionLabel({ label }: { label: string }) {
    return (
      <div className="text-[9px] font-bold uppercase tracking-widest px-2 mb-2 mt-4"
        style={{ color: "rgba(107,122,153,0.55)" }}>
        {label}
      </div>
    );
  }

  return (
    <aside
      className="w-[228px] flex-shrink-0 flex flex-col border-r h-full"
      style={{ backgroundColor: "var(--t-sidebar-bg)", borderColor: "rgba(0,129,242,0.12)" }}
    >
      {/* ── Logo area ─────────────────────────────────────────────────── */}
      <div
        className="h-[68px] flex items-center justify-between px-5 border-b flex-shrink-0"
        style={{ borderColor: "rgba(0,129,242,0.12)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-[88px] h-[24px] relative flex-shrink-0">
            <Image src="/vaultco-logo.png" alt="Vault Co" fill className="object-contain object-left" priority />
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0"
            style={{ color: "rgba(107,122,153,0.8)" }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Portal label ──────────────────────────────────────────────── */}
      <div
        className="px-5 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "rgba(0,129,242,0.08)", backgroundColor: "rgba(0,129,242,0.04)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#0081f2]">
            {portalLabel}
          </span>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">

        {/* Back to Command Hub — all portals */}
        {backToHub}

        <div className="border-t my-2" style={{ borderColor: "rgba(0,129,242,0.08)" }} />

        {/* ── Revenue Dashboard portal ───────────────────────────────── */}
        {isRevenueDashboard && (
          <>
            <SectionLabel label="Revenue" />
            <NavLink label="Revenue Overview"    href="/revenue-dashboard"                  icon={TrendingUp} />

            <SectionLabel label="Revenue Portal" />
            <NavLink label="Live Tracker"        href="/revenue-dashboard/live-tracker"     icon={Activity}      />
            <NavLink label="Monthly Closeout"    href="/revenue-dashboard/monthly-closeout" icon={CalendarCheck} />
            <NavLink label="Setup Pipeline"      href="/revenue-dashboard/setup-pipeline"   icon={Layers}        />
            <NavLink label="Partner Earnings"    href="/revenue-dashboard/partner-earnings" icon={Users}         />
            <NavLink label="Leaderboard"         href="/revenue-dashboard/leaderboard"      icon={Trophy}        />
            <NavLink label="Forecast Calculator" href="/revenue-dashboard/forecast"         icon={Calculator}    />
            <NavLink label="Scenario Modeling"   href="/revenue-dashboard/scenarios"        icon={BarChart3}     />
            <NavLink label="GHL Revenue Tracker" href="/revenue-dashboard/ghl-tracker"      icon={RefreshCw}     />
          </>
        )}

        {/* ── Victoria portal ────────────────────────────────────────── */}
        {isVictoria && (
          <>
            <SectionLabel label="Victoria AI" />
            <NavLink label="Victoria AI Sales Coach" href="/victoria" icon={Mic2} />

            <SectionLabel label="Coming Soon" />
            <ComingSoonItem icon={BookOpen}     label="Sales Frameworks"       />
            <ComingSoonItem icon={MessageSquare} label="Objection Library"      />
            <ComingSoonItem icon={PhoneCall}     label="Call Coaching"          />
            <ComingSoonItem icon={Repeat2}       label="Follow-Up Templates"    />
          </>
        )}

        {/* ── Veronica portal (default) ──────────────────────────────── */}
        {!isRevenueDashboard && !isVictoria && (
          <>
            <SectionLabel label="Veronica AI" />
            {veronicaNavItems
              .filter((item) => permissions?.[item.permission] ?? false)
              .map(({ label, href, icon }) => (
                <NavLink key={href} label={label} href={href} icon={icon} />
              ))}

            <SectionLabel label="Other Portals" />
            <Link
              href="/victoria"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
              style={{ color: "rgba(184,158,255,0.75)", border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#b89eff";
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(167,139,250,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(167,139,250,0.18)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "rgba(184,158,255,0.75)";
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
              }}
            >
              <Mic2 size={15} className="flex-shrink-0" style={{ color: "#a78bfa" }} />
              <span className="truncate">Victoria AI</span>
              <span
                className="ml-auto flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
                style={{ color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.20)" }}
              >
                Sales
              </span>
            </Link>

            <SectionLabel label="Coming Soon" />
            <ComingSoonItem icon={ClipboardList} label="Client Onboarding" />
          </>
        )}

      </nav>

      {/* ── Bottom ────────────────────────────────────────────────────── */}
      <div
        className="border-t py-2.5 px-3 space-y-0.5 flex-shrink-0"
        style={{ borderColor: "rgba(0,129,242,0.12)" }}
      >
        {showSettings && (
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
            style={
              isActive("/settings")
                ? { backgroundColor: "rgba(0,129,242,0.12)", border: "1px solid rgba(0,129,242,0.20)", color: "#f8f8f7" }
                : { color: "rgba(107,122,153,0.85)", border: "1px solid transparent" }
            }
          >
            <Settings size={15} className="flex-shrink-0" style={{ color: isActive("/settings") ? "#0081f2" : undefined }} />
            Settings
          </Link>
        )}

        {/* User card */}
        {user && (
          <div
            className="mt-1.5 px-3 py-2.5 rounded-lg space-y-2"
            style={{ backgroundColor: "rgba(0,129,242,0.06)", border: "1px solid rgba(0,129,242,0.12)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                style={{ backgroundColor: roleColor, color: "#05070B" }}
              >
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold truncate leading-tight" style={{ color: "#f8f8f7" }}>
                  {user.name}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border leading-tight"
                    style={{ color: roleColor, backgroundColor: `${roleColor}18`, borderColor: `${roleColor}30` }}
                  >
                    {roleLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => void signOut()}
                title="Sign out"
                className="w-6 h-6 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
                style={{ color: "rgba(61,79,110,0.8)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#ef4444";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "rgba(61,79,110,0.8)";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <LogOut size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
