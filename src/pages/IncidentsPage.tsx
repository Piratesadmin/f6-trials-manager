import { useMemo, useState, type FormEvent } from 'react'
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Download, HeartPulse, Plus, Search, ShieldAlert, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import type { IncidentReport, IncidentSeverity, IncidentStatus, IncidentType, Player, TrialSession } from '../types'
import { createIncidentReport, incidentSeverityLabels, incidentStatusLabels, incidentTypeLabels } from '../utils/incidents'
import { isConfirmedForTeam } from '../utils/player'

type Props = {
  reports: IncidentReport[]
  players: Player[]
  sessions: TrialSession[]
  assignedTeams: string[]
  isAdmin: boolean
  readOnly: boolean
  saveReport: (report: IncidentReport) => Promise<void>
}

const csvCell=(value:string|number|boolean)=>`"${String(value).replaceAll('"','""')}"`
const displayDate=(value:string)=>value?new Date(`${value}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Date not recorded'
const typeIcons={injury:HeartPulse,accident:AlertTriangle,'near-miss':ShieldAlert}

export function IncidentsPage({reports,players,sessions,assignedTeams,isAdmin,readOnly,saveReport}:Props){
  const [query,setQuery]=useState('')
  const [teamFilter,setTeamFilter]=useState('All teams')
  const [statusFilter,setStatusFilter]=useState<'all'|IncidentStatus>('all')
  const [typeFilter,setTypeFilter]=useState<'all'|IncidentType>('all')
  const [editing,setEditing]=useState<IncidentReport|null>(null)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const sorted=useMemo(()=>[...reports].sort((a,b)=>`${b.occurredOn}T${b.occurredAt||'23:59'}`.localeCompare(`${a.occurredOn}T${a.occurredAt||'23:59'}`)||b.updatedAt-a.updatedAt),[reports])
  const filtered=useMemo(()=>sorted.filter(report=>{
    const search=query.trim().toLowerCase()
    const haystack=`${report.personName} ${report.team} ${report.location} ${report.description} ${report.immediateAction} ${report.followUp} ${report.eventTitle}`.toLowerCase()
    return (teamFilter==='All teams'||report.team===teamFilter)&&(statusFilter==='all'||report.status===statusFilter)&&(typeFilter==='all'||report.type===typeFilter)&&(!search||haystack.includes(search))
  }),[sorted,query,teamFilter,statusFilter,typeFilter])
  const openCount=reports.filter(report=>report.status!=='closed').length
  const seriousCount=reports.filter(report=>report.severity==='serious'&&report.status!=='closed').length
  const currentYear=new Date().getFullYear().toString()
  const yearCount=reports.filter(report=>report.occurredOn.startsWith(currentYear)).length
  const availableTeams=assignedTeams
  const playersForTeam=useMemo(()=>players.filter(player=>editing&&(isConfirmedForTeam(player,editing.team)||player.id===editing.playerId)).sort((a,b)=>a.name.localeCompare(b.name)),[players,editing])
  const eventsForTeam=useMemo(()=>sessions.filter(session=>editing&&session.teams.includes(editing.team)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100),[sessions,editing])

  const openNew=()=>{setError('');setEditing(createIncidentReport(availableTeams[0]||''))}
  const openExisting=(report:IncidentReport)=>{setError('');setEditing({...report})}
  const change=(patch:Partial<IncidentReport>)=>setEditing(current=>current?{...current,...patch}:current)
  const chooseEvent=(eventId:string)=>{
    const session=sessions.find(item=>item.id===eventId)
    change(session?{eventId:session.id,eventTitle:session.title,occurredOn:session.date,occurredAt:session.startTime,location:session.venue}:{eventId:'',eventTitle:''})
  }
  const choosePlayer=(playerId:string)=>{
    const player=players.find(item=>item.id===playerId)
    change(player?{playerId:player.id,personName:player.name,personType:'player'}:{playerId:''})
  }
  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    if(!editing)return
    setSaving(true);setError('')
    try{await saveReport(editing);setEditing(null)}catch(caught){setError(caught instanceof Error?caught.message:'The incident report could not be saved.')}
    finally{setSaving(false)}
  }
  const exportCsv=()=>{
    const header=['Reference','Date','Time','Team','Person','Person type','Type','Severity','Status','Location','Event','Description','Immediate action','First aid given','First aid details','Emergency services','Parent or guardian notified','Witnesses','Follow-up','Reported by','Reported at','Last updated by','Last updated at']
    const rows=filtered.map(report=>[report.id,report.occurredOn,report.occurredAt,report.team,report.personName,report.personType,incidentTypeLabels[report.type],incidentSeverityLabels[report.severity],incidentStatusLabels[report.status],report.location,report.eventTitle,report.description,report.immediateAction,report.firstAidGiven,report.firstAidDetails,report.emergencyServices,report.parentGuardianNotified,report.witnesses,report.followUp,report.createdByName,new Date(report.createdAt).toISOString(),report.updatedByName,new Date(report.updatedAt).toISOString()])
    const blob=new Blob([[header,...rows].map(row=>row.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`f6-incidents-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url)
  }

  return <>
    <PageHeader title="Incident reports" subtitle={isAdmin?'A secure club-wide record of injuries, accidents and near misses.':'Report and follow up incidents for your assigned teams.'} action={<div className="incident-header-actions"><button className="secondary" onClick={exportCsv} disabled={!filtered.length}><Download/>Export</button>{!readOnly&&<button className="primary" onClick={openNew}><Plus/>New report</button>}</div>}/>
    <section className="incident-stats"><div><ClipboardList/><span>Total reports</span><b>{reports.length}</b></div><div><Activity/><span>Open or monitoring</span><b>{openCount}</b></div><div className={seriousCount?'attention':''}><AlertTriangle/><span>Serious and active</span><b>{seriousCount}</b></div><div><CalendarDays/><span>Reported in {currentYear}</span><b>{yearCount}</b></div></section>
    <div className="incident-safety-note"><ShieldAlert/><div><b>Deal with immediate safety first</b><span>Use the club's emergency procedure before completing this record. This register does not replace emergency, safeguarding or statutory reporting routes.</span></div></div>
    <section className="panel incident-panel">
      <div className="incident-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search person, place, event or report"/></label><select value={teamFilter} onChange={event=>setTeamFilter(event.target.value)}><option>All teams</option>{availableTeams.map(team=><option key={team}>{team}</option>)}</select><select value={typeFilter} onChange={event=>setTypeFilter(event.target.value as 'all'|IncidentType)}><option value="all">All types</option>{Object.entries(incidentTypeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><select value={statusFilter} onChange={event=>setStatusFilter(event.target.value as 'all'|IncidentStatus)}><option value="all">All statuses</option>{Object.entries(incidentStatusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
      <div className="incident-list">{filtered.map(report=>{const Icon=typeIcons[report.type];return <button key={report.id} className={`incident-row severity-${report.severity}`} onClick={()=>openExisting(report)}><span className={`incident-type-icon ${report.type}`}><Icon/></span><span className="incident-row-copy"><b>{report.personName}</b><small>{incidentTypeLabels[report.type]} · {report.team}{report.location?` · ${report.location}`:''}</small><em>{report.description}</em></span><span className="incident-row-meta"><time>{displayDate(report.occurredOn)}{report.occurredAt?` · ${report.occurredAt}`:''}</time><span className={`incident-status ${report.status}`}>{incidentStatusLabels[report.status]}</span><span className={`incident-severity ${report.severity}`}>{incidentSeverityLabels[report.severity]}</span></span><ChevronRight/></button>})}{!filtered.length&&<div className="empty-state compact"><ShieldAlert/><h3>No incident reports found</h3><p>{reports.length?'Try changing the filters or search.':'New reports will be retained here for follow-up and review.'}</p></div>}</div>
    </section>
    <p className="incident-retention-note"><CheckCircle2/>Closed reports stay in the register as a permanent operational record. They cannot be deleted from this screen.</p>

    {editing&&<div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!saving)setEditing(null)}}><form className="incident-modal" onSubmit={submit}>
      <header><div><span className="eyebrow">{editing.createdAt?'INCIDENT RECORD':'NEW INCIDENT REPORT'}</span><h2>{editing.createdAt?editing.personName:'Record an injury or accident'}</h2>{Boolean(editing.createdAt)&&<p>Reported by {editing.createdByName} · {new Date(editing.createdAt).toLocaleString('en-GB')}</p>}</div><button type="button" onClick={()=>setEditing(null)} disabled={saving} aria-label="Close"><X/></button></header>
      <div className="incident-form">
        <section><h3>When and where</h3><div className="incident-form-grid"><label>Team <strong>*</strong><select required disabled={Boolean(editing.createdAt)||readOnly} value={editing.team} onChange={event=>change({team:event.target.value,eventId:'',eventTitle:'',playerId:'',personName:''})}><option value="">Select team</option>{availableTeams.map(team=><option key={team}>{team}</option>)}</select></label><label>Related event<select disabled={readOnly||!editing.team} value={editing.eventId} onChange={event=>chooseEvent(event.target.value)}><option value="">Not linked to an event</option>{eventsForTeam.map(session=><option value={session.id} key={session.id}>{displayDate(session.date)} · {session.title}</option>)}</select></label><label>Date <strong>*</strong><input required disabled={readOnly} type="date" value={editing.occurredOn} onChange={event=>change({occurredOn:event.target.value})}/></label><label>Time<input disabled={readOnly} type="time" value={editing.occurredAt} onChange={event=>change({occurredAt:event.target.value})}/></label><label className="wide">Location <strong>*</strong><input required disabled={readOnly} maxLength={160} value={editing.location} onChange={event=>change({location:event.target.value})} placeholder="Venue and specific area"/></label></div></section>
        <section><h3>Person involved</h3><div className="incident-form-grid"><label>Person type <strong>*</strong><select required disabled={readOnly} value={editing.personType} onChange={event=>change({personType:event.target.value as IncidentReport['personType'],playerId:event.target.value==='player'?editing.playerId:''})}><option value="player">Player</option><option value="coach">Coach</option><option value="spectator">Spectator</option><option value="other">Other</option></select></label>{editing.personType==='player'&&<label>Link player record<select disabled={readOnly||!editing.team} value={editing.playerId} onChange={event=>choosePlayer(event.target.value)}><option value="">Enter name manually</option>{playersForTeam.map(player=><option value={player.id} key={player.id}>{player.name}</option>)}</select></label>}<label className={editing.personType==='player'?'wide':''}>Full name <strong>*</strong><input required disabled={readOnly} maxLength={160} value={editing.personName} onChange={event=>change({personName:event.target.value})}/></label></div></section>
        <section><h3>What happened</h3><div className="incident-form-grid"><label>Report type <strong>*</strong><select required disabled={readOnly} value={editing.type} onChange={event=>change({type:event.target.value as IncidentType})}>{Object.entries(incidentTypeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>Severity <strong>*</strong><select required disabled={readOnly} value={editing.severity} onChange={event=>change({severity:event.target.value as IncidentSeverity})}>{Object.entries(incidentSeverityLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label className="wide">Description <strong>*</strong><textarea required disabled={readOnly} maxLength={3000} value={editing.description} onChange={event=>change({description:event.target.value})} placeholder="Give a factual account of what happened, including the activity and any injury observed."/></label><label className="wide">Immediate action taken <strong>*</strong><textarea required disabled={readOnly} maxLength={2000} value={editing.immediateAction} onChange={event=>change({immediateAction:event.target.value})} placeholder="How the activity was stopped or made safe, and what support was provided."/></label></div></section>
        <section><h3>Response and notifications</h3><div className="incident-checks"><label><input type="checkbox" disabled={readOnly} checked={editing.firstAidGiven} onChange={event=>change({firstAidGiven:event.target.checked})}/><span><b>First aid given</b><small>Record treatment details below</small></span></label><label><input type="checkbox" disabled={readOnly} checked={editing.emergencyServices} onChange={event=>change({emergencyServices:event.target.checked})}/><span><b>Emergency services contacted</b><small>Ambulance, police or other service</small></span></label><label><input type="checkbox" disabled={readOnly} checked={editing.parentGuardianNotified} onChange={event=>change({parentGuardianNotified:event.target.checked})}/><span><b>Parent or guardian notified</b><small>Where relevant to the person involved</small></span></label></div><div className="incident-form-grid follow-up-fields"><label className="wide">First aid details<textarea disabled={readOnly} maxLength={2000} value={editing.firstAidDetails} onChange={event=>change({firstAidDetails:event.target.value})} placeholder="Treatment given, by whom, and any onward advice."/></label><label className="wide">Witnesses<input disabled={readOnly} maxLength={1000} value={editing.witnesses} onChange={event=>change({witnesses:event.target.value})} placeholder="Names and contact details held by the club, if applicable"/></label></div></section>
        <section><h3>Follow-up</h3><div className="incident-form-grid"><label>Status <strong>*</strong><select required disabled={readOnly} value={editing.status} onChange={event=>change({status:event.target.value as IncidentStatus})}>{Object.entries(incidentStatusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label className="wide">Follow-up notes<textarea disabled={readOnly} maxLength={3000} value={editing.followUp} onChange={event=>change({followUp:event.target.value})} placeholder="Further contact, medical updates, actions to prevent recurrence, or closure outcome."/></label></div></section>
      </div>
      {error&&<p className="incident-form-error">{error}</p>}
      <footer><span>{editing.createdAt?`Last updated by ${editing.updatedByName} · ${new Date(editing.updatedAt).toLocaleString('en-GB')}`:'Fields marked * are required.'}</span><div><button type="button" className="secondary" onClick={()=>setEditing(null)} disabled={saving}>{readOnly?'Close':'Cancel'}</button>{!readOnly&&<button className="primary" disabled={saving}>{saving?'Saving…':editing.createdAt?'Update report':'Save report'}</button>}</div></footer>
    </form></div>}
  </>
}
