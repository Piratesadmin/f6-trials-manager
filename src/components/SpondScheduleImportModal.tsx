import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, FileSpreadsheet, RefreshCw, Upload, UserCheck, Users, X } from 'lucide-react'
import type { ClubEventType, Player, SessionAttendanceStatus, TrialSession } from '../types'
import { findSpondMatchingSession, formatSessionDate } from '../utils/schedule'
import { parseSpondEventWorkbook, type ParsedSpondEvent, type SpondAttendanceRow } from '../utils/spond'

type Props={
  existingPlayers:Player[]
  existingSessions:TrialSession[]
  availableTeams:string[]
  onClose:()=>void
  onImport:(session:Omit<TrialSession,'id'>,attendance:Record<string,SessionAttendanceStatus>,existingSessionId?:string)=>Promise<void>
}

type MatchedAttendance=SpondAttendanceRow&{player?:Player;ambiguous?:boolean}
const normalise=(value:string)=>value.toLowerCase().replace(/\s+/g,' ').trim()

function matchAttendance(rows:SpondAttendanceRow[],players:Player[]):MatchedAttendance[]{
  const byEmail=new Map(players.filter(player=>player.email).map(player=>[normalise(player.email),player]))
  const byName=new Map<string,Player[]>()
  players.forEach(player=>{const key=normalise(player.name);byName.set(key,[...(byName.get(key)||[]),player])})
  return rows.map(row=>{
    const emailMatch=row.email?byEmail.get(normalise(row.email)):undefined
    if(emailMatch)return{...row,player:emailMatch}
    const nameMatches=byName.get(normalise(row.name))||[]
    return{...row,player:nameMatches.length===1?nameMatches[0]:undefined,ambiguous:nameMatches.length>1}
  })
}

