import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, CalendarCheck, Boxes, ShieldCheck, Users, LogOut, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const nav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, roles: ['employee','manager','admin'] },
  { to: '/resources', label: 'Resources', icon: Boxes, roles: ['employee','manager','admin'] },
  { to: '/bookings', label: 'My Bookings', icon: CalendarCheck, roles: ['employee','manager','admin'] },
  { to: '/manager', label: 'Approvals', icon: Users, roles: ['manager','admin'] },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['admin'] },
]

export default function Shell() {
  const { user, logout } = useAuth(); const nav2 = useNavigate(); const location = useLocation()
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 p-5 border-r border-white/5 hidden md:flex flex-col gap-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent grid place-items-center text-ink-900"><Sparkles size={18}/></div>
          <div><div className="font-display text-xl leading-none">ERABS</div><div className="text-xs text-white/50">Resource OS</div></div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.filter(n => n.roles.includes(user.role)).map(n => (
            <NavLink key={n.to} to={n.to} end
              className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded-xl transition ${isActive ? 'bg-accent/15 text-accent border border-accent/20' : 'hover:bg-white/5 text-white/75'}`}>
              <n.icon size={16}/> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto glass rounded-2xl p-3">
          <div className="text-sm font-semibold">{user.name}</div>
          <div className="text-xs text-white/50">{user.role} · {user.department}</div>
          <button onClick={() => { logout(); nav2('/login') }} className="mt-3 btn-ghost w-full justify-center text-sm"><LogOut size={14}/> Sign out</button>
        </div>
      </aside>
      <main className="flex-1 p-5 md:p-8 max-w-[1500px] mx-auto w-full">
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
