import { createContext, useContext, useEffect, useState } from 'react'
import API from '../lib/api'

const Ctx = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = localStorage.getItem('token')
    if (!t) { setLoading(false); return }
    API.get('/auth/me').then(r => setUser(r.data)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false))
  }, [])
  const login = async (email, password) => {
    const body = new URLSearchParams(); body.append('username', email); body.append('password', password)
    const { data } = await API.post('/auth/login', body)
    localStorage.setItem('token', data.access_token); setUser(data.user); return data.user
  }
  const logout = () => { localStorage.removeItem('token'); setUser(null) }
  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
