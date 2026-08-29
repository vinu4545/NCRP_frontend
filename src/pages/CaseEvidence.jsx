import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { uploadBinary } from '../services/api/client'
import { Button, ErrorBox, Loading } from '../components/common'

function EvidenceCard({ item, requested = false, onUpload }) {
  const inputRef = useRef(null); const [description, setDescription] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState()
  const upload = async event => { const file = event.target.files?.[0]; if (!file) return; setBusy(true); setError(); try { const prepared = await api.uploadUrl({ filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size }); if (!prepared.uploadUrl) throw new Error('The backend did not return a signed upload URL.'); await uploadBinary(prepared.uploadUrl, file); await api.addCaseEvidence(item.caseId, { kind: 'file', storagePath: prepared.storagePath, requestId: item.id, tag: item.tag, description: description || null }); onUpload() } catch (caught) { setError(caught) } finally { setBusy(false); if (inputRef.current) inputRef.current.value = '' } }
  if (requested) return <article className="case-evidence-card requested-evidence"><div className="evidence-card-top"><span className="evidence-type">REQUESTED</span><span className={`request-status ${item.status === 'FULFILLED' ? 'fulfilled' : ''}`}>{item.status || 'OPEN'}</span></div><h3>{item.tag || 'Additional evidence'}</h3><p>{item.description || 'Please provide supporting documentation.'}</p>{item.status !== 'FULFILLED' && <><input ref={inputRef} type="file" onChange={upload} hidden /><Button primary onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? 'Uploading…' : 'Upload evidence'}</Button>{error && <ErrorBox error={error}/>}</>}</article>
  return <article className="case-evidence-card"><div className="evidence-card-top"><span className="evidence-type">{item.kind === 'url' ? 'LINK' : 'FILE'}</span>{item.createdAt && <small>{new Date(item.createdAt).toLocaleDateString()}</small>}</div><h3>{item.filename || item.url || 'Evidence'}</h3>{item.tag && <span className="evidence-tag">{item.tag}</span>}{item.description && <p>{item.description}</p>}</article>
}

export default function CaseEvidence() {
  const { caseId } = useParams(); const [data, setData] = useState(); const [error, setError] = useState(); const [refreshing, setRefreshing] = useState(false)
  const load = async () => { try { setError(); setData(await api.caseEvidence(caseId)) } catch (caught) { setError(caught) } }
  useEffect(() => { load() }, [caseId])
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }
  if (!data) return error ? <ErrorBox error={error}/> : <Loading/>
  const submitted = data.submitted || []; const requested = data.requested || []
  return <div className="detail-main"><Link to={`/cases/${caseId}`}>← Back to Case Home</Link><p className="eyebrow">CASE EVIDENCE</p><h1>Evidence</h1><p>Review the evidence attached to this case and provide any documents requested by the investigating team.</p><ErrorBox error={error}/><section className="evidence-section"><div className="evidence-section-heading"><div><h2>Submitted evidence</h2><p className="hint">{submitted.length} item{submitted.length === 1 ? '' : 's'} attached to this case.</p></div></div>{submitted.length ? <div className="case-evidence-grid">{submitted.map(item => <EvidenceCard item={item} key={item.id}/>)}</div> : <div className="empty">No evidence has been submitted yet.</div>}</section><section className="evidence-section"><div className="evidence-section-heading"><div><h2>Required evidence</h2><p className="hint">Upload documents for each open request.</p></div>{requested.some(item => item.status !== 'FULFILLED') && <span className="request-count">{requested.filter(item => item.status !== 'FULFILLED').length} open</span>}</div>{requested.length ? <div className="case-evidence-grid">{requested.map(item => <EvidenceCard item={{ ...item, caseId }} requested key={item.id} onUpload={refresh}/>)}</div> : <div className="empty">There are no additional evidence requests.</div>}</section>{refreshing && <p className="hint">Refreshing evidence…</p>}</div>
}
