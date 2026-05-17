"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, Phone, DollarSign, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { clientStatusVariant } from "@/lib/data";
import type { Client } from "@/lib/data";
import { getDataProvider } from "@/lib/data/data-provider";
import type { ClientCreateInput } from "@/lib/data/data-provider";

// ── Shared input style ─────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--t-input-bg)",
  border: "1px solid var(--t-border)",
  color: "var(--t-text)",
  borderRadius: "8px",
};

const inputFocusStyle = {
  borderColor: "rgba(0, 129, 242, 0.40)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "var(--t-muted)",
  display: "block",
  marginBottom: "6px",
};

// ── Add Client Modal ──────────────────────────────────────────

function AddClientModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (client: Client) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientCreateInput>({
    name: "",
    owner: "",
    email: "",
    phone: "",
    market: "",
    services: [],
    monthlyBudget: "",
    avgJobValue: "",
    offer: "",
    status: "onboarding",
  });
  const [serviceInput, setServiceInput] = useState("");
  const [error, setError] = useState("");

  function set<K extends keyof ClientCreateInput>(key: K, value: ClientCreateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addService() {
    const trimmed = serviceInput.trim();
    if (!trimmed) return;
    set("services", [...(form.services ?? []), trimmed]);
    setServiceInput("");
  }

  function removeService(s: string) {
    set("services", (form.services ?? []).filter((x) => x !== s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.owner.trim()) {
      setError("Company name and owner name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const client = await getDataProvider().addClient(form);
      onSave(client);
    } catch (err) {
      setError("Failed to add client. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg shadow-2xl rounded-xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{
          backgroundColor: "var(--t-surface)",
          border: "1px solid var(--t-border)",
          boxShadow: "var(--t-dropdown-shadow)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--t-border-nav)" }}
        >
          <div>
            <div
              className="text-[15px] font-bold tracking-wide"
              style={{ fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif", color: "var(--t-text)" }}
            >
              Add New Client
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
              Fill in the basics — you can update everything else in the client profile.
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "#6b7a99" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              className="px-4 py-2.5 rounded-lg text-[12px]"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.20)",
                color: "#ef4444",
              }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Company Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Acme Roofing"
                className="w-full px-3 py-2 text-[13px] focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputFocusStyle)}
                onBlur={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputStyle)}
              />
            </div>
            <div>
              <label style={labelStyle}>Owner Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                value={form.owner}
                onChange={(e) => set("owner", e.target.value)}
                placeholder="John Smith"
                className="w-full px-3 py-2 text-[13px] focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputFocusStyle)}
                onBlur={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputStyle)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="john@company.com"
                className="w-full px-3 py-2 text-[13px] focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputFocusStyle)}
                onBlur={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputStyle)}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-3 py-2 text-[13px] focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputFocusStyle)}
                onBlur={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputStyle)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Market / City</label>
              <input
                type="text"
                value={form.market ?? ""}
                onChange={(e) => set("market", e.target.value)}
                placeholder="Phoenix, AZ"
                className="w-full px-3 py-2 text-[13px] focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputFocusStyle)}
                onBlur={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputStyle)}
              />
            </div>
            <div>
              <label style={labelStyle}>Monthly Budget</label>
              <input
                type="text"
                value={form.monthlyBudget ?? ""}
                onChange={(e) => set("monthlyBudget", e.target.value)}
                placeholder="$2,000/mo"
                className="w-full px-3 py-2 text-[13px] focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputFocusStyle)}
                onBlur={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputStyle)}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Services</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }}
                placeholder="Roof Replacement"
                className="flex-1 px-3 py-2 text-[13px] focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputFocusStyle)}
                onBlur={(e) => Object.assign((e.currentTarget as HTMLElement).style, inputStyle)}
              />
              <button
                type="button"
                onClick={addService}
                className="px-3 py-2 text-[12px] rounded-lg transition-colors"
                style={{
                  backgroundColor: "rgba(0, 129, 242, 0.10)",
                  border: "1px solid rgba(0, 129, 242, 0.20)",
                  color: "#0081f2",
                }}
              >
                Add
              </button>
            </div>
            {(form.services ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(form.services ?? []).map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                    style={{
                      color: "#ff8400",
                      backgroundColor: "rgba(255, 132, 0, 0.10)",
                      border: "1px solid rgba(255, 132, 0, 0.20)",
                    }}
                  >
                    {s}
                    <button type="button" onClick={() => removeService(s)} className="hover:text-white">
                      <X size={9} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as Client["status"])}
              className="w-full px-3 py-2 text-[13px] focus:outline-none transition-colors"
              style={inputStyle}
            >
              <option value="onboarding">Onboarding</option>
              <option value="setup">Setup</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-colors"
              style={{
                color: "#6b7a99",
                border: "1px solid rgba(0, 129, 242, 0.15)",
                backgroundColor: "transparent",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-[13px] font-semibold rounded-lg transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#ff8400" }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? "Adding…" : "Add Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

type FilterStatus = "All" | "Active" | "Setup" | "Onboarding" | "Paused";

export default function ClientsPage() {
  const router = useRouter();
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await getDataProvider().getClients();
        if (!cancelled) setAllClients(c);
      } catch {
        // fall through to empty state
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = allClients.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.owner.toLowerCase().includes(search.toLowerCase()) ||
      c.market.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" ||
      c.status.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const activeCount = allClients.filter((c) => c.status === "active").length;

  function handleClientAdded(client: Client) {
    setAllClients((prev) => [...prev, client]);
    setShowAddModal(false);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Clients"
        description={
          hasLoaded
            ? `${allClients.length} client${allClients.length !== 1 ? "s" : ""} · ${activeCount} active`
            : "Loading…"
        }
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white text-[13px] font-semibold rounded-lg transition-all"
            style={{ backgroundColor: "#ff8400", borderRadius: "6px" }}
          >
            <Plus size={14} />
            Add Client
          </button>
        }
      />

      {/* Search & filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-8 pr-3 py-2 text-[13px] focus:outline-none transition-colors rounded-lg"
            style={inputStyle}
          />
        </div>
        {(["All", "Active", "Setup", "Onboarding", "Paused"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={
              filter === f
                ? {
                    backgroundColor: "rgba(0, 129, 242, 0.10)",
                    border: "1px solid rgba(0, 129, 242, 0.22)",
                    color: "#f8f8f7",
                  }
                : { color: "#6b7a99", backgroundColor: "transparent" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--t-surface)",
          border: "1px solid var(--t-border)",
          boxShadow: "var(--t-card-shadow)",
        }}
      >
        {!hasLoaded ? (
          <div className="flex items-center justify-center py-16 text-[13px] gap-2" style={{ color: "var(--t-muted)" }}>
            <Loader2 size={14} className="animate-spin" />
            Loading clients…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--t-text)" }}>
              {search || filter !== "All" ? "No clients match your filter" : "No clients yet"}
            </div>
            <p className="text-[12px] mb-4" style={{ color: "var(--t-muted)" }}>
              {search || filter !== "All"
                ? "Try adjusting your search or filter."
                : "Add your first client to get started."}
            </p>
            {!search && filter === "All" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-white text-[12px] font-semibold rounded-lg"
                style={{ backgroundColor: "#ff8400" }}
              >
                <Plus size={13} />
                Add Client
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-[13px] min-w-[680px]">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--t-border-subtle)" }}>
                {["Client", "Market", "Status", "Budget", "Leads", "Booked", "CPL", "Avg. Job Value", ""].map(
                  (h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className={`px-4 py-3.5 text-[9px] font-bold uppercase tracking-widest ${
                        h === "Client" || h === "Market" ? "text-left" : h === "" ? "" : "text-right"
                      }`}
                      style={{ color: "var(--t-dim)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className="border-b transition-colors group cursor-pointer"
                  style={{
                    borderColor: i === filtered.length - 1 ? "transparent" : "var(--t-border-subtle)",
                  }}
                  onClick={() => router.push(`/clients/${c.id}`)}
                >
                  <td className="px-4 py-4">
                    <div className="font-semibold" style={{ color: "var(--t-text)" }}>{c.name}</div>
                    <div className="flex items-center gap-1 text-[10px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                      <Phone size={9} />
                      {c.owner} · {c.phone || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-4" style={{ color: "var(--t-muted)" }}>{c.market || "—"}</td>
                  <td className="px-4 py-4">
                    <Badge label={c.status} variant={clientStatusVariant[c.status]} />
                  </td>
                  <td className="px-4 py-4 text-right" style={{ color: "var(--t-text)" }}>{c.monthlyBudget || "—"}</td>
                  <td className="px-4 py-4 text-right font-semibold" style={{ color: "#0081f2" }}>
                    {c.stats.leads > 0 ? c.stats.leads : "—"}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold" style={{ color: "#22c55e" }}>
                    {c.stats.booked > 0 ? c.stats.booked : "—"}
                  </td>
                  <td className="px-4 py-4 text-right" style={{ color: "var(--t-text)" }}>{c.stats.cpl}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1" style={{ color: "var(--t-text)" }}>
                      <DollarSign size={10} style={{ color: "#ff8400" }} />
                      {(c.avgJobValue || "0").replace("$", "").replace(",", "")}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/clients/${c.id}`}
                      className="flex items-center gap-1 text-[11px] transition-colors opacity-0 group-hover:opacity-100"
                      style={{ color: "var(--t-muted)" }}
                    >
                      Open <ChevronRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSave={handleClientAdded}
        />
      )}
    </div>
  );
}
