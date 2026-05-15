"use client";

import { useState, useEffect } from "react";
import {
  ListChecks,
  Plus,
  X,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Archive,
  ShieldCheck,
  Bot,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  User,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDataProvider } from "@/lib/data/data-provider";
import type { Client } from "@/lib/data";

// ── Types ─────────────────────────────────────────────────────

interface OperatorTask {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  description: string | null;
  taskType: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "blocked" | "done" | "archived";
  source: "manual" | "veronica";
  sourceAgent: string | null;
  sourceDraftId: string | null;
  dueDate: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Display maps ──────────────────────────────────────────────

const TASK_TYPE_LABELS: Record<string, string> = {
  integration: "Integration",
  creative: "Creative",
  campaign: "Campaign",
  ghl_workflow: "GHL Workflow",
  client_message: "Client Message",
  reporting: "Reporting",
  follow_up: "Follow-Up",
  sales_process: "Sales Process",
  data_cleanup: "Data Cleanup",
  internal_admin: "Internal Admin",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f59e0b",
  medium: "#0081f2",
  low: "#6b7a99",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived",
};

const AGENT_LABELS: Record<string, string> = {
  client_health: "Client Health",
  launch_readiness: "Launch Readiness",
  client_intelligence: "Client Intelligence",
  media_buyer: "Media Buyer",
  ghl_followup: "GHL Follow-Up",
  sales_conversion: "Sales Conversion",
  creative_strategist: "Creative Strategist",
  offer_messaging: "Offer & Messaging",
  reporting: "Reporting",
  operator_priority: "Operator Priority",
  client_retention: "Client Retention",
  upsell_opportunity: "Upsell Opportunity",
  capacity_scaling: "Capacity & Scaling",
  data_quality: "Data Quality",
  compliance_risk: "Compliance & Risk",
  landing_page_cro: "Landing Page CRO",
  appointment_setter: "Appointment Setter",
  client_communication: "Client Communication",
  ghl_workflow_builder: "GHL Workflow Builder",
};

// ── Task card ─────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusChange,
}: {
  task: OperatorTask;
  onStatusChange: (id: string, status: OperatorTask["status"]) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const priorityColor = PRIORITY_COLORS[task.priority] ?? "#6b7a99";

  const borderColor =
    task.priority === "urgent"
      ? "rgba(239, 68, 68, 0.25)"
      : task.priority === "high"
      ? "rgba(245, 158, 11, 0.20)"
      : task.status === "blocked"
      ? "rgba(239, 68, 68, 0.15)"
      : task.status === "in_progress"
      ? "rgba(34, 197, 94, 0.15)"
      : "var(--t-border)";

  const shortDesc = task.description
    ? task.description.length > 200
      ? task.description.slice(0, 200).trimEnd() + "…"
      : task.description
    : null;

  const formattedDate = new Date(task.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleStatus(status: OperatorTask["status"]) {
    setUpdating(true);
    try {
      await onStatusChange(task.id, status);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className="rounded-xl p-4 transition-colors"
      style={{
        backgroundColor: "var(--t-surface)",
        border: `1px solid ${borderColor}`,
        boxShadow: "var(--t-card-shadow)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Priority dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: priorityColor }}
          title={PRIORITY_LABELS[task.priority]}
        />

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {/* Priority badge */}
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
              style={{
                color: priorityColor,
                backgroundColor: `${priorityColor}12`,
                borderColor: `${priorityColor}28`,
              }}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>

            {/* Task type */}
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                color: "var(--t-dim)",
                backgroundColor: "var(--t-surface-2)",
                border: "1px solid var(--t-border)",
              }}
            >
              {TASK_TYPE_LABELS[task.taskType] ?? task.taskType}
            </span>

            {/* Status badge */}
            {task.status === "in_progress" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
                In Progress
              </span>
            )}
            {task.status === "blocked" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
                Blocked
              </span>
            )}
            {task.status === "done" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#6b7a99]/10 text-[#6b7a99] border border-[#6b7a99]/20">
                Done
              </span>
            )}

            {/* Source badge */}
            {task.source === "veronica" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#c9a84c]/08 text-[#c9a84c] border border-[#c9a84c]/20 flex items-center gap-1">
                <Bot size={8} />
                Veronica
                {task.sourceAgent && (
                  <span style={{ color: "var(--t-dim)" }}>
                    · {AGENT_LABELS[task.sourceAgent] ?? task.sourceAgent}
                  </span>
                )}
              </span>
            )}

            {/* Client */}
            {task.clientName && (
              <span className="text-[10px] font-semibold" style={{ color: "var(--t-muted)" }}>
                {task.clientId ? (
                  <Link href={`/clients/${task.clientId}`} className="hover:underline">
                    {task.clientName}
                  </Link>
                ) : (
                  task.clientName
                )}
              </span>
            )}
          </div>

          {/* Title */}
          <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>
            {task.title}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap mb-1.5" style={{ color: "var(--t-dim)" }}>
            <span className="text-[10px] flex items-center gap-1">
              <Clock size={9} />
              {formattedDate}
            </span>
            {task.dueDate && (
              <span className="text-[10px] flex items-center gap-1">
                <CalendarDays size={9} />
                Due {new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {task.assignedTo && (
              <span className="text-[10px] flex items-center gap-1">
                <User size={9} />
                {task.assignedTo}
              </span>
            )}
          </div>

          {/* Description */}
          {shortDesc && (
            <div className="mt-1.5">
              {expanded ? (
                <pre
                  className="text-[11px] leading-relaxed whitespace-pre-wrap break-words overflow-auto rounded-lg p-2.5"
                  style={{
                    color: "var(--t-muted)",
                    backgroundColor: "var(--t-surface-2)",
                    border: "1px solid var(--t-border)",
                    maxHeight: "320px",
                  }}
                >
                  {task.description}
                </pre>
              ) : (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  {shortDesc}
                </p>
              )}
              {task.description && task.description.length > 200 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 mt-1 text-[10px] font-medium"
                  style={{ color: "#6b7a99" }}
                >
                  {expanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                  {expanded ? "Collapse" : "Show full content"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end ml-2">
          {task.status === "open" && (
            <>
              <button
                disabled={updating}
                onClick={() => handleStatus("in_progress")}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#22c55e] border border-[#22c55e]/25 rounded-lg hover:bg-[#22c55e]/08 transition-colors disabled:opacity-50"
              >
                <Circle size={10} />
                Start
              </button>
              <button
                disabled={updating}
                onClick={() => handleStatus("blocked")}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#ef4444] border border-[#ef4444]/20 rounded-lg hover:bg-[#ef4444]/08 transition-colors disabled:opacity-50"
              >
                <AlertCircle size={10} />
                Blocked
              </button>
            </>
          )}
          {task.status === "in_progress" && (
            <>
              <button
                disabled={updating}
                onClick={() => handleStatus("blocked")}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#ef4444] border border-[#ef4444]/20 rounded-lg hover:bg-[#ef4444]/08 transition-colors disabled:opacity-50"
              >
                <AlertCircle size={10} />
                Blocked
              </button>
              <button
                disabled={updating}
                onClick={() => handleStatus("done")}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#22c55e] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <CheckCircle2 size={10} />
                Mark Done
              </button>
            </>
          )}
          {task.status === "blocked" && (
            <>
              <button
                disabled={updating}
                onClick={() => handleStatus("open")}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
                style={{ color: "var(--t-muted)", borderColor: "var(--t-border)" }}
              >
                Reopen
              </button>
              <button
                disabled={updating}
                onClick={() => handleStatus("in_progress")}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#22c55e] border border-[#22c55e]/25 rounded-lg hover:bg-[#22c55e]/08 transition-colors disabled:opacity-50"
              >
                Resume
              </button>
            </>
          )}
          {task.status === "done" && (
            <span className="flex items-center gap-1 text-[11px] text-[#22c55e] px-2.5 py-1 bg-[#22c55e]/08 border border-[#22c55e]/15 rounded-lg">
              <CheckCircle2 size={10} />
              Done
            </span>
          )}
          {task.status !== "archived" && task.status !== "done" && (
            <button
              disabled={updating}
              onClick={() => handleStatus("archived")}
              className="w-6 h-6 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50"
              style={{ borderColor: "var(--t-border)", color: "var(--t-dim)" }}
              title="Archive task"
            >
              <Archive size={11} />
            </button>
          )}
          {task.status === "done" && (
            <button
              disabled={updating}
              onClick={() => handleStatus("archived")}
              className="w-6 h-6 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50"
              style={{ borderColor: "var(--t-border)", color: "var(--t-dim)" }}
              title="Archive task"
            >
              <Archive size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Task Modal ────────────────────────────────────────────

interface NewTaskForm {
  clientId: string;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
}

const DEFAULT_FORM: NewTaskForm = {
  clientId: "",
  title: "",
  description: "",
  taskType: "internal_admin",
  priority: "medium",
  dueDate: "",
  assignedTo: "",
};

function NewTaskModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: Client[];
  onClose: () => void;
  onCreated: (task: OperatorTask) => void;
}) {
  const [form, setForm] = useState<NewTaskForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/operator-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId || undefined,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          taskType: form.taskType,
          priority: form.priority,
          source: "manual",
          dueDate: form.dueDate || undefined,
          assignedTo: form.assignedTo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create task.");
        return;
      }
      const client = clients.find((c) => c.id === form.clientId);
      onCreated({
        id: data.id ?? `mock-${Date.now()}`,
        clientId: form.clientId || null,
        clientName: client?.name ?? null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        taskType: form.taskType,
        priority: form.priority as OperatorTask["priority"],
        status: "open",
        source: "manual",
        sourceAgent: null,
        sourceDraftId: null,
        dueDate: form.dueDate || null,
        assignedTo: form.assignedTo.trim() || null,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-[13px] focus:outline-none transition-colors";
  const inputStyle = {
    backgroundColor: "var(--t-surface-2)",
    border: "1px solid var(--t-border)",
    color: "var(--t-text)",
  };
  const labelClass = "block text-[11px] font-semibold mb-1";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto"
          style={{
            backgroundColor: "var(--t-surface)",
            border: "1px solid var(--t-border)",
            maxHeight: "90vh",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "var(--t-border)" }}
          >
            <div className="flex items-center gap-2">
              <ListChecks size={15} className="text-[#c9a84c]" />
              <span className="text-[14px] font-semibold" style={{ color: "var(--t-text)" }}>
                New Operator Task
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ color: "var(--t-dim)" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Safety note */}
          <div className="mx-5 mt-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-[#c9a84c]/05 border border-[#c9a84c]/15">
            <ShieldCheck size={11} className="text-[#c9a84c] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] leading-snug" style={{ color: "var(--t-muted)" }}>
              Creating a task does not perform any external action. It is an internal tracking record only.
            </p>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            {/* Title */}
            <div>
              <label className={labelClass} style={{ color: "var(--t-muted)" }}>
                Title <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Connect Meta Ad Account for Kaczmar"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Client */}
            <div>
              <label className={labelClass} style={{ color: "var(--t-muted)" }}>
                Client (optional)
              </label>
              <select
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={{ color: "var(--t-muted)" }}>
                  Task Type
                </label>
                <select
                  value={form.taskType}
                  onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                >
                  {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--t-muted)" }}>
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Due date + Assigned to row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={{ color: "var(--t-muted)" }}>
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--t-muted)" }}>
                  Assign To (optional)
                </label>
                <input
                  type="text"
                  value={form.assignedTo}
                  onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                  placeholder="Name or email"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass} style={{ color: "var(--t-muted)" }}>
                Description (optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Task details, blockers, context…"
                className={inputClass + " resize-none"}
                style={inputStyle}
              />
            </div>

            {error && (
              <p className="text-[12px] text-[#ef4444]">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium border transition-colors"
                style={{ color: "var(--t-muted)", borderColor: "var(--t-border)" }}
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={submit}
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#c9a84c] text-black hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Section header ────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  color,
  count,
  collapsible,
  collapsed,
  onToggle,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  count: number;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const el = (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={13} style={{ color }} />
      <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t-dim)" }}>
        {title}
      </h3>
      {count > 0 && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
          style={{
            color,
            backgroundColor: `${color}15`,
            borderColor: `${color}28`,
          }}
        >
          {count}
        </span>
      )}
      {collapsible && (
        <span className="ml-auto text-[10px]" style={{ color: "var(--t-dim)" }}>
          {collapsed ? "Show ↓" : "Hide ↑"}
        </span>
      )}
    </div>
  );

  if (collapsible && onToggle) {
    return (
      <button onClick={onToggle} className="w-full text-left group">
        {el}
      </button>
    );
  }

  return el;
}

// ── Page ──────────────────────────────────────────────────────

export default function OperatorQueuePage() {
  const [tasks, setTasks] = useState<OperatorTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterClient, setFilterClient] = useState("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/operator-tasks")
        .then((r) => r.ok ? r.json() : { tasks: [] })
        .then((b) => b.tasks ?? []),
      getDataProvider().getClients(),
    ])
      .then(([taskData, clientData]) => {
        setTasks(taskData);
        setClients(clientData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: OperatorTask["status"]) {
    const res = await fetch(`/api/operator-tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    }
  }

  function handleCreated(task: OperatorTask) {
    setTasks((prev) => [task, ...prev]);
  }

  // Apply filters
  const filtered = tasks.filter((t) => {
    if (t.status === "archived" && !showArchived) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterType !== "all" && t.taskType !== filterType) return false;
    if (filterClient !== "all" && t.clientId !== filterClient) return false;
    return true;
  });

  // Group tasks
  const urgentHigh = filtered.filter(
    (t) =>
      ["urgent", "high"].includes(t.priority) &&
      !["done", "archived"].includes(t.status)
  );
  const openMedLow = filtered.filter(
    (t) => t.status === "open" && !["urgent", "high"].includes(t.priority)
  );
  const inProgress = filtered.filter(
    (t) => t.status === "in_progress" && !["urgent", "high"].includes(t.priority)
  );
  const blocked = filtered.filter(
    (t) => t.status === "blocked" && !["urgent", "high"].includes(t.priority)
  );
  const done = filtered.filter((t) => t.status === "done");

  const openCount = tasks.filter((t) => !["done", "archived"].includes(t.status)).length;
  const urgentCount = tasks.filter((t) => t.priority === "urgent" && t.status !== "archived").length;

  const selectClass = "text-[11px] px-2.5 py-1.5 rounded-lg border focus:outline-none";
  const selectStyle = {
    backgroundColor: "var(--t-surface)",
    border: "1px solid var(--t-border)",
    color: "var(--t-muted)",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Operator Queue"
        description={`${openCount} open task${openCount !== 1 ? "s" : ""}${urgentCount > 0 ? ` · ${urgentCount} urgent` : ""}`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold bg-[#c9a84c] text-black rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={12} />
            New Task
          </button>
        }
      />

      {/* Safety notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-[#c9a84c]/05 border border-[#c9a84c]/12 rounded-xl mb-5">
        <ShieldCheck size={13} className="text-[#c9a84c] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] leading-snug" style={{ color: "var(--t-muted)" }}>
          <span className="text-[#c9a84c] font-semibold">Internal tracking only: </span>
          Tasks in this queue are internal records. Marking a task done does not send, push, launch, or activate anything externally. All live actions require separate operator sign-off.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="all">All Types</option>
          {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="all">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div
          className="rounded-xl p-10 flex flex-col items-center text-center"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
        >
          <div className="text-[13px]" style={{ color: "var(--t-muted)" }}>Loading tasks…</div>
        </div>
      ) : tasks.length === 0 ? (
        /* Empty state */
        <div
          className="rounded-xl p-10 flex flex-col items-center text-center"
          style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ backgroundColor: "var(--t-surface-2)", border: "1px solid var(--t-border)" }}
          >
            <ListChecks size={16} style={{ color: "var(--t-dim)" }} />
          </div>
          <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>
            No operator tasks yet
          </div>
          <p className="text-[12px] mb-4" style={{ color: "var(--t-muted)" }}>
            Ask Veronica what needs to be done, then save tasks into the queue. Or create a task manually.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c] text-black text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={13} />
              New Task
            </button>
            <Link
              href="/ai-agent"
              className="flex items-center gap-2 px-4 py-2 border text-[12px] font-medium rounded-lg hover:opacity-80 transition-opacity"
              style={{ color: "var(--t-muted)", borderColor: "var(--t-border)" }}
            >
              <Bot size={13} />
              Open Veronica
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Urgent & High Priority */}
          {urgentHigh.length > 0 && (
            <section>
              <SectionHeader
                icon={AlertCircle}
                title="Urgent & High Priority"
                color="#ef4444"
                count={urgentHigh.length}
              />
              <div className="space-y-2.5">
                {urgentHigh.map((t) => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </section>
          )}

          {/* Open */}
          {openMedLow.length > 0 && (
            <section>
              <SectionHeader
                icon={Circle}
                title="Open"
                color="#0081f2"
                count={openMedLow.length}
              />
              <div className="space-y-2.5">
                {openMedLow.map((t) => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </section>
          )}

          {/* In Progress */}
          {inProgress.length > 0 && (
            <section>
              <SectionHeader
                icon={Clock}
                title="In Progress"
                color="#22c55e"
                count={inProgress.length}
              />
              <div className="space-y-2.5">
                {inProgress.map((t) => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </section>
          )}

          {/* Blocked */}
          {blocked.length > 0 && (
            <section>
              <SectionHeader
                icon={AlertCircle}
                title="Blocked"
                color="#ef4444"
                count={blocked.length}
              />
              <div className="space-y-2.5">
                {blocked.map((t) => (
                  <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </section>
          )}

          {/* Done — collapsed by default */}
          {done.length > 0 && (
            <section>
              <SectionHeader
                icon={CheckCircle2}
                title="Done"
                color="#6b7a99"
                count={done.length}
                collapsible
                collapsed={!showDone}
                onToggle={() => setShowDone((v) => !v)}
              />
              {showDone && (
                <div className="space-y-2.5">
                  {done.map((t) => (
                    <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Archived — hidden unless toggled */}
          {tasks.some((t) => t.status === "archived") && (
            <section>
              <SectionHeader
                icon={Archive}
                title="Archived"
                color="#6b7a99"
                count={tasks.filter((t) => t.status === "archived").length}
                collapsible
                collapsed={!showArchived}
                onToggle={() => setShowArchived((v) => !v)}
              />
              {showArchived && (
                <div className="space-y-2.5">
                  {tasks
                    .filter((t) => t.status === "archived")
                    .map((t) => (
                      <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                    ))}
                </div>
              )}
            </section>
          )}

          {/* No results for current filter */}
          {filtered.length === 0 && tasks.length > 0 && (
            <div
              className="rounded-xl p-8 flex flex-col items-center text-center"
              style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
            >
              <p className="text-[13px]" style={{ color: "var(--t-muted)" }}>
                No tasks match the current filters.
              </p>
            </div>
          )}
        </div>
      )}

      {/* New task modal */}
      {showModal && (
        <NewTaskModal
          clients={clients}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
