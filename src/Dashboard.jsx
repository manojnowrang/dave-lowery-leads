import React, { useEffect, useMemo, useState } from "react";

const GOLD = "#C8952D";
const RED = "#D71920";

const leadTypeLabels = {
  buy: "Buyer",
  sell: "Seller",
  invest: "Investor",
  market_report: "Market Report",
};

const pipelineStages = ["new", "contacted", "showing", "offer", "closed", "archived"];

const stageLabels = {
  new: "New",
  contacted: "Contacted",
  showing: "Showing",
  offer: "Offer",
  closed: "Closed",
  archived: "Archived",
};

const priorityLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

const clientStatuses = [
  "Not Contacted",
  "Contacted",
  "Interested",
  "Not Interested",
  "Converted to Lead",
  "Do Not Contact",
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
    client_id: lead.client_id || null,
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

function normalizeClient(client) {
  return {
    id: client.id,
    name_first: client.name_first || "",
    name_last: client.name_last || "",
    email: client.email || "",
    cell_number: client.cell_number || "",
    home_phone: client.home_phone || "",
    office_phone: client.office_phone || "",
    status: client.status || "Not Contacted",
    notes: client.notes || "",
    contacted: Boolean(client.contacted),
    converted_to_lead: Boolean(client.converted_to_lead),
    archived: Boolean(client.archived),
    created_at: client.created_at || null,
    updated_at: client.updated_at || null,
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

function filterClients(clients, search, statusFilter = "all") {
  const term = search.toLowerCase().trim();

  return clients.filter((client) => {
    const fullName = `${client.name_first || ""} ${client.name_last || ""}`.toLowerCase();
    const searchable = [
      fullName,
      client.email,
      client.cell_number,
      client.home_phone,
      client.office_phone,
      client.status,
      client.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !term || searchable.includes(term);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "contacted_any" && (client.contacted || client.status === "Contacted")) ||
      (statusFilter === "converted_any" && (client.converted_to_lead || client.status === "Converted to Lead")) ||
      client.status === statusFilter;

    return matchesSearch && matchesStatus;
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

function calculateClientStats(clients) {
  return {
    total: clients.length,
    notContacted: clients.filter((client) => client.status === "Not Contacted").length,
    contacted: clients.filter((client) => client.contacted || client.status === "Contacted").length,
    converted: clients.filter((client) => client.converted_to_lead || client.status === "Converted to Lead").length,
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

function appendNote(existingNotes, newNote) {
  const current = String(existingNotes || "").trim();
  return current ? `${current}\n\n${newNote}` : newNote;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
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
      await Promise.all([fetchLeads(), fetchClients()]);
    }

    checkAuthAndLoad();
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

  async function fetchClients() {
    setClientsLoading(true);
    setErrorMessage("");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMessage("Supabase is not connected.");
      setClientsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name_last", { ascending: true });

    if (error) {
      console.error("Clients fetch error:", error);
      setErrorMessage("Could not load clients from Supabase. Check the clients table and RLS policies.");
      setClientsLoading(false);
      return;
    }

    setClients((data || []).map(normalizeClient));
    setLastUpdated(new Date());
    setClientsLoading(false);
  }

  async function updateLead(id, updates) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMessage("Supabase is not connected.");
      return false;
    }

    const { error } = await supabase.from("leads").update(updates).eq("id", id);

    if (error) {
      console.error("Lead update error:", error);
      setErrorMessage("Could not update lead. Confirm columns exist and update policy is allowed.");
      return false;
    }

    setLeads((current) => current.map((lead) => (lead.id === id ? normalizeLead({ ...lead, ...updates }) : lead)));
    setSelectedLead((current) => (current && current.id === id ? normalizeLead({ ...current, ...updates }) : current));
    await fetchLeads();
    return true;
  }

  async function updateClient(id, updates) {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setErrorMessage("Supabase is not connected.");
      return false;
    }

    const { error } = await supabase
      .from("clients")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Client update error:", error);
      setErrorMessage("Could not update client. Confirm columns exist and update policy is allowed.");
      return false;
    }

    setClients((current) => current.map((client) => (client.id === id ? normalizeClient({ ...client, ...updates }) : client)));
    setSelectedClient((current) => (current && current.id === id ? normalizeClient({ ...current, ...updates }) : current));
    await fetchClients();
    return true;
  }

  async function archiveLead(id) {
    const confirmed = window.confirm("Archive this lead? It will be hidden from the main Leads tab but kept in Supabase.");
    if (!confirmed) return;
    await updateLead(id, { status: "archived" });
    setSelectedLead(null);
  }

  async function unarchiveLead(id) {
    const confirmed = window.confirm("Restore this lead? They will return to the active Leads tab.");
    if (!confirmed) return;

    const restored = await updateLead(id, { status: "new" });
    if (!restored) return;

    setSelectedLead(null);
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setActiveTab("leads");
  }

  async function archiveClient(id) {
    const confirmed = window.confirm("Archive this client? They will move to the Archived tab but remain in Supabase.");
    if (!confirmed) return;
    await updateClient(id, { archived: true });
    setSelectedClient(null);
  }

  async function restoreClient(id) {
    const confirmed = window.confirm("Restore this client? They will return to the Clients / Mailing List tab.");
    if (!confirmed) return;

    const restored = await updateClient(id, { archived: false });
    if (!restored) return;

    setSelectedClient(null);
    setSearch("");
    setClientStatusFilter("all");
    setActiveTab("clients");
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

  async function convertClientToLead(client) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage("Supabase is not connected.");
      return;
    }

    const confirmed = window.confirm("Convert this client into an active lead?");
    if (!confirmed) return;

    const { error: leadError } = await supabase.from("leads").insert([
      {
        client_id: client.id,
        lead_type: "market_report",
        first_name: client.name_first,
        last_name: client.name_last,
        email: client.email,
        phone: client.cell_number || client.home_phone || client.office_phone || "",
        message: "Converted from Clients / Mailing List.",
        notes: client.notes || "",
        status: "new",
        priority: "warm",
        submitted_at: new Date().toISOString(),
      },
    ]);

    if (leadError) {
      console.error("Convert client to lead error:", leadError);
      setErrorMessage("Could not convert client to lead. Make sure the leads table has the client_id column.");
      return;
    }

    await updateClient(client.id, {
      contacted: true,
      converted_to_lead: true,
      status: "Converted to Lead",
    });

    await fetchLeads();
    await fetchClients();
    setSelectedClient(null);
    setActiveTab("leads");
  }

  async function moveLeadBackToClients(lead) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage("Supabase is not connected.");
      return;
    }

    const confirmed = window.confirm("Move this lead back to Clients / Mailing List? The lead will be archived, not deleted.");
    if (!confirmed) return;

    const note = `Moved back from Leads on ${new Date().toLocaleDateString("en-CA")}.`;
    let matchingClient = null;

    if (lead.client_id) {
      matchingClient = clients.find((client) => client.id === lead.client_id) || null;
    }

    if (!matchingClient && lead.email) {
      matchingClient = clients.find((client) => client.email && client.email.toLowerCase() === lead.email.toLowerCase()) || null;
    }

    if (matchingClient) {
      const { error: clientError } = await supabase
        .from("clients")
        .update({
          archived: false,
          contacted: true,
          converted_to_lead: false,
          status: "Contacted",
          notes: appendNote(matchingClient.notes, note),
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchingClient.id);

      if (clientError) {
        console.error("Move back client update error:", clientError);
        setErrorMessage("Could not update the matching client record.");
        return;
      }
    } else {
      const { error: insertClientError } = await supabase.from("clients").insert([
        {
          name_first: lead.first_name || "",
          name_last: lead.last_name || "",
          email: lead.email || "",
          cell_number: lead.phone || "",
          status: "Contacted",
          notes: appendNote(lead.notes, note),
          contacted: true,
          converted_to_lead: false,
          archived: false,
        },
      ]);

      if (insertClientError) {
        console.error("Move back client insert error:", insertClientError);
        setErrorMessage("Could not create a client record from this lead.");
        return;
      }
    }

    const leadArchived = await updateLead(lead.id, {
      status: "archived",
      notes: appendNote(lead.notes, "Moved back to Clients / Mailing List."),
    });

    if (!leadArchived) return;

    await fetchClients();
    await fetchLeads();
    setSelectedLead(null);
    setActiveTab("clients");
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const activeLeads = useMemo(() => leads.filter((lead) => (lead.status || "new") !== "archived"), [leads]);
  const archivedLeads = useMemo(() => leads.filter((lead) => (lead.status || "new") === "archived"), [leads]);
  const activeClients = useMemo(() => clients.filter((client) => !client.archived), [clients]);
  const archivedClients = useMemo(() => clients.filter((client) => client.archived), [clients]);

  const filteredLeads = useMemo(
    () => filterLeads(activeLeads, search, typeFilter, statusFilter, priorityFilter),
    [activeLeads, search, typeFilter, statusFilter, priorityFilter]
  );

  const filteredClients = useMemo(
    () => filterClients(activeClients, search, clientStatusFilter),
    [activeClients, search, clientStatusFilter]
  );

  const filteredArchivedLeads = useMemo(
    () => filterLeads(archivedLeads, search, "all", "all", "all"),
    [archivedLeads, search]
  );

  const filteredArchivedClients = useMemo(
    () => filterClients(archivedClients, search, "all"),
    [archivedClients, search]
  );

  const stats = useMemo(() => calculateStats(activeLeads), [activeLeads]);
  const clientStats = useMemo(() => calculateClientStats(activeClients), [activeClients]);

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
        <Header refresh={async () => Promise.all([fetchLeads(), fetchClients()])} lastUpdated={lastUpdated} signOut={signOut} />

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-100">
            {errorMessage}
          </div>
        ) : null}

        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === "leads" ? (
          <LeadsPanel
            stats={stats}
            search={search}
            setSearch={setSearch}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            loading={loading}
            leads={filteredLeads}
            openLead={setSelectedLead}
            advanceLeadStage={advanceLeadStage}
            updatePriority={updatePriority}
            archiveLead={archiveLead}
          />
        ) : null}

        {activeTab === "clients" ? (
          <ClientsPanel
            clientStats={clientStats}
            search={search}
            setSearch={setSearch}
            clientStatusFilter={clientStatusFilter}
            setClientStatusFilter={setClientStatusFilter}
            loading={clientsLoading}
            clients={filteredClients}
            openClient={setSelectedClient}
            archiveClient={archiveClient}
            convertClientToLead={convertClientToLead}
          />
        ) : null}

        {activeTab === "archived" ? (
          <ArchivedPanel
            search={search}
            setSearch={setSearch}
            loading={loading || clientsLoading}
            archivedLeads={filteredArchivedLeads}
            archivedClients={filteredArchivedClients}
            openLead={setSelectedLead}
            openClient={setSelectedClient}
            unarchiveLead={unarchiveLead}
            restoreClient={restoreClient}
          />
        ) : null}
      </main>

      {selectedLead ? (
        <LeadDrawer
          lead={selectedLead}
          close={() => setSelectedLead(null)}
          updateLead={updateLead}
          archiveLead={archiveLead}
          unarchiveLead={unarchiveLead}
          moveLeadBackToClients={moveLeadBackToClients}
        />
      ) : null}

      {selectedClient ? (
        <ClientDrawer
          client={selectedClient}
          close={() => setSelectedClient(null)}
          updateClient={updateClient}
          archiveClient={archiveClient}
          restoreClient={restoreClient}
          convertClientToLead={convertClientToLead}
        />
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
          Leads, mailing-list clients, archived records, and client-to-lead conversion tracking.
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-white/35">
          {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : "Ready"}
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
          Refresh
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

function TabBar({ activeTab, setActiveTab }) {
  const tabs = [
    {
      value: "leads",
      label: "Leads",
      activeClass: "border-[#C8A44D]/80 bg-[#C8A44D] text-black shadow-xl shadow-[#C8A44D]/20",
      inactiveClass: "border-[#C8A44D]/40 bg-[#C8A44D]/12 text-[#F6E6B5] hover:bg-[#C8A44D]/20 hover:text-white",
    },
    {
      value: "clients",
      label: "Clients / Mailing List",
      activeClass: "border-blue-300/80 bg-blue-600 text-white shadow-xl shadow-blue-600/20",
      inactiveClass: "border-blue-400/40 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20 hover:text-white",
    },
    {
      value: "archived",
      label: "Archived",
      activeClass: "border-slate-300/70 bg-slate-600 text-white shadow-xl shadow-slate-700/20",
      inactiveClass: "border-slate-400/30 bg-slate-500/10 text-slate-200 hover:bg-slate-500/20 hover:text-white",
    },
  ];

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => setActiveTab(tab.value)}
          className={`rounded-2xl border px-5 py-4 text-sm font-black uppercase tracking-wide transition hover:-translate-y-0.5 ${
            activeTab === tab.value ? tab.activeClass : tab.inactiveClass
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function LeadsPanel({
  stats,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  loading,
  leads,
  openLead,
  advanceLeadStage,
  updatePriority,
  archiveLead,
}) {
  function showLeadView({ type = "all", status = "all", priority = "all" }) {
    setSearch("");
    setTypeFilter(type);
    setStatusFilter(status);
    setPriorityFilter(priority);
  }

  return (
    <>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <StatCard
          label="Total Leads"
          value={stats.total}
          accent={GOLD}
          onClick={() => showLeadView({})}
          active={typeFilter === "all" && statusFilter === "all" && priorityFilter === "all"}
        />
        <StatCard
          label="New Leads"
          value={stats.newLeads}
          accent="#38BDF8"
          onClick={() => showLeadView({ status: "new" })}
          active={typeFilter === "all" && statusFilter === "new" && priorityFilter === "all"}
        />
        <StatCard
          label="Hot Leads"
          value={stats.hotLeads}
          accent="#EF4444"
          onClick={() => showLeadView({ priority: "hot" })}
          active={typeFilter === "all" && statusFilter === "all" && priorityFilter === "hot"}
        />
        <StatCard
          label="Buyers"
          value={stats.buyers}
          accent="#22C55E"
          onClick={() => showLeadView({ type: "buy" })}
          active={typeFilter === "buy" && statusFilter === "all" && priorityFilter === "all"}
        />
        <StatCard
          label="Sellers"
          value={stats.sellers}
          accent={RED}
          onClick={() => showLeadView({ type: "sell" })}
          active={typeFilter === "sell" && statusFilter === "all" && priorityFilter === "all"}
        />
        <StatCard
          label="Investors"
          value={stats.investors}
          accent="#A855F7"
          onClick={() => showLeadView({ type: "invest" })}
          active={typeFilter === "invest" && statusFilter === "all" && priorityFilter === "all"}
        />
        <StatCard
          label="Reports"
          value={stats.marketReports}
          accent="#F97316"
          onClick={() => showLeadView({ type: "market_report" })}
          active={typeFilter === "market_report" && statusFilter === "all" && priorityFilter === "all"}
        />
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur sm:p-5">
        <PanelHeader eyebrow="Lead Command Centre" title="Client Pipeline" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, phone, email..." />
          <FilterSelect value={typeFilter} onChange={setTypeFilter} options={[["all", "All Lead Types"], ["buy", "Buyers"], ["sell", "Sellers"], ["invest", "Investors"], ["market_report", "Market Reports"]]} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[["all", "All Stages"], ...pipelineStages.filter((stage) => stage !== "archived").map((stage) => [stage, stageLabels[stage]])]} />
          <FilterSelect value={priorityFilter} onChange={setPriorityFilter} options={[["all", "All Priorities"], ["hot", "Hot"], ["warm", "Warm"], ["cold", "Cold"]]} />
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
          {loading ? (
            <EmptyState text="Loading Dave’s leads..." />
          ) : leads.length === 0 ? (
            <EmptyState text="No leads match this view." />
          ) : (
            <div className="grid gap-3 p-3">
              {leads.map((lead) => (
                <LeadRowCard key={lead.id} lead={lead} openLead={() => openLead(lead)} advanceLeadStage={advanceLeadStage} updatePriority={updatePriority} archiveLead={archiveLead} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ClientsPanel({ clientStats, search, setSearch, clientStatusFilter, setClientStatusFilter, loading, clients, openClient, archiveClient, convertClientToLead }) {
  function showClientStatus(status) {
    setSearch("");
    setClientStatusFilter(status);
  }

  return (
    <>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clients" value={clientStats.total} accent={GOLD} onClick={() => showClientStatus("all")} active={clientStatusFilter === "all"} />
        <StatCard label="Not Contacted" value={clientStats.notContacted} accent="#38BDF8" onClick={() => showClientStatus("Not Contacted")} active={clientStatusFilter === "Not Contacted"} />
        <StatCard label="Contacted" value={clientStats.contacted} accent="#22C55E" onClick={() => showClientStatus("contacted_any")} active={clientStatusFilter === "contacted_any"} />
        <StatCard label="Converted" value={clientStats.converted} accent="#A855F7" onClick={() => showClientStatus("converted_any")} active={clientStatusFilter === "converted_any"} />
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur sm:p-5">
        <PanelHeader eyebrow="Client Database" title="Clients / Mailing List" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search clients by name, email, phone..." />
          <FilterSelect
            value={clientStatusFilter}
            onChange={setClientStatusFilter}
            options={[
              ["all", "All Client Statuses"],
              ["contacted_any", "Contacted"],
              ["converted_any", "Converted to Lead"],
              ...clientStatuses
                .filter((status) => !["Contacted", "Converted to Lead"].includes(status))
                .map((status) => [status, status]),
            ]}
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
          {loading ? (
            <EmptyState text="Loading clients..." />
          ) : clients.length === 0 ? (
            <EmptyState text="No clients match this view." />
          ) : (
            <div className="grid gap-3 p-3">
              {clients.map((client) => (
                <ClientRowCard key={client.id} client={client} openClient={() => openClient(client)} archiveClient={archiveClient} convertClientToLead={convertClientToLead} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ArchivedPanel({ search, setSearch, loading, archivedLeads, archivedClients, openLead, openClient, unarchiveLead, restoreClient }) {
  return (
    <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur sm:p-5">
      <PanelHeader eyebrow="Archived Records" title="Archived Leads and Clients" />
      <div className="mt-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Search archived records..." />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-white/10">
          <h3 className="border-b border-white/10 bg-black/20 p-4 text-sm font-black uppercase tracking-wide text-white/70">Archived Leads</h3>
          {loading ? <EmptyState text="Loading archived leads..." /> : archivedLeads.length === 0 ? <EmptyState text="No archived leads." /> : (
            <div className="grid gap-3 p-3">
              {archivedLeads.map((lead) => (
                <ArchivedLeadRow key={lead.id} lead={lead} openLead={() => openLead(lead)} restore={() => unarchiveLead(lead.id)} />
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10">
          <h3 className="border-b border-white/10 bg-black/20 p-4 text-sm font-black uppercase tracking-wide text-white/70">Archived Clients</h3>
          {loading ? <EmptyState text="Loading archived clients..." /> : archivedClients.length === 0 ? <EmptyState text="No archived clients." /> : (
            <div className="grid gap-3 p-3">
              {archivedClients.map((client) => (
                <ArchivedClientRow key={client.id} client={client} openClient={() => openClient(client)} restore={() => restoreClient(client.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PanelHeader({ eyebrow, title }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: GOLD }}>{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-[44px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-amber-400"
    />
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[44px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-amber-400"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>{optionLabel}</option>
      ))}
    </select>
  );
}

function EmptyState({ text }) {
  return <div className="flex min-h-[220px] items-center justify-center text-center text-white/60">{text}</div>;
}

function StatCard({ label, value, accent, onClick, active = false }) {
  const content = (
    <>
      <div className="mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: accent }} />
      <p className="text-4xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      {onClick ? <p className="mt-3 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/35">Click to view</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-[1.5rem] border bg-white/[0.06] p-5 text-left shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.1] ${
          active ? "border-white/35 ring-2 ring-white/20" : "border-white/10"
        }`}
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur">{content}</div>;
}

function LeadRowCard({ lead, openLead, advanceLeadStage, updatePriority, archiveLead }) {
  return (
    <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 transition hover:bg-white/[0.04] lg:grid-cols-[1.4fr_0.9fr_0.9fr_0.8fr_0.7fr_0.9fr] lg:items-center min-h-[72px]">
      <button type="button" onClick={openLead} className="text-left">
        <p className="font-black text-[15px] text-white">{lead.first_name || "Unknown"} {lead.last_name || ""}</p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-white/45">{lead.message || lead.notes || "Click to view/edit lead"}</p>
      </button>

      <div className="flex flex-wrap gap-2">
        <LeadBadge type={lead.lead_type} />
        <StatusPill status={lead.status || "new"} />
      </div>

      <ContactBlock phone={lead.phone} email={lead.email} />

      <div className="text-sm">
        <p className="font-bold text-white/90">{lead.preferred_area || lead.neighbourhood || "Not specified"}</p>
        <p className="text-white/45">{lead.timeline || "No timeline"}</p>
      </div>

      <select value={lead.priority || "warm"} onChange={(event) => updatePriority(lead.id, event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-black uppercase tracking-wide text-white outline-none focus:border-amber-400">
        <option value="hot">Hot</option>
        <option value="warm">Warm</option>
        <option value="cold">Cold</option>
      </select>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button type="button" onClick={openLead} className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-100 transition hover:bg-blue-400/20">Edit</button>
        <button type="button" onClick={() => advanceLeadStage(lead)} disabled={["closed", "archived"].includes(lead.status || "new")} className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50">
          {(lead.status || "new") === "closed" ? "✓ Closed" : `Move: ${stageLabels[getNextStage(lead.status || "new")]}`}
        </button>
        <button type="button" onClick={() => archiveLead(lead.id)} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100 transition hover:bg-amber-400/20">Archive</button>
      </div>
    </div>
  );
}

function ClientRowCard({ client, openClient, archiveClient, convertClientToLead }) {
  return (
    <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 transition hover:bg-white/[0.04] lg:grid-cols-[1.5fr_0.9fr_0.9fr_0.8fr] lg:items-center min-h-[72px]">
      <button type="button" onClick={openClient} className="text-left">
        <p className="font-black text-[15px] text-white">{client.name_first || "Unknown"} {client.name_last || ""}</p>
        <p className="mt-0.5 text-[11px] text-white/45">{client.notes || "Click to view/edit client"}</p>
      </button>

      <div className="flex flex-wrap gap-2">
        <ClientStatusPill status={client.status} />
        {client.converted_to_lead ? <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-purple-200">Converted</span> : null}
      </div>

      <ContactBlock phone={client.cell_number || client.home_phone || client.office_phone} email={client.email} />

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button type="button" onClick={openClient} className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-100 transition hover:bg-blue-400/20">Edit</button>
        <button type="button" onClick={() => convertClientToLead(client)} disabled={client.converted_to_lead} className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50">Convert</button>
        <button type="button" onClick={() => archiveClient(client.id)} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100 transition hover:bg-amber-400/20">Archive</button>
      </div>
    </div>
  );
}

function ArchivedLeadRow({ lead, openLead, restore }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-black text-[15px] text-white">{lead.first_name || "Unknown"} {lead.last_name || ""}</p>
      <p className="mt-0.5 text-[11px] text-white/45">{lead.email || "No email"} {lead.phone ? `• ${lead.phone}` : ""}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={openLead} className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-2 py-1 text-[10px] font-black uppercase text-blue-100">View</button>
        <button type="button" onClick={restore} className="rounded-xl border border-green-400/30 bg-green-400/10 px-3 py-2 text-xs font-black uppercase text-green-100">Restore</button>
      </div>
    </div>
  );
}

function ArchivedClientRow({ client, openClient, restore }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-black text-[15px] text-white">{client.name_first || "Unknown"} {client.name_last || ""}</p>
      <p className="mt-0.5 text-[11px] text-white/45">{client.email || "No email"} {client.cell_number ? `• ${client.cell_number}` : ""}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={openClient} className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-2 py-1 text-[10px] font-black uppercase text-blue-100">View</button>
        <button type="button" onClick={restore} className="rounded-xl border border-green-400/30 bg-green-400/10 px-3 py-2 text-xs font-black uppercase text-green-100">Restore</button>
      </div>
    </div>
  );
}

function ContactBlock({ phone, email }) {
  return (
    <div className="text-sm">
      {phone ? <a className="block font-bold text-white/90 hover:text-emerald-200" href={`tel:${cleanPhone(phone)}`}>{phone}</a> : <span className="font-bold text-white/50">No phone</span>}
      {email ? <a className="block text-white/45 hover:text-blue-200" href={`mailto:${email}`}>{email}</a> : <span className="block text-white/35">No email</span>}
      {phone ? <a className="mt-1 block text-xs font-black uppercase tracking-wide text-amber-200" href={`sms:${cleanPhone(phone)}`}>Text</a> : null}
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

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${styles[type] || "border-white/20 bg-white/10 text-white/70"}`}>{leadTypeLabels[type] || type || "Unknown"}</span>;
}

function PriorityPill({ priority }) {
  const styles = {
    hot: "border-red-400/40 bg-red-500/15 text-red-200",
    warm: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    cold: "border-slate-400/30 bg-slate-500/10 text-slate-200",
  };

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${styles[priority] || styles.warm}`}>{priorityLabels[priority] || "Warm"}</span>;
}

function StatusPill({ status }) {
  const styles = {
    new: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    contacted: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    showing: "border-blue-400/30 bg-blue-400/10 text-blue-200",
    offer: "border-purple-400/30 bg-purple-400/10 text-purple-200",
    closed: "border-white/30 bg-white/15 text-white",
    archived: "border-slate-400/30 bg-slate-500/10 text-slate-200",
  };

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${styles[status] || styles.new}`}>{stageLabels[status] || status}</span>;
}

function ClientStatusPill({ status }) {
  return <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-200">{status || "Not Contacted"}</span>;
}

function LeadDrawer({ lead, close, updateLead, archiveLead, unarchiveLead, moveLeadBackToClients }) {
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
        <DrawerBackButton close={close} />
        <DrawerTitle eyebrow="Editable Lead Profile" title={`${editing.first_name || "Unknown"} ${editing.last_name || ""}`}>
          <LeadBadge type={editing.lead_type} />
          <StatusPill status={editing.status || "new"} />
          <PriorityPill priority={editing.priority || "warm"} />
        </DrawerTitle>

        <ActionLinks phone={editing.phone} email={editing.email} />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <EditField label="First Name" value={editing.first_name} onChange={(value) => updateField("first_name", value)} />
          <EditField label="Last Name" value={editing.last_name} onChange={(value) => updateField("last_name", value)} />
          <EditField label="Phone" value={editing.phone} onChange={(value) => updateField("phone", value)} />
          <EditField label="Email" value={editing.email} onChange={(value) => updateField("email", value)} />
          <EditSelect label="Lead Type" value={editing.lead_type} onChange={(value) => updateField("lead_type", value)} options={[["buy", "Buyer"], ["sell", "Seller"], ["invest", "Investor"], ["market_report", "Market Report"], ["unknown", "Unknown"]]} />
          <EditSelect label="Pipeline Stage" value={editing.status || "new"} onChange={(value) => updateField("status", value)} options={pipelineStages.map((stage) => [stage, stageLabels[stage]])} />
          <EditSelect label="Priority" value={editing.priority || "warm"} onChange={(value) => updateField("priority", value)} options={[["hot", "Hot"], ["warm", "Warm"], ["cold", "Cold"]]} />
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
          <EditTextArea label="Dave’s Private Notes" value={editing.notes} onChange={(value) => updateField("notes", value)} placeholder="Add call notes, follow-up details, showing preferences, financing updates, or next steps..." />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button onClick={saveDrawerChanges} disabled={saving} className="rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: GOLD }}>{saving ? "Saving..." : "Save Changes"}</button>
          <button onClick={close} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-black uppercase tracking-wide text-white hover:bg-white/15">Cancel</button>
          {(lead.status || "new") === "archived" ? (
            <button type="button" onClick={() => unarchiveLead(lead.id)} className="rounded-2xl border border-green-400/30 bg-green-500/10 px-5 py-4 text-sm font-black uppercase tracking-wide text-green-100 hover:bg-green-500/20">Restore Lead</button>
          ) : (
            <button type="button" onClick={() => archiveLead(lead.id)} className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4 text-sm font-black uppercase tracking-wide text-amber-100 hover:bg-amber-500/20">Archive Lead</button>
          )}
          <button type="button" onClick={() => moveLeadBackToClients(lead)} className="rounded-2xl border border-blue-400/30 bg-blue-500/10 px-5 py-4 text-sm font-black uppercase tracking-wide text-blue-100 hover:bg-blue-500/20">Move to Clients</button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Submitted</p>
          <p className="mt-2 text-base font-bold text-white/90">{formatDate(lead.submitted_at)}</p>
        </div>
      </aside>
    </div>
  );
}

function ClientDrawer({ client, close, updateClient, archiveClient, restoreClient, convertClientToLead }) {
  const [editing, setEditing] = useState({ ...client });
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setEditing((current) => ({ ...current, [field]: value }));
  }

  async function saveDrawerChanges() {
    setSaving(true);
    await updateClient(client.id, {
      name_first: editing.name_first,
      name_last: editing.name_last,
      email: editing.email,
      cell_number: editing.cell_number,
      home_phone: editing.home_phone,
      office_phone: editing.office_phone,
      status: editing.status,
      notes: editing.notes,
      contacted: editing.status !== "Not Contacted",
      converted_to_lead: editing.status === "Converted to Lead" ? true : editing.converted_to_lead,
    });
    setSaving(false);
    close();
  }

  const mainPhone = editing.cell_number || editing.home_phone || editing.office_phone;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#06101f] p-5 text-white shadow-2xl sm:p-7">
        <DrawerBackButton close={close} />
        <DrawerTitle eyebrow="Editable Client Profile" title={`${editing.name_first || "Unknown"} ${editing.name_last || ""}`}>
          <ClientStatusPill status={editing.status} />
          {editing.converted_to_lead ? <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-purple-200">Converted</span> : null}
        </DrawerTitle>

        <ActionLinks phone={mainPhone} email={editing.email} />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <EditField label="First Name" value={editing.name_first} onChange={(value) => updateField("name_first", value)} />
          <EditField label="Last Name" value={editing.name_last} onChange={(value) => updateField("name_last", value)} />
          <EditField label="Email" value={editing.email} onChange={(value) => updateField("email", value)} />
          <EditField label="Cell Number" value={editing.cell_number} onChange={(value) => updateField("cell_number", value)} />
          <EditField label="Home Phone" value={editing.home_phone} onChange={(value) => updateField("home_phone", value)} />
          <EditField label="Office Phone" value={editing.office_phone} onChange={(value) => updateField("office_phone", value)} />
          <EditSelect label="Client Status" value={editing.status || "Not Contacted"} onChange={(value) => updateField("status", value)} options={clientStatuses.map((status) => [status, status])} />
        </div>

        <div className="mt-4 grid gap-4">
          <EditTextArea label="Dave’s Private Notes" value={editing.notes} onChange={(value) => updateField("notes", value)} placeholder="Add call notes, relationship details, follow-up plans, or mailing-list notes..." />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button onClick={saveDrawerChanges} disabled={saving} className="rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: GOLD }}>{saving ? "Saving..." : "Save Changes"}</button>
          <button onClick={close} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-black uppercase tracking-wide text-white hover:bg-white/15">Cancel</button>
          {client.archived ? (
            <button type="button" onClick={() => restoreClient(client.id)} className="rounded-2xl border border-green-400/30 bg-green-500/10 px-5 py-4 text-sm font-black uppercase tracking-wide text-green-100 hover:bg-green-500/20">Restore Client</button>
          ) : (
            <button type="button" onClick={() => archiveClient(client.id)} className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4 text-sm font-black uppercase tracking-wide text-amber-100 hover:bg-amber-500/20">Archive Client</button>
          )}
          <button type="button" onClick={() => convertClientToLead(client)} disabled={client.converted_to_lead} className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm font-black uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50">Convert to Lead</button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Imported</p>
          <p className="mt-2 text-base font-bold text-white/90">{formatDate(client.created_at)}</p>
        </div>
      </aside>
    </div>
  );
}

function DrawerBackButton({ close }) {
  return (
    <button onClick={close} className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/15">
      ← Back to Dashboard
    </button>
  );
}

function DrawerTitle({ eyebrow, title, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: GOLD }}>{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black">{title}</h2>
        <div className="mt-3 flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  );
}

function ActionLinks({ phone, email }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <a href={phone ? `tel:${cleanPhone(phone)}` : undefined} className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center font-black text-emerald-200">Call</a>
      <a href={phone ? `sms:${cleanPhone(phone)}` : undefined} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center font-black text-amber-200">Text</a>
      <a href={email ? `mailto:${email}` : undefined} className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-center font-black text-blue-200">Email</a>
    </div>
  );
}

function EditField({ label, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{label}</span>
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-amber-400" />
    </label>
  );
}

function EditSelect({ label, value, onChange, options }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-amber-400">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function EditTextArea({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{label}</span>
      <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none placeholder:text-white/25 focus:border-amber-400" />
    </label>
  );
}
