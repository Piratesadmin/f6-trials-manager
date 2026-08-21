import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Archive, CalendarDays, CheckCircle2, Download, FileArchive, Mail, RefreshCw, RotateCcw, Search, ShieldAlert, ShieldCheck, Star, Trash2, Users, WalletCards, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import type { ArchivedPlayerRecord, Player, SeasonArchive, SeasonSettings, TrialSession } from '../types'
import { formatCurrency } from '../utils/finance'
import { averageRating, confirmedTeamNames } from '../utils/player'

type Props = {
  seasonSettings: SeasonSettings
  players: Player[]
  sessions: TrialSession[]
  archives: SeasonArchive[]
  archivedPlayers: ArchivedPlayerRecord[]
  rollover: (nextSeason: string) => Promise<void>
  cleanupTrialists: (scope: CleanupScope) => Promise<number>
  restoreArchivedPlayer: (record: ArchivedPlayerRecord) => Promise<void>
}

type CleanupScope = 'rejected' | 'not-confirmed'

export function ArchivePage({ seasonSettings, players, sessions, archives, archivedPlayers, rollover, cleanupTrialists, restoreArchivedPlayer }: Props) {
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
  const [archiveQuery,setArchiveQuery]=useState('')
  const [archiveDivision,setArchiveDivision]=useState('All divisions')
  const [archivePosition,setArchivePosition]=useState('All positions')
  const [selectedArchivedId,setSelectedArchivedId]=useState(archivedPlayers[0]?.id||'')
  const [restoreBusy,setRestoreBusy]=useState(false)
  const [restoreError,setRestoreError]=useState('')
  useEffect(()=>setNextSeason(nextSeasonSuggestion(seasonSettings.currentSeason)),[seasonSettings.currentSeason])
  useEffect(()=>{if(!archives.some(archive=>archive.id===selectedId))setSelectedId(archives[0]?.id||'')},[archives,selectedId])
  useEffect(()=>{if(!archivedPlayers.some(record=>record.id===selectedArchivedId))setSelectedArchivedId(archivedPlayers[0]?.id||'')},[archivedPlayers,selectedArchivedId])
  const selected=archives.find(archive=>archive.id===selectedId)
  const confirmed=players.filter(player=>player.decision==='Offer accepted').length
  const communications=players.reduce((total,player)=>total+Object.keys(player.communicationHistory||{}).length,0)
  const rejected=players.filter(player=>player.decision==='Rejection sent')
  const notConfirmed=players.filter(player=>player.decision!=='Offer accepted')
  const pendingOffers=players.filter(player=>player.decision==='Offer planned'||player.decision==='Alternative offer'||player.decision==='Offer sent').length
  const waiting=players.filter(player=>player.decision==='Waiting list planned'||player.decision==='Waiting list sent').length
  const cleanupTargets=cleanupScope==='rejected'?rejected:notConfirmed
  const ready=nextSeason.trim()&&nextSeason.trim()!==seasonSettings.currentSeason&&confirmation==='ARCHIVE'
  const archiveDivisions=useMemo(()=>[...new Set(archivedPlayers.map(record=>record.player.interestedDivisions).filter(Boolean))].sort(),[archivedPlayers])
  const archivePositions=useMemo(()=>[...new Set(archivedPlayers.map(record=>record.player.position).filter(Boolean))].sort(),[archivedPlayers])
  const filteredArchived=useMemo(()=>archivedPlayers.filter(record=>{
    const player=record.player
    const search=`${player.name} ${player.email} ${player.position} ${player.secondaryPosition} ${player.interestedDivisions} ${player.recommendation} ${player.strengths} ${player.playingExperience}`.toLowerCase()
    return (!archiveQuery.trim()||search.includes(archiveQuery.trim().toLowerCase()))&&(archiveDivision==='All divisions'||player.interestedDivisions===archiveDivision)&&(archivePosition==='All positions'||player.position===archivePosition||player.secondaryPosition===archivePosition)
  }),[archivedPlayers,archiveQuery,archiveDivision,archivePosition])
  const selectedArchived=archivedPlayers.find(record=>record.id===selectedArchivedId)
  const completeRollover=async()=>{if(!ready)return;setBusy(true);setError('');try{await rollover(nextSeason.trim());setShowRollover(false);setConfirmation('')}catch(err){setError(err instanceof Error?err.message:'Unable to complete the season rollover.')}finally{setBusy(false)}}
  const completeCleanup=async()=>{if(cleanupConfirmation!=='ARCHIVE'||!cleanupTargets.length)return;setCleanupBusy(true);setCleanupError('');try{const removed=await cleanupTrialists(cleanupScope);setCleanupResult(removed);setShowCleanup(false);setCleanupConfirmation('')}catch(err){setCleanupError(err instanceof Error?err.message:'Unable to archive the selected trialists. Publish the supplied v0.26 Firebase rules and try again.')}finally{setCleanupBusy(false)}}
  const restore=async(record:ArchivedPlayerRecord)=>{if(!window.confirm(`Restore ${record.player.name} to the live player list? Their archived profile and photo will be returned.`))return;setRestoreBusy(true);setRestoreError('');try{await restoreArchivedPlayer(record)}catch(err){setRestoreError(err instanceof Error?err.message:'Unable to restore this player.')}finally{setRestoreBusy(false)}}
  const downloadArchive=(archive:SeasonArchive)=>{const blob=new Blob([JSON.stringify(archive,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`f6-${archive.seasonName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-archive.json`;link.click();URL.revokeObjectURL(url)}

  return <>
    <PageHeader title="Seasons & archive" subtitle="Keep removed trialists available for replacements and close completed seasons safely." action={<button className="primary" onClick={()=>setShowRollover(true)}><RefreshCw/>Start season rollover</button>}/>
    <section className="current-season-card"><div><span className="eyebrow">CURRENT LIVE SEASON</span><h2>{seasonSettings.currentSeason}</h2><p>These are the records currently used throughout Club Manager.</p></div><div><span><Users/><b>{players.length}</b><small>Live players</small></span><span><FileArchive/><b>{archivedPlayers.length}</b><small>Archived trialists</small></span><span><CalendarDays/><b>{sessions.length}</b><small>Events</small></span><span><Mail/><b>{communications}</b><small>Messages</small></span></div></section>
    <section className="panel trialist-cleanup-panel"><div className="cleanup-heading"><div className="cleanup-icon"><Trash2/></div><div><span className="eyebrow">ADMINISTRATOR CLEANUP</span><h2>Remove trialists from live records</h2><p>Move completed trial records out of the working list while retaining them as possible replacements.</p></div><button className="secondary danger-outline" onClick={()=>{setCleanupScope('rejected');setCleanupError('');setShowCleanup(true)}} disabled={!notConfirmed.length}><FileArchive/>Review cleanup</button></div><div className="cleanup-preview-stats"><span className="protected"><CheckCircle2/><b>{confirmed}</b><small>Confirmed players protected</small></span><span><ShieldAlert/><b>{rejected.length}</b><small>Final rejections</small></span><span><Mail/><b>{pendingOffers}</b><small>Offers still open</small></span><span><Users/><b>{waiting}</b><small>Waiting-list players</small></span></div>{cleanupResult>0&&<p className="cleanup-success"><CheckCircle2/>{cleanupResult} trialist{cleanupResult===1?' was':'s were'} moved to Archived players.</p>}<div className="cleanup-retention-note"><AlertTriangle/><span>Cleanup removes players from live lists but retains their profile, assessments, notes, communications and photo in the administrator-only archive. Finance records and personal coach stars are not retained.</span></div></section>

    <section className="panel archived-players-panel">
      <header className="archived-players-heading"><div><span className="eyebrow">REPLACEMENT POOL</span><h2>Archived players</h2><p>Search previous trialists and restore a suitable replacement to the live club records.</p></div><FileArchive/></header>
      <div className="archived-player-toolbar"><label><Search/><input value={archiveQuery} onChange={event=>setArchiveQuery(event.target.value)} placeholder="Search name, email, experience or notes"/></label><select value={archiveDivision} onChange={event=>setArchiveDivision(event.target.value)}><option>All divisions</option>{archiveDivisions.map(division=><option key={division}>{division}</option>)}</select><select value={archivePosition} onChange={event=>setArchivePosition(event.target.value)}><option>All positions</option>{archivePositions.map(position=><option key={position}>{position}</option>)}</select></div>
      <div className="archived-player-workspace">
        <div className="archived-player-list"><div className="archived-player-count"><b>{filteredArchived.length}</b> of {archivedPlayers.length} archived player{archivedPlayers.length===1?'':'s'}</div>{filteredArchived.map(record=>{const player=record.player;const rating=averageRating(player);return <button key={record.id} className={selectedArchivedId===record.id?'selected':''} onClick={()=>{setSelectedArchivedId(record.id);setRestoreError('')}}><div className={`avatar archived-avatar ${record.photo?'has-photo':''}`}>{record.photo?<img src={record.photo} alt=""/>:player.name.split(' ').filter(Boolean).map(part=>part[0]).join('').slice(0,2)}</div><span><b>{player.name}</b><small>{player.interestedDivisions} · {player.position}{player.secondaryPosition?` / ${player.secondaryPosition}`:''}</small><em>{new Date(record.archivedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</em></span><strong><Star/>{rating?rating.toFixed(1):'—'}</strong></button>})}{!filteredArchived.length&&<div className="archived-player-empty"><Search/><b>No archived players found</b><span>Try clearing the search or filters.</span></div>}</div>
        <div className="archived-player-detail">{selectedArchived?<ArchivedPlayerDetail record={selectedArchived} restore={()=>restore(selectedArchived)} busy={restoreBusy} error={restoreError}/>:<div className="archive-detail-empty"><FileArchive/><h3>Replacement player profiles</h3><p>Select an archived player to review their trial information and assessment history.</p></div>}</div>
      </div>
    </section>

    <section className="archive-layout">
      <div className="panel archive-list-panel"><div className="panel-head"><div><span className="eyebrow">READ-ONLY HISTORY</span><h2>Season archives</h2><p>Archived records remain available to full administrators.</p></div><FileArchive/></div><div className="season-archive-list">{archives.map(archive=><button key={archive.id} className={archive.id===selectedId?'selected':''} onClick={()=>setSelectedId(archive.id)}><Archive/><span><b>{archive.seasonName}</b><small>{new Date(archive.archivedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · {archive.summary.players} players</small></span></button>)}{!archives.length&&<div className="archive-empty"><Archive/><b>No archived seasons yet</b><span>Your first completed rollover will appear here.</span></div>}</div></div>
      <div className="panel archive-detail-panel">{selected?<ArchiveDetail archive={selected} download={()=>downloadArchive(selected)}/>:<div className="archive-detail-empty"><FileArchive/><h3>Historical records</h3><p>Select an archived season to see its final totals and download its structured data.</p></div>}</div>
    </section>
    <div className="archive-policy-note"><ShieldCheck/><div><b>What is retained?</b><p>Archived trialists remain in the replacement pool until season rollover. Rollover then includes them in the completed season snapshot and clears the live replacement pool for the new season.</p></div></div>
    {showRollover&&<div className="modal-backdrop"><section className="rollover-modal"><header><div><span className="eyebrow">ADMINISTRATOR ONLY</span><h2>Archive {seasonSettings.currentSeason}</h2></div><button onClick={()=>setShowRollover(false)} aria-label="Close"><X/></button></header><div className="rollover-warning"><ShieldAlert/><div><b>This changes the live club workspace</b><p>A protected archive will be created first. Live players, archived trialists, events, player payments, personal stars and player photos will then be cleared for the new season.</p></div></div><div className="rollover-kept"><b>Kept for the next season</b><span>Coach accounts · Team permissions · Team targets · Email templates · Team details · Standard fees · Activity history</span></div><label>New season name<input value={nextSeason} onChange={event=>setNextSeason(event.target.value)} maxLength={60} placeholder="e.g. 2027 season"/></label><label>Type <strong>ARCHIVE</strong> to confirm<input value={confirmation} onChange={event=>setConfirmation(event.target.value.toUpperCase())} placeholder="ARCHIVE" autoComplete="off"/></label>{error&&<p className="rollover-error">{error}</p>}<footer><button className="secondary" onClick={()=>setShowRollover(false)}>Cancel</button><button className="danger rollover-confirm" disabled={!ready||busy} onClick={completeRollover}>{busy?'Archiving…':'Archive and start new season'}</button></footer></section></div>}
    {showCleanup&&<div className="modal-backdrop"><section className="rollover-modal cleanup-modal"><header><div><span className="eyebrow">LIVE DATA CLEANUP</span><h2>Archive trialists</h2></div><button onClick={()=>setShowCleanup(false)} aria-label="Close"><X/></button></header><div className="cleanup-scope-options"><button className={cleanupScope==='rejected'?'selected':''} onClick={()=>{setCleanupScope('rejected');setCleanupConfirmation('')}}><ShieldAlert/><span><b>Final rejections only</b><small>Archive {rejected.length} player{rejected.length===1?'':'s'} whose rejection email is marked sent.</small></span></button><button className={cleanupScope==='not-confirmed'?'selected':''} onClick={()=>{setCleanupScope('not-confirmed');setCleanupConfirmation('')}}><Users/><span><b>Everyone outside confirmed squads</b><small>Archive all {notConfirmed.length} players without an accepted offer.</small></span></button></div>{cleanupScope==='not-confirmed'&&<div className="rollover-warning"><ShieldAlert/><div><b>This includes unresolved players</b><p>{pendingOffers} open offer{pendingOffers===1?'':'s'} and {waiting} waiting-list player{waiting===1?'':'s'} will also move out of the live list. Only players with <strong>Offer accepted</strong> will remain live.</p></div></div>}<div className="cleanup-target-preview"><b>{cleanupTargets.length} player{cleanupTargets.length===1?'':'s'} will move to Archived players</b><span>{cleanupTargets.slice(0,8).map(player=>player.name).join(' · ')}{cleanupTargets.length>8?` · +${cleanupTargets.length-8} more`:''}</span><small>Profiles, assessments, notes, communication history and photos are retained. Finance records and personal star references are removed.</small></div><label>Type <strong>ARCHIVE</strong> to confirm<input value={cleanupConfirmation} onChange={event=>setCleanupConfirmation(event.target.value.toUpperCase())} placeholder="ARCHIVE" autoComplete="off"/></label>{cleanupError&&<p className="rollover-error">{cleanupError}</p>}<footer><button className="secondary" onClick={()=>setShowCleanup(false)}>Cancel</button><button className="danger rollover-confirm" disabled={cleanupConfirmation!=='ARCHIVE'||!cleanupTargets.length||cleanupBusy} onClick={completeCleanup}>{cleanupBusy?'Archiving…':`Archive ${cleanupTargets.length} trialist${cleanupTargets.length===1?'':'s'}`}</button></footer></section></div>}
  </>
}

function ArchivedPlayerDetail({record,restore,busy,error}:{record:ArchivedPlayerRecord;restore:()=>void;busy:boolean;error:string}){
  const player=record.player
  const rating=averageRating(player)
  const assessmentCount=Object.keys(player.assessmentHistory||{}).length
  return <><header><div className={`avatar archived-detail-avatar ${record.photo?'has-photo':''}`}>{record.photo?<img src={record.photo} alt={`${player.name} profile`}/>:player.name.split(' ').filter(Boolean).map(part=>part[0]).join('').slice(0,2)}</div><div><span className="eyebrow">ARCHIVED PLAYER</span><h2>{player.name}</h2><p>{player.email}</p></div><button className="primary" disabled={busy} onClick={restore}><RotateCcw/>{busy?'Restoring…':'Restore to live players'}</button></header><div className="archived-player-meta"><span><small>Primary position</small><b>{player.position||'Not recorded'}</b></span><span><small>Second position</small><b>{player.secondaryPosition||'Not recorded'}</b></span><span><small>Interested division(s)</small><b>{player.interestedDivisions||'Not recorded'}</b></span><span><small>Average rating</small><b>{rating?`${rating.toFixed(1)} / 5`:'Not assessed'}</b></span><span><small>Recommendation</small><b>{player.recommendation||'Not recorded'}</b></span><span><small>Saved assessments</small><b>{assessmentCount}</b></span></div><div className="archived-player-status"><FileArchive/><div><b>{record.archiveReason}</b><span>{record.seasonName} · archived by {record.archivedBy||'Club administrator'} on {new Date(record.archivedAt).toLocaleString('en-GB',{dateStyle:'long',timeStyle:'short'})}</span></div></div><div className="archived-player-notes"><section><b>Strengths</b><p>{player.strengths||'No strengths recorded.'}</p></section><section><b>Development areas</b><p>{player.developmentAreas||'No development areas recorded.'}</p></section><section><b>Playing experience</b><p>{player.playingExperience||player.highestLevelPlayed||'No playing experience recorded.'}</p></section><section><b>Coach notes</b><p>{player.notes||'No coach notes recorded.'}</p></section></div>{player.suitableTeams.length>0&&<div className="archived-suitable-teams"><b>Suitable teams</b><div>{player.suitableTeams.map(team=><span key={team}>{team}</span>)}</div></div>}{error&&<p className="rollover-error archived-restore-error">{error}</p>}</>
}

function ArchiveDetail({archive,download}:{archive:SeasonArchive;download:()=>void}){
  const squads=useMemo(()=>Object.values(archive.snapshot.players||{}).reduce<Record<string,number>>((totals,player)=>{confirmedTeamNames(player).forEach(team=>{totals[team]=(totals[team]||0)+1});return totals},{}),[archive])
  const archivedTrialists=Object.keys(archive.snapshot.archivedPlayers||{}).length
  return <><div className="archive-detail-heading"><div><span className="eyebrow">ARCHIVED SEASON</span><h2>{archive.seasonName}</h2><p>Archived by {archive.archivedBy} on {new Date(archive.archivedAt).toLocaleString('en-GB',{dateStyle:'long',timeStyle:'short'})}</p></div><button className="secondary" onClick={download}><Download/>Download JSON</button></div><div className="archive-summary-grid"><span><Users/><b>{archive.summary.players}</b><small>Live players</small></span><span><FileArchive/><b>{archivedTrialists}</b><small>Archived trialists</small></span><span><CheckCircle2/><b>{archive.summary.confirmedPlayers}</b><small>Confirmed</small></span><span><CalendarDays/><b>{archive.summary.sessions}</b><small>Events</small></span><span><WalletCards/><b>{formatCurrency(archive.summary.amountBilled)}</b><small>Billed</small></span><span><WalletCards/><b>{formatCurrency(archive.summary.amountPaid)}</b><small>Paid</small></span></div><div className="archived-squads"><h3>Final confirmed squads</h3>{Object.keys(squads).length?<div>{Object.entries(squads).sort().map(([team,count])=><span key={team}><b>{team}</b><em>{count} players</em></span>)}</div>:<p>No confirmed squads were recorded.</p>}</div></>
}

function nextSeasonSuggestion(current:string){const year=current.match(/\b(20\d{2})\b/);return year?current.replace(year[1],String(Number(year[1])+1)):`${new Date().getFullYear()+1} season`}
