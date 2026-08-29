import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { TOKEN_KEY } from '../services/api/client'
import { Button, ErrorBox, Loading } from '../components/common'
import EvidenceReview from '../components/EvidenceReview'
import EvidenceUploader from '../components/EvidenceUploader'
import QuestionRenderer, { answerPayload, hasQuestionAnswer } from '../components/QuestionRenderer'
import { useAuth } from '../context/AuthContext'

export default function Report() {
  const { authenticated } = useAuth()
  const [draft, setDraft] = useState()
  const [step, setStep] = useState()
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState()
  const [error, setError] = useState()
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.createDraft().then(created => { setDraft(created); return api.current(created.draftId) }).then(setStep).catch(setError) }, [])
  useEffect(() => { const save = () => { if (draft?.draftId) api.save(draft.draftId).catch(setError) }; window.addEventListener('ncrp-save-report', save); return () => window.removeEventListener('ncrp-save-report', save) }, [draft])
  useEffect(() => { if (!step?.complete) return; if (!authenticated) { setPhase('auth'); return }; api.me().then(() => setPhase('evidence')).catch(() => { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem('ncrp_user'); setPhase('auth') }) }, [step?.complete, authenticated])

  const answer = async event => {
    event.preventDefault()
    if (!hasQuestionAnswer(step.question, value)) return
    setBusy(true)
    try { setStep(await api.answer(draft.draftId, { node_id: step.question.id, ...answerPayload(step.question, value) })); setValue(step.question.type === 'multi_select' ? [] : '') } catch (caught) { setError(caught) } finally { setBusy(false) }
  }
  const goBackFromEvidence = async () => { try { setStep(await api.back(draft.draftId)); setPhase(); setValue('') } catch (caught) { setError(caught) } }

  if (error && !draft) return <ErrorBox error={error} />
  if (!draft || !step) return <Loading text="Starting your report…" />
  if (step.complete && !phase) return <Loading text="Verifying your session…" />
  if (phase === 'auth') return <AuthStep onBack={() => setPhase()} onDone={() => setPhase('evidence')} />
  if (phase === 'evidence') return <EvidenceUploader draftId={draft.draftId} required claim={api.claim} addEvidence={api.addReportEvidence} onBack={goBackFromEvidence} onDone={() => setPhase('review')} />
  if (phase === 'review') return <ReviewStep draftId={draft.draftId} onBack={() => setPhase('evidence')} />
  if (!step.question) return <ErrorBox error={{ message: 'The report question was not returned by the backend.' }} />
  const question = step.question
  const percentage = Math.min(step.progress?.percentage || 0, 100)
  return <div className="narrow report-question"><div className="progress-summary"><span className="step">Step {step.progress?.current || 1} of {step.progress?.total || 1}</span><span>{percentage}% complete</span></div><div className="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage} aria-label="Report completion"><span style={{ width: `${percentage}%` }} /></div><p className="question-breadcrumb">{step.breadcrumb?.join(' / ')}</p><h1>{question.title}</h1>{question.description && <p className="question-description">{question.description}</p>}<ErrorBox error={error}/><form onSubmit={answer}><QuestionRenderer question={question} value={value} setValue={setValue}/>{question.type !== 'terminal' && <div className="actions"><Button type="button" disabled={!step.navigation?.canGoBack || busy} onClick={async () => { setValue(question.type === 'multi_select' ? [] : ''); setStep(await api.back(draft.draftId)) }}>Back</Button><Button primary disabled={busy || !hasQuestionAnswer(question, value)}>Continue</Button></div>}</form></div>
}

function AuthStep({ onDone, onBack }) {
  const { signIn } = useAuth(); const [phone, setPhone] = useState(''); const [otp, setOtp] = useState(''); const [sent, setSent] = useState(false); const [error, setError] = useState(); const [busy, setBusy] = useState(false)
  const submit = async event => { event.preventDefault(); setBusy(true); try { if (!sent) { await api.sendOtp({ phone }); setSent(true) } else { const data = await api.verifyOtp({ phone, otp }); signIn(data); onDone() } } catch (caught) { setError(caught) } finally { setBusy(false) } }
  return <div className="narrow">{onBack && <button type="button" className="back-link" onClick={onBack}>← Back</button>}<span className="step">Security check</span><h1>Verify your mobile number</h1><p>We need to verify your identity before we can submit this report.</p><ErrorBox error={error}/><form onSubmit={submit}><label htmlFor="report-phone">Mobile number<input id="report-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} required minLength="10" maxLength="15" /></label>{sent && <label htmlFor="report-otp">One-time password<input id="report-otp" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value)} required placeholder="Enter the 4-digit code" /></label>}<Button primary disabled={busy}>{busy ? 'Please wait…' : sent ? 'Verify and continue' : 'Send me a code'}</Button></form>{sent&&<p className="hint">For this local demo, use OTP 1234.</p>}</div>
}

function ReviewStep({ draftId, onBack }) {
  const [review, setReview] = useState(); const [error, setError] = useState(); const [busy, setBusy] = useState(false); const nav = useNavigate()
  useEffect(() => { api.review(draftId).then(setReview).catch(setError) }, [draftId])
  const submit = async () => { setBusy(true); try { await api.claim(draftId); const result = await api.submit(draftId); nav(`/submitted/${result.case.id}`) } catch (caught) { setError(caught) } finally { setBusy(false) } }
  if (!review) return error ? <ErrorBox error={error} /> : <Loading />
  return <div className="narrow review-page">{onBack && <button type="button" className="back-link" onClick={onBack}>← Back to evidence</button>}<span className="step">Final check</span><h1>Review your report</h1><p className="page-description">Check these details before you submit. You won’t be able to edit this report afterwards.</p><div className="review-list">{Object.entries(review.answers || {}).map(([key, value]) => <div className="review-row" key={key}><small>{key.replaceAll('_', ' ')}</small><pre>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</pre></div>)}</div><EvidenceReview evidence={review.evidence || []} evidenceCount={review.evidenceCount ?? review.evidence?.length ?? 0}/><ErrorBox error={error}/><Button primary onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit report'}</Button></div>
}
