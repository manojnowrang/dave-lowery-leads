import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './index.css'
import App from './App.jsx'
import Dashboard from './Dashboard.jsx'
import Login from './Login.jsx'

const supabase = createClient(
  "https://hysuftmjwyakgafsdcpw.supabase.co",
  "sb_publishable_XbqZFqmfyOzNllxJVJx3Ng_Jm3P9T66"
)

globalThis.supabaseClient = supabase

const path = window.location.pathname

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/dashboard' ? <Dashboard /> :
     path === '/login' ? <Login /> :
     <App />}
  </StrictMode>,
)
