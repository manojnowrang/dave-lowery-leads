import React, { useEffect, useMemo, useState } from "react";

const GOLD = "#C8952D";
const RED = "#D71920";

const leadTypeLabels = {
  buy: "Buyer",
  sell: "Seller",
  invest: "Investor",
  market_report: "Market Report",
};

const pipelineStages = ["new", "contacted", "showing", "offer", "closed"];

const stageLabels = {
  new: "New",
  contacted: "Contacted",
  showing: "Showing",
  offer: "Offer",
  closed: "Closed",
};

const priorityLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

function getSupabaseClient() {
  if (typeof globalThis === "undefined") return null;
  if (globalThis.supabaseClient) return globalThis.supabaseClient;
  if (globalThis.supabase) return globalThis.supabase;
  return null;
}

function normalizeLead(lead) {
  return {
    id: lead.id,
    lead_type: lead.lead_type || "unknown",
    first_name: lead.first_name || "",
    last_name: lead.last_name || "",
    email: lead.email || "",
    phone: lead.phone || "",
    preferred_area: lead.preferred_area || "",
    price_range: lead.price_range || "",
    home_type: lead.home_type || "",
    timeline: lead.timeline || "",
    mortgage_status: lead.mortgage_status || "",
    property_address: lead.property_address || "",
    neighbourhood: lead.neighbourhood || "",
    estimated_value: lead.estimated_value || "",
    reason_selling: lead.reason_selling || "",
    investment_budget: lead.investment_budget || "",
    investment_goal: lead.investment_goal || "",
    message: lead.message || "",
    notes: lead.notes || "",
    status: lead.status || "new",
    priority: lead.priority || "warm",
    submitted_at: lead.submitted_at || null,
    contacted_at: lead.contacted_at || null,
  };
}

function filterLeads(leads, search, typeFilter, statusFilter, priorityFilter) {
  const term = search.toLowerCase().trim();

  return leads.filter((lead) => {
    const fullName = `${lead.first_name || ""} ${lead.last_name || ""}`.toLowerCase();
    const searchable = [
      fullName,
      lead.email,
      lead.phone,
      lead.preferred_area,
      lead.property_address,
      lead.neighbourhood,
      lead.message,
      lead.notes,
      lead.priority,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!term || searchable.includes(term)) &&
      (typeFilter === "all" || lead.lead_type === typeFilter) &&
      (statusFilter === "all" || (lead.status || "new") === statusFilter) &&
      (priorityFilter === "all" || (lead.priority || "warm") === priorityFilter)
    );
  });
}

function calculateStats(leads) {
  return {
    total: leads.length,
    buyers: leads.filter((lead) => lead.lead_type === "buy").length,
    sellers: leads.filter((lead) => lead.lead_type === "sell").length,
    investors: leads.filter((lead) => lead.lead_type === "invest").length,
    marketReports: leads.filter((lead) => lead.lead_type === "market_report").length,
    newLeads: leads.filter((lead) => (lead.status || "new") === "new").length,
    hotLeads: leads.filter((lead) => (lead.priority || "warm") === "hot").length,
  };
}

function getNextStage(currentStatus) {
  const currentIndex = pipelineStages.indexOf(currentStatus || "new");
  if (currentIndex < 0) return "contacted";
  return pipelineStages[Math.min(currentIndex + 1, pipelineStages.length - 1)];
}