export function SpondScheduleImportModal({existingPlayers,existingSessions,availableTeams,onClose,onImport}:Props){
  const inputRef=useRef<HTMLInputElement>(null)
  const[fileName,setFileName]=useState('')
  const[parsed,setParsed]=useState<ParsedSpondEvent|null>(null)
  const[session,setSession]=useState<Omit<TrialSession,'id'>|null>(null)
  const[createSeparate,setCreateSeparate]=useState(false)
  const[busy,setBusy]=useState(false)
  const[error,setError]=useState('')
  const matchingSession=session?findSpondMatchingSession(existingSessions,session):undefined
  const matchedRows=useMemo(()=>matchAttendance(parsed?.attendance||[],existingPlayers),[parsed,existingPlayers])
  const recordedRows=matchedRows.filter(row=>row.player&&row.status)
  const unmatchedRows=matchedRows.filter(row=>!row.player)
  const unrecordedRows=matchedRows.filter(row=>row.player&&!row.status)
  const attendance=Object.fromEntries(recordedRows.map(row=>[row.player!.id,row.status])) as Record<string,SessionAttendanceStatus>

  const reset=()=>{setFileName('');setParsed(null);setSession(null);setCreateSeparate(false);setError('');if(inputRef.current)inputRef.current.value=''}
  const readFile=async(file?:File)=>{
    if(!file)return
    setError('')
    if(file.size>10*1024*1024){setError('Choose a file smaller than 10 MB.');return}
    if(!file.name.toLowerCase().endsWith('.xlsx')){setError('Choose the .xlsx participant list exported by Spond.');return}
    try{const result=await parseSpondEventWorkbook(file);setFileName(file.name);setParsed(result);setSession(result.session);setCreateSeparate(false)}
    catch(caught){setError(caught instanceof Error?caught.message:'Unable to read this Spond workbook.')}
  }
  const toggleTeam=(team:string)=>{if(!session)return;setSession({...session,teams:session.teams.includes(team)?session.teams.filter(item=>item!==team):[...session.teams,team]})}
  const submit=async()=>{
    if(!session)return
    const updating=Boolean(matchingSession&&!createSeparate)
    const teams=updating?matchingSession!.teams:session.teams
    if(!session.title.trim()||!session.date||!session.startTime){setError('Check the event name, date and start time before continuing.');return}
    if(!updating&&!teams.length){setError('Select the team or teams for this event.');return}
    setBusy(true);setError('')
    try{await onImport({...session,teams},attendance,updating?matchingSession?.id:undefined);onClose()}
    catch(caught){setError(caught instanceof Error?caught.message:'The Spond event could not be imported.')}
    finally{setBusy(false)}
  }
  const updateField=<K extends keyof Omit<TrialSession,'id'>>(key:K,value:Omit<TrialSession,'id'>[K])=>session&&setSession({...session,[key]:value})

  return <div className="modal-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
    <section className="import-modal spond-import-modal" role="dialog" aria-modal="true" aria-labelledby="spond-import-title">
      <div className="modal-head"><div><span className="eyebrow">SPOND SCHEDULE IMPORT</span><h2 id="spond-import-title">Import training and attendance</h2><p>Upload the Excel participant list exported from one Spond event. Existing players are matched by email, then by their exact name.</p></div><button className="modal-close" onClick={onClose} aria-label="Close"><X/></button></div>
      {!parsed||!session?<div className="upload-step">
        <input ref={inputRef} hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event=>readFile(event.target.files?.[0])}/>
        <button className="drop-zone" onClick={()=>inputRef.current?.click()}><FileSpreadsheet/><b>Choose a Spond event export</b><span>In Spond, open the event and choose Export participant list.</span><small>.xlsx · one training session or match · up to 10 MB</small></button>
        {error&&<div className="import-alert error"><AlertTriangle/>{error}</div>}
      </div>:<>
        <div className="file-summary"><FileSpreadsheet/><div><b>{fileName}</b><span>Spond participant list · “{parsed.sourceSheet}”</span></div><button onClick={reset}>Choose another file</button></div>
        <div className="excel-session-editor"><div><span className="eyebrow">EVENT DETECTED</span><h3>Check the event details</h3><p>These fields are used to check whether the same event already exists in the Club Manager schedule.</p></div><div className="excel-session-fields">
          <label className="wide">Event name<input value={session.title} onChange={event=>updateField('title',event.target.value)}/></label>
          <label>Event type<select value={session.eventType} onChange={event=>updateField('eventType',event.target.value as ClubEventType)}><option value="training">Training</option><option value="game">Game / fixture</option></select></label>
          <label>Date<input type="date" value={session.date} onChange={event=>updateField('date',event.target.value)}/></label>
          <label>Start time<input type="time" value={session.startTime} onChange={event=>updateField('startTime',event.target.value)}/></label>
          <label>End time<input type="time" value={session.endTime} onChange={event=>updateField('endTime',event.target.value)}/></label>
          <label className="wide">Venue<input value={session.venue} onChange={event=>updateField('venue',event.target.value)}/></label>
        </div></div>
        {matchingSession&&<div className="existing-event-import spond-event-match"><div><RefreshCw/><span><b>Event already exists — update it</b><small>{formatSessionDate(matchingSession.date)} · {matchingSession.startTime} · {matchingSession.title}{matchingSession.teams.length?` · ${matchingSession.teams.join(', ')}`:''}</small></span></div><p>The existing event details and attendance will be updated. Attendance already recorded for players missing from this file is retained.</p><label><input type="checkbox" checked={createSeparate} onChange={event=>setCreateSeparate(event.target.checked)}/>Create a separate event instead</label></div>}
        {(!matchingSession||createSeparate)&&<div className="spond-team-picker"><div><span className="eyebrow">TEAMS</span><h3>Select the attending squad</h3><p>{matchingSession?'Choose the team or teams for the separate event.':'No existing event matched this name, date and start time, so a new schedule event will be created.'}</p></div><div>{availableTeams.map(team=><button type="button" key={team} className={session.teams.includes(team)?'selected':''} onClick={()=>toggleTeam(team)}>{session.teams.includes(team)&&<CheckCircle2/>}{team}</button>)}</div></div>}
        {parsed.warnings.map(warning=><div className="import-alert warning" key={warning}><AlertTriangle/>{warning}</div>)}
        <div className="import-results spond-import-results"><div className="result-good"><UserCheck/><b>{recordedRows.length}</b><span>Attendance ready</span></div><div><Users/><b>{unrecordedRows.length}</b><span>Matched, no attendance</span></div><div><AlertTriangle/><b>{unmatchedRows.length}</b><span>Players not matched</span></div></div>
        <div className="excel-import-note"><CalendarDays/><p><b>Going, attended and late</b> become Present. <b>Can’t go and not attended</b> become Absent, <b>Valid absence</b> becomes Excused, and <b>Not answered</b> remains unmarked.</p></div>
        <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Spond player</th><th>Email</th><th>Spond value</th><th>Club Manager player</th><th>Import result</th></tr></thead><tbody>{matchedRows.slice(0,12).map((row,index)=><tr key={`${row.email}-${row.name}-${index}`}><td>{row.name||'—'}</td><td>{row.email||'—'}</td><td>{row.sourceStatus||'Not recorded'}</td><td>{row.player?.name||'—'}</td><td><span className={`row-status ${!row.player?'invalid':row.status?'ready':'duplicate'}`}>{!row.player?(row.ambiguous?'Ambiguous name':'Not matched'):row.status?row.status[0].toUpperCase()+row.status.slice(1):'Unmarked'}</span></td></tr>)}</tbody></table>{matchedRows.length>12&&<p className="preview-more">Showing 12 of {matchedRows.length} players</p>}</div>
        {error&&<div className="import-alert error"><AlertTriangle/>{error}</div>}
        <div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy} onClick={submit}><Upload/>{busy?'Saving…':matchingSession&&!createSeparate?`Update event and ${recordedRows.length} attendance marks`:`Import event and ${recordedRows.length} attendance marks`}</button></div>
      </>}
    </section>
  </div>
}
