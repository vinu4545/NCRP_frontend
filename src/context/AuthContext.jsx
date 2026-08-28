import { createContext, useContext, useState } from 'react'
import { api } from '../services/api'
import { TOKEN_KEY } from '../services/api/client'
const AuthContext = createContext(null)
export function AuthProvider({ children }) { const [user, setUser] = useState(() => { try { return JSON.parse(sessionStorage.getItem('ncrp_user')) } catch { return null } }); const signIn = data => { localStorage.setItem(TOKEN_KEY, data.token); sessionStorage.setItem('ncrp_user', JSON.stringify(data.user)); setUser(data.user) }; const signOut = async () => { try { await api.logout() } catch {} localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem('ncrp_user'); setUser(null) }; return <AuthContext.Provider value={{ user, authenticated: Boolean(user || localStorage.getItem(TOKEN_KEY)), signIn, signOut }}>{children}</AuthContext.Provider> }
export const useAuth = () => useContext(AuthContext)
