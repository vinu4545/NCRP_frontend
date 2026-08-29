import React from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FullLayout, ReportLayout } from './components/layout/Shell'
import { ErrorBox, Loading } from './components/common'
import { api } from './services/api'
import { useAsync } from './hooks/useAsync'
import Home from './pages/Home'
import Login from './pages/Auth/Login'
import Report from './pages/Report'
import { SuspectLanding, SuspectCheck, SuspectReport, SuspectSubmitted } from './pages/Suspect'
import { Cases, CaseHome } from './pages/Cases'
import Profile from './pages/Profile'
import AdminCase from './pages/AdminCase'
import CaseDetails from './pages/CaseDetails'
import CaseEvidencePage from './pages/CaseEvidence'
import { CaseTimeline, CaseMessages } from './pages/CaseActivity'
import AdminActivity from './pages/AdminActivity'

function Protected({ children }) { const { authenticated } = useAuth(); return authenticated ? children : <Navigate to="/login" replace /> }
function CasePage({ title }) { const { caseId } = useParams(); return <div className="detail-main"><a href={`/cases/${caseId}`}>← Back to Case Home</a><p className="eyebrow">CASE {title.toUpperCase()}</p><h1>{title}</h1><section className="panel"><p>This case surface is ready for backend data. The current API contract does not expose a dedicated {title.toLowerCase()} endpoint.</p></section></div> }
function Submitted() { const { caseId } = useParams(); return <div className="center success-page"><p className="success-mark" aria-hidden="true">✓</p><p className="eyebrow">REPORT RECEIVED</p><h1>Your report has been submitted</h1><p className="lead">We’ve recorded your cybercrime report. Keep this reference number so you can check updates later.</p><div className="reference-card"><span>Reference number</span><strong>{caseId}</strong></div><Link className="button primary" to={`/cases/${caseId}`}>View report status</Link><p className="hint">We’ll notify you when there is an update.</p></div> }
function CaseEvidence() { const { caseId } = useParams(); const state = useAsync(() => api.caseEvidence(caseId), [caseId]); if (state.loading) return <Loading/>; return <div className="detail-main"><a href={`/cases/${caseId}`}>← Back to Case Home</a><p className="eyebrow">CASE EVIDENCE</p><h1>Case evidence</h1>{state.error ? <ErrorBox error={state.error}/> : <><section className="panel"><h2>Submitted evidence</h2>{state.data.submitted?.length ? state.data.submitted.map(item => <p key={item.id}>{item.tag} — {item.description}</p>) : <p>No evidence submitted.</p>}</section><section className="panel"><h2>Evidence requested</h2>{state.data.requested?.length ? state.data.requested.map(item => <p key={item.id}>{item.tag} — {item.description}</p>) : <p>No additional evidence requested.</p>}</section></>}</div> }

function Routed() { return <Routes><Route path="/" element={<FullLayout><Home/></FullLayout>}/><Route path="/login" element={<FullLayout><Login/></FullLayout>}/><Route path="/report" element={<ReportLayout><Report/></ReportLayout>}/><Route path="/suspect" element={<FullLayout><SuspectLanding/></FullLayout>}/><Route path="/suspect/check" element={<FullLayout><SuspectCheck/></FullLayout>}/><Route path="/suspect/report" element={<FullLayout><SuspectReport/></FullLayout>}/><Route path="/suspect/submitted" element={<FullLayout><SuspectSubmitted/></FullLayout>}/><Route path="/cases" element={<FullLayout><Cases/></FullLayout>}/><Route path="/admin/cases/:caseId" element={<FullLayout><><AdminCase/><AdminActivity/></></FullLayout>}/><Route path="/cases/:caseId" element={<FullLayout><Protected><CaseHome/></Protected></FullLayout>}/><Route path="/cases/:caseId/details" element={<FullLayout><Protected><CaseDetails/></Protected></FullLayout>}/><Route path="/cases/:caseId/timeline" element={<FullLayout><Protected><CaseTimeline/></Protected></FullLayout>}/><Route path="/cases/:caseId/evidence" element={<FullLayout><Protected><CaseEvidencePage/></Protected></FullLayout>}/><Route path="/cases/:caseId/messages" element={<FullLayout><Protected><CaseMessages/></Protected></FullLayout>}/><Route path="/submitted/:caseId" element={<FullLayout><Protected><Submitted/></Protected></FullLayout>}/><Route path="/profile" element={<FullLayout><Protected><Profile/></Protected></FullLayout>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes> }
export default function App() { return <BrowserRouter><AuthProvider><Routed/></AuthProvider></BrowserRouter> }
