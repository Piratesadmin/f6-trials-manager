import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react'
import type { Player } from '../types'
import { isValidEmail, parseCsv, rowsToPlayers, suggestMapping, type CsvField, type CsvMapping, type ParsedCsv } from '../utils/csv'

type Props = {
  existingPlayers: Player[]
  onClose: () => void
  onImport: (players: Omit<Player, 'id'>[]) => Promise<void>
}

const fieldLabels: { key: CsvField; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Full name' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email address', required: true },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'interestedDivisions', label: 'Interested division(s)' },
  { key: 'appliedTeam', label: 'Applied team' },
  { key: 'position', label: 'Primary position' },
  { key: 'secondaryPosition', label: 'Second position' },
  { key: 'playingExperience', label: 'Past playing experience' },
  { key: 'highestLevelPlayed', label: 'Highest level played' },
  { key: 'photoUrl', label: 'Existing photo URL' },
  { key: 'trialDate', label: 'Trial date/session' },
]

const blankMapping: CsvMapping = { name: '', firstName: '', lastName: '', email: '', dateOfBirth: '', interestedDivisions: '', appliedTeam: '', position: '', secondaryPosition: '', playingExperience: '', highestLevelPlayed: '', photoUrl: '', trialDate: '' }

export function CsvImportModal({ existingPlayers, onClose, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<CsvMapping>(blankMapping)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const candidates = useMemo(() => parsed ? rowsToPlayers(parsed.rows, mapping) : [], [parsed, mapping])
  const existingEmails = useMemo(() => new Set(existingPlayers.map(player => player.email.toLowerCase())), [existingPlayers])
  const seen = new Set<string>()
  const analysed = candidates.map(player => {
    const duplicate = existingEmails.has(player.email) || seen.has(player.email)
    if (player.email) seen.add(player.email)
    const valid = Boolean(player.name) && isValidEmail(player.email)
    return { player, duplicate, valid }
  })
  const ready = analysed.filter(item => item.valid && !item.duplicate).map(item => item.player)
  const duplicateCount = analysed.filter(item => item.duplicate).length
  const invalidCount = analysed.filter(item => !item.valid).length
  const hasNameMapping = Boolean(mapping.name || mapping.firstName || mapping.lastName)

  const readFile = async (file?: File) => {
    if (!file) return
    setError('')
    try {
      const result = parseCsv(await file.text())
      if (result.headers.length < 2 || result.rows.length === 0) throw new Error('The CSV appears to be empty or does not contain a header row.')
      setFileName(file.name)
      setParsed(result)
      setMapping(suggestMapping(result.headers))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read this CSV file.')
    }
  }

  const submit = async () => {
    if (!mapping.email || !hasNameMapping) {
      setError('Match an email column and either a full-name column or first/last-name columns.')
      return
    }
    if (!ready.length) {
      setError('There are no valid new players ready to import.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onImport(ready)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The players could not be imported.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="csv-title">
      <div className="modal-head"><div><span className="eyebrow">CSV IMPORT</span><h2 id="csv-title">Import trial sign-ups</h2><p>Upload a CSV exported from Google Forms or Google Sheets. Phone numbers and address columns are never imported.</p></div><button className="modal-close" onClick={onClose} aria-label="Close"><X /></button></div>

      {!parsed ? <div className="upload-step">
        <input ref={inputRef} hidden type="file" accept=".csv,text/csv" onChange={event => readFile(event.target.files?.[0])}/>
        <button className="drop-zone" onClick={() => inputRef.current?.click()}><FileSpreadsheet/><b>Choose a CSV file</b><span>The first row must contain column headings.</span><small>CSV files up to 10 MB</small></button>
        {error && <div className="import-alert error"><AlertTriangle/>{error}</div>}
      </div> : <>
        <div className="file-summary"><FileSpreadsheet/><div><b>{fileName}</b><span>{parsed.rows.length} rows detected</span></div><button onClick={() => { setParsed(null); setFileName(''); setError('') }}>Choose another file</button></div>
        <div className="mapping-grid">
          <div><span className="eyebrow">MATCH COLUMNS</span><h3>Tell us what each column contains</h3><p>Likely headings are matched automatically. Cell, street address, city and postal-code columns are deliberately excluded.</p></div>
          <div className="mapping-fields">{fieldLabels.map(field => <label key={field.key}>{field.label}{field.required && <em>Required</em>}<select value={mapping[field.key]} onChange={event => setMapping({...mapping, [field.key]: event.target.value})}><option value="">Not included</option>{parsed.headers.map(header => <option key={header} value={header}>{header}</option>)}</select></label>)}</div>
        </div>
        <div className="import-results"><div className="result-good"><CheckCircle2/><b>{ready.length}</b><span>Ready to import</span></div><div><AlertTriangle/><b>{duplicateCount}</b><span>Duplicates skipped</span></div><div><AlertTriangle/><b>{invalidCount}</b><span>Invalid rows skipped</span></div></div>
        <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Status</th><th>Name</th><th>Email</th><th>Division(s)</th><th>Primary position</th><th>Second position</th><th>Trial</th></tr></thead><tbody>{analysed.slice(0,8).map(({player,duplicate,valid}, index) => <tr key={`${player.email}-${index}`}><td><span className={`row-status ${!valid?'invalid':duplicate?'duplicate':'ready'}`}>{!valid?'Invalid':duplicate?'Duplicate':'Ready'}</span></td><td>{player.name || 'Missing name'}</td><td>{player.email || 'Missing email'}</td><td>{player.interestedDivisions || player.appliedTeam}</td><td>{player.position}</td><td>{player.secondaryPosition || '—'}</td><td>{player.trialDate}</td></tr>)}</tbody></table>{analysed.length > 8 && <p className="preview-more">Showing 8 of {analysed.length} rows</p>}</div>
        {error && <div className="import-alert error"><AlertTriangle/>{error}</div>}
        <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy || ready.length === 0} onClick={submit}><Upload/>{busy ? 'Importing…' : `Import ${ready.length} players`}</button></div>
      </>}
    </section>
  </div>
}
