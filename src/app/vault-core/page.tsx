// Vault Core — Executive Command (the private operating-system home).
// Composes the existing Command Hub panels (no duplicated logic) + module entries.
// Renders inside the app shell, so the Vault Core sidebar section is shown.

import Link from "next/link";
import { Brain, Network, Activity, Fingerprint, ArrowRight, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VCPageWrapper, VCStatusBadge } from "@/components/ui/VaultUI";
import { CommandHubExecutiveBrief } from "@/components/core/CommandHubExecutiveBrief";
import { CommandHubRecommendationsPanel } from "@/components/core/CommandHubRecommendationsPanel";
import { CommandHubProposalsPanel } from "@/components/core/CommandHubProposalsPanel";
import { CommandHubDraftsPanel } from "@/components/core/CommandHubDraftsPanel";

export const metadata = {
  title: "Executive Command · Vault Core",
};

function ModuleTile({ href, icon: Icon, title, desc }: { href: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 px-4 py-4 rounded-2xl transition-all"
      style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,129,242,0.12)", border: "1px solid rgba(0,129,242,0.24)" }}>
          <Icon size={16} style={{ color: "#0081f2" }} />
        </div>
        <ArrowRight size={14} style={{ color: "var(--t-dim)" }} />
      </div>
      <div className="text-[14px] font-semibold" style={{ color: "var(--t-text)", fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif" }}>{title}</div>
      <p className="text-[11.5px] leading-snug" style={{ color: "var(--t-muted)" }}>{desc}</p>
    </Link>
  );
}

export default function VaultCoreHomePage() {
  return (
    <VCPageWrapper className="!max-w-none">
      <PageHeader
        sectionLabel="Vault Core · Private Operating System"
        title="Executive Command"
        description="The private AI operating system for Vault Co — executive intelligence, workforce, and everything awaiting human review."
        badge={<VCStatusBadge label="5 executives active" variant="success" dot />}
      />

      {/* Daily Executive Brief + Executive Queue */}
      <CommandHubExecutiveBrief />

      {/* Recommendations + System Proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CommandHubRecommendationsPanel />
        <CommandHubProposalsPanel />
      </div>

      {/* Draft Approval Queue */}
      <CommandHubDraftsPanel />

      {/* Modules */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0081f2" }}>Vault Core Modules</span>
        <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(0,129,242,0.28), transparent)" }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <ModuleTile href="/vault-core/identity" icon={Fingerprint} title="Identity Core" desc="Who Vault Co is, brand voice, and legacy learnings." />
        <ModuleTile href="/workforce" icon={Network} title="Workforce" desc="Five executives — reputation, objectives, and collaboration." />
        <ModuleTile href="/vault-memory" icon={Brain} title="Vault Memory" desc="The knowledge graph and intelligence signals." />
        <ModuleTile href="/runtime" icon={Activity} title="Runtime Activity" desc="The 24/7 continuous-operations feed and agent cycles." />
      </div>

      <p className="text-[10.5px] pt-1" style={{ color: "var(--t-dim)" }}>
        Read · analyze · recommend · draft — every action requires human review. No external systems are modified.
      </p>
    </VCPageWrapper>
  );
}
