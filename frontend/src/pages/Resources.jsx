import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import API from '../lib/api'
import { Search } from 'lucide-react'

export default function Resources() {
  const [list, setList] = useState([]); const [q, setQ] = useState(''); const [type, setType] = useState('all')
  useEffect(() => { API.get('/resources').then(r => setList(r.data)) }, [])
  const types = ['all', ...new Set(list.map(r => r.type))]
  const filtered = list.filter(r => (type === 'all' || r.type === type) && r.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-6">
      <div><div className="text-xs uppercase tracking-[.2em] text-white/40">Catalog</div>
        <h1 className="font-display text-4xl mt-1">Resources</h1></div>
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5 w-64"><Search size={14}/><input className="!bg-transparent !border-0 !p-0" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)}/></div>
        <div className="flex gap-2">{types.map(t => <button key={t} onClick={() => setType(t)}
          className={`chip capitalize ${type===t ? 'border-accent text-accent' : 'border-white/10 text-white/60'}`}>{t}</button>)}</div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*.05 }}
            whileHover={{ y: -4 }} className="glass rounded-3xl overflow-hidden">
            <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${r.image_url})` }}/>
            <div className="p-4">
              <div className="flex justify-between items-center"><div className="font-display text-lg">{r.name}</div>
                <span className="chip border-white/10 text-white/60">{r.type}</span></div>
              <p className="text-sm text-white/60 mt-1">{r.description}</p>
              <div className="mt-3 flex gap-2 text-xs flex-wrap">
                <span className="chip border-white/10 text-white/60">cap {r.capacity}</span>
                <span className="chip border-white/10 text-white/60">{r.avail_start}:00–{r.avail_end}:00</span>
                {r.requires_approval && <span className="chip border-amber-300/40 text-amber-300 bg-amber-300/10">approval</span>}
              </div>
            </div>
          </motion.div>))}
      </div>
    </div>
  )
}
