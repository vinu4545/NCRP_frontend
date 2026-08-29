import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Button, ErrorBox, Loading } from '../components/common'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const state = useAsync(api.profile, [])
  const [form, setForm] = useState({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState()
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  const { signOut } = useAuth()

  useEffect(() => {
    if (state.data) setForm({ full_name: state.data.name || '', email: state.data.email || '', address: state.data.address || '', state: state.data.state || '', district: state.data.district || '' })
  }, [state.data])

  if (state.loading) return <Loading text="Loading your account…" />
  if (state.error) return <ErrorBox error={state.error} />

  const save = async event => {
    event.preventDefault(); setSaved(false); setError()
    try { await api.updateProfile(form); setSaved(true) } catch (caught) { setError(caught) }
  }
  const logout = async () => { setLoggingOut(true); await signOut(); navigate('/login') }

  return <div className="narrow profile-page">
    <p className="eyebrow">YOUR ACCOUNT</p>
    <h1>Profile</h1>
    <p className="page-description">Update the contact details connected to your NCRP account.</p>
    <div className="account-reference"><span>Mobile number</span><strong>{state.data.phone}</strong></div>
    <ErrorBox error={error} />
    {saved && <div className="alert" role="status"><strong>Your profile was updated.</strong><span>Your changes have been saved.</span></div>}
    <form onSubmit={save}>{Object.entries({ full_name: 'Full name', email: 'Email', address: 'Address', state: 'State', district: 'District' }).map(([key, label]) => <label htmlFor={`profile-${key}`} key={key}>{label}<input id={`profile-${key}`} type={key === 'email' ? 'email' : 'text'} autoComplete={key === 'full_name' ? 'name' : key === 'email' ? 'email' : undefined} value={form[key] || ''} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}<Button primary>Save changes</Button></form>
    <div className="account-actions"><Button onClick={logout} disabled={loggingOut}>{loggingOut ? 'Signing out…' : 'Sign out'}</Button><Button disabled title="Account deletion is not available in the current backend API">Delete account</Button></div>
    <p className="hint">Account deletion is not available yet.</p>
  </div>
}
