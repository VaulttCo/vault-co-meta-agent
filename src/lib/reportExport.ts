/**
 * reportExport.ts
 * Utility functions for exporting and copying Veronica-generated reports.
 * Supports: Copy Client Narrative, Copy Full Report, Download Markdown,
 * Download JSON, Download PDF (browser print).
 */

import type { PersistedReport } from "@/lib/data/data-provider";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function safe(value: string | number | undefined | null, fallback = "—"): string {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function heading(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

function section(title: string, body: string | undefined | null): string {
  if (!body) return "";
  return `${title}\n\n${body}\n`;
}

function bulletList(items: string[]): string {
  if (!items || items.length === 0) return "";
  return items.map((i) => `- ${i}`).join("\n");
}

// ─────────────────────────────────────────────────────────────
// 1. Client-Ready Narrative (plain text, safe to paste to client)
// ─────────────────────────────────────────────────────────────

export function buildClientNarrative(report: PersistedReport): string {
  const gc = report.generatedContent;
  const clientName = report.clientName ?? report.clientId;
  const lines: string[] = [];

  lines.push(`${clientName} — ${safe(report.reportPeriod)}`);
  lines.push(`Prepared by Veronica | Vault Co`);
  lines.push("");

  if (gc?.executiveSummary) {
    lines.push("EXECUTIVE SUMMARY");
    lines.push(gc.executiveSummary);
    lines.push("");
  }

  if (gc?.winsSection) {
    lines.push("WINS THIS PERIOD");
    lines.push(gc.winsSection);
    lines.push("");
  }

  if (gc?.issuesSection) {
    lines.push("ISSUES & CHALLENGES");
    lines.push(gc.issuesSection);
    lines.push("");
  }

  if (gc?.nextActionsSection) {
    lines.push("NEXT ACTIONS");
    lines.push(gc.nextActionsSection);
    lines.push("");
  }

  if (gc?.clientReadyNarrative) {
    lines.push("CLIENT UPDATE");
    lines.push(gc.clientReadyNarrative);
    lines.push("");
  }

  return lines.join("\n").trim();
}

// ─────────────────────────────────────────────────────────────
// 2. Full Internal Report (plain text, includes KPIs + internal)
// ─────────────────────────────────────────────────────────────

export function buildFullReport(report: PersistedReport): string {
  const gc = report.generatedContent;
  const clientName = report.clientName ?? report.clientId;
  const lines: string[] = [];

  lines.push(`${gc?.reportTitle ?? `${clientName} — Report`}`);
  lines.push(`Client: ${clientName}`);
  lines.push(`Period: ${safe(report.reportPeriod)}`);
  lines.push(`Status: ${report.status}`);
  lines.push(`Prepared by Veronica | Vault Co`);
  lines.push(`Generated: ${new Date(report.createdAt).toLocaleString()}`);
  lines.push("");

  // KPIs
  lines.push("─── KPI SNAPSHOT ───────────────────────────────────");
  lines.push(`Leads:          ${safe(report.leads)}`);
  lines.push(`Booked:         ${safe(report.booked)}`);
  lines.push(`CPL:            ${safe(report.cpl)}`);
  lines.push(`Spend:          ${safe(report.spend)}`);
  lines.push(`CPBA:           ${safe(report.cpba)}`);
  lines.push(`Show Rate:      ${safe(report.showRate)}`);
  lines.push(`Pipeline Value: ${safe(report.pipelineValue)}`);
  lines.push(`Revenue:        ${safe(report.revenueGenerated)}`);
  lines.push("");

  if (gc?.executiveSummary) {
    lines.push("─── EXECUTIVE SUMMARY ──────────────────────────────");
    lines.push(gc.executiveSummary);
    lines.push("");
  }

  if (gc?.winsSection) {
    lines.push("─── WINS ───────────────────────────────────────────");
    lines.push(gc.winsSection);
    lines.push("");
  }

  if (gc?.issuesSection) {
    lines.push("─── ISSUES ─────────────────────────────────────────");
    lines.push(gc.issuesSection);
    lines.push("");
  }

  if (gc?.nextActionsSection) {
    lines.push("─── NEXT ACTIONS ───────────────────────────────────");
    lines.push(gc.nextActionsSection);
    lines.push("");
  }

  if (gc?.clientReadyNarrative) {
    lines.push("─── CLIENT-READY NARRATIVE ─────────────────────────");
    lines.push(gc.clientReadyNarrative);
    lines.push("");
  }

  if (gc?.agentRecommendations && gc.agentRecommendations.length > 0) {
    lines.push("─── VERONICA'S RECOMMENDATIONS ─────────────────────");
    gc.agentRecommendations.forEach((rec) => lines.push(`→ ${rec}`));
    lines.push("");
  }

  if (gc?.approvalNote) {
    lines.push("─── APPROVAL NOTE ──────────────────────────────────");
    lines.push(gc.approvalNote);
    lines.push("");
  }

  return lines.join("\n").trim();
}

// ─────────────────────────────────────────────────────────────
// 3. Markdown export
// ─────────────────────────────────────────────────────────────

export function buildMarkdown(report: PersistedReport): string {
  const gc = report.generatedContent;
  const clientName = report.clientName ?? report.clientId;
  const title = gc?.reportTitle ?? `${clientName} — Report`;
  const lines: string[] = [];

  lines.push(heading(1, title));
  lines.push("");
  lines.push(`**Client:** ${clientName}  `);
  lines.push(`**Period:** ${safe(report.reportPeriod)}  `);
  lines.push(`**Status:** ${report.status}  `);
  lines.push(`**Prepared by:** Veronica | Vault Co  `);
  lines.push(`**Generated:** ${new Date(report.createdAt).toLocaleString()}  `);
  lines.push("");

  // KPI table
  lines.push(heading(2, "KPI Snapshot"));
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| :--- | ---: |");
  lines.push(`| Leads | ${safe(report.leads)} |`);
  lines.push(`| Booked | ${safe(report.booked)} |`);
  lines.push(`| CPL | ${safe(report.cpl)} |`);
  lines.push(`| Spend | ${safe(report.spend)} |`);
  lines.push(`| CPBA | ${safe(report.cpba)} |`);
  lines.push(`| Show Rate | ${safe(report.showRate)} |`);
  lines.push(`| Pipeline Value | ${safe(report.pipelineValue)} |`);
  lines.push(`| Revenue Generated | ${safe(report.revenueGenerated)} |`);
  lines.push("");

  if (gc?.executiveSummary) {
    lines.push(section(heading(2, "Executive Summary"), gc.executiveSummary));
  }

  if (gc?.winsSection) {
    lines.push(section(heading(2, "Wins"), gc.winsSection));
  }

  if (gc?.issuesSection) {
    lines.push(section(heading(2, "Issues"), gc.issuesSection));
  }

  if (gc?.nextActionsSection) {
    lines.push(section(heading(2, "Next Actions"), gc.nextActionsSection));
  }

  if (gc?.clientReadyNarrative) {
    lines.push(section(heading(2, "Client-Ready Narrative"), gc.clientReadyNarrative));
  }

  if (gc?.agentRecommendations && gc.agentRecommendations.length > 0) {
    lines.push(heading(2, "Veronica's Recommendations"));
    lines.push("");
    lines.push(bulletList(gc.agentRecommendations));
    lines.push("");
  }

  if (gc?.approvalNote) {
    lines.push(heading(2, "Approval Note"));
    lines.push("");
    lines.push(`> ${gc.approvalNote}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("*Prepared by Veronica — Vault Co Internal Growth Portal*");

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// 4. JSON export
// ─────────────────────────────────────────────────────────────

export function buildJSON(report: PersistedReport): string {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    exportedBy: "Veronica | Vault Co",
    report: {
      id: report.id,
      clientId: report.clientId,
      clientName: report.clientName,
      reportType: report.reportType,
      reportPeriod: report.reportPeriod,
      reportPeriodStart: report.reportPeriodStart,
      reportPeriodEnd: report.reportPeriodEnd,
      status: report.status,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      kpis: {
        leads: report.leads,
        booked: report.booked,
        cpl: report.cpl,
        spend: report.spend,
        cpba: report.cpba,
        showRate: report.showRate,
        pipelineValue: report.pipelineValue,
        revenueGenerated: report.revenueGenerated,
      },
      wins: report.wins,
      issues: report.issues,
      nextActions: report.nextActions,
      generatedContent: report.generatedContent ?? null,
    },
  };
  return JSON.stringify(exportPayload, null, 2);
}

// ─────────────────────────────────────────────────────────────
// 5. PDF via browser print (no npm deps)
// ─────────────────────────────────────────────────────────────

export function triggerPDFPrint(report: PersistedReport): void {
  const gc = report.generatedContent;
  const clientName = report.clientName ?? report.clientId;
  const title = gc?.reportTitle ?? `${clientName} — Report`;

  const kpiRows = [
    ["Leads", safe(report.leads)],
    ["Booked", safe(report.booked)],
    ["CPL", safe(report.cpl)],
    ["Spend", safe(report.spend)],
    ["CPBA", safe(report.cpba)],
    ["Show Rate", safe(report.showRate)],
    ["Pipeline Value", safe(report.pipelineValue)],
    ["Revenue Generated", safe(report.revenueGenerated)],
  ]
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join("");

  function block(label: string, body: string | undefined | null): string {
    if (!body) return "";
    return `<div class="section"><h3>${label}</h3><p>${body.replace(/\n/g, "<br>")}</p></div>`;
  }

  function recList(recs: string[] | undefined): string {
    if (!recs || recs.length === 0) return "";
    return `<div class="section"><h3>Veronica's Recommendations</h3><ul>${recs
      .map((r) => `<li>${r}</li>`)
      .join("")}</ul></div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { margin: 1.5cm; size: A4; }
  body { font-family: Georgia, serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 18pt; margin-bottom: 4px; }
  h2 { font-size: 13pt; margin-top: 20px; margin-bottom: 4px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-bottom: 4px; }
  .meta { font-size: 9pt; color: #666; margin-bottom: 16px; }
  .brand { font-size: 9pt; color: #ff8400; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  td { padding: 5px 10px; border: 1px solid #ddd; font-size: 10pt; }
  td:first-child { font-weight: bold; color: #444; width: 40%; }
  .section { margin-top: 16px; }
  ul { margin: 6px 0 0 0; padding-left: 18px; }
  li { margin-bottom: 4px; }
  .narrative { background: #f9f9f9; border-left: 3px solid #ff8400; padding: 10px 14px; margin-top: 8px; }
  .approval { background: #fff8f0; border: 1px solid #ff8400; padding: 8px 12px; font-size: 9.5pt; color: #b35a00; margin-top: 16px; }
  footer { margin-top: 32px; font-size: 8pt; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
</style>
</head>
<body>
<div class="brand">Prepared by Veronica | Vault Co</div>
<h1>${title}</h1>
<div class="meta">
  Client: <strong>${clientName}</strong> &nbsp;|&nbsp;
  Period: <strong>${safe(report.reportPeriod)}</strong> &nbsp;|&nbsp;
  Status: <strong>${report.status}</strong> &nbsp;|&nbsp;
  Generated: ${new Date(report.createdAt).toLocaleString()}
</div>

<h2>KPI Snapshot</h2>
<table>${kpiRows}</table>

${block("Executive Summary", gc?.executiveSummary)}
${block("Wins", gc?.winsSection)}
${block("Issues", gc?.issuesSection)}
${block("Next Actions", gc?.nextActionsSection)}

${
  gc?.clientReadyNarrative
    ? `<div class="section"><h3>Client-Ready Narrative</h3><div class="narrative">${gc.clientReadyNarrative.replace(/\n/g, "<br>")}</div></div>`
    : ""
}

${recList(gc?.agentRecommendations)}

${
  gc?.approvalNote
    ? `<div class="approval"><strong>Approval Note:</strong> ${gc.approvalNote}</div>`
    : ""
}

<footer>Prepared by Veronica — Vault Co Internal Growth Portal &nbsp;|&nbsp; ${new Date().toLocaleDateString()}</footer>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 300);
}

// ─────────────────────────────────────────────────────────────
// Browser download helper
// ─────────────────────────────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Clipboard helper
// ─────────────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

// ─────────────────────────────────────────────────────────────
// Filename helper
// ─────────────────────────────────────────────────────────────

export function reportFilename(report: PersistedReport, ext: string): string {
  const slug = (report.clientName ?? report.clientId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const period = (report.reportPeriod ?? "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `veronica-report-${slug}-${period}.${ext}`;
}
