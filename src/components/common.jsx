import React from 'react'
export function ErrorBox({ error }) { return error ? <div className="alert error" role="alert">{error.message}</div> : null }
export function Loading({ text = 'Loading…' }) { return <div className="loading" role="status">{text}</div> }
export function Button({ children, primary, ...props }) { return <button className={primary ? 'primary' : ''} {...props}>{children}</button> }
