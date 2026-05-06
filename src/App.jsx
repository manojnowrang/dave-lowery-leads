import { supabase } from './supabase'
import React, { useMemo, useState } from "react";

const GOLD = "#C8952D";
const NAVY = "#061829";
const RED = "#D71920";
const GREEN = "#0F7A4F";
const BLUE = "#2563EB";

const leadTypes = [
  {
    id: "buy",
    label: "I Want to Buy",
    short: "Buy",
    icon: "home",
    description: "Find the right home, not just any home.",
    accent: GOLD,
  },
  {
    id: "sell",
    label: "I Want to Sell",
    short: "Sell",
    icon: "dollar",
    description: "Get a smart pricing and marketing strategy.",
    accent: RED,
  },
  {
    id: "invest",
    label: "I Want to Invest",
    short: "Invest",
    icon: "trend",
    description: "Build wealth with Winnipeg real estate.",
    accent: GREEN,
  },
  {
    id: "market_report",
    label: "Send Me the Market Report",
    short: "Market Report",
    icon: "file",
    description: "Get the latest Winnipeg market snapshot.",
    accent: BLUE,
  },
];

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  preferredArea: "",
  priceRange: "",
  homeType: "",
  timeline: "",
  mortgageStatus: "",
  propertyAddress: "",
  neighbourhood: "",
  estimatedValue: "",
  reasonSelling: "",
  investmentBudget: "",
  investmentGoal: "",
  message: "",
  consent: false,
};

function isValidLeadType(value) {
  return leadTypes.some((item) => item.id === value);
}

function getRequiredFieldsForLeadType(value) {
  if (!isValidLeadType(value)) return [];
  return ["firstName", "lastName", "email", "phone", "consent"];
}

function buildLeadPayload(leadType, form) {
  return {
    lead_type: leadType,
    first_name: form.firstName,
    last_name: form.lastName,
    email: form.email,
    phone: form.phone,
    preferred_area: form.preferredArea,
    price_range: form.priceRange,
    home_type: form.homeType,
    timeline: form.timeline,
    mortgage_status: form.mortgageStatus,
    property_address: form.propertyAddress,
    neighbourhood: form.neighbourhood,
    estimated_value: form.estimatedValue,
    reason_selling: form.reasonSelling,
    investment_budget: form.investmentBudget,
    investment_goal: form.investmentGoal,
    message: form.message,
    consent: form.consent,
  };
}

function runSelfTests() {
  console.assert(isValidLeadType("buy") === true, "buy should be valid");
  console.assert(isValidLeadType("sell") === true, "sell should be valid");
  console.assert(isValidLeadType("invest") === true, "invest should be valid");
  console.assert(isValidLeadType("market_report") === true, "market_report should be valid");
  console.assert(isValidLeadType("unknown") === false, "unknown should not be valid");
  console.assert(getRequiredFieldsForLeadType("buy").includes("email"), "email should be required");
  const testPayload = buildLeadPayload("buy", { ...initialForm, firstName: "Test", consent: true });
  console.assert(testPayload.lead_type === "buy", "payload should include lead type");
  console.assert(testPayload.first_name === "Test", "payload should map first name");
  console.assert(testPayload.consent === true, "payload should map consent");
}

runSelfTests();

function Icon({ name, size = 24, className = "" }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true",
  };

  if (name === "home") {
    return (
      <svg {...props}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9 21v-7h6v7" />
      </svg>
    );
  }

  if (name === "dollar") {
    return (
      <svg {...props}>
        <path d="M12 2v20" />
        <path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }

  if (name === "trend") {
    return (
      <svg {...props}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </svg>
    );
  }

  if (name === "file") {
    return (
      <svg {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...props}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.11 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.61a2 2 0 0 1-.45 2.11L9 10.73a16 16 0 0 0 4.27 4.27l1.29-1.29a2 2 0 0 1 2.11-.45c.84.3 1.71.51 2.61.63A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...props}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    );
  }

  if (name === "map") {
    return (
      <svg {...props}>
        <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12l3 3 5-6" />
      </svg>
    );
  }

  if (name === "right") {
    return (
      <svg {...props}>
        <path d="M5 12h14" />
        <path d="M12 5l7 7-7 7" />
      </svg>
    );
  }

  if (name === "left") {
    return (
      <svg {...props}>
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    );
  }

  return null;
}

