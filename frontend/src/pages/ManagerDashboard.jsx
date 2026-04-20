import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Check, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import API from '../lib/api'

const PIE = ['#7cf7c6', '#ff6ad5', '#5ee7ff', '#ffb547', '#a78bfa', '#f87171']

export default function ManagerDashboard() {
  const [queue, setQueue] = useState([]); const [sum, setSum] = useState(null); const [comment, setComment] = useState('')
  const load = async () => {
    const [q, s] = await Promise.all([API.get('/bookings?scope=pending'), API.get('/analytics/summary')])
    setQueue(q.data); setSum(s.data)
  }
  useEffect(() => { load() }, [])

  const act = async (id, action) => {
    try { await API.post(`/bookings/${id}/${action}`, null, { params: { comment } }); toast.success(action === 'approve' ? 'Approved' : 'Rejected'); setComment(''); load() }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  }

  return (
    <div className="space-y-8">
      <div><div className="text-xs uppercase tracking-[.2em] text-white/40">Manager</div>
        <h1 className="font-display text-4xl mt-1">Approval queue</h1></div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-5 min-h-[420px] relative">
          <h2 className="font-display text-xl mb-4">Swipe to decide ({queue.length})</h2>
          <div className="relative h-80">
            <AnimatePresence>
              {queue.slice(0, 3).map((b, i) => (
                <motion.div key={b.id} drag="x" dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => { if (info.offset.x > 120) act(b.id, 'approve'); else if (info.offset.x < -120) act(b.id, 'reject') }}
                  initial={{ scale: .9, y: i * 10, opacity: 0 }} animate={{ scale: 1 - i*.04, y: i * 10, opacity: 1 }} exit={{ x: 500, opacity: 0 }}
                  whileDrag={{ rotate: 4 }} className="absolute inset-0 glass-strong rounded-3xl p-6" style={{ zIndex: 10 - i }}>
                  <div className="text-xs text-white/50">Requested by</div>
                  <div className="font-display text-2xl">{b.user_name}</div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-white/50 text-xs">Resource</div>{b.resource_name}</div>
                    <div><div className="text-white/50 text-xs">Attendees</div>{b.attendees}</div>
                    <div className="col-span-2"><div className="text-white/50 text-xs">When</div>{new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleTimeString()}</div>
                    <div className="col-span-2"><div className="text-white/50 text-xs">Purpose</div>{b.purpose || '—'}</div>
                  </div>
                  {i === 0 && (
                    <div className="mt-5 space-y-2">
                      <input placeholder="Optional comment" value={comment} onChange={e => setComment(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={() => act(b.id, 'reject')} className="flex-1 btn-ghost justify-center text-rose-300 border-rose-300/40"><X size={16}/> Reject</button>
                        <button onClick={() => act(b.id, 'approve')} className="flex-1 btn-primary justify-center"><Check size={16}/> Approve</button>
                      </div>
                      <div className="text-xs text-white/40 text-center">Tip: drag the card ←/→ to decide</div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {queue.length === 0 && <div className="h-full grid place-items-center text-white/50">All caught up 🌿</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl p-5">
            <h3 className="font-display text-xl mb-3">Bookings by department</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sum?.by_department || []}>
                <XAxis dataKey="name" stroke="#ffffff70" fontSize={12}/><YAxis stroke="#ffffff70" fontSize={12}/>
                <Tooltip contentStyle={{ background:'#10121f', border:'1px solid #ffffff22', borderRadius: 12 }}/>
                <Bar dataKey="value" fill="#7cf7c6" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-3xl p-5">
            <h3 className="font-display text-xl mb-3">Mix by resource type</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sum?.by_type || []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                  {(sum?.by_type || []).map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:'#10121f', border:'1px solid #ffffff22', borderRadius: 12 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
