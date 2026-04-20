import axios from 'axios'
const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
API.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
export default API
export const statusColor = {
  pending: 'text-amber-300 border-amber-300/40 bg-amber-300/10',
  approved: 'text-emerald-300 border-emerald-300/40 bg-emerald-300/10',
  rejected: 'text-rose-300 border-rose-300/40 bg-rose-300/10',
  cancelled: 'text-slate-300 border-slate-300/30 bg-slate-300/10',
  completed: 'text-cyan-300 border-cyan-300/40 bg-cyan-300/10',
}
