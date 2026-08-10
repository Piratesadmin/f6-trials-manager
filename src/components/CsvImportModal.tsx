import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, FileSpreadsheet, Upload, Users, X } from 'lucide-react'
import type { Player, TrialSession } from '../types'
import { isValidEmail, parseCsv, rowsToPlayers, suggestMapping, type CsvField, type CsvMapping, type ParsedCsv } from '../utils/csv'
import { parseTrialWorkbook, type ParsedTrialWorkbook } from '../utils/excel'

type Props = {
  existingPlayers: Player[]
  onClose: () => void
  onImport: (players: Omit<Player, 'id'>[]) => Promise<void>
  onWorkbookImport: (session: Omit<TrialSession, 'id'>, players: Omit<Player, 'id'>[]) => Promise<void>
}

const fieldLabels: { key: CsvField; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Full name' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email address', required: true },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'interestedDivisions', label: 'Interested division(s)' },
  { key: 'position', label: 'Primary position' },
  { key: 'secondaryPosition', label: 'Second position' },
  { key: 'playingExperience', label: 'Past playing experience' },
  { key: 'highestLevelPlayed', label: 'Highest level played' },
  { key: 'photoUrl', label: 'Existing photo URL' },
  { key: 'trialDate', label: 'Trial date/session' },
]

const blankMapping: CsvMapping = { name: '', firstName: '', lastName: '', email: '', dateOfBirth: '', interestedDivisions: '', position: '', secondaryPosition: '', playingExperience: '', highestLevelPlayed: '', photoUrl: '', trialDate: '' }

