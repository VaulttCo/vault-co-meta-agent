"use client";
import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  CalendarCheck,
  DollarSign,
  Sparkles,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Copy,
  FileJson,
  Printer,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";
import type { PersistedReport } from "@/lib/data/data-provider";
import { usePersistedReports } from "@/lib/usePersistedReports";
import type { WeeklyReportInput } from "@/lib/ai/service";
import {
  buildClientNarrative,
  buildFullReport,
  buildMarkdown,
  buildJSON,
  triggerPDFPrint,
  downloadFile,
  copyToClipboard,
  reportFilename,
} from "@/lib/reportExport";

// ── Helpers ───────────────────────────────────────────────────
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildReportInput(client: Client): WeeklyReportInput {
  return {
    clientId: client.id,
    clientName: client.name,
    reportPeriod: "May 2026 — Week 1",
    spend: client.stats.spend,
    leads: client.stats.leads,
    booked: client.stats.booked,
    cpl: client.stats.cpl,
    cpba: client.stats.cpba ?? "—",
    showRate: client.stats.showRate ?? "—",
    pipelineValue: client.stats.pipeline ?? "$0",
    revenueGenerated: client.stats.revenue ?? "$0",
    wins: [],
    issues: [],
    nextActions: [],
  };
}

// ── Export Action Bar ─────────────────────────────────────────
function ExportBar({ report }: { report: PersistedReport }) {
  const [copied, setCopied] = useState<"narrative" | "full" | null>(null);

  async function handleCopyNarrative() {
    const text = buildClientNarrative(report);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied("narrative");
      setTimeout(() => setCopied(null), 2000);
    }
  }

  async function handleCopyFull() {
    const text = buildFullReport(report);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied("full");
      setTimeout(() => setCopied(null), 2000);
    }
  }

  function handleDownloadMarkdown() {
    const md = buildMarkdown(report);
    downloadFile(md, reportFilename(report, "md"), "text/markdown;charset=utf-8");
  }

  function handleDownloadJSON() {
    const json = buildJSON(report);
    downloadFile(json, reportFilename(report, "json"), "application/json;charset=utf-8");
  }

  function handleDownloadPDF() {
    triggerPDFPrint(report);
  }

  const btnBase =
    "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-[#0a1220] border-t border-[rgba(0,129,242,0.15)] rounded-b-2xl">
      {/* Copy client narrative */}
      <button
        onClick={handleCopyNarrative}
        className={`${btnBase} ${
          copied === "narrative"
            ? "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/25"
            : "text-[#c8d4e8] bg-[#0f1a28] border-[rgba(0,129,242,0.2)] hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.35)]"
        }`}
        title="Copy client-ready narrative (Executive Summary, Wins, Issues, Next Actions, Client Update)"
      >
        {copied === "narrative" ? (
          <CheckCircle size={11} />
        ) : (
          <ClipboardList size={11} />
        )}
        {copied === "narrative" ? "Copied!" : "Copy Client Narrative"}
      </button>

      {/* Copy full internal report */}
      <button
        onClick={handleCopyFull}
        className={`${btnBase} ${
          copied === "full"
            ? "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/25"
            : "text-[#c8d4e8] bg-[#0f1a28] border-[rgba(0,129,242,0.2)] hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.35)]"
        }`}
        title="Copy full internal report including KPIs, Veronica recommendations, and approval note"
      >
        {copied === "full" ? (
          <CheckCircle size={11} />
        ) : (
          <Copy size={11} />
        )}
        {copied === "full" ? "Copied!" : "Copy Full Report"}
      </button>

      {/* Download Markdown */}
      <button
        onClick={handleDownloadMarkdown}
        className={`${btnBase} text-[#a78bfa] bg-[#a78bfa]/8 border-[#a78bfa]/20 hover:bg-[#a78bfa]/15 hover:border-[#a78bfa]/35`}
        title="Download as Markdown file (.md)"
      >
        <Download size={11} />
        Download .md
      </button>

      {/* Download JSON */}
      <button
        onClick={handleDownloadJSON}
        className={`${btnBase} text-[#0081f2] bg-[#0081f2]/8 border-[#0081f2]/20 hover:bg-[#0081f2]/15 hover:border-[#0081f2]/35`}
        title="Download as JSON file (.json)"
      >
        <FileJson size={11} />
        Download .json
      </button>

      {/* Download PDF */}
      <button
        onClick={handleDownloadPDF}
        className={`${btnBase} text-[#ff8400] bg-[#ff8400]/8 border-[#ff8400]/20 hover:bg-[#ff8400]/15 hover:border-[#ff8400]/35`}
        title="Open browser print dialog to save as PDF"
      >
        <Printer size={11} />
        Download PDF
      </button>
    </div>
  );
}