export default function DaveLoweryLeadCaptureApp() {
  const [leadType, setLeadType] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selected = useMemo(() => {
    return leadTypes.find((item) => item.id === leadType) || null;
  }, [leadType]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    const payload = buildLeadPayload(leadType, form);
    const { error } = await supabase.from("leads").insert([payload]);

    setSubmitting(false);

    if (error) {
      console.error("Supabase insert error:", error);
      setSubmitError("Something went wrong. Please try again or contact Dave directly.");
      return;
    }

    setSubmitted(true);
  }

  function resetApp() {
    setLeadType(null);
    setForm(initialForm);
    setSubmitted(false);
    setSubmitError("");
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-blue-800/30 blur-3xl sm:h-80 sm:w-80" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-7xl items-center px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        <div className="grid w-full gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
          <BrandPanel />

          <section className="rounded-[1.5rem] bg-white p-4 text-slate-950 shadow-2xl sm:rounded-[1.75rem] sm:p-5 md:p-7">
            {!leadType && !submitted && <LeadTypeChooser onChoose={setLeadType} />}
            {leadType && !submitted && selected && (
              <LeadForm
                selected={selected}
                leadType={leadType}
                form={form}
                updateField={updateField}
                onBack={() => setLeadType(null)}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitError={submitError}
              />
            )}
            {submitted && <ThankYou resetApp={resetApp} />}
          </section>
        </div>
      </main>
    </div>
  );
}

function BrandPanel() {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur sm:rounded-[1.75rem] sm:p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-black tracking-tight sm:text-3xl">
            DAVE <span style={{ color: GOLD }}>LOWERY</span>
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 sm:text-sm">REALTOR® | WINNIPEG, MB</p>
        </div>
        <div className="w-fit rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-left text-[11px] font-bold uppercase leading-tight sm:text-right sm:text-xs">
          Royal LePage<br />Prime Real Estate
        </div>
      </div>

      <div>
        <p className="mb-2 font-serif text-2xl italic text-white/90 sm:text-3xl">What a Difference a</p>
        <h1 className="text-5xl font-black leading-[0.88] tracking-tight sm:text-6xl lg:text-7xl">
          DAVE
          <span className="block font-serif text-4xl italic leading-none sm:text-5xl" style={{ color: GOLD }}>
            Makes!
          </span>
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-white/78 sm:mt-6 sm:text-lg">
          Trusted advice. Proven results. A better real estate experience for buyers, sellers, and investors across Winnipeg.
        </p>
      </div>
    </section>
  );
}

function LeadTypeChooser({ onChoose }) {
  return (
    <div>
      <div className="mb-5 sm:mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] sm:text-sm" style={{ color: GOLD }}>Start here</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">How can Dave help?</h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">Choose the option that best matches your real estate goal.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {leadTypes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChoose(item.id)}
            className="group min-h-[142px] rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-1 hover:border-amber-400 hover:bg-white hover:shadow-xl sm:p-5"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white sm:mb-4" style={{ backgroundColor: item.accent }}>
              <Icon name={item.icon} size={24} />
            </div>
            <h3 className="text-lg font-black sm:text-xl">{item.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold" style={{ color: item.accent }}>
              Continue <Icon name="right" size={16} className="transition group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LeadForm({ selected, leadType, form, updateField, onBack, onSubmit, submitting, submitError }) {
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-5">
        <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <Icon name="left" size={16} /> Back
        </button>
        <p className="text-xs font-bold uppercase tracking-[0.2em] sm:text-sm" style={{ color: selected.accent }}>{selected.short} Lead</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Tell Dave a little more.</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="First Name" value={form.firstName} onChange={(value) => updateField("firstName", value)} required />
        <Input label="Last Name" value={form.lastName} onChange={(value) => updateField("lastName", value)} required />
        <Input label="Email" type="email" value={form.email} onChange={(value) => updateField("email", value)} required icon="mail" />
        <Input label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} required icon="phone" />
      </div>

      {leadType === "buy" && <BuyerFields form={form} updateField={updateField} />}
      {leadType === "sell" && <SellerFields form={form} updateField={updateField} />}
      {leadType === "invest" && <InvestorFields form={form} updateField={updateField} />}
      {leadType === "market_report" && <MarketReportFields form={form} updateField={updateField} />}

      <div className="mt-4">
        <label className="mb-2 block text-sm font-bold text-slate-700">Message / Notes</label>
        <textarea
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          rows={4}
          className="w-full min-h-[110px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:bg-white"
          placeholder="Tell Dave anything helpful about your goals..."
        />
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(event) => updateField("consent", event.target.checked)}
          required
          className="mt-1 h-5 w-5 shrink-0"
        />
        <span>I consent to Dave Lowery contacting me about my real estate inquiry.</span>
      </label>

      {submitError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{submitError}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-black uppercase tracking-wide text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: NAVY }}
      >
        {submitting ? "Sending..." : "Send My Request"} <Icon name="right" size={18} />
      </button>
    </form>
  );
}

