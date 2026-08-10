import { useMemo, useState } from 'react'
import { Archive, CalendarDays, ChevronRight, ClipboardList, Download, Filter, Mail, Search, Settings, ShieldCheck, UserCog, Users, WalletCards } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { teams } from '../data/constants'
import type { ActivityCategory, ActivityLogEntry, Player, TrialSession } from '../types'
import { activityCategoryLabels } from '../utils/activity'

type Props = {
  entries: ActivityLogEntry[]
  players: Player[]
  sessions: TrialSession[]
  openPlayer: (playerId: string) => void
  openSession: (sessionId: string) => void
}

const categoryIcons = { player: Users, schedule: CalendarDays, email: Mail, team: ShieldCheck, finance: WalletCards, settings: Settings, access: UserCog, import: ClipboardList, season: Archive }

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

export function ActivityPage({ entries, players, sessions, openPlayer, openSession }: Props) {
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState<'all'|ActivityCategory>('all')
  const [team,setTeam]=useState('All teams')
  const [actor,setActor]=useState('All people')
  const actors=useMemo(()=>Array.from(new Set(entries.map(entry=>entry.actorName).filter(Boolean))).sort(),[entries])
  const now=Date.now()
  const filtered=useMemo(()=>entries.filter(entry=>{
    const search=query.trim().toLowerCase()
    return (category==='all'||entry.category===category)&&(team==='All teams'||entry.team===team)&&(actor==='All people'||entry.actorName===actor)&&(!search||`${entry.summary} ${entry.detail} ${entry.actorName} ${entry.actorEmail} ${entry.team} ${entry.season}`.toLowerCase().includes(search))
  }),[entries,query,category,team,actor])
  const last24=entries.filter(entry=>entry.timestamp>=now-86400000).length
  const last7=entries.filter(entry=>entry.timestamp>=now-604800000).length
  const openEntry=(entry:ActivityLogEntry)=>{if(entry.entityType==='player'&&entry.entityId)openPlayer(entry.entityId);if(entry.entityType==='session'&&entry.entityId)openSession(entry.entityId)}
  const exportCsv=()=>{
    const header=['Date','Person','Email','Category','Action','Summary','Detail','Team','Season']
    const rows=filtered.map(entry=>[new Date(entry.timestamp).toISOString(),entry.actorName,entry.actorEmail,activityCategoryLabels[entry.category],entry.action,entry.summary,entry.detail,entry.team,entry.season])
    const blob=new Blob([[header,...rows].map(row=>row.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`f6-activity-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url)
  }

  return <>
    <PageHeader title="Activity & audit" subtitle="An administrator-only history of important club changes." action={<button className="primary" onClick={exportCsv} disabled={!filtered.length}><Download/>Export activity</button>}/>
    <section className="activity-stats"><div><ClipboardList/><span>Recorded events</span><b>{entries.length}</b></div><div><CalendarDays/><span>Last 24 hours</span><b>{last24}</b></div><div><Filter/><span>Last 7 days</span><b>{last7}</b></div><div><Users/><span>People active</span><b>{actors.length}</b></div></section>
    <section className="panel activity-panel">
      <div className="activity-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search activity, player or coach"/></label><select value={category} onChange={event=>setCategory(event.target.value as 'all'|ActivityCategory)}><option value="all">All activity</option>{Object.entries(activityCategoryLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><select value={team} onChange={event=>setTeam(event.target.value)}><option>All teams</option>{teams.map(name=><option key={name}>{name}</option>)}</select><select value={actor} onChange={event=>setActor(event.target.value)}><option>All people</option>{actors.map(name=><option key={name}>{name}</option>)}</select></div>
      <div className="activity-audit-list">{filtered.map(entry=>{const Icon=categoryIcons[entry.category];const canOpen=entry.entityType==='player'?players.some(player=>player.id===entry.entityId):entry.entityType==='session'?sessions.some(session=>session.id===entry.entityId):false;return <button key={entry.id} className={`audit-entry category-${entry.category}`} onClick={()=>openEntry(entry)} disabled={!canOpen}><span className="audit-icon"><Icon/></span><span className="audit-copy"><b>{entry.summary}</b>{entry.detail&&<small>{entry.detail}</small>}<em>{entry.actorName}{entry.team?` · ${entry.team}`:''}{entry.season?` · ${entry.season}`:''}</em></span><time>{new Date(entry.timestamp).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time>{canOpen&&<ChevronRight/>}</button>})}{!filtered.length&&<div className="empty-state compact"><ClipboardList/><h3>No matching activity</h3><p>Important changes will appear here after the updated Firebase rules are published.</p></div>}</div>
    </section>
    <p className="audit-integrity-note"><ShieldCheck/>Entries are append-only and attributed to the signed-in account. They provide an operational history, but they are not a substitute for a legally certified financial audit.</p>
  </>
}
