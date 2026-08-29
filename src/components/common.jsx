import React from 'react'
import { Link } from 'react-router-dom'

function readableError(error) {
  if (!error) return ''
  if (error.code === 'NETWORK_ERROR') return 'We could not connect to the NCRP service. Check your internet connection and try again.'
  if (error.code === 'UPLOAD_NETWORK_ERROR' || error.code === 'UPLOAD_FAILED') return 'We could not upload that file. Check your connection and try again.'
  if (error.status >= 500) return 'Something went wrong on our side. Please try again in a moment.'
  return error.message || 'We could not complete that action. Please check the information and try again.'
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return <div className="alert error" role="alert">
    <strong>We could not complete that request.</strong>
    <span>{readableError(error)}</span>
    {onRetry && <button type="button" className="alert-action" onClick={onRetry}>Try again</button>}
  </div>
}

export function Loading({ text = 'Loading…' }) {
  return <div className="loading" role="status" aria-live="polite"><span className="loading-spinner" aria-hidden="true" />{text}</div>
}

export function Button({ children, primary, className = '', ...props }) {
  return <button className={`${primary ? 'primary ' : ''}${className}`.trim()} {...props}>{children}</button>
}

export function PageIntro({ eyebrow, title, description, children }) {
  return <div className="page-intro">
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
    <h1>{title}</h1>
    {description && <p className="page-description">{description}</p>}
    {children}
  </div>
}

export function BackLink({ to, children = 'Back' }) {
  return <Link className="back-link" to={to}>← {children}</Link>
}
