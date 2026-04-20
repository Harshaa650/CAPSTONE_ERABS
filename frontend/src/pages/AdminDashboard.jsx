import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Wrench, Plus } from 'lucide-react'
import API from '../lib/api'

const empty = { name:'', type:'room', description:'', capacity:1, location:'HQ', avail_start:8, avail_end:20,
  requires_approval:false, department_restricted:'', max_duration_min:240, active:true, image_url:'' }

export default function AdminDashboard() {
  const [resources, setResources] = useState([]); const [bookings, setBookings] = useState([])
  const [editing, setEditing] = useState(null); const [form, setForm] = useState(empty)
  const [maint, setMaint] = useState({ resource_id: '', start_time: '', end_time: '', reason: '' })
  const [logs, setLogs] = useState([])

  const load = async () => {
    const [r, b, l] = await Promise.all([API.get('/resources'), API.get('/bookings?scope=all'), API.get('/audit')])
    setResources(r.data); setBookings(b.data); setLogs(l.data)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      if (editing) await API.put(`/resources/${editing}`, form)
      else await API.post('/resources', form)
      toast.success('Saved'); setEditing(null); setForm(empty); load()
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  }
  const del = async id => { await API.delete(`/resources/${id}`); toast('Deactivated'); load() }
  const addMaint = async () => {
    try {
      const r = await API.post('/maintenance', {
        resource_id: Number(maint.resource_id),
        start_time: new Date(maint.start_time).toISOString(),
        end_time: new Date(maint.end_time).toISOString(), reason: maint.reason })
      toast.success(`Maintenance set. ${r.data.cancelled} bookings auto-cancelled`)
      setMaint({ resource_id: '', start_time: '', end_time: '', reason: '' }); load()
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  }

  return (
    <div className="space-y-8">
      <div><div className="text-xs uppercase tracking-[.2em] text-white/40">Admin</div>
        <h1 className="font-display text-4xl mt-1">Control center</h1></div>

      <section className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">Resources</h2>
          <button onClick={() => { setEditing(null); setForm(empty) }} className="btn-ghost text-sm"><Plus size={14}/> New</button>
        </div>
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/50 text-xs uppercase"><tr>
                <th className="text-left py-2">Name</th><th>Type</th><th>Cap.</th><th>Hours</th><th>Approval</th><th></th>
              </tr></thead>
              <tbody>{resources.map(r => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-2">{r.name}<div className="text-xs text-white/40">{r.location}</div></td>
                  <td className="text-center">{r.type}</td><td className="text-center">{r.capacity}</td>
                  <td className="text-center">{r.avail_start}–{r.avail_end}</td>
                  <td className="text-center">{r.requires_approval ? 'Yes' : 'No'}</td>
                  <td className="text-right flex gap-2 justify-end py-2">
                    <button onClick={() => { setEditing(r.id); setForm(r) }} className="btn-ghost text-xs"><Pencil size={12}/></button>
                    <button onClick={() => del(r.id)} className="btn-ghost text-xs text-rose-300"><Trash2 size={12}/></button>
                  </td></tr>))}</tbody>
            </table>
          </div>
          <div className="glass-strong rounded-2xl p-4 space-y-2">
            <div className="font-semibold">{editing ? 'Edit' : 'New'} resource</div>
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option>room</option><option>desk</option><option>projector</option><option>vehicle</option></select>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Capacity" value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })}/>
              <input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-white/60">Open <input type="number" min={0} max={23} value={form.avail_start} onChange={e => setForm({ ...form, avail_start: +e.target.value })}/></label>
              <label className="text-xs text-white/60">Close <input type="number" min={1} max={24} value={form.avail_end} onChange={e => setForm({ ...form, avail_end: +e.target.value })}/></label>
            </div>
            <label className="text-xs text-white/70">Max duration (min)
              <input type="range" min={30} max={600} step={30} value={form.max_duration_min}
                onChange={e => setForm({ ...form, max_duration_min: +e.target.value })}/>
              <span>{form.max_duration_min} min</span></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4" checked={form.requires_approval}
              onChange={e => setForm({ ...form, requires_approval: e.target.checked })}/> Requires approval</label>
            <input placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}/>
            <button onClick={save} className="btn-primary w-full justify-center">{editing ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <h2 className="font-display text-xl mb-3"><Wrench size={16} className="inline"/> Maintenance block</h2>
        <div className="grid md:grid-cols-5 gap-2">
          <select value={maint.resource_id} onChange={e => setMaint({ ...maint, resource_id: e.target.value })}>
            <option value="">Resource…</option>{resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="datetime-local" onChange={e => setMaint({ ...maint, start_time: e.target.value })}/>
          <input type="datetime-local" onChange={e => setMaint({ ...maint, end_time: e.target.value })}/>
          <input placeholder="Reason" value={maint.reason} onChange={e => setMaint({ ...maint, reason: e.target.value })}/>
          <button onClick={addMaint} className="btn-primary justify-center">Block</button>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-5">
          <h2 className="font-display text-xl mb-3">All bookings ({bookings.length})</h2>
          <div className="max-h-80 overflow-auto divide-y divide-white/5">
            {bookings.map(b => (
              <div key={b.id} className="py-2 text-sm flex justify-between"><span>{b.resource_name} · {b.user_name}</span>
                <span className="text-white/50 text-xs">{new Date(b.start_time).toLocaleString()} · {b.status}</span></div>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-5">
          <h2 className="font-display text-xl mb-3">Audit trail</h2>
          <div className="max-h-80 overflow-auto text-xs font-mono space-y-1">
            {logs.map(l => <div key={l.id} className="text-white/70">
              <span className="text-accent">{l.action}</span> {l.entity}#{l.entity_id} — <span className="text-white/40">{new Date(l.timestamp).toLocaleString()}</span> {l.details && `· ${l.details}`}</div>)}
          </div>
        </div>
      </section>
    </div>
  )
}
