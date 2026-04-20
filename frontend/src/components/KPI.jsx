import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useState } from 'react'

export function CountUp({ value = 0 }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, v => Math.round(v))
  const [n, setN] = useState(0)
  useEffect(() => { const c = animate(mv, value, { duration: 1.1 }); const u = rounded.on('change', setN); return () => { c.stop(); u() } }, [value])
  return <span>{n}</span>
}

export default function KPI({ label, value, accent = 'accent', icon: Icon, hint }) {
  return (
    <motion.div whileHover={{ y: -4, rotateX: 2, rotateY: -2 }} transition={{ type: 'spring', stiffness: 250 }}
      className="relative noise glass rounded-3xl p-5 overflow-hidden group">
      <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl opacity-30 bg-${accent}`} />
      <div className="flex items-center justify-between text-white/60 text-sm"><span>{label}</span>{Icon && <Icon size={16}/>}</div>
      <div className="mt-3 font-display text-4xl"><CountUp value={value}/></div>
      {hint && <div className="mt-2 text-xs text-white/50">{hint}</div>}
    </motion.div>
  )
}
