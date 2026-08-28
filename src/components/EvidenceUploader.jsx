import React, { useEffect, useRef, useState } from 'react'
import { uploadBinary } from '../services/api/client'
import { api } from '../services/api'
import { Button, ErrorBox } from './common'

const TAGS = ['Payment Receipt', 'Profile Screenshot', 'Transaction Screenshot', 'Conversation Screenshot', 'Other']

function makeItem(file) {
  return { id: `${file.name}-${file.lastModified}-${Math.random()}`, file, tag: 'Other', description: '' }
}

export default function EvidenceUploader({ draftId, required, claim, addEvidence, onDone }) {
  const inputRef = useRef(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState()
  const [busy, setBusy] = useState(false)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => { claim(draftId).then(() => setClaimed(true)).catch(setError) }, [draftId, claim])

  const addFiles = event => {
    const selected = Array.from(event.target.files || [])
    setItems(current => [...current, ...selected.map(makeItem)])
    event.target.value = ''
  }

  const updateItem = (id, changes) => setItems(current => current.map(item => item.id === id ? { ...item, ...changes } : item))
  const removeItem = id => setItems(current => current.filter(item => item.id !== id))

  const submit = async () => {
    if (required && !items.length) {
      setError(new Error('Add at least one evidence file to continue.'))
      return
    }
    setBusy(true)
    setError()
    try {
      for (const item of items) {
        const file = item.file
        const upload = await api.uploadUrl({ filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size })
        if (!upload.uploadUrl) throw new Error('The backend did not return a signed upload URL.')
        await uploadBinary(upload.uploadUrl, file)
        await addEvidence(draftId, { kind: 'file', storagePath: upload.storagePath, tag: item.tag, description: item.description || null })
      }
      onDone()
    } catch (e) { setError(e) } finally { setBusy(false) }
  }

  return <div className="evidence-uploader">
    <div className="evidence-intro"><span className="step">Evidence {required ? 'required' : '· optional'}</span><h1>{required ? 'Submit supporting evidence' : 'Add supporting evidence'}</h1><p>{required ? 'Add at least one file. You can add multiple items.' : 'Evidence is optional. Add any files that help explain the report.'}</p></div>
    <ErrorBox error={error} />
    <div className="upload-dropzone" onClick={() => inputRef.current?.click()} role="button" tabIndex="0" onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}>
      <span className="upload-icon">＋</span><strong>Choose files to upload</strong><small>PNG, JPG, PDF or other supporting documents · You can select multiple files</small><Button type="button">Browse files</Button>
      <input ref={inputRef} type="file" multiple onChange={addFiles} hidden />
    </div>
    {items.length > 0 && <div className="evidence-queue"><div className="queue-heading"><strong>{items.length} file{items.length === 1 ? '' : 's'} ready</strong><button type="button" className="text-button" onClick={() => inputRef.current?.click()}>+ Add more</button></div>{items.map(item => <div className="evidence-card" key={item.id}><div className="file-heading"><span className="file-type">FILE</span><div><strong>{item.file.name}</strong><small>{Math.ceil(item.file.size / 1024)} KB</small></div><button type="button" className="remove-file" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.file.name}`}>Remove</button></div><div className="file-fields"><label>Evidence type<select value={item.tag} onChange={event => updateItem(item.id, { tag: event.target.value })}>{TAGS.map(tag => <option key={tag}>{tag}</option>)}</select></label><label>Description <span className="optional">optional</span><textarea value={item.description} onChange={event => updateItem(item.id, { description: event.target.value })} placeholder="What does this evidence show?" /></label></div></div>)}</div>}
    <div className="evidence-actions"><Button type="button" onClick={onDone} disabled={busy || (required && !items.length)}>Skip for now</Button><Button primary onClick={submit} disabled={busy || !claimed}>{busy ? 'Uploading evidence…' : !claimed ? 'Preparing secure upload…' : required ? 'Continue to review' : items.length ? 'Save and continue' : 'Continue without evidence'}</Button></div>
  </div>
}
