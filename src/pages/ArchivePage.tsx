import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Archive, CalendarDays, CheckCircle2, Download, FileArchive, Mail, RefreshCw, ShieldAlert, ShieldCheck, Trash2, Users, WalletCards, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import type { Player, SeasonArchive, SeasonSettings, TrialSession } from '../types'
import { formatCurrency } from '../utils/finance'

type Props = {
  seasonSettings: SeasonSettings
  players: Player[]
  sessions: TrialSession[]
  archives: SeasonArchive[]
  rollover: (nextSeason: string) => Promise<void>
  cleanupTrialists: (scope: CleanupScope) => Promise<number>
}

type CleanupScope = 'rejected' | 'not-confirmed'

export function ArchivePage({ seasonSettings, players, sessions, archives, rollover, cleanupTrialists }: Props) {
  const [showRollover,setShowRollover]=useState(false)
  const [nextSeason,setNextSeason]=useState(nextSeasonSuggestion(seasonSettings.currentSeason))
  const [confirmation,setConfirmation]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [selectedId,setSelectedId]=useState(archives[0]?.id||'')
  const [showCleanup,setShowCleanup]=useState(false)
  const [cleanupScope,setCleanupScope]=useState<CleanupScope>('rejected')
  const [cleanupConfirmation,setCleanupConfirmation]=useState('')
  const [cleanupBusy,setCleanupBusy]=useState(false)
  const [cleanupError,setCleanupError]=useState('')
  const [cleanupResult,setCleanupResult]=useState(0)
  useEffect(()=>setNextSeason(nextSeasonSuggestion(seasonSettings.currentSeason)),[seasonSettings.currentSeason])
  useEffect(()=>{if(!archives.some(archive=>archive.id===selectedId))setSelectedId(archives[0]?.id||'')},[archives,selectedId])
  const selected=archives.find(archive=>archive.id===selectedId)
  const confirmed=players.filter(player=>player.decision==='Offer accepted').length
  const communications=players.reduce((total,player)=>total+Object.keys(player.communicationHistory||{}).length,0)
  const rejected=players.filter(player=>player.decision==='Rejection sent')
  const notConfirmed=players.filter(player=>player.decision!=='Offer accepted')
  const pendingOffers=players.filter(player=>player.decision==='Offer planned'||player.decision==='Alternative offer'||player.decision==='Offer sent').length
  const waiting=players.filter(player=>player.decision==='Waiting list planned'||player.decision==='Waiting list sent').length
  const cleanupTargets=cleanupScope==='rejected'?rejected:notConfirmed
  const ready=nextSeason.trim()&&nextSeason.trim()!==seasonSettings.currentSeason&&confirmation==='ARCHIVE'
  const completeRollover=async()=>{if(!ready)return;setBusy(true);setError('');try{await rollover(nextSeason.trim());setShowRollover(false);setConfirmation('')}catch(err){setError(err instanceof Error?err.message:'Unable to complete the season rollover.')}finally{setBusy(false)}}
  const completeCleanup=async()=>{if(cleanupConfirmation!=='REMOVE'||!cleanupTargets.length)return;setCleanupBusy(true);setCleanupError('');try{const removed=await cleanupTrialists(cleanupScope);setCleanupResult(removed);setShowCleanup(false);setCleanupConfirmation('')}catch(err){setCleanupError(err instanceof Error?err.message:'Unable to remove the selected trialists. Check that the v0.20.1 Firebase rules are published.')}finally{setCleanupBusy(false)}}
  const downloadArchive=(archive:SeasonArchive)=>{const blob=new Blob([JSON.stringify(archive,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`f6-${archive.seasonName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-archive.json`;link.click();URL.revokeObjectURL(url)}

  return <>
    <PageHeader title="Seasons & archive" subtitle="Close a completed season safely and keep a read-only historical snapshot." action={<button className="primary" onClick={()=>setShowRollover(true)}><RefreshCw/>Start season rollover</button>}/>
    <section className="current-season-card"><div><span className="eyebrow">CURRENT LIVE SEASON</span><h2>{seasonSettings.currentSeason}</h2><p>These are the records currently used throughout Club Manager.</p></div><div><span><Users/><b>{players.length}</b><small>Players</small></span><span><CheckCircle2/><b>{confirmed}</b><small>Confirmed</small></span><span><CalendarDays/><b>{sessions.length}</b><small>Events</small></span><span><Mail/><b>{communications}</b><small>Messages</small></span></div></section>
    <section className="panel trialist-cleanup-panel"><div className="cleanup-heading"><div className="cleanup-icon"><Trash2/></div><div><span className="eyebrow">ADMINISTRATOR CLEANUP</span><h2>Remove trialists from live records</h2><p>Clean the working player list after decisions are complete while protecting confirmed squad members.</p></div><button className="secondary danger-outline" onClick={()=>{setCleanupScope('rejected');setCleanupError('');setShowCleanup(true)}} disabled={!notConfirmed.length}><Trash2/>Review cleanup</button></div><div className="cleanup-preview-stats"><span className="protected"><CheckCircle2/><b>{confirmed}</b><small>Confirmed players protected</small></span><span><ShieldAlert/><b>{rejected.length}</b><small>Final rejections</small></span><span><Mail/><b>{pendingOffers}</b><small>Offers still open</small></span><span><Users/><b>{waiting}</b><small>Waiting-list players</small></span></div>{cleanupResult>0&&<p className="cleanup-success"><CheckCircle2/>{cleanupResult} trialist{cleanupResult===1?' was':'s were'} removed from the live club records.</p>}<div className="cleanup-retention-note"><AlertTriangle/><span>This cleanup does not alter existing season archives or the administrator activity history. Use it to clean the live workspace, not to fulfil a complete data-erasure request.</span></div></section>
    <section className="archive-layout">
      <div className="panel archive-list-panel"><div className="panel-head"><div><span className="eyebrow">READ-ONLY HISTORY</span><h2>Season archives</h2><p>Archived records remain available to full administrators.</p></div><FileArchive/></div><div className="season-archive-list">{archives.map(archive=><button key={archive.id} className={archive.id===selectedId?'selected':''} onClick={()=>setSelectedId(archive.id)}><Archive/><span><b>{archive.seasonName}</b><small>{new Date(archive.archivedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · {archive.summary.players} players</small></span></button>)}{!archives.length&&<div className="archive-empty"><Archive/><b>No archived seasons yet</b><span>Your first completed rollover will appear here.</span></div>}</div></div>
      <div className="panel archive-detail-panel">{selected?<ArchiveDetail archive={selected} download={()=>downloadArchive(selected)}/>:<div className="archive-detail-empty"><FileArchive/><h3>Historical records</h3><p>Select an archived season to see its final totals and download its structured data.</p></div>}</div>
    </section>
    <div className="archive-policy-note"><ShieldCheck/><div><b>What is retained?</b><p>Player profiles, assessments, decisions, communication history, schedules, team targets and season finance records are copied into the archive. Coach accounts and club configuration continue into the next season.</p></div></div>
    {showRollover&&<div className="modal-backdrop"><section className="rollover-modal"><header><div><span className="eyebrow">ADMINISTRATOR ONLY</span><h2>Archive {seasonSettings.currentSeason}</h2></div><button onClick={()=>setShowRollover(false)} aria-label="Close"><X/></button></header><div className="rollover-warning"><ShieldAlert/><div><b>This changes the live club workspace</b><p>A protected archive will be created first. Live players, trial/game/training events, player payments, personal stars and player photos will then be cleared for the new season.</p></div></div><div className="rollover-kept"><b>Kept for the next season</b><span>Coach accounts · Team permissions · Team targets · Email templates · Team details · Standard fees · Activity history</span></div><label>New season name<input value={nextSeason} onChange={event=>setNextSeason(event.target.value)} maxLength={60} placeholder="e.g. 2027 season"/></label><label>Type <strong>ARCHIVE</strong> to confirm<input value={confirmation} onChange={event=>setConfirmation(event.target.value.toUpperCase())} placeholder="ARCHIVE" autoComplete="off"/></label>{error&&<p className="rollover-error">{error}</p>}<footer><button className="secondary" onClick={()=>setShowRollover(false)}>Cancel</button><button className="danger rollover-confirm" disabled={!ready||busy} onClick={completeRollover}>{busy?'Archiving…':'Archive and start new season'}</button></footer></section></div>}
    {showCleanup&&<div className="modal-backdrop"><section className="rollover-modal cleanup-modal"><header><div><span className="eyebrow">LIVE DATA CLEANUP</span><h2>Remove trialists</h2></div><button onClick={()=>setShowCleanup(false)} aria-label="Close"><X/></button></header><div className="cleanup-scope-options"><button className={cleanupScope==='rejected'?'selected':''} onClick={()=>{setCleanupScope('rejected');setCleanupConfirmation('')}}><ShieldAlert/><span><b>Final rejections only</b><small>Remove {rejected.length} player{rejected.length===1?'':'s'} whose rejection email is marked sent.</small></span></button><button className={cleanupScope==='not-confirmed'?'selected':''} onClick={()=>{setCleanupScope('not-confirmed');setCleanupConfirmation('')}}><Users/><span><b>Everyone outside confirmed squads</b><small>Remove all {notConfirmed.length} players without an accepted offer.</small></span></button></div>{cleanupScope==='not-confirmed'&&<div className="rollover-warning"><ShieldAlert/><div><b>This includes unresolved players</b><p>{pendingOffers} open offer{pendingOffers===1?'':'s'} and {waiting} waiting-list player{waiting===1?'':'s'} will also be removed. Only players with <strong>Offer accepted</strong> will remain.</p></div></div>}<div className="cleanup-target-preview"><b>{cleanupTargets.length} player{cleanupTargets.length===1?'':'s'} will be removed</b><span>{cleanupTargets.slice(0,8).map(player=>player.name).join(' · ')}{cleanupTargets.length>8?` · +${cleanupTargets.length-8} more`:''}</span><small>Player profiles, photos, payment records and every coach's star reference will be removed from the live database.</small></div><label>Type <strong>REMOVE</strong> to confirm<input value={cleanupConfirmation} onChange={event=>setCleanupConfirmation(event.target.value.toUpperCase())} placeholder="REMOVE" autoComplete="off"/></label>{cleanupError&&<p className="rollover-error">{cleanupError}</p>}<footer><button className="secondary" onClick={()=>setShowCleanup(false)}>Cancel</button><button className="danger rollover-confirm" disabled={cleanupConfirmation!=='REMOVE'||!cleanupTargets.length||cleanupBusy} onClick={completeCleanup}>{cleanupBusy?'Removing…':`Remove ${cleanupTargets.length} trialist${cleanupTargets.length===1?'':'s'}`}</button></footer></section></div>}
  </>
}

function ArchiveDetail({archive,download}:{archive:SeasonArchive;download:()=>void}){
  const squads=useMemo(()=>Object.values(archive.snapshot.players||{}).filter(player=>player.decision==='Offer accepted').reduce<Record<string,number>>((totals,player)=>{const team=player.offeredTeam||player.appliedTeam;totals[team]=(totals[team]||0)+1;return totals},{}),[archive])
  return <><div className="archive-detail-heading"><div><span className="eyebrow">ARCHIVED SEASON</span><h2>{archive.seasonName}</h2><p>Archived by {archive.archivedBy} on {new Date(archive.archivedAt).toLocaleString('en-GB',{dateStyle:'long',timeStyle:'short'})}</p></div><button className="secondary" onClick={download}><Download/>Download JSON</button></div><div className="archive-summary-grid"><span><Users/><b>{archive.summary.players}</b><small>Players</small></span><span><CheckCircle2/><b>{archive.summary.confirmedPlayers}</b><small>Confirmed</small></span><span><CalendarDays/><b>{archive.summary.sessions}</b><small>Events</small></span><span><Mail/><b>{archive.summary.communicationsSent}</b><small>Sent messages</small></span><span><WalletCards/><b>{formatCurrency(archive.summary.amountBilled)}</b><small>Billed</small></span><span><WalletCards/><b>{formatCurrency(archive.summary.amountPaid)}</b><small>Paid</small></span></div><div className="archived-squads"><h3>Final confirmed squads</h3>{Object.keys(squads).length?<div>{Object.entries(squads).sort().map(([team,count])=><span key={team}><b>{team}</b><em>{count} players</em></span>)}</div>:<p>No confirmed squads were recorded.</p>}</div></>
}

function nextSeasonSuggestion(current:string){const year=current.match(/\b(20\d{2})\b/);return year?current.replace(year[1],String(Number(year[1])+1)):`${new Date().getFullYear()+1} season`}
