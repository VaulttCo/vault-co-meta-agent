"use client";

import { useState, useEffect } from "react";
import { Plus, Search, ChevronRight, Phone, DollarSign, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { clientStatusVariant } from "@/lib/data";
import type { Client } from "@/lib/data";
import { getDataProvider } from "@/lib/data/data-provider";
import type { ClientCreateInput } from "@/lib/data/data-provider";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#13151c] border border-[#2a2e42] rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2438]">
          <div>
            <div className="text-sm font-semibold text-[#eef1f8]">Add New Client</div>
            <div className="text-[11px] text-[#5a6278] mt-0.5">
              Fill in the basics — you can update everything else in the client profile.
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#5a6278] hover:text-[#eef1f8] hover:bg-[#1c2438] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 bg-[#ef4444]/10 border border-[#ef4444]/25 rounded-lg text-[12px] text-[#ef4444]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5a6278] uppercase tracking-wide mb-1.5">
                Company Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Acme Roofing"
                className="w-full px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#3d4460] focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#5a6278] uppercase tracking-wide mb-1.5">
                Owner Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                value={form.owner}
                onChange={(e) => set("owner", e.target.value)}
                placeholder="John Smith"
                className="w-full px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#3d4460] focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5a6278] uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="john@company.com"
                className="w-full px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#3d4460] focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#5a6278] uppercase tracking-wide mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#3d4460] focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5a6278] uppercase tracking-wide mb-1.5">
                Market / City
              </label>
              <input
                type="text"
                value={form.market ?? ""}
                onChange={(e) => set("market", e.target.value)}
                placeholder="Phoenix, AZ"
                className="w-full px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#3d4460] focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#5a6278] uppercase tracking-wide mb-1.5">
                Monthly Budget
              </label>
              <input
                type="text"
                value={form.monthlyBudget ?? ""}
                onChange={(e) => set("monthlyBudget", e.target.value)}
                placeholder="$2,000/mo"
                className="w-full px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#3d4460] focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5a6278] uppercase tracking-wide mb-1.5">
              Services
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }}
                placeholder="Roof Replacement"
                className="flex-1 px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#3d4460] focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
              />
              <button
                type="button"
                onClick={addService}
                className="px-3 py-2 bg-[#1c2438] hover:bg-[#263050] text-[#eef1f8] text-[12px] rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            {(form.services ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(form.services ?? []).map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/25 rounded-full"
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
            <label className="block text-[11px] font-semibold text-[#5a6278] uppercase tracking-wide mb-1.5">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as Client["status"])}
              className="w-full px-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
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
              className="flex-1 py-2.5 text-[13px] font-medium text-[#5a6278] border border-[#1c2438] rounded-lg hover:text-[#eef1f8] hover:border-[#263050] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 vc-orange-gradient text-white text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
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
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    getDataProvider()
      .getClients()
      .then((c) => { setAllClients(c); setHasLoaded(true); })
      .catch(() => setHasLoaded(true));
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
            className="flex items-center gap-2 px-4 py-2 vc-orange-gradient text-white text-[13px] font-semibold rounded-lg transition-opacity hover:opacity-90"
          >
            <Plus size={14} />
            Add Client
          </button>
        }
      />

      {/* Search & filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6278]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-8 pr-3 py-2 bg-[#0c0f15] border border-[#1c2438] rounded-lg text-[13px] text-[#eef1f8] placeholder-[#5a6278] focus:outline-none focus:border-[#18b8f0]/40 transition-colors"
          />
        </div>
        {(["All", "Active", "Setup", "Onboarding", "Paused"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              filter === f
                ? "bg-[#131720] border border-[#263050] text-[#eef1f8]"
                : "text-[#5a6278] hover:text-[#eef1f8]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl overflow-hidden">
        {!hasLoaded ? (
          <div className="flex items-center justify-center py-16 text-[#5a6278] text-[13px] gap-2">
            <Loader2 size={14} className="animate-spin" />
            Loading clients…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[13px] font-semibold text-[#eef1f8] mb-1">
              {search || filter !== "All" ? "No clients match your filter" : "No clients yet"}
            </div>
            <p className="text-[12px] text-[#5a6278] mb-4">
              {search || filter !== "All"
                ? "Try adjusting your search or filter."
                : "Add your first client to get started."}
            </p>
            {!search && filter === "All" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 vc-orange-gradient text-white text-[12px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus size={13} />
                Add Client
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#1c2438]">
                {["Client", "Market", "Status", "Budget", "Leads", "Booked", "CPL", "Avg. Job Value", ""].map(
                  (h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className={`px-4 py-3.5 text-[9px] font-bold text-[#3d4460] uppercase tracking-widest ${
                        h === "Client" || h === "Market" ? "text-left" : h === "" ? "" : "text-right"
                      }`}
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
                  className={`border-b border-[#1c2438]/60 hover:bg-[#131720]/60 transition-colors group ${
                    i === filtered.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="font-semibold text-[#eef1f8]">{c.name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-[#5a6278] mt-0.5">
                      <Phone size={9} />
                      {c.owner} · {c.phone || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[#5a6278]">{c.market || "—"}</td>
                  <td className="px-4 py-4">
                    <Badge label={c.status} variant={clientStatusVariant[c.status]} />
                  </td>
                  <td className="px-4 py-4 text-right text-[#eef1f8]">{c.monthlyBudget || "—"}</td>
                  <td className="px-4 py-4 text-right text-[#18b8f0] font-semibold">
                    {c.stats.leads > 0 ? c.stats.leads : "—"}
                  </td>
                  <td className="px-4 py-4 text-right text-[#22c55e] font-semibold">
                    {c.stats.booked > 0 ? c.stats.booked : "—"}
                  </td>
                  <td className="px-4 py-4 text-right text-[#eef1f8]">{c.stats.cpl}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 text-[#eef1f8]">
                      <DollarSign size={10} className="text-[#f07820]" />
                      {(c.avgJobValue || "0").replace("$", "").replace(",", "")}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/clients/${c.id}`}
                      className="flex items-center gap-1 text-[11px] text-[#5a6278] hover:text-[#18b8f0] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Open <ChevronRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
