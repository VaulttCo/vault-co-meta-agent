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
  ExternalLink,
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
  { label: "Dashboard",           href: "/",          icon: LayoutDashboard, permission: "canViewDashboard" },
  { label: "Clients",             href: "/clients",   icon: Users,           permission: "canViewClients" },
  { label: "Campaigns",           href: "/campaigns", icon: Megaphone,       permission: "canViewCampaigns" },
  { label: "AI Campaign Builder", href: "/ai-agent",  icon: Bot,             permission: "canViewAiBuilder" },
  { label: "Creatives",           href: "/creatives", icon: ImageIcon,       permission: "canViewCreatives" },
  { label: "Analytics",           href: "/analytics", icon: BarChart3,       permission: "canViewAnalytics" },
  { label: "Reports",             href: "/reports",   icon: FileText,        permission: "canViewReports" },
  { label: "Approvals",           href: "/approvals", icon: CheckSquare,     permission: "canViewApprovals" },
];

const settingsItem: NavItem = {
  label: "Settings", href: "/settings", icon: Settings, permission: "canViewSettings",
};

const CLIENT_ONBOARDING_URL = "https://portal-vaulttco.manus.space";

export function Sidebar() {
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

  const roleColor = user ? ROLE_COLORS[user.role] : "#5a6278";
  const roleLabel = user ? ROLE_LABELS[user.role] : "";

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-[#1c2438] bg-[#0c0f15]">
      {/* Logo */}
      <div className="h-[68px] flex items-center px-4 border-b border-[#1c2438]">
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

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        <div className="text-[9px] font-bold text-[#3d4460] uppercase tracking-widest px-2 mb-2 mt-1">
          Portal
        </div>

        {visibleNavItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                active
                  ? "bg-[#131720] text-[#18b8f0] border border-[#1c2438]"
                  : "text-[#5a6278] hover:text-[#eef1f8] hover:bg-[#131720]"
              }`}
            >
              <Icon
                size={15}
                className={`flex-shrink-0 transition-colors ${
                  active ? "text-[#18b8f0]" : "group-hover:text-[#eef1f8]"
                }`}
              />
              <span className="truncate">{label}</span>
              {label === "AI Campaign Builder" && (
                <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-[#18b8f0] bg-[#18b8f0]/10 border border-[#18b8f0]/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
                  <Sparkles size={7} />
                  AI
                </span>
              )}
              {label === "Approvals" && (
                <span className="ml-auto flex items-center text-[9px] font-bold text-[#f07820] bg-[#f07820]/10 border border-[#f07820]/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
                  {3 + pendingDrafts}
                </span>
              )}
            </Link>
          );
        })}

        {/* Client Onboarding — external link to Manus onboarding dashboard */}
        <div className="text-[9px] font-bold text-[#3d4460] uppercase tracking-widest px-2 mb-2 mt-4">
          Onboarding
        </div>
        <a
          href={CLIENT_ONBOARDING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group text-[#5a6278] hover:text-[#eef1f8] hover:bg-[#131720]"
        >
          <ClipboardList
            size={15}
            className="flex-shrink-0 transition-colors group-hover:text-[#eef1f8]"
          />
          <span className="truncate">Client Onboarding</span>
          <ExternalLink
            size={10}
            className="ml-auto flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
          />
        </a>
      </nav>

      {/* Bottom */}
      <div className="border-t border-[#1c2438] py-2.5 px-2.5 space-y-0.5">
        {showSettings && (
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
              isActive("/settings")
                ? "bg-[#131720] text-[#18b8f0] border border-[#1c2438]"
                : "text-[#5a6278] hover:text-[#eef1f8] hover:bg-[#131720]"
            }`}
          >
            <Settings size={15} className="flex-shrink-0" />
            {settingsItem.label}
          </Link>
        )}

        {/* User card */}
        {user && (
          <div className="mt-1.5 px-2.5 py-2.5 rounded-lg bg-[#131720] border border-[#1c2438] space-y-2">
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#0d0e12]"
                style={{ backgroundColor: roleColor }}
              >
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-[#eef1f8] truncate leading-tight">{user.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border leading-tight"
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
              {/* Sign out */}
              <button
                onClick={signOut}
                title="Sign out"
                className="w-6 h-6 flex items-center justify-center rounded-md text-[#3d4460] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors flex-shrink-0"
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
