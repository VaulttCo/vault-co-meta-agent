"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Phone, DollarSign, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { VCSearchInput, VCFilterBar } from "@/components/ui/VaultUI";
import { clientStatusVariant } from "@/lib/data";
import type { Client } from "@/lib/data";
import { getDataProvider } from "@/lib/data/data-provider";
import type { ClientCreateInput } from "@/lib/data/data-provider";

// Form label style — use vc-label class (globals.css) plus display:block and margin
const labelCls = "vc-label block mb-1.5";

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
              <label className={labelCls}>Company Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Acme Roofing"
                className="vc-input px-3 py-2"
              />
            </div>
            <div>
              <label className={labelCls}>Owner Name <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                value={form.owner}
                onChange={(e) => set("owner", e.target.value)}
                placeholder="John Smith"
                className="vc-input px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="john@company.com"
                className="vc-input px-3 py-2"
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(555) 000-0000"
                className="vc-input px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Market / City</label>
              <input
                type="text"
                value={form.market ?? ""}
                onChange={(e) => set("market", e.target.value)}
                placeholder="Phoenix, AZ"
                className="vc-input px-3 py-2"
              />
            </div>
            <div>
              <label className={labelCls}>Monthly Budget</label>
              <input
                type="text"
                value={form.monthlyBudget ?? ""}
                onChange={(e) => set("monthlyBudget", e.target.value)}
                placeholder="$2,000/mo"
                className="vc-input px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Services</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }}
                placeholder="Roof Replacement"
                className="vc-input flex-1 px-3 py-2"
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
            <label className={labelCls}>Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as Client["status"])}
              className="vc-input px-3 py-2"
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
        sectionLabel="Vault Co CRM"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white text-[12px] font-semibold rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: "#ff8400" }}
          >
            <Plus size={13} />
            Add Client
          </button>
        }
      />

      {/* Search & filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
        <VCSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search clients…"
          className="flex-1 min-w-[160px] max-w-xs"
        />
        <VCFilterBar
          options={["All", "Active", "Setup", "Onboarding", "Paused"] as FilterStatus[]}
          active={filter}
          onChange={setFilter}
        />
      </div>

      {/* Table */}
      <div className="vc-panel">
        {!hasLoaded ? (
          <div className="flex items-center justify-center py-16 text-[13px] gap-2" style={{ color: "var(--t-muted)" }}>
            <Loader2 size={14} className="animate-spin" />
            Loading clients…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(0,129,242,0.06)", border: "1px solid rgba(0,129,242,0.14)" }}
            >
              <Phone size={16} style={{ color: "var(--t-dim)" }} />
            </div>
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
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[680px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--t-border-subtle)" }}>
                  {/* Status indicator column */}
                  <th className="w-1 p-0" />
                  {["Client", "Market", "Status", "Budget", "Leads", "Booked", "CPL", "Avg. Job Value", ""].map(
                    (h, i) => (
                      <th
                        key={`${h}-${i}`}
                        className={`px-4 py-3 text-[9px] font-bold uppercase tracking-widest ${
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
                {filtered.map((c, i) => {
                  const statusColor =
                    c.status === "active"      ? "#22c55e" :
                    c.status === "setup"       ? "#0081f2" :
                    c.status === "onboarding"  ? "#ff8400" :
                    c.status === "paused"      ? "#f59e0b" :
                                                 "#3d4f6e";
                  return (
                    <tr
                      key={c.id}
                      className="vc-table-row border-b group"
                      style={{
                        borderColor: i === filtered.length - 1 ? "transparent" : "var(--t-border-subtle)",
                      }}
                      onClick={() => router.push(`/clients/${c.id}`)}
                    >
                      {/* Status indicator bar */}
                      <td className="p-0 w-1">
                        <div
                          className="w-[3px] h-full min-h-[52px] rounded-r"
                          style={{ backgroundColor: statusColor, opacity: 0.7 }}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[13px]" style={{ color: "var(--t-text)" }}>{c.name}</div>
                        <div className="flex items-center gap-1 text-[10px] mt-0.5" style={{ color: "var(--t-muted)" }}>
                          <Phone size={9} />
                          {c.owner} · {c.phone || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[12px]" style={{ color: "var(--t-muted)" }}>{c.market || "—"}</td>
                      <td className="px-4 py-3.5">
                        <Badge label={c.status} variant={clientStatusVariant[c.status]} />
                      </td>
                      <td className="px-4 py-3.5 text-right text-[12px]" style={{ color: "var(--t-text)" }}>{c.monthlyBudget || "—"}</td>
                      <td className="px-4 py-3.5 text-right text-[13px] font-semibold" style={{ color: "#0081f2" }}>
                        {c.stats.leads > 0 ? c.stats.leads : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[13px] font-semibold" style={{ color: "#22c55e" }}>
                        {c.stats.booked > 0 ? c.stats.booked : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[12px]" style={{ color: "var(--t-text)" }}>{c.stats.cpl}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 text-[12px]" style={{ color: "var(--t-text)" }}>
                          <DollarSign size={10} style={{ color: "#ff8400" }} />
                          {(c.avgJobValue || "0").replace("$", "").replace(",", "")}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/clients/${c.id}`}
                          className="flex items-center gap-1 text-[11px] transition-opacity opacity-0 group-hover:opacity-70 whitespace-nowrap"
                          style={{ color: "var(--t-muted)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open <ChevronRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