function BuyerFields({ form, updateField }) {
  return (
    <Section>
      <Input label="Preferred Winnipeg Area" value={form.preferredArea} onChange={(value) => updateField("preferredArea", value)} icon="map" />
      <Select label="Price Range" value={form.priceRange} onChange={(value) => updateField("priceRange", value)} options={["Under $300,000", "$300,000-$450,000", "$450,000-$650,000", "$650,000+", "Not sure yet"]} />
      <Select label="Home Type" value={form.homeType} onChange={(value) => updateField("homeType", value)} options={["Detached", "Condo", "Townhouse", "Duplex", "Open to options"]} />
      <Select label="Timeline to Buy" value={form.timeline} onChange={(value) => updateField("timeline", value)} options={["Immediately", "1-3 months", "3-6 months", "6-12 months", "Just researching"]} />
      <Select label="Mortgage Pre-Approval" value={form.mortgageStatus} onChange={(value) => updateField("mortgageStatus", value)} options={["Already pre-approved", "Need a mortgage contact", "Not yet", "Buying cash", "Not sure"]} />
    </Section>
  );
}

function SellerFields({ form, updateField }) {
  return (
    <Section>
      <Input label="Property Address" value={form.propertyAddress} onChange={(value) => updateField("propertyAddress", value)} icon="map" />
      <Input label="Neighbourhood" value={form.neighbourhood} onChange={(value) => updateField("neighbourhood", value)} />
      <Select label="Estimated Home Value" value={form.estimatedValue} onChange={(value) => updateField("estimatedValue", value)} options={["Under $300,000", "$300,000-$450,000", "$450,000-$650,000", "$650,000+", "Not sure"]} />
      <Select label="Timeline to Sell" value={form.timeline} onChange={(value) => updateField("timeline", value)} options={["Immediately", "1-3 months", "3-6 months", "6-12 months", "Just curious"]} />
      <Select label="Reason for Selling" value={form.reasonSelling} onChange={(value) => updateField("reasonSelling", value)} options={["Upsizing", "Downsizing", "Relocating", "Investment property", "Estate/family reason", "Other"]} />
    </Section>
  );
}

function InvestorFields({ form, updateField }) {
  return (
    <Section>
      <Select label="Investment Budget" value={form.investmentBudget} onChange={(value) => updateField("investmentBudget", value)} options={["Under $300,000", "$300,000-$500,000", "$500,000-$750,000", "$750,000+", "Need guidance"]} />
      <Input label="Preferred Area" value={form.preferredArea} onChange={(value) => updateField("preferredArea", value)} icon="map" />
      <Select label="Property Type" value={form.homeType} onChange={(value) => updateField("homeType", value)} options={["Single-family rental", "Duplex", "Condo", "Multi-family", "Flip", "Open to opportunities"]} />
      <Select label="Investment Goal" value={form.investmentGoal} onChange={(value) => updateField("investmentGoal", value)} options={["Cash flow", "Long-term appreciation", "Flip/resale", "Retirement income", "Build a portfolio"]} />
    </Section>
  );
}

function MarketReportFields({ form, updateField }) {
  return (
    <Section>
      <Select label="Area of Interest" value={form.preferredArea} onChange={(value) => updateField("preferredArea", value)} options={["City-wide Winnipeg", "Northeast Winnipeg", "Northwest Winnipeg", "Southwest Winnipeg", "Southeast Winnipeg", "Not sure"]} />
      <Select label="I am mainly interested in" value={form.timeline} onChange={(value) => updateField("timeline", value)} options={["Buying", "Selling", "Investing", "Market updates", "Home value"]} />
    </Section>
  );
}

function ThankYou({ resetApp }) {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center px-2 text-center sm:min-h-[620px]">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
        <Icon name="check" size={42} />
      </div>
      <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: GOLD }}>Request received</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Thanks — Dave will be in touch shortly.</h2>
      <p className="mt-4 max-w-md text-slate-600">
        Your information has been captured. Dave can now follow up with neighbourhood-specific advice and next steps.
      </p>
      <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
        <a href="tel:2047973000" className="rounded-2xl border border-slate-200 px-4 py-3 font-bold hover:bg-slate-50">Call Dave</a>
        <a href="mailto:info@davelowery.com" className="rounded-2xl px-4 py-3 font-bold text-white" style={{ backgroundColor: GOLD }}>Email Dave</a>
      </div>
      <button type="button" onClick={resetApp} className="mt-6 text-sm font-bold text-slate-500 hover:text-slate-950">Start another request</button>
    </div>
  );
}

function Section({ children }) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Input({ label, value, onChange, type = "text", required = false, icon }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}{required ? " *" : ""}</span>
      <div className="relative">
        {icon ? <Icon name={icon} size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /> : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className={`w-full min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 py-3 text-base outline-none transition focus:border-amber-500 focus:bg-white ${icon ? "pl-10 pr-4" : "px-4"}`}
        />
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:bg-white"
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