export function CsvImportModal({ existingPlayers, onClose, onImport, onWorkbookImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [workbook, setWorkbook] = useState<ParsedTrialWorkbook | null>(null)
  const [workbookSession, setWorkbookSession] = useState<Omit<TrialSession, 'id'> | null>(null)
  const [mapping, setMapping] = useState<CsvMapping>(blankMapping)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const candidates = useMemo(() => parsed ? rowsToPlayers(parsed.rows, mapping) : [], [parsed, mapping])
  const existingEmails = useMemo(() => new Set(existingPlayers.map(player => player.email.toLowerCase()).filter(Boolean)), [existingPlayers])
  const analysed = analysePlayers(candidates, existingEmails, false)
  const ready = analysed.filter(item => item.valid && !item.duplicate).map(item => item.player)
  const duplicateCount = analysed.filter(item => item.duplicate).length
  const invalidCount = analysed.filter(item => !item.valid).length
  const hasNameMapping = Boolean(mapping.name || mapping.firstName || mapping.lastName)

  const workbookAnalysed = analysePlayers(workbook?.players || [], existingEmails, true)
  const workbookReady = workbookAnalysed.filter(item => item.valid && !item.duplicate).map(item => item.player)
  const workbookExistingCount = workbookAnalysed.filter(item => item.valid && item.existing && !item.duplicate).length
  const workbookInvalidCount = workbookAnalysed.filter(item => !item.valid || item.duplicate).length
  const goingCount = workbookReady.filter(player => player.trialResponseStatus === 'Going').length
  const unansweredCount = workbookReady.filter(player => player.trialResponseStatus === 'Not answered').length
  const cannotGoCount = workbookReady.filter(player => player.trialResponseStatus === "Can't go").length

  const reset = () => {
    setParsed(null); setWorkbook(null); setWorkbookSession(null); setFileName(''); setMapping(blankMapping); setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const readFile = async (file?: File) => {
    if (!file) return
    setError('')
    if (file.size > 10 * 1024 * 1024) { setError('Choose a file smaller than 10 MB.'); return }
    try {
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const result = await parseTrialWorkbook(file)
        setFileName(file.name)
        setWorkbook(result)
        setWorkbookSession(result.session)
        setParsed(null)
      } else {
        const result = parseCsv(await file.text())
        if (result.headers.length < 2 || result.rows.length === 0) throw new Error('The CSV appears to be empty or does not contain a header row.')
        setFileName(file.name)
        setParsed(result)
        setMapping(suggestMapping(result.headers))
        setWorkbook(null)
        setWorkbookSession(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read this spreadsheet.')
    }
  }

  const submitCsv = async () => {
    if (!mapping.email || !hasNameMapping) { setError('Match an email column and either a full-name column or first/last-name columns.'); return }
    if (!ready.length) { setError('There are no valid new players ready to import.'); return }
    setBusy(true); setError('')
    try { await onImport(ready); onClose() }
    catch (err) { setError(err instanceof Error ? err.message : 'The players could not be imported.') }
    finally { setBusy(false) }
  }

  const submitWorkbook = async () => {
    if (!workbookSession?.title.trim() || !workbookSession.date) { setError('Check the session name and date before importing.'); return }
    if (!workbookReady.length) { setError('There are no valid players ready to import.'); return }
    setBusy(true); setError('')
    try { await onWorkbookImport(workbookSession, workbookReady); onClose() }
    catch (err) { setError(err instanceof Error ? err.message : 'The session and players could not be imported.') }
    finally { setBusy(false) }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="modal-head"><div><span className="eyebrow">PLAYER &amp; SCHEDULE IMPORT</span><h2 id="import-title">Import trial sign-ups</h2><p>Upload a CSV or an Excel trial workbook. Phone numbers and address columns are never imported.</p></div><button className="modal-close" onClick={onClose} aria-label="Close"><X /></button></div>

      {!parsed && !workbook ? <div className="upload-step">
        <input ref={inputRef} hidden type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => readFile(event.target.files?.[0])}/>
        <button className="drop-zone" onClick={() => inputRef.current?.click()}><FileSpreadsheet/><b>Choose a CSV or Excel file</b><span>Excel files like the club trial attendance workbook are detected automatically.</span><small>.csv or .xlsx · up to 10 MB</small></button>
        {error && <div className="import-alert error"><AlertTriangle/>{error}</div>}
      </div> : <>
        <div className="file-summary"><FileSpreadsheet/><div><b>{fileName}</b><span>{workbook ? `Excel · player details read from “${workbook.sourceSheet}”` : `${parsed?.rows.length || 0} CSV rows detected`}</span></div><button onClick={reset}>Choose another file</button></div>

        {workbook && workbookSession ? <>
          <div className="excel-session-editor"><div><span className="eyebrow">SESSION DETECTED</span><h3>Check the trial details</h3><p>The first three rows supplied the session name, date/time and venue. You can correct anything before import.</p></div><div className="excel-session-fields"><label className="wide">Session name<input value={workbookSession.title} onChange={event => setWorkbookSession({...workbookSession,title:event.target.value})}/></label><label>Date<input type="date" value={workbookSession.date} onChange={event => setWorkbookSession({...workbookSession,date:event.target.value})}/></label><label>Venue<input value={workbookSession.venue} onChange={event => setWorkbookSession({...workbookSession,venue:event.target.value})}/></label><label>Start time<input type="time" value={workbookSession.startTime} onChange={event => setWorkbookSession({...workbookSession,startTime:event.target.value})}/></label><label>End time<input type="time" value={workbookSession.endTime} onChange={event => setWorkbookSession({...workbookSession,endTime:event.target.value})}/></label></div></div>
          {workbook.warnings.map(warning => <div className="import-alert warning" key={warning}><AlertTriangle/>{warning}</div>)}
          <div className="excel-response-summary"><span className="going"><CheckCircle2/>{goingCount} Going</span><span className="unanswered"><Users/>{unansweredCount} Not answered</span><span className="cannot-go"><X/>{cannotGoCount} Can’t go</span></div>
          <div className="import-results"><div className="result-good"><CheckCircle2/><b>{workbookReady.length}</b><span>Players ready</span></div><div><Users/><b>{workbookExistingCount}</b><span>Existing profiles updated</span></div><div><AlertTriangle/><b>{workbookInvalidCount}</b><span>Invalid/repeated rows skipped</span></div></div>
          <div className="excel-import-note"><CalendarDays/><p><b>Going and Not answered</b> players will be placed into this session. <b>Can’t go</b> players are imported but left off the session roster. Payment and attendance begin as not paid and not attended.</p></div>
          <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Response</th><th>Name</th><th>Email</th><th>Date of birth</th><th>Division(s)</th><th>Primary position</th><th>Second position</th><th>Import result</th></tr></thead><tbody>{workbookAnalysed.slice(0,10).map(({player,existing,duplicate,valid},index)=><tr key={`${player.email}-${index}`}><td><span className={`rsvp-status ${statusClass(player.trialResponseStatus)}`}>{player.trialResponseStatus||'No response'}</span></td><td>{player.name||'Missing name'}</td><td>{player.email||'Missing email'}</td><td>{player.dateOfBirth||'—'}</td><td>{player.interestedDivisions||'—'}</td><td>{player.position}</td><td>{player.secondaryPosition||'—'}</td><td><span className={`row-status ${!valid||duplicate?'invalid':existing?'duplicate':'ready'}`}>{!valid?'Invalid':duplicate?'Repeated':existing?'Update':'New'}</span></td></tr>)}</tbody></table>{workbookAnalysed.length>10&&<p className="preview-more">Showing 10 of {workbookAnalysed.length} rows</p>}</div>
          {error && <div className="import-alert error"><AlertTriangle/>{error}</div>}
          <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy||!workbookReady.length} onClick={submitWorkbook}><Upload/>{busy?'Importing…':`Create session and import ${workbookReady.length} players`}</button></div>
        </> : parsed ? <>
          <div className="mapping-grid"><div><span className="eyebrow">MATCH COLUMNS</span><h3>Tell us what each column contains</h3><p>Likely headings are matched automatically. Cell, street address, city and postal-code columns are deliberately excluded.</p></div><div className="mapping-fields">{fieldLabels.map(field => <label key={field.key}>{field.label}{field.required && <em>Required</em>}<select value={mapping[field.key]} onChange={event => setMapping({...mapping, [field.key]: event.target.value})}><option value="">Not included</option>{parsed.headers.map(header => <option key={header} value={header}>{header}</option>)}</select></label>)}</div></div>
          <div className="import-results"><div className="result-good"><CheckCircle2/><b>{ready.length}</b><span>Ready to import</span></div><div><AlertTriangle/><b>{duplicateCount}</b><span>Duplicates skipped</span></div><div><AlertTriangle/><b>{invalidCount}</b><span>Invalid rows skipped</span></div></div>
          <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Status</th><th>Name</th><th>Email</th><th>Division(s)</th><th>Primary position</th><th>Second position</th><th>Trial</th></tr></thead><tbody>{analysed.slice(0,8).map(({player,duplicate,valid}, index) => <tr key={`${player.email}-${index}`}><td><span className={`row-status ${!valid?'invalid':duplicate?'duplicate':'ready'}`}>{!valid?'Invalid':duplicate?'Duplicate':'Ready'}</span></td><td>{player.name || 'Missing name'}</td><td>{player.email || 'Missing email'}</td><td>{player.interestedDivisions || '—'}</td><td>{player.position}</td><td>{player.secondaryPosition || '—'}</td><td>{player.trialDate}</td></tr>)}</tbody></table>{analysed.length > 8 && <p className="preview-more">Showing 8 of {analysed.length} rows</p>}</div>
          {error && <div className="import-alert error"><AlertTriangle/>{error}</div>}
          <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy || ready.length === 0} onClick={submitCsv}><Upload/>{busy ? 'Importing…' : `Import ${ready.length} players`}</button></div>
        </> : null}
      </>}
    </section>
  </div>
}

function analysePlayers(players: Omit<Player,'id'>[], existingEmails: Set<string>, updateExisting: boolean) {
  const seen=new Set<string>()
  return players.map(player=>{
    const key=player.email.toLowerCase()
    const duplicate=Boolean(key&&seen.has(key))
    if(key)seen.add(key)
    const existing=existingEmails.has(key)
    const valid=Boolean(player.name)&&isValidEmail(player.email)
    return{player,duplicate:duplicate||(!updateExisting&&existing),existing,valid}
  })
}

function statusClass(status:Player['trialResponseStatus']) {
  if(status==='Going')return'going'
  if(status==='Not answered')return'unanswered'
  if(status==="Can't go")return'cannot-go'
  return'none'
}