function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function cleanPhone(phone) {
  return String(phone || "").replace(/[^0-9+]/g, "");
}

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let intervalId;

    async function checkAuthAndLoad() {
      const supabase = getSupabaseClient();

      if (!supabase) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        window.location.href = "/login";
        return;
      }

      setAuthChecking(false);
      await fetchLeads();

      intervalId = setInterval(fetchLeads, 10000);
    }

    checkAuthAndLoad();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  async function fetchLeads() {
    setLoading(true);
    setErrorMessage("");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMessage("Supabase is not connected.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Dashboard fetch error:", error);
      setErrorMessage("Could not load leads from Supabase. Check the leads table, RLS policies, and submitted_at column.");
      setLoading(false);
      return;
    }

    setLeads((data || []).map(normalizeLead));
    setLastUpdated(new Date());
    setLoading(false);
  }

  async function updateLead(id, updates) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMessage("Supabase is not connected.");
      return;
    }

    const { error } = await supabase.from("leads").update(updates).eq("id", id);

    if (error) {
      console.error("Lead update error:", error);
      setErrorMessage("Could not update lead. Confirm columns exist and update policy is allowed.");
      return;
    }

    setLeads((current) =>
      current.map((lead) => (lead.id === id ? normalizeLead({ ...lead, ...updates }) : lead))
    );

    setSelectedLead((current) =>
      current && current.id === id ? normalizeLead({ ...current, ...updates }) : current
    );

    await fetchLeads();
  }

  async function advanceLeadStage(lead) {
    const nextStage = getNextStage(lead.status || "new");
    await updateLead(lead.id, {
      status: nextStage,
      contacted_at: nextStage === "contacted" ? new Date().toISOString() : lead.contacted_at,
    });
  }

  async function updatePriority(id, priority) {
    await updateLead(id, { priority });
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const filteredLeads = useMemo(
    () => filterLeads(leads, search, typeFilter, statusFilter, priorityFilter),
    [leads, search, typeFilter, statusFilter, priorityFilter]
  );

  const stats = useMemo(() => calculateStats(leads), [leads]);

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] text-white">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: GOLD }}>
            Dave Lowery Admin
          </p>
          <h1 className="mt-3 text-3xl font-black">Checking secure access...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute left-[-140px] top-1/3 h-96 w-96 rounded-full bg-blue-900/25 blur-3xl" />
        <div className="absolute bottom-[-180px] right-1/4 h-96 w-96 rounded-full bg-red-900/20 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Header refresh={fetchLeads} lastUpdated={lastUpdated} signOut={signOut} />

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-100">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
          <StatCard label="Total Leads" value={stats.total} accent={GOLD} />
          <StatCard label="New Leads" value={stats.newLeads} accent="#38BDF8" />
          <StatCard label="Hot Leads" value={stats.hotLeads} accent="#EF4444" />
          <StatCard label="Buyers" value={stats.buyers} accent="#22C55E" />
          <StatCard label="Sellers" value={stats.sellers} accent={RED} />
          <StatCard label="Investors" value={stats.investors} accent="#A855F7" />
          <StatCard label="Reports" value={stats.marketReports} accent="#F97316" />
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: GOLD }}>
                Lead Command Centre
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Client Pipeline</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:min-w-[760px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, email..."
                className="min-h-[44px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-amber-400"
              />

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="min-h-[44px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-amber-400"
              >
                <option value="all">All Lead Types</option>
                <option value="buy">Buyers</option>
                <option value="sell">Sellers</option>
                <option value="invest">Investors</option>
                <option value="market_report">Market Reports</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-[44px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-amber-400"
              >
                <option value="all">All Stages</option>
                {pipelineStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stageLabels[stage]}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="min-h-[44px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-amber-400"
              >
                <option value="all">All Priorities</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center text-white/60">
                Loading Dave’s leads...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center text-center text-white/60">
                No leads match this view.
              </div>
            ) : (
              <div className="grid gap-3 p-3">
                {filteredLeads.map((lead) => (
                  <LeadRowCard
                    key={lead.id}
                    lead={lead}
                    openLead={() => setSelectedLead(lead)}
                    advanceLeadStage={advanceLeadStage}
                    updatePriority={updatePriority}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedLead ? (
        <LeadDrawer lead={selectedLead} close={() => setSelectedLead(null)} updateLead={updateLead} />
      ) : null}
    </div>
  );
}

function Header({ refresh, lastUpdated, signOut }) {
  return (
    <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: GOLD }}>
          Dave Lowery Admin
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Lead Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
          A high-performance client pipeline for buyers, sellers, investors, and Winnipeg market report prospects.
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-white/35">
          Auto-refreshes every 10 seconds {lastUpdated ? `• Last updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="/"
          className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/15"
        >
          Lead Form
        </a>
        <button
          onClick={refresh}
          className="rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-xl transition hover:-translate-y-0.5"
          style={{ backgroundColor: GOLD }}
        >
          Refresh Leads
        </button>
        <button
          onClick={signOut}
          className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-red-100 transition hover:bg-red-500/20"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur">
      <div className="mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: accent }} />
      <p className="text-4xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
    </div>
  );
}

function LeadRowCard({ lead, openLead, advanceLeadStage, updatePriority }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/[0.04] lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_0.8fr_1fr] lg:items-center">
      <button type="button" onClick={openLead} className="text-left">
        <p className="font-black text-white">
          {lead.first_name || "Unknown"} {lead.last_name || ""}
        </p>
        <p className="mt-1 line-clamp-1 text-sm text-white/45">
          {lead.message || lead.notes || "Click to view/edit lead"}
        </p>
      </button>

      <div className="flex flex-wrap gap-2">
        <LeadBadge type={lead.lead_type} />
        <StatusPill status={lead.status || "new"} />
      </div>

      <div className="text-sm">
        {lead.phone ? (
          <a className="block font-bold text-white/90 hover:text-emerald-200" href={`tel:${cleanPhone(lead.phone)}`}>
            {lead.phone}
          </a>
        ) : (
          <span className="font-bold text-white/50">No phone</span>
        )}
        {lead.email ? (
          <a className="block text-white/45 hover:text-blue-200" href={`mailto:${lead.email}`}>
            {lead.email}
          </a>
        ) : (
          <span className="block text-white/35">No email</span>
        )}
        {lead.phone ? (
          <a className="mt-1 block text-xs font-black uppercase tracking-wide text-amber-200" href={`sms:${cleanPhone(lead.phone)}`}>
            Text Lead
          </a>
        ) : null}
      </div>

      <div className="text-sm">
        <p className="font-bold text-white/90">{lead.preferred_area || lead.neighbourhood || "Not specified"}</p>
        <p className="text-white/45">{lead.timeline || "No timeline"}</p>
      </div>

      <select
        value={lead.priority || "warm"}
        onChange={(event) => updatePriority(lead.id, event.target.value)}
        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-black uppercase tracking-wide text-white outline-none focus:border-amber-400"
      >
        <option value="hot">Hot</option>
        <option value="warm">Warm</option>
        <option value="cold">Cold</option>
      </select>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button
          type="button"
          onClick={openLead}
          className="rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-blue-100 transition hover:bg-blue-400/20"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => advanceLeadStage(lead)}
          disabled={(lead.status || "new") === "closed"}
          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {(lead.status || "new") === "closed" ? "✓ Closed" : `Move: ${stageLabels[getNextStage(lead.status || "new")]}`}
        </button>
      </div>
    </div>
  );
}

function LeadBadge({ type }) {
  const styles = {
    buy: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    sell: "border-red-400/30 bg-red-400/10 text-red-200",
    invest: "border-purple-400/30 bg-purple-400/10 text-purple-200",
    market_report: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${styles[type] || "border-white/20 bg-white/10 text-white/70"}`}>
      {leadTypeLabels[type] || type || "Unknown"}
    </span>
  );
}

