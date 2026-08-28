import React from 'react'

export default function EvidenceReview({ evidence = [], evidenceCount = evidence.length }) {
  return <section className="review-evidence">
    <div className="review-section-heading"><div><p className="eyebrow">SUPPORTING DOCUMENTS</p><h2>Evidence</h2></div><span className="evidence-count">{evidenceCount} item{evidenceCount === 1 ? '' : 's'}</span></div>
    {evidence.length === 0 ? <p className="hint">No evidence was added.</p> : <div className="review-evidence-list">{evidence.map((item, index) => <div className="review-evidence-item" key={item.id || `${item.kind}-${index}`}><div className="review-evidence-icon">{item.kind === 'url' ? '↗' : 'FILE'}</div><div className="review-evidence-content"><strong>{item.kind === 'url' ? item.url : item.filename || 'Uploaded file'}</strong>{item.tag && <span className="evidence-tag">{item.tag}</span>}{item.description && <p>{item.description}</p>}</div></div>)}</div>}
  </section>
}
