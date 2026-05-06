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

const mockLeads = [
  {
    id: 1,
    lead_type: "buy",
    first_name: "Sample",
    last_name: "Buyer",
    email: "buyer@example.com",
    phone: "204-555-0123",
    preferred_area: "Northwest Winnipeg",
    timeline: "1-3 months",
    home_type: "Detached",
    price_range: "$300,000-$450,000",
    mortgage_status: "Already pre-approved",
    message: "Looking for a family home near schools.",
    status: "new",
    priority: "hot",
    submitted_at: new Date().toISOString(),
  },
  {
    id: 2,
    lead_type: "sell",
    first_name: "Sample",
    last_name: "Seller",
    email: "seller@example.com",
    phone: "204-555-0456",
    preferred_area: "Northeast Winnipeg",
    property_address: "123 Example Street",
    neighbourhood: "North Kildonan",
    estimated_value: "$450,000-$650,000",
    timeline: "3-6 months",
    reason_selling: "Downsizing",
    message: "Wants a home evaluation before listing.",
    status: "contacted",
    priority: "warm",
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

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
      lead.priority,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !term || searchable.includes(term);
    const matchesType = typeFilter === "all" || lead.lead_type === typeFilter;
    const matchesStatus = statusFilter === "all" || (lead.status || "new") === statusFilter;
    const matchesPriority = priorityFilter === "all" || (lead.priority || "warm") === priorityFilter;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
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

function runSelfTests() {
  const normalized = normalizeLead({ id: 99, lead_type: "buy" });
  console.assert(normalized.status === "new", "normalizeLead should default status to new");
  console.assert(normalized.priority === "warm", "normalizeLead should default priority to warm");
  console.assert(normalized.first_name === "", "normalizeLead should default missing first_name to blank string");
  console.assert(normalized.lead_type === "buy", "normalizeLead should preserve lead type");

  const filteredByType = filterLeads(mockLeads, "", "buy", "all", "all");
  console.assert(filteredByType.length === 1, "filterLeads should filter by lead type");

  const filteredBySearch = filterLeads(mockLeads, "kildonan", "all", "all", "all");
  console.assert(filteredBySearch.length === 1, "filterLeads should search neighbourhood/area fields");

  const filteredByStatus = filterLeads(mockLeads, "", "all", "contacted", "all");
  console.assert(filteredByStatus.length === 1, "filterLeads should filter by status");

  const filteredByPriority = filterLeads(mockLeads, "", "all", "all", "hot");
  console.assert(filteredByPriority.length === 1, "filterLeads should filter by priority");

  const stats = calculateStats(mockLeads);
  console.assert(stats.total === 2, "calculateStats should count total leads");
  console.assert(stats.buyers === 1, "calculateStats should count buyers");
  console.assert(stats.sellers === 1, "calculateStats should count sellers");
  console.assert(stats.hotLeads === 1, "calculateStats should count hot leads");
  console.assert(getNextStage("new") === "contacted", "new should advance to contacted");
  console.assert(getNextStage("offer") === "closed", "offer should advance to closed");
  console.assert(getNextStage("closed") === "closed", "closed should remain closed");
  console.assert(formatDate(null) === "Not available", "formatDate should handle empty values");
}

runSelfTests();

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

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

    const intervalId = setInterval(fetchLeads, 10000);
    return () => clearInterval(intervalId);
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  }

  async function fetchLeads() {
    setLoading(true);
    setErrorMessage("");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLeads(mockLeads.map(normalizeLead));
      setUsingDemoData(true);
      setLastUpdated(new Date());
      setErrorMessage("Dashboard is showing demo data because Supabase is not connected to globalThis.supabaseClient. In your Vite app, assign your Supabase client to globalThis.supabaseClient in src/main.jsx before rendering the dashboard.");
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
    setUsingDemoData(false);
    setLastUpdated(new Date());
    setLoading(false);
  }

  async function updateLead(id, updates) {
    const supabase = getSupabaseClient();

    if (!supabase || usingDemoData) {
      setLeads((current) =>
        current.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
      );
      setSelectedLead((current) => current && current.id === id ? { ...current, ...updates } : current);
      return;
    }

    const { error } = await supabase.from("leads").update(updates).eq("id", id);

    if (error) {
      console.error("Lead update error:", error);
      setErrorMessage("Could not update lead. Confirm status, priority, and contacted_at columns exist and update policy is allowed.");
      return;
    }

    await fetchLeads();
  }

  async function advanceLeadStage(lead) {
    const nextStage = getNextStage(lead.status || "new");
    const updates = {
      status: nextStage,
      contacted_at: nextStage === "contacted" ? new Date().toISOString() : lead.contacted_at,
    };
    await updateLead(lead.id, updates);
  }

  async function updatePriority(id, priority) {
    await updateLead(id, { priority });
  }

  const filteredLeads = useMemo(() => {
    return filterLeads(leads, search, typeFilter, statusFilter, priorityFilter);
  }, [leads, search, typeFilter, statusFilter, priorityFilter]);

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

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:min-w-[860px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, email, area..."
                className="min-h-[46px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-amber-400"
              />

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="min-h-[46px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-amber-400"
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
                className="min-h-[46px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-amber-400"
              >
                <option value="all">All Stages</option>
                {pipelineStages.map((stage) => (
                  <option key={stage} value={stage}>{stageLabels[stage]}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="min-h-[46px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-amber-400"
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
              <div className="flex min-h-[360px] items-center justify-center text-white/60">
                Loading Dave’s leads...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex min-h-[360px] items-center justify-center text-center text-white/60">
                No leads match this view.
              </div>
            ) : (
              <div className="overflow-x-hidden">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-white/45">
                      <th className="px-5 py-4">Lead</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Priority</th>
                      <th className="px-5 py-4">Contact</th>
                      <th className="px-5 py-4">Area / Timeline</th>
                      <th className="px-5 py-4">Submitted</th>
                      <th className="px-5 py-4">Stage</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className={`border-t border-white/10 transition hover:bg-white/[0.04] ${getPriorityRowClass(lead.priority)}`}>
                        <td className="px-5 py-4">
                          <button onClick={() => setSelectedLead(lead)} className="text-left">
                            <p className="font-black text-white">
                              {lead.first_name || "Unknown"} {lead.last_name || ""}
                            </p>
                            <p className="mt-1 max-w-[260px] truncate text-sm text-white/45">
                              {lead.message || "No message provided"}
                            </p>
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <LeadBadge type={lead.lead_type} />
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={lead.priority || "warm"}
                            onChange={(event) => updatePriority(lead.id, event.target.value)}
                            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-black uppercase tracking-wide text-white outline-none focus:border-amber-400"
                          >
                            <option value="hot">Hot</option>
                            <option value="warm">Warm</option>
                            <option value="cold">Cold</option>
                          </select>
                        </td>

                        <td className="px-5 py-4 text-sm">
                          <div className="flex flex-col gap-1">
                            {lead.phone ? <a className="font-bold text-white/90 hover:text-emerald-200" href={`tel:${cleanPhone(lead.phone)}`}>{lead.phone}</a> : <span className="font-bold text-white/50">No phone</span>}
                            {lead.email ? <a className="text-white/45 hover:text-blue-200" href={`mailto:${lead.email}`}>{lead.email}</a> : <span className="text-white/35">No email</span>}
                            {lead.phone ? <a className="text-xs font-black uppercase tracking-wide text-amber-200" href={`sms:${cleanPhone(lead.phone)}`}>Text Lead</a> : null}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm">
                          <p className="font-bold text-white/90">{lead.preferred_area || lead.neighbourhood || "Not specified"}</p>
                          <p className="text-white/45">{lead.timeline || "No timeline"}</p>
                        </td>

                        <td className="px-5 py-4 text-sm text-white/60">
                          {formatDate(lead.submitted_at)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusPill status={lead.status || "new"} />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => advanceLeadStage(lead)}
                              disabled={(lead.status || "new") === "closed"}
                              className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {(lead.status || "new") === "closed" ? "✓ Closed" : `Move to ${stageLabels[getNextStage(lead.status || "new")]}`}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedLead ? <LeadDrawer lead={selectedLead} close={() => setSelectedLead(null)} updateLead={updateLead} /> : null}
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
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          Lead Dashboard
        </h1>
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
  const [localPriority, setLocalPriority] = useState(lead.priority || "warm");
  const [localStatus, setLocalStatus] = useState(lead.status || "new");

  async function saveDrawerChanges() {
    await updateLead(lead.id, {
      priority: localPriority,
      status: localStatus,
      contacted_at: localStatus === "contacted" ? new Date().toISOString() : lead.contacted_at,
    });
    close();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#06101f] p-5 text-white shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: GOLD }}>
              Lead Profile
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {lead.first_name || "Unknown"} {lead.last_name || ""}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <LeadBadge type={lead.lead_type} />
              <StatusPill status={localStatus} />
              <PriorityPill priority={localPriority} />
            </div>
          </div>

          <button onClick={close} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 font-black hover:bg-white/15">
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href={lead.phone ? `tel:${cleanPhone(lead.phone)}` : undefined} className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center font-black text-emerald-200">
            Call
          </a>
          <a href={lead.phone ? `sms:${cleanPhone(lead.phone)}` : undefined} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center font-black text-amber-200">
            Text
          </a>
          <a href={lead.email ? `mailto:${lead.email}` : undefined} className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-center font-black text-blue-200 sm:col-span-2">
            Email
          </a>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Pipeline Stage</span>
            <select value={localStatus} onChange={(event) => setLocalStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none">
              {pipelineStages.map((stage) => (
                <option key={stage} value={stage}>{stageLabels[stage]}</option>
              ))}
            </select>
          </label>

          <label className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Priority</span>
            <select value={localPriority} onChange={(event) => setLocalPriority(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none">
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </label>
        </div>

        <button onClick={saveDrawerChanges} className="mt-4 w-full rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl" style={{ backgroundColor: GOLD }}>
          Save Lead Updates
        </button>

        <div className="mt-8 grid gap-4">
          <Detail label="Phone" value={lead.phone} />
          <Detail label="Email" value={lead.email} />
          <Detail label="Preferred Area" value={lead.preferred_area} />
          <Detail label="Timeline" value={lead.timeline} />
          <Detail label="Home Type" value={lead.home_type} />
          <Detail label="Price Range" value={lead.price_range} />
          <Detail label="Mortgage Status" value={lead.mortgage_status} />
          <Detail label="Property Address" value={lead.property_address} />
          <Detail label="Neighbourhood" value={lead.neighbourhood} />
          <Detail label="Estimated Value" value={lead.estimated_value} />
          <Detail label="Reason Selling" value={lead.reason_selling} />
          <Detail label="Investment Budget" value={lead.investment_budget} />
          <Detail label="Investment Goal" value={lead.investment_goal} />
          <Detail label="Submitted" value={formatDate(lead.submitted_at)} />
          <Detail label="Message" value={lead.message} large />
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value, large = false }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.05] p-4 ${large ? "min-h-[120px]" : ""}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className="mt-2 text-base font-bold text-white/90">{value || "Not provided"}</p>
    </div>
  );
}

function getPriorityRowClass(priority) {
  if (priority === "hot") return "bg-red-500/[0.035]";
  if (priority === "warm") return "bg-amber-500/[0.025]";
  return "";
}
