import { useState } from "react";

const GOLD = "#C8952D";

function getSupabaseClient() {
  if (typeof globalThis === "undefined") return null;
  if (globalThis.supabaseClient) return globalThis.supabaseClient;
  if (globalThis.supabase) return globalThis.supabase;
  return null;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setErrorMessage("");
    setWorking(true);

    const supabase = getSupabaseClient();

    if (!supabase) {
      setWorking(false);
      setErrorMessage("Supabase is not connected. Check main.jsx.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setWorking(false);

    if (error) {
      setErrorMessage("Login failed. Check the email and password.");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute left-[-140px] top-1/3 h-96 w-96 rounded-full bg-blue-900/25 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8">
        <section className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: GOLD }}>
              Dave Lowery Admin
            </p>

            <h1 className="mt-4 text-5xl font-black leading-none tracking-tight sm:text-6xl">
              Secure
              <span className="block" style={{ color: GOLD }}>
                Login
              </span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
              Private dashboard access for Dave Lowery’s real estate lead pipeline.
            </p>
          </div>

          <form onSubmit={handleLogin} className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-2xl sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: GOLD }}>
              Sign in
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Access the dashboard
            </h2>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full min-h-[52px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:bg-white"
                placeholder="Dave's email"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full min-h-[52px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:bg-white"
                placeholder="Password"
              />
            </label>

            {errorMessage ? (
              <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={working}
              className="mt-6 w-full rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "#061829" }}
            >
              {working ? "Signing in..." : "Login"}
            </button>

            <a href="/" className="mt-5 block text-center text-sm font-bold text-slate-500 hover:text-slate-950">
              Return to lead form
            </a>
          </form>
        </section>
      </main>
    </div>
  );
}