// ── Quick Export Dropdown (table row) ─────────────────────────
function QuickExportDropdown({ report }: { report: PersistedReport }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleCopyNarrative() {
    const text = buildClientNarrative(report);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    setOpen(false);
  }

  function handleDownloadMarkdown() {
    const md = buildMarkdown(report);
    downloadFile(md, reportFilename(report, "md"), "text/markdown;charset=utf-8");
    setOpen(false);
  }

  function handleDownloadJSON() {
    const json = buildJSON(report);
    downloadFile(json, reportFilename(report, "json"), "application/json;charset=utf-8");
    setOpen(false);
  }

  function handleDownloadPDF() {
    triggerPDFPrint(report);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
          copied
            ? "bg-[#22c55e]/10 border-[#22c55e]/25 text-[#22c55e]"
            : "bg-[#0f1a28] border-[rgba(0,129,242,0.15)] text-[#6b7a99] hover:text-[#f8f8f7]"
        }`}
        title="Export options"
      >
        {copied ? <CheckCircle size={12} /> : <Download size={12} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-48 bg-[#0D1520] border border-[rgba(0,129,242,0.2)] rounded-xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-[rgba(0,129,242,0.12)]">
            <span className="text-[9px] font-bold text-[#3d4f6e] uppercase tracking-widest">
              Export Report
            </span>
          </div>
          {[
            {
              label: "Copy Client Narrative",
              icon: ClipboardList,
              action: handleCopyNarrative,
              color: "#c8d4e8",
            },
            {
              label: "Download Markdown",
              icon: Download,
              action: handleDownloadMarkdown,
              color: "#a78bfa",
            },
            {
              label: "Download JSON",
              icon: FileJson,
              action: handleDownloadJSON,
              color: "#0081f2",
            },
            {
              label: "Download PDF",
              icon: Printer,
              action: handleDownloadPDF,
              color: "#ff8400",
            },
          ].map(({ label, icon: Icon, action, color }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-[#c8d4e8] hover:bg-[#0f1a28] transition-colors text-left"
            >
              <Icon size={12} style={{ color }} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── View Report Modal ─────────────────────────────────────────
function ViewReportModal({
  report,
  onClose,
}: {
  report: PersistedReport;
  onClose: () => void;
}) {
  const gc = report.generatedContent;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.2)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[rgba(0,129,242,0.15)] sticky top-0 bg-[#0D1520] z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={13} className="text-[#ff8400]" />
              <span className="text-[11px] text-[#ff8400] font-semibold uppercase tracking-widest">
                Prepared by Veronica
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-[#f8f8f7] leading-tight">
              {gc?.reportTitle ?? `${report.clientName ?? report.clientId} — Report`}
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[12px] text-[#6b7a99]">{report.reportPeriod}</span>
              <Badge
                label={report.status === "published" ? "Published" : "Draft"}
                variant={report.status === "published" ? "success" : "neutral"}
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] text-[#6b7a99] hover:text-[#f8f8f7] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* KPI Snapshot */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Leads", value: String(report.leads), color: "#0081f2" },
              { label: "Booked", value: String(report.booked), color: "#22c55e" },
              { label: "CPL", value: report.cpl, color: "#ff8400" },
              { label: "Spend", value: report.spend, color: "#a78bfa" },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-[#0a1220] border border-[rgba(0,129,242,0.12)] rounded-xl p-3 text-center"
              >
                <div className="text-[16px] font-bold" style={{ color: k.color }}>
                  {k.value}
                </div>
                <div className="text-[10px] text-[#6b7a99] mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {gc?.executiveSummary && (
            <div>
              <h3 className="text-[11px] font-bold text-[#3d4f6e] uppercase tracking-widest mb-2">
                Executive Summary
              </h3>
              <p className="text-[13px] text-[#c8d4e8] leading-relaxed">{gc.executiveSummary}</p>
            </div>
          )}

          {gc?.winsSection && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={13} className="text-[#22c55e]" />
                <h3 className="text-[11px] font-bold text-[#22c55e] uppercase tracking-widest">
                  Wins
                </h3>
              </div>
              <p className="text-[13px] text-[#c8d4e8] leading-relaxed">{gc.winsSection}</p>
            </div>
          )}

          {gc?.issuesSection && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={13} className="text-[#ff8400]" />
                <h3 className="text-[11px] font-bold text-[#ff8400] uppercase tracking-widest">
                  Issues
                </h3>
              </div>
              <p className="text-[13px] text-[#c8d4e8] leading-relaxed">{gc.issuesSection}</p>
            </div>
          )}

          {gc?.nextActionsSection && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ChevronRight size={13} className="text-[#0081f2]" />
                <h3 className="text-[11px] font-bold text-[#0081f2] uppercase tracking-widest">
                  Next Actions
                </h3>
              </div>
              <p className="text-[13px] text-[#c8d4e8] leading-relaxed">{gc.nextActionsSection}</p>
            </div>
          )}

          {gc?.agentRecommendations && gc.agentRecommendations.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-[#3d4f6e] uppercase tracking-widest mb-2">
                Veronica&apos;s Recommendations
              </h3>
              <ul className="space-y-1.5">
                {gc.agentRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[#c8d4e8]">
                    <span className="text-[#ff8400] mt-0.5 shrink-0">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gc?.clientReadyNarrative && (
            <div className="bg-[#0a1220] border border-[rgba(0,129,242,0.12)] rounded-xl p-4">
              <h3 className="text-[11px] font-bold text-[#3d4f6e] uppercase tracking-widest mb-3">
                Client-Ready Narrative
              </h3>
              <div className="text-[12px] text-[#c8d4e8] leading-relaxed whitespace-pre-wrap">
                {gc.clientReadyNarrative}
              </div>
            </div>
          )}

          {gc?.approvalNote && (
            <div className="flex items-start gap-2 p-3 bg-[#ff8400]/5 border border-[#ff8400]/20 rounded-lg">
              <AlertCircle size={13} className="text-[#ff8400] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#ff8400]/80">{gc.approvalNote}</p>
            </div>
          )}
        </div>

        {/* Export Action Bar — sticky at bottom of modal */}
        <div className="sticky bottom-0">
          <ExportBar report={report} />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ReportsPage() {
  const { reports, addReport, usingSupabase, loading } = usePersistedReports();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [viewReport, setViewReport] = useState<PersistedReport | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Load clients from Supabase (or mock in dev)
  useEffect(() => {
    const db = getDataProvider();
    db.getClients()
      .then(setClients)
      .catch((err) => {
        console.error("[ReportsPage] Failed to load clients:", err);
        setClients([]);
      })
      .finally(() => setClientsLoading(false));
  }, []);

  const getReportForClient = (clientId: string): PersistedReport | undefined =>
    reports.find((r) => r.clientId === clientId);

  async function handleGenerate(client: Client) {
    setGenerating((prev) => ({ ...prev, [client.id]: true }));
    try {
      const input = buildReportInput(client);
      const res = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const draft = result.report as any;

      if (result.mockMode && result.notice) {
        setAiNotice(result.notice);
      } else {
        setAiNotice(null);
      }

      const report: PersistedReport = {
        id: generateId(),
        clientId: client.id,
        clientName: client.name,
        reportType: "weekly",
        reportPeriod: input.reportPeriod,
        reportPeriodStart: today(),
        reportPeriodEnd: today(),
        spend: input.spend,
        leads: input.leads,
        booked: input.booked,
        cpl: input.cpl,
        cpba: input.cpba,
        showRate: input.showRate,
        pipelineValue: input.pipelineValue,
        revenueGenerated: input.revenueGenerated,
        wins: input.wins,
        issues: input.issues,
        nextActions: input.nextActions,
        generatedContent: draft,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addReport(report);
    } catch (err) {
      console.error("[ReportsPage] generate failed:", err);
    } finally {
      setGenerating((prev) => ({ ...prev, [client.id]: false }));
    }
  }

  async function handleGenerateAll() {
    for (const client of clients) {
      if (!getReportForClient(client.id)) {
        await handleGenerate(client);
      }
    }
  }

  // Summary stats from active Supabase clients
  const activeClients = clients.filter((c) => c.status === "active");
  const totalLeads = activeClients.reduce((sum, c) => sum + (c.stats?.leads ?? 0), 0);
  const totalBooked = activeClients.reduce((sum, c) => sum + (c.stats?.booked ?? 0), 0);
  const totalSpend = activeClients.reduce(
    (sum, c) => sum + parseInt((c.stats?.spend ?? "$0").replace(/\D/g, ""), 10),
    0
  );
  const avgCpl = totalLeads > 0 ? `$${(totalSpend / totalLeads).toFixed(2)}` : "—";
  const anyGenerating = Object.values(generating).some(Boolean);
  const isLoading = loading || clientsLoading;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {viewReport && (
        <ViewReportModal report={viewReport} onClose={() => setViewReport(null)} />
      )}

      <PageHeader
        title="Reports"
        description="Client performance reports — prepared by Veronica weekly"
        action={
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${
                usingSupabase
                  ? "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20"
                  : "text-[#ff8400] bg-[#ff8400]/10 border-[#ff8400]/20"
              }`}
            >
              {usingSupabase ? "Supabase" : "Local"}
            </span>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-lg text-[13px] text-[#6b7a99] hover:text-[#f8f8f7] hover:border-[rgba(0,129,242,0.25)] transition-colors">
              <Calendar size={13} />
              May 2026
            </button>
            {clients.length > 0 && (
              <button
                onClick={handleGenerateAll}
                disabled={anyGenerating || isLoading}
                className="flex items-center gap-2 px-4 py-2 vc-orange-gradient text-white text-[13px] font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {anyGenerating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FileText size={13} />
                )}
                Generate All
              </button>
            )}
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Leads (Active Clients)", value: isLoading ? "…" : String(totalLeads), icon: Users, color: "#0081f2" },
          { label: "Total Booked (MTD)", value: isLoading ? "…" : String(totalBooked), icon: CalendarCheck, color: "#22c55e" },
          { label: "Avg. CPL (All Active)", value: isLoading ? "…" : avgCpl, icon: TrendingUp, color: "#ff8400" },
          { label: "Total Spend (MTD)", value: isLoading ? "…" : `$${totalSpend.toLocaleString()}`, icon: DollarSign, color: "#a78bfa" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl p-4"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: `${s.color}15`, border: `1px solid ${s.color}28` }}
            >
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <div className="text-[18px] font-bold text-[#f8f8f7] tracking-tight">{s.value}</div>
            <div className="text-[11px] text-[#6b7a99] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI fallback notice banner */}
      {aiNotice && (
        <div className="flex items-start gap-3 p-3 bg-[#ff8400]/8 border border-[#ff8400]/25 rounded-xl">
          <AlertCircle size={14} className="text-[#ff8400] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[12px] text-[#ff8400] font-semibold">AI Fallback Active</p>
            <p className="text-[11px] text-[#ff8400]/75 mt-0.5">{aiNotice}</p>
          </div>
          <button onClick={() => setAiNotice(null)} className="text-[#ff8400]/50 hover:text-[#ff8400] transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Reports table */}
      <div className="bg-[#0D1520] border border-[rgba(0,129,242,0.15)] rounded-xl overflow-hidden">
        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(0,129,242,0.15)] text-[12px] text-[#6b7a99]">
            <Loader2 size={12} className="animate-spin" />
            Loading clients and reports…
          </div>
        )}

        {!isLoading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#0f1a28] border border-[rgba(0,129,242,0.15)] flex items-center justify-center mb-4">
              <FileText size={18} className="text-[#3d4f6e]" />
            </div>
            <div className="text-[14px] font-semibold text-[#f8f8f7] mb-2">No clients found</div>
            <p className="text-[12px] text-[#6b7a99] max-w-sm">
              Add clients in the Clients section to start generating weekly performance reports.
            </p>
          </div>
        )}

        {!isLoading && clients.length > 0 && (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[rgba(0,129,242,0.15)]">
                {["Client", "Report Period", "Status", "Leads", "Booked", "CPL", "Spend", ""].map(
                  (h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className={`px-4 py-3.5 text-[9px] font-bold text-[#3d4f6e] uppercase tracking-widest ${
                        h === "Client" || h === "Report Period"
                          ? "text-left"
                          : h === ""
                          ? ""
                          : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {clients.map((client, i) => {
                const persisted = getReportForClient(client.id);
                const isGenerating = generating[client.id] ?? false;
                const hasReport = !!persisted;
                const leads = persisted?.leads ?? client.stats?.leads ?? 0;
                const booked = persisted?.booked ?? client.stats?.booked ?? 0;
                const cpl = persisted?.cpl ?? client.stats?.cpl ?? "—";
                const spend = persisted?.spend ?? client.stats?.spend ?? "$0";

                return (
                  <tr
                    key={client.id}
                    className={`border-b border-[rgba(0,129,242,0.15)]/60 hover:bg-[#0f1a28]/60 transition-colors group ${
                      i === clients.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[#f8f8f7]">{client.name}</div>
                      {client.status !== "active" && (
                        <div className="text-[10px] text-[#6b7a99] mt-0.5 capitalize">
                          {client.status} — {hasReport ? "report generated" : "no data yet"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[#6b7a99]">
                      {persisted?.reportPeriod ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {isGenerating ? (
                        <div className="flex items-center gap-1.5">
                          <Loader2 size={11} className="animate-spin text-[#ff8400]" />
                          <span className="text-[11px] text-[#ff8400]">Generating…</span>
                        </div>
                      ) : hasReport ? (
                        <>
                          <Badge label="Ready" variant="success" />
                          <div className="flex items-center gap-1 mt-1">
                            <Sparkles size={9} className="text-[#ff8400]" />
                            <span className="text-[10px] text-[#6b7a99]">Prepared by Veronica</span>
                          </div>
                        </>
                      ) : (
                        <Badge label="No data" variant="neutral" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {leads > 0 ? (
                        <span className="text-[#0081f2] font-semibold">{leads}</span>
                      ) : (
                        <span className="text-[#3d4f6e]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {booked > 0 ? (
                        <span className="text-[#22c55e] font-semibold">{booked}</span>
                      ) : (
                        <span className="text-[#3d4f6e]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#f8f8f7]">{cpl}</td>
                    <td className="px-4 py-3.5 text-right text-[#f8f8f7]">
                      {spend !== "$0" ? spend : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasReport ? (
                          <>
                            <button
                              onClick={() => setViewReport(persisted!)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#0081f2] bg-[#0081f2]/10 border border-[#0081f2]/20 rounded-md hover:bg-[#0081f2]/18 transition-colors"
                            >
                              View
                            </button>
                            <QuickExportDropdown report={persisted!} />
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenerate(client)}
                            disabled={isGenerating}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#ff8400] bg-[#ff8400]/10 border border-[#ff8400]/20 rounded-md hover:bg-[#ff8400]/18 transition-colors disabled:opacity-50"
                          >
                            {isGenerating ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Sparkles size={10} />
                            )}
                            Generate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
