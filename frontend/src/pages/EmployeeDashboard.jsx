import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { CalendarClock, AlertTriangle, CheckCircle2, Boxes, TrendingUp, Users2 } from 'lucide-react'
import API, { statusColor } from '../lib/api'
import KPI from '../components/KPI'
import { useAuth } from '../hooks/useAuth'

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [sum, setSum] = useState(null); const [resources, setResources] = useState([]); const [bookings, setBookings] = useState([])
  const [flipped, setFlipped] = useState(null); const [form, setForm] = useState({ resource_id: null, start: '', end: '', attendees: 1, purpose: '' }); const [hint, setHint] = useState(null)

  const load = async () => {
    const [s, r, b] = await Promise.all([API.get('/analytics/summary'), API.get('/resources'), API.get('/bookings?scope=mine')])
    setSum(s.data); setResources(r.data); setBookings(b.data)
  }
  useEffect(() => { load() }, [])

  const validate = async (f) => {
    if (!f.resource_id || !f.start || !f.end) return setHint(null)
    try {
      const { data } = await API.post('/bookings/validate', {
        resource_id: f.resource_id, start_time: new Date(f.start).toISOString(),
        end_time: new Date(f.end).toISOString(), attendees: Number(f.attendees) || 1, purpose: f.purpose })
      setHint(data.ok ? { ok: true, msg: 'Slot is available' } : { ok: false, msg: data.reason })
    } catch {}
  }

  const book = async (r) => {
    try {
      await API.post('/bookings', {
        resource_id: r.id, start_time: new Date(form.start).toISOString(),
        end_time: new Date(form.end).toISOString(), attendees: Number(form.attendees) || 1, purpose: form.purpose })
      toast.success(r.requires_approval ? 'Request sent for approval' : 'Booking confirmed')
      setFlipped(null); setForm({ resource_id: null, start: '', end: '', attendees: 1, purpose: '' })
      load()
    } catch (e) { toast.error(e?.response?.data?.detail || 'Booking failed') }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[.2em] text-white/40">Overview</div>
        <h1 className="font-display text-4xl md:text-5xl mt-1">Hello, {user.name.split(' ')[0]} <span className="text-accent">.</span></h1>
        <p className="text-white/60 mt-1 text-sm">Here's what's moving in your workspace today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="kpi-row">
        <KPI label="Total bookings" value={sum?.total_bookings ?? 0} icon={CalendarClock}/>
        <KPI label="Pending approvals" value={sum?.pending_approvals ?? 0} accent="accent-amber" icon={CheckCircle2}/>
        <KPI label="Active resources" value={sum?.active_resources ?? 0} accent="accent-cyan" icon={Boxes}/>
        <KPI label="Upcoming" value={sum?.upcoming ?? 0} accent="accent-pink" icon={TrendingUp}/>
      </div>

      <section>
        <div className="flex items-end justify-between mb-3">
          <div><h2 className="font-display text-2xl">Quick book</h2><p className="text-white/50 text-sm">Tap a card to flip and reserve.</p></div>
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {resources.slice(0, 8).map(r => (
            <div key={r.id} className="[perspective:1200px] h-72">
              <motion.div className="relative w-full h-full [transform-style:preserve-3d]"
                animate={{ rotateY: flipped === r.id ? 180 : 0 }} transition={{ duration: .6 }}>
                {/* Front */}
                <div className="absolute inset-0 [backface-visibility:hidden] glass rounded-3xl overflow-hidden group">
                  <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${r.image_url})` }}/>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-display text-lg">{r.name}</div>
                      <span className="chip border-white/10 text-white/70">{r.type}</span>
                    </div>
                    <div className="text-xs text-white/50 mt-1">{r.location} · cap {r.capacity}</div>
                    <div className="flex items-center gap-2 mt-3 text-xs">
                      {r.requires_approval && <span className="chip border-amber-300/40 text-amber-300 bg-amber-300/10"><AlertTriangle size={12}/> approval</span>}
                      <span className="chip border-emerald-300/40 text-emerald-300 bg-emerald-300/10">{r.avail_start}:00–{r.avail_end}:00</span>
                    </div>
                    <button onClick={() => { setFlipped(r.id); setForm(f => ({ ...f, resource_id: r.id })); setHint(null) }}
                      className="btn-primary w-full justify-center mt-4" data-testid={`book-${r.id}`}>Book now</button>
                  </div>
                </div>
                {/* Back */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] glass-strong rounded-3xl p-4">
                  <div className="flex items-center justify-between"><div className="font-display">{r.name}</div>
                    <button className="text-xs text-white/60" onClick={() => setFlipped(null)}>close</button></div>
                  <div className="mt-2 space-y-2 text-sm">
                    <input type="datetime-local" onChange={e => { const nf = { ...form, resource_id: r.id, start: e.target.value }; setForm(nf); validate(nf) }}/>
                    <input type="datetime-local" onChange={e => { const nf = { ...form, resource_id: r.id, end: e.target.value }; setForm(nf); validate(nf) }}/>
                    {r.capacity > 1 && <input type="number" min={1} max={r.capacity} placeholder="attendees"
                      onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))}/>}
                    <input placeholder="Purpose" onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}/>
                    {hint && <div className={`text-xs px-2 py-1 rounded-lg ${hint.ok ? 'bg-emerald-300/10 text-emerald-300' : 'bg-rose-300/10 text-rose-300'}`}>{hint.msg}</div>}
                    <button onClick={() => book(r)} className="btn-primary w-full justify-center" disabled={hint && !hint.ok}>Confirm</button>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl mb-3">Your recent bookings</h2>
        <div className="glass rounded-2xl divide-y divide-white/5">
          <AnimatePresence>
            {bookings.slice(0, 6).map(b => (
              <motion.div key={b.id} layout initial={{opacity:0}} animate={{opacity:1}}
                className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{b.resource_name}</div>
                  <div className="text-xs text-white/50">{new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleTimeString()}</div>
                </div>
                <span className={`chip capitalize ${statusColor[b.status]}`}>{b.status}</span>
                {b.status !== 'cancelled' && b.status !== 'rejected' &&
                  <button onClick={async () => { await API.post(`/bookings/${b.id}/cancel`); toast('Cancelled'); load() }}
                    className="btn-ghost text-xs">Cancel</button>}
              </motion.div>
            ))}
            {bookings.length === 0 && <div className="p-8 text-center text-white/50 text-sm">No bookings yet — pick a resource above.</div>}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}
