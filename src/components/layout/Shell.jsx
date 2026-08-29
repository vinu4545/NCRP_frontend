import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../context/AuthContext'
import { ErrorBox, Loading } from '../common'

function isActive(pathname, path) { return path === '/' ? pathname === '/' : pathname.startsWith(path) }

function Notifications({ onClose }) {
  const state = useAsync(api.notifications, [])
  const [readError, setReadError] = useState()
  const [reading, setReading] = useState(false)
  const [allRead, setAllRead] = useState(false)
  const markAllRead = async () => {
    setReading(true); setReadError()
    try { await api.readAll(); setAllRead(true) } catch (error) { setReadError(error) } finally { setReading(false) }
  }
  return <aside className="drawer" aria-label="Notifications">
    <div className="drawer-header"><h2>Notifications</h2><button type="button" className="drawer-close" onClick={onClose} aria-label="Close notifications">×</button></div>
    {state.loading ? <Loading text="Checking notifications…"/> : state.error ? <ErrorBox error={state.error} /> : state.data.notifications.length ? <>
      <div className="drawer-actions"><span>{state.data.notifications.length} notification{state.data.notifications.length === 1 ? '' : 's'}</span><button type="button" className="read-all-button" onClick={markAllRead} disabled={reading || allRead}>{reading ? 'Marking…' : allRead ? 'All read' : 'Mark all as read'}</button></div>
      {state.data.notifications.map(notification => <div className={`drawer-item ${allRead || notification.readAt ? 'is-read' : ''}`} key={notification.id}><strong>{notification.title}</strong><p>{notification.message}</p></div>)}
    </> : <div className="empty small-empty"><strong>You’re all caught up</strong><p>No new notifications.</p></div>}
    <ErrorBox error={readError}/>
  </aside>
}

function FullFooter() {
  return <footer>
    <div><strong>Citizen services</strong>Report cybercrime<br/>Check suspicious identifier<br/>Track complaint</div>
    <div><strong>Help</strong>FAQs<br/>Cyber safety<br/>Contact / Support</div>
    <div><strong>Information</strong>About NCRP<br/>Privacy<br/>Terms</div>
    <div><strong>Government resources</strong>Official cybercrime resources</div>
    <div className="brandline"><span>NCRP</span><span>Government of India</span></div>
    <div className="footer-credit">A Project made for "Build What Moves India" Hackathon by Varun Mayya</div>
  </footer>
}

export function FullLayout({ children }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { authenticated } = useAuth()
  return <div className="shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header><Link className="brand" to="/"><span>NATIONAL CYBERCRIME</span><strong>REPORTING PORTAL · NCRP</strong></Link><nav aria-label="Primary navigation">
      <Link className={isActive(location.pathname, '/') ? 'active' : ''} aria-current={location.pathname === '/' ? 'page' : undefined} to="/">Home</Link>
      <Link className={isActive(location.pathname, '/report') ? 'active' : ''} aria-current={isActive(location.pathname, '/report') ? 'page' : undefined} to="/report">Report cybercrime</Link>
      <Link className={isActive(location.pathname, '/cases') ? 'active' : ''} aria-current={isActive(location.pathname, '/cases') ? 'page' : undefined} to="/cases">My reports</Link>
      {authenticated && <button className="nav-button" aria-expanded={open} onClick={() => setOpen(!open)}>Notifications</button>}
      {authenticated ? <Link className={isActive(location.pathname, '/profile') ? 'active' : ''} aria-current={isActive(location.pathname, '/profile') ? 'page' : undefined} to="/profile">Profile</Link> : <Link className={isActive(location.pathname, '/login') ? 'active' : ''} aria-current={isActive(location.pathname, '/login') ? 'page' : undefined} to="/login">Sign in</Link>}
    </nav></header>
    {open && <Notifications onClose={() => setOpen(false)}/>}<main id="main-content">{children}</main><FullFooter />
  </div>
}

export function ReportLayout({ children }) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const save = async () => { setSaving(true); window.dispatchEvent(new CustomEvent('ncrp-save-report')); setTimeout(() => setSaving(false), 700) }
  const exit = () => { window.dispatchEvent(new CustomEvent('ncrp-save-report')); navigate('/') }
  return <div className="shell report-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header><Link className="report-brand" to="/">← <span>Report cybercrime</span></Link><span className="save-indicator"><button className="nav-button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button><button className="nav-button exit-button" onClick={exit}>Save & exit</button></span></header>
    <main id="main-content">{children}</main>
    <footer><div className="help-footer">Need Help?</div><div className="brandline"><span>NCRP</span><span>Government of India</span></div><div className="footer-credit">A Project made for "Build What Moves India" Hackathon by Varun Mayya</div></footer>
  </div>
}
