"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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

const allNavItems: NavItem[] = [
  { label: "Command Hub",       href: "/",                   icon: LayoutDashboard, permission: "canViewDashboard" },
  { label: "Veronica AI",       href: "/ai-agent",           icon: Bot,             permission: "canViewAiBuilder" },
  { label: "Revenue Dashboard", href: "/revenue-dashboard",  icon: TrendingUp,      permission: "canViewAnalytics" },
  { label: "Clients",           href: "/clients",            icon: Users,           permission: "canViewClients" },
  { label: "Operator Queue",    href: "/operator-queue",     icon: ListChecks,      permission: "canViewAiBuilder" },
  { label: "Approvals",         href: "/approvals",          icon: CheckSquare,     permission: "canViewApprovals" },
  { label: "Reports",           href: "/reports",            icon: FileText,        permission: "canViewReports" },
  { label: "Campaigns",         href: "/campaigns",          icon: Megaphone,       permission: "canViewCampaigns" },
  { label: "Creatives",         href: "/creatives",          icon: ImageIcon,       permission: "canViewCreatives" },
  { label: "Analytics",         href: "/analytics",          icon: BarChart3,       permission: "canViewAnalytics" },
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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const visibleNavItems = allNavItems.filter(
    (item) => permissions?.[item.permission] ?? false
  );
  const showSettings = permissions?.canViewSettings ?? false;

  const roleColor = user ? ROLE_COLORS[user.role] : "#6b7a99";
  const roleLabel = user ? ROLE_LABELS[user.role] : "";

  return (
    <aside
      className="w-[228px] flex-shrink-0 flex flex-col border-r h-full"
      style={{
        backgroundColor: "var(--t-sidebar-bg)",
        borderColor: "rgba(0, 129, 242, 0.12)",
      }}
    >
      {/* Logo area */}
      <div
        className="h-[68px] flex items-center justify-between px-5 border-b flex-shrink-0"
        style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-[88px] h-[24px] relative flex-shrink-0">
            <Image
              src="/vaultco-logo.png"
              alt="Vault Co"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0"
            style={{ color: "rgba(107, 122, 153, 0.8)" }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Internal portal label */}
      <div
        className="px-5 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "rgba(0, 129, 242, 0.08)", backgroundColor: "rgba(0, 129, 242, 0.04)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#0081f2]">
            Vault Co Command Hub
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        <div
          className="text-[9px] font-bold uppercase tracking-widest px-2 mb-2 mt-1"
          style={{ color: "rgba(107, 122, 153, 0.6)" }}
        >
          Command Center
        </div>

        {visibleNavItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative ${
                active ? "text-[#f8f8f7]" : ""
              }`}
              style={
                active
                  ? {
                      backgroundColor: "rgba(0, 129, 242, 0.12)",
                      border: "1px solid rgba(0, 129, 242, 0.20)",
                      color: "#f8f8f7",
                    }
                  : {
                      color: "rgba(107, 122, 153, 0.85)",
                      border: "1px solid transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = "#f8f8f7";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(107, 122, 153, 0.85)";
              }}
            >
              <Icon
                size={15}
                className="flex-shrink-0"
                style={{ color: active ? "#0081f2" : undefined }}
              />
              <span className="truncate">{label}</span>
              {label === "Veronica AI" && (
                <span
                  className="ml-auto flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
                  style={{
                    color: "#ff8400",
                    backgroundColor: "rgba(255, 132, 0, 0.10)",
                    border: "1px solid rgba(255, 132, 0, 0.20)",
                  }}
                >
                  <Sparkles size={7} />
                  AI
                </span>
              )}
              {label === "Approvals" && pendingDrafts > 0 && (
                <span
                  className="ml-auto flex items-center text-[9px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
                  style={{
                    color: "#ff8400",
                    backgroundColor: "rgba(255, 132, 0, 0.10)",
                    border: "1px solid rgba(255, 132, 0, 0.20)",
                  }}
                >
                  {pendingDrafts}
                </span>
              )}
            </Link>
          );
        })}

        {/* Coming soon section */}
        <div
          className="text-[9px] font-bold uppercase tracking-widest px-2 mb-2 mt-5"
          style={{ color: "rgba(107, 122, 153, 0.6)" }}
        >
          Coming Soon
        </div>

        {/* Victoria AI */}
        <Link
          href="/victoria"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
          style={{ color: "rgba(107, 122, 153, 0.55)", border: "1px solid transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(167,139,250,0.8)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(107, 122, 153, 0.55)"; }}
        >
          <Mic2 size={15} className="flex-shrink-0" />
          <span className="truncate">Victoria AI</span>
          <span
            className="ml-auto flex-shrink-0 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{
              color: "rgba(107, 122, 153, 0.6)",
              backgroundColor: "rgba(61,79,110,0.12)",
              border: "1px solid rgba(61,79,110,0.20)",
            }}
          >
            Soon
          </span>
        </Link>

        {/* Client Onboarding */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium cursor-default select-none"
          style={{ color: "rgba(107, 122, 153, 0.4)" }}
          title="Client Onboarding Portal — coming soon"
        >
          <ClipboardList size={15} className="flex-shrink-0" />
          <span className="truncate">Client Onboarding</span>
          <span
            className="ml-auto flex-shrink-0 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{
              color: "rgba(107, 122, 153, 0.6)",
              backgroundColor: "rgba(61,79,110,0.12)",
              border: "1px solid rgba(61,79,110,0.20)",
            }}
          >
            Soon
          </span>
        </div>
      </nav>

      {/* Bottom */}
      <div
        className="border-t py-2.5 px-3 space-y-0.5 flex-shrink-0"
        style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}
      >
        {showSettings && (
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
            style={
              isActive("/settings")
                ? {
                    backgroundColor: "rgba(0, 129, 242, 0.12)",
                    border: "1px solid rgba(0, 129, 242, 0.20)",
                    color: "#f8f8f7",
                  }
                : { color: "rgba(107, 122, 153, 0.85)", border: "1px solid transparent" }
            }
          >
            <Settings
              size={15}
              className="flex-shrink-0"
              style={{ color: isActive("/settings") ? "#0081f2" : undefined }}
            />
            {settingsItem.label}
          </Link>
        )}

        {/* User card */}
        {user && (
          <div
            className="mt-1.5 px-3 py-2.5 rounded-lg space-y-2"
            style={{
              backgroundColor: "rgba(0, 129, 242, 0.06)",
              border: "1px solid rgba(0, 129, 242, 0.12)",
            }}
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
              <button
                onClick={() => void signOut()}
                title="Sign out"
                className="w-6 h-6 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
                style={{ color: "rgba(61, 79, 110, 0.8)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#ef4444";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239, 68, 68, 0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "rgba(61, 79, 110, 0.8)";
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
