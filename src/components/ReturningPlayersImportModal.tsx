import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, ShieldCheck, Upload, Users, X } from 'lucide-react'
import type { Player } from '../types'
import { isValidEmail } from '../utils/csv'
import { parseTrialWorkbook, type ParsedTrialWorkbook } from '../utils/excel'

type Props = {
  team: string
  existingPlayers: Player[]
  onClose: () => void
  onImport: (team: string, players: Omit<Player, 'id'>[]) => Promise<void>
}

export function ReturningPlayersImportModal({ team, existingPlayers, onClose, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [workbook, setWorkbook] = useState<ParsedTrialWorkbook | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const existingEmails = useMemo(() => new Set(existingPlayers.map(player => player.email.trim().toLowerCase()).filter(Boolean)), [existingPlayers])
  const analysed = useMemo(() => {
    const seen = new Set<string>()
    return (workbook?.players || []).map(player => {
      const email = player.email.trim().toLowerCase()
      const duplicate = Boolean(email && seen.has(email))
      if (email) seen.add(email)
      return {
        player,
        duplicate,
        existing: existingEmails.has(email),
        valid: Boolean(player.name.trim()) && isValidEmail(email),
      }
    })
  }, [existingEmails, workbook])
  const ready = analysed.filter(item => item.valid && !item.duplicate).map(item => item.player)
  const newCount = analysed.filter(item => item.valid && !item.duplicate && !item.existing).length
  const existingCount = analysed.filter(item => item.valid && !item.duplicate && item.existing).length
  const skippedCount = analysed.filter(item => !item.valid || item.duplicate).length

  const reset = () => {
    setFileName('')
    setWorkbook(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const readFile = async (file?: File) => {
    if (!file) return
    setError('')
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Choose an Excel .xlsx workbook.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose a file smaller than 10 MB.')
      return
    }
    try {
      setWorkbook(await parseTrialWorkbook(file))
      setFileName(file.name)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to read this Excel workbook.')
    }
  }

  const submit = async () => {
    if (!ready.length) {
      setError('There are no valid returning players ready to import.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onImport(team, ready)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The returning players could not be imported.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="import-modal returning-player-import" role="dialog" aria-modal="true" aria-labelledby="returning-import-title">
      <div className="modal-head"><div><span className="eyebrow">RETURNING PLAYER IMPORT</span><h2 id="returning-import-title">Import into {team}</h2><p>Every valid row will be added directly to the {team} confirmed squad.</p></div><button className="modal-close" onClick={onClose} aria-label="Close"><X/></button></div>

      {!workbook ? <div className="upload-step">
        <input ref={inputRef} hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => readFile(event.target.files?.[0])}/>
        <button className="drop-zone" onClick={() => inputRef.current?.click()}><FileSpreadsheet/><b>Choose the returning-player Excel file</b><span>Name, email, date of birth, divisions, positions and playing experience will be imported.</span><small>.xlsx · up to 10 MB</small></button>
        <div className="returning-import-privacy"><ShieldCheck/><span><b>Private contact details excluded</b>Phone number and address columns are deliberately ignored and never saved.</span></div>
        {error&&<div className="import-alert error"><AlertTriangle/>{error}</div>}
      </div> : <>
        <div className="file-summary"><FileSpreadsheet/><div><b>{fileName}</b><span>Player details read from “{workbook.sourceSheet}”</span></div><button onClick={reset}>Choose another file</button></div>
        <div className="returning-import-destination"><Users/><div><b>Confirmed squad: {team}</b><span>New players will be created and matching email addresses will be updated. All ready rows become confirmed players immediately.</span></div></div>
        <div className="import-results"><div className="result-good"><CheckCircle2/><b>{newCount}</b><span>New players</span></div><div><Users/><b>{existingCount}</b><span>Existing players updated</span></div><div><AlertTriangle/><b>{skippedCount}</b><span>Invalid/repeated rows skipped</span></div></div>
        <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Name</th><th>Email</th><th>Date of birth</th><th>Division(s)</th><th>Primary position</th><th>Second position</th><th>Experience</th><th>Highest level</th><th>Import result</th></tr></thead><tbody>{analysed.slice(0,10).map(({player,existing,duplicate,valid},index)=><tr key={`${player.email}-${index}`}><td>{player.name||'Missing name'}</td><td>{player.email||'Missing email'}</td><td>{player.dateOfBirth||'—'}</td><td>{player.interestedDivisions||'—'}</td><td>{player.position||'Unassigned'}</td><td>{player.secondaryPosition||'—'}</td><td>{player.playingExperience||'—'}</td><td>{player.highestLevelPlayed||'—'}</td><td><span className={`row-status ${!valid||duplicate?'invalid':existing?'duplicate':'ready'}`}>{!valid?'Invalid':duplicate?'Repeated':existing?'Update & confirm':'New & confirm'}</span></td></tr>)}</tbody></table>{analysed.length>10&&<p className="preview-more">Showing 10 of {analysed.length} rows</p>}</div>
        {error&&<div className="import-alert error"><AlertTriangle/>{error}</div>}
        <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy||!ready.length} onClick={submit}><Upload/>{busy?'Importing…':`Import ${ready.length} into ${team}`}</button></div>
      </>}
    </section>
  </div>
}
