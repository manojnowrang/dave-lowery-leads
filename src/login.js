import { useState } from "react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleLogin() {
    const supabase = globalThis.supabaseClient

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Login failed")
    } else {
      window.location.href = "/dashboard"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-white/10 p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Dave Login</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 p-3 rounded bg-black/50"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-3 rounded bg-black/50"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-yellow-500 text-black p-3 rounded font-bold"
        >
          Login
        </button>
      </div>
    </div>
  )
}