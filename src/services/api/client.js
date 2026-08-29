const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
// const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://ncrp-backend.onrender.com').replace(/\/$/, '')
export const TOKEN_KEY = 'ncrp_token'

export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code }
}

export async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  let response
  try { response = await fetch(`${API_BASE}${path}`, { ...options, headers }) } catch { throw new ApiError('Unable to reach the NCRP service. Check that the backend is running.', 0, 'NETWORK_ERROR') }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) { const detail = data?.detail?.error || data?.detail; throw new ApiError(typeof detail === 'string' ? detail : detail?.message || 'The request could not be completed.', response.status, detail?.code) }
  return data
}

export async function uploadBinary(uploadUrl, file) {
  let response
  try { response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file }) } catch { throw new ApiError('The file could not be uploaded from this environment.', 0, 'UPLOAD_NETWORK_ERROR') }
  if (!response.ok) throw new ApiError('The file upload was rejected by storage. Please try again.', response.status, 'UPLOAD_FAILED')
}

export async function downloadFile(path, filename) {
  const token = localStorage.getItem(TOKEN_KEY)
  let response
  try { response = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }) } catch { throw new ApiError('Unable to download the report from the NCRP service.', 0, 'NETWORK_ERROR') }
  if (!response.ok) { const data = await response.json().catch(() => ({})); const detail = data?.detail?.error || data?.detail; throw new ApiError(typeof detail === 'string' ? detail : detail?.message || 'The report could not be downloaded.', response.status, detail?.code) }
  const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
}
