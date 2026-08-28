import React from 'react'

const INDIA_STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry']

export function hasQuestionAnswer(question, value) {
  return question.type === 'multi_select' ? Array.isArray(value) && value.length > 0 : value !== undefined && value !== null && String(value).trim() !== ''
}

export function answerPayload(question, value) {
  if (question.type === 'single_select') return { option_id: value, value: null }
  if (question.type === 'currency') return { option_id: null, value: Number(value) }
  return { option_id: null, value }
}

export default function QuestionRenderer({ question, value, setValue }) {
  const rules = question.validation || {}
  const options = question.options?.length ? question.options : question.dataSource === 'india_states' ? INDIA_STATES.map(state => ({ id: state, label: state })) : []
  if (question.type === 'single_select') return <div className="option-grid" role="radiogroup">{options.map(option => <button type="button" role="radio" aria-checked={value === option.id} className={value === option.id ? 'selected' : ''} key={option.id} onClick={() => setValue(option.id)}>{option.label}</button>)}</div>
  if (question.type === 'multi_select') return <div className="option-grid" role="group">{options.map(option => { const selected = Array.isArray(value) && value.includes(option.id); return <button type="button" role="checkbox" aria-checked={selected} className={selected ? 'selected' : ''} key={option.id} onClick={() => setValue(selected ? value.filter(item => item !== option.id) : [...(Array.isArray(value) ? value : []), option.id])}>{option.label}</button> })}</div>
  if (question.type === 'text') return <input type="text" value={value || ''} onChange={event => setValue(event.target.value)} minLength={rules.minLength} maxLength={rules.maxLength} required={question.required} />
  if (question.type === 'textarea') return <textarea value={value || ''} onChange={event => setValue(event.target.value)} minLength={rules.minLength} maxLength={rules.maxLength} required={question.required} />
  if (question.type === 'currency') return <input type="number" inputMode="decimal" value={value ?? ''} onChange={event => setValue(event.target.value)} min={rules.min} max={rules.max} required={question.required} />
  if (question.type === 'date') return <input type="date" value={value || ''} onChange={event => setValue(event.target.value)} required={question.required} />
  if (question.type === 'datetime') return <input type="datetime-local" value={value || ''} onChange={event => setValue(event.target.value)} required={question.required} />
  if (question.type === 'select') return <select value={value || ''} onChange={event => setValue(event.target.value)} required={question.required}><option value="">Select an option</option>{options.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select>
  if (question.type === 'terminal') return <div className="terminal-question"><strong>Questionnaire complete</strong><p>Your report details are ready for the next step.</p></div>
  return <div className="alert error">This question type is not supported yet. Please contact support.</div>
}
