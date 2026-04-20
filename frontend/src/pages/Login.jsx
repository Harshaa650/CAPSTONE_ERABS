import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const demo = [
  { role: 'Admin', email: 'admin@erabs.io', pw: 'admin123' },
  { role: 'Manager', email: 'manager@erabs.io', pw: 'manager123' },
  { role: 'Employee', email: 'employee@erabs.io', pw: 'employee123' },
]
export default function Login() {
  const { login } = useAuth(); const nav = useNavigate()
  const [email, setEmail] = useState('employee@erabs.io'); const [pw, setPw] = useState('employee123'); const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setBusy(true)
    try { await login(email, pw); toast.success('Welcome back'); nav('/') }
    catch (err) { toast.error(err?.response?.data?.detail || 'Login failed') } finally { setBusy(false) }
  }
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-12 relative noise overflow-hidden">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-accent rounded-xl grid place-items-center text-ink-900"><Sparkles size={18}/></div><span className="font-display text-2xl">ERABS</span></div>
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:.8}}>
          <h1 className="font-display text-5xl leading-[1.05]">Allocate, book & govern<br/><span className="text-accent">every resource</span> — with intent.</h1>
          <p className="mt-4 text-white/60 max-w-md">Real-time conflict detection, policy-aware approvals and a calendar that understands your org. Built for modern workplaces.</p>
        </motion.div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {demo.map(d => <button key={d.role} onClick={() => { setEmail(d.email); setPw(d.pw) }} className="glass rounded-xl p-3 text-left hover:border-accent/40">
            <div className="text-accent font-semibold">{d.role}</div><div className="text-white/60 truncate">{d.email}</div>
          </button>)}
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <motion.form onSubmit={submit} initial={{opacity:0, scale:.97}} animate={{opacity:1, scale:1}}
          className="glass-strong rounded-3xl p-8 w-full max-w-md">
          <h2 className="font-display text-3xl">Welcome back</h2>
          <p className="text-white/50 mt-1 text-sm">Sign in to your ERABS workspace</p>
          <label className="block mt-6 text-xs text-white/60">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} data-testid="login-email"/>
          <label className="block mt-3 text-xs text-white/60">Password</label>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} data-testid="login-password"/>
          <button disabled={busy} className="btn-primary w-full justify-center mt-6" data-testid="login-submit">{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="text-center text-xs text-white/40 mt-4">Use the demo accounts on the left to explore all roles.</p>
        </motion.form>
      </div>
    </div>
  )
}
