import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import API, { statusColor } from '../lib/api'

export default function MyBookings() {
  const [rows, setRows] = useState([]); const [filter, setFilter] = useState('all')
  const load = async () => setRows((await API.get('/bookings?scope=mine')).data)
  useEffect(() => { load() }, [])
  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)
  return (
    <div className="space-y-6">
      <div><div className="text-xs uppercase tracking-[.2em] text-white/40">Mine</div>
        <h1 className="font-display text-4xl mt-1">My bookings</h1></div>
      <div className="flex gap-2 flex-wrap">
        {['all','pending','approved','rejected','cancelled'].map(f =>
          <button key={f} onClick={() => setFilter(f)} className={`chip capitalize ${filter===f ? 'border-accent text-accent' : 'border-white/10 text-white/60'}`}>{f}</button>)}
      </div>
      <div className="glass rounded-2xl divide-y divide-white/5">
        {filtered.map(b => (
          <div key={b.id} className="p-4 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[220px]"><div className="font-semibold">{b.resource_name}</div>
              <div className="text-xs text-white/50">{new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleTimeString()}</div>
              {b.approver_comment && <div className="text-xs text-white/50 italic mt-1">“{b.approver_comment}”</div>}</div>
            <span className={`chip capitalize ${statusColor[b.status]}`}>{b.status}</span>
            {['pending','approved'].includes(b.status) &&
              <button onClick={async () => { await API.post(`/bookings/${b.id}/cancel`); toast('Cancelled'); load() }} className="btn-ghost text-xs">Cancel</button>}
          </div>))}
        {filtered.length === 0 && <div className="p-8 text-center text-white/50 text-sm">No bookings.</div>}
      </div>
    </div>
  )
}