function PriorityPill({ priority }) {
  const styles = {
    hot: "border-red-400/40 bg-red-500/15 text-red-200",
    warm: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    cold: "border-slate-400/30 bg-slate-500/10 text-slate-200",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${styles[priority] || styles.warm}`}>
      {priorityLabels[priority] || "Warm"}
    </span>
  );
}

function StatusPill({ status }) {
  const styles = {
    new: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    contacted: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    showing: "border-blue-400/30 bg-blue-400/10 text-blue-200",
    offer: "border-purple-400/30 bg-purple-400/10 text-purple-200",
    closed: "border-white/30 bg-white/15 text-white",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${styles[status] || styles.new}`}>
      {stageLabels[status] || status}
    </span>
  );
}

function LeadDrawer({ lead, close, updateLead }) {
  const [editing, setEditing] = useState({ ...lead });
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setEditing((current) => ({ ...current, [field]: value }));
  }

  async function saveDrawerChanges() {
    setSaving(true);

    await updateLead(lead.id, {
      first_name: editing.first_name,
      last_name: editing.last_name,
      email: editing.email,
      phone: editing.phone,
      lead_type: editing.lead_type,
      preferred_area: editing.preferred_area,
      price_range: editing.price_range,
      home_type: editing.home_type,
      timeline: editing.timeline,
      mortgage_status: editing.mortgage_status,
      property_address: editing.property_address,
      neighbourhood: editing.neighbourhood,
      estimated_value: editing.estimated_value,
      reason_selling: editing.reason_selling,
      investment_budget: editing.investment_budget,
      investment_goal: editing.investment_goal,
      message: editing.message,
      notes: editing.notes,
      priority: editing.priority,
      status: editing.status,
      contacted_at: editing.status === "contacted" && !lead.contacted_at ? new Date().toISOString() : lead.contacted_at,
    });

    setSaving(false);
    close();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#06101f] p-5 text-white shadow-2xl sm:p-7">
        <button
          onClick={close}
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/15"
        >
          ← Back to Dashboard
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: GOLD }}>
              Editable Lead Profile
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {editing.first_name || "Unknown"} {editing.last_name || ""}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <LeadBadge type={editing.lead_type} />
              <StatusPill status={editing.status || "new"} />
              <PriorityPill priority={editing.priority || "warm"} />
            </div>
          </div>

          <button onClick={close} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 font-black hover:bg-white/15">
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <a href={editing.phone ? `tel:${cleanPhone(editing.phone)}` : undefined} className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center font-black text-emerald-200">
            Call
          </a>
          <a href={editing.phone ? `sms:${cleanPhone(editing.phone)}` : undefined} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center font-black text-amber-200">
            Text
          </a>
          <a href={editing.email ? `mailto:${editing.email}` : undefined} className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-center font-black text-blue-200">
            Email
          </a>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <EditField label="First Name" value={editing.first_name} onChange={(value) => updateField("first_name", value)} />
          <EditField label="Last Name" value={editing.last_name} onChange={(value) => updateField("last_name", value)} />
          <EditField label="Phone" value={editing.phone} onChange={(value) => updateField("phone", value)} />
          <EditField label="Email" value={editing.email} onChange={(value) => updateField("email", value)} />

          <EditSelect
            label="Lead Type"
            value={editing.lead_type}
            onChange={(value) => updateField("lead_type", value)}
            options={[
              ["buy", "Buyer"],
              ["sell", "Seller"],
              ["invest", "Investor"],
              ["market_report", "Market Report"],
            ]}
          />

          <EditSelect
            label="Pipeline Stage"
            value={editing.status || "new"}
            onChange={(value) => updateField("status", value)}
            options={pipelineStages.map((stage) => [stage, stageLabels[stage]])}
          />

          <EditSelect
            label="Priority"
            value={editing.priority || "warm"}
            onChange={(value) => updateField("priority", value)}
            options={[
              ["hot", "Hot"],
              ["warm", "Warm"],
              ["cold", "Cold"],
            ]}
          />

          <EditField label="Preferred Area" value={editing.preferred_area} onChange={(value) => updateField("preferred_area", value)} />
          <EditField label="Timeline" value={editing.timeline} onChange={(value) => updateField("timeline", value)} />
          <EditField label="Home Type" value={editing.home_type} onChange={(value) => updateField("home_type", value)} />
          <EditField label="Price Range" value={editing.price_range} onChange={(value) => updateField("price_range", value)} />
          <EditField label="Mortgage Status" value={editing.mortgage_status} onChange={(value) => updateField("mortgage_status", value)} />
          <EditField label="Property Address" value={editing.property_address} onChange={(value) => updateField("property_address", value)} />
          <EditField label="Neighbourhood" value={editing.neighbourhood} onChange={(value) => updateField("neighbourhood", value)} />
          <EditField label="Estimated Value" value={editing.estimated_value} onChange={(value) => updateField("estimated_value", value)} />
          <EditField label="Reason Selling" value={editing.reason_selling} onChange={(value) => updateField("reason_selling", value)} />
          <EditField label="Investment Budget" value={editing.investment_budget} onChange={(value) => updateField("investment_budget", value)} />
          <EditField label="Investment Goal" value={editing.investment_goal} onChange={(value) => updateField("investment_goal", value)} />
        </div>

        <div className="mt-4 grid gap-4">
          <EditTextArea label="Client Message" value={editing.message} onChange={(value) => updateField("message", value)} />
          <EditTextArea
            label="Dave’s Private Notes"
            value={editing.notes}
            onChange={(value) => updateField("notes", value)}
            placeholder="Add call notes, follow-up details, showing preferences, financing updates, or next steps..."
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={saveDrawerChanges} disabled={saving} className="rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: GOLD }}>
            {saving ? "Saving..." : "Save All Changes"}
          </button>
          <button onClick={close} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-black uppercase tracking-wide text-white hover:bg-white/15">
            Cancel
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Submitted</p>
          <p className="mt-2 text-base font-bold text-white/90">{formatDate(lead.submitted_at)}</p>
        </div>
      </aside>
    </div>
  );
}

function EditField({ label, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{label}</span>
      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-amber-400"
      />
    </label>
  );
}

function EditSelect({ label, value, onChange, options }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{label}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-amber-400"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditTextArea({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{label}</span>
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none placeholder:text-white/25 focus:border-amber-400"
      />
    </label>
  );
}
