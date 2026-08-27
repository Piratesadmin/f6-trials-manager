import { useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, CalendarDays, CheckCircle2, ClipboardCheck, Mail, ShieldCheck, Star, UserRoundCheck, Users, WalletCards, X } from 'lucide-react'
import type { EmailSettings, FinanceSettings, PageKey, Player, PlayerFinanceMap, PlayerPhotos, PlayerStars, PlayerTab, TeamPlans, TrialSession } from '../types'
import { PageHeader } from '../components/PageHeader'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { NotificationDropdown } from '../components/NotificationDropdown'
import { StatsCards } from '../components/StatsCards'
import { averageRating } from '../utils/player'
import { emailQueueStatus, emailTypeFor } from '../utils/email'
import { eventTypeLabel, formatSessionDate } from '../utils/schedule'
import { effectiveAmountOwed, emptyPlayerFinance, formatCurrency, outstandingAmount, paymentDeadlineDetails } from '../utils/finance'
import { deadlineStateLabel, decisionReminderDetailText, decisionReminderDetails, formatDeadline, responseDeadlineDetails } from '../utils/deadline'

type Props={
  players:Player[]
  playerPhotos:PlayerPhotos
  sessions:TrialSession[]
  settings:EmailSettings
  teamPlans:TeamPlans
  setPage:(page:PageKey)=>void
  openPlayer:(playerId:string,tab?:PlayerTab)=>void
  openEmail:(playerId:string)=>void
  openSchedule:(sessionId:string)=>void
  assignedTeams:string[]
  isAdmin:boolean
  finances:PlayerFinanceMap
  financeSettings:FinanceSettings
  playerStars:PlayerStars
  trialsMode:boolean
}

type FocusView='starred'|'recommended'|'deadlines'

export function DashboardPage({players,playerPhotos,sessions,settings,teamPlans,setPage,openPlayer,openEmail,openSchedule,assignedTeams,isAdmin,finances,financeSettings,playerStars,trialsMode}:Props){
  const [focusView,setFocusView]=useState<FocusView|null>(null)
  const recent=[...players].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,5)
  const emailPlayers=players.filter(player=>emailTypeFor(player))
  const deadlineFor=(player:Player)=>responseDeadlineDetails(player,sessions,settings.defaultResponseDeadline)
  const emailCounts={
    needs:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))==='needs-info').length,
    ready:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))==='ready').length,
    reviewed:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))==='reviewed').length,
    sent:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))==='sent').length,
  }
  const pendingDeadlinePlayers=emailPlayers.filter(player=>emailTypeFor(player)!=='rejection'&&deadlineFor(player).state!=='none')
  const decisionReminders=players.map(player=>({player,details:decisionReminderDetails(player,sessions)})).filter(item=>item.details.state!=='none').sort((a,b)=>b.details.hoursSinceSession-a.details.hoursSinceSession)
  const decisionCounts={needed:decisionReminders.filter(item=>item.details.state==='needed').length,pending:decisionReminders.filter(item=>item.details.state==='pending').length,overdue:decisionReminders.filter(item=>item.details.state==='overdue').length}
  const today=new Date().toISOString().slice(0,10)
  const nextSession=[...sessions].filter(session=>session.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime))[0]
  const confirmed=players.filter(player=>player.decision==='Offer accepted')
  const financeRecords=confirmed.map(player=>({player,finance:finances[player.id]||emptyPlayerFinance(player.id)}))
  const billed=financeRecords.reduce((total,{player,finance})=>total+effectiveAmountOwed(player,finance,financeSettings),0)
  const outstanding=financeRecords.reduce((total,{player,finance})=>total+outstandingAmount(finance,effectiveAmountOwed(player,finance,financeSettings)),0)
  const overduePayments=financeRecords.filter(({player,finance})=>paymentDeadlineDetails(finance,effectiveAmountOwed(player,finance,financeSettings),financeSettings).state==='overdue').length
  const relevantToCoach=(player:Player)=>isAdmin||assignedTeams.some(team=>player.suitableTeams.includes(team)||Boolean(player.teamConsideration[team]))
  const suitableForCoach=(player:Player)=>assignedTeams.some(team=>player.suitableTeams.includes(team))
  const starredPlayers=players.filter(player=>playerStars[player.id])
  const recommendedPlayers=players.filter(player=>player.recommendation&&player.recommendation!=='Not suitable'&&suitableForCoach(player))
  const deadlinePlayers=pendingDeadlinePlayers.filter(relevantToCoach).sort((a,b)=>deadlineFor(a).effectiveDeadline.localeCompare(deadlineFor(b).effectiveDeadline))
  const overdueDeadlines=deadlinePlayers.filter(player=>deadlineFor(player).state==='overdue').length
  const focusPlayers=focusView==='starred'?starredPlayers:focusView==='recommended'?recommendedPlayers:deadlinePlayers
  const focusTitle=focusView==='starred'?'My starred players':focusView==='recommended'?'Recommended players':'Email response deadlines'
  const focusDescription=focusView==='starred'?'Your private shortlist for quick review.':focusView==='recommended'?'Players recommended for teams you can manage.':'Players whose 72-hour response window is currently running.'
  const openFocusPlayer=(player:Player)=>{setFocusView(null);if(focusView==='deadlines')openEmail(player.id);else openPlayer(player.id,focusView==='recommended'?'assessment':'overview')}

  if(!trialsMode)return <>
    <PageHeader title="Club dashboard" subtitle="Your in-season shortcuts, upcoming schedule and latest squad updates." action={<button className="primary" onClick={()=>setPage('schedule')}>Open schedule</button>}/>
    <section className="club-mode-banner"><ShieldCheck/><div><span className="eyebrow">CLUB MODE</span><h2>In-season workspace</h2><p>Trial decisions, email preparation and squad planning are hidden until an administrator turns Trials Mode back on.</p></div></section>
    <section className="dashboard-grid club-mode-dashboard">
      <div className="panel"><div className="panel-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest player updates</h2></div><button className="text-button" onClick={()=>setPage('players')}>Open players <ArrowRight/></button></div><div className="activity-list">{recent.map(player=>{const rating=averageRating(player);return <div key={player.id} className="activity-row"><PlayerAvatar player={player} photo={playerPhotos[player.id]}/><div><b>{player.name}</b><span>{player.decision==='Offer accepted'?'Confirmed squad':player.recommendation||player.decision} · {rating?`${rating.toFixed(1)} rating`:'Player record'}</span></div><time>{player.updatedAt?new Date(player.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—'}</time></div>})}{!recent.length&&<div className="empty-state compact">No recent player updates.</div>}</div></div>
      <div className="quick-actions"><button onClick={()=>setPage('schedule')}><CalendarDays/><div><b>Club schedule</b><span>{nextSession?`${eventTypeLabel(nextSession.eventType)} · ${formatSessionDate(nextSession.date)} · ${nextSession.title}`:'Add the next training session or game'}</span></div><ArrowRight/></button><button onClick={()=>setPage('players')}><Users/><div><b>Player records</b><span>View confirmed members and club information</span></div><ArrowRight/></button><button onClick={()=>setPage('teams')}><ShieldCheck/><div><b>Teams and attendance</b><span>Confirmed squads, training and game statistics</span></div><ArrowRight/></button>{isAdmin&&<button onClick={()=>setPage('finance')}><WalletCards/><div><b>Finance</b><span>{overduePayments?`${overduePayments} payment${overduePayments===1?'':'s'} overdue`:`${formatCurrency(outstanding)} outstanding`}</span></div><ArrowRight/></button>}</div>
    </section>
  </>

  return <>
    <PageHeader title="Club dashboard" subtitle="A live overview of trials, squads, communications and decisions." action={<div className="dashboard-header-actions"><NotificationDropdown players={players} sessions={sessions} assignedTeams={assignedTeams} isAdmin={isAdmin} openPlayer={id=>openPlayer(id,'decision')} openSchedule={openSchedule}/><button className="primary" onClick={()=>setPage('players')}>View players</button></div>}/>
    <section className="dashboard-coach-focus" aria-label="Coach player shortcuts">
      <button className="dashboard-focus-card starred" onClick={()=>setFocusView('starred')}><span className="focus-icon"><Star/></span><span><small>MY SHORTLIST</small><b>Starred players</b><em>{starredPlayers.length} player{starredPlayers.length===1?'':'s'}</em></span><ArrowRight/></button>
      <button className="dashboard-focus-card recommended" onClick={()=>setFocusView('recommended')}><span className="focus-icon"><UserRoundCheck/></span><span><small>COACH REVIEWS</small><b>Recommended players</b><em>{recommendedPlayers.length} relevant to your teams</em></span><ArrowRight/></button>
      <button className={`dashboard-focus-card deadlines ${overdueDeadlines?'urgent':''}`} onClick={()=>setFocusView('deadlines')}><span className="focus-icon"><CalendarClock/></span><span><small>72-HOUR WINDOWS</small><b>Email deadlines</b><em>{overdueDeadlines?`${overdueDeadlines} overdue`:deadlinePlayers.length?`${deadlinePlayers.length} active`:'No active deadlines'}</em></span><ArrowRight/></button>
    </section>
    <StatsCards players={players}/>
    {decisionReminders.length>0&&<section className={`dashboard-decision-reminders ${decisionCounts.overdue?'has-overdue':''}`}><div className="decision-reminder-heading"><AlertTriangle/><div><span className="eyebrow">POST-TRIAL DECISIONS</span><h2>{decisionCounts.overdue?`${decisionCounts.overdue} decision${decisionCounts.overdue===1?' is':'s are'} overdue`:`${decisionReminders.length} player decision${decisionReminders.length===1?' is':'s are'} waiting`}</h2><p>These reminders begin as soon as an attended player’s scheduled session finishes.</p></div><button className="secondary" onClick={()=>setPage('players')}>Review players <ArrowRight/></button></div><div className="decision-reminder-counts"><span className="needed"><b>{decisionCounts.needed}</b>Decision needed</span><span className="pending"><b>{decisionCounts.pending}</b>Decision pending</span><span className="overdue"><b>{decisionCounts.overdue}</b>Overdue</span></div><div className="decision-reminder-list">{decisionReminders.slice(0,5).map(({player,details})=><button key={player.id} onClick={()=>openPlayer(player.id)}><PlayerAvatar player={player} photo={playerPhotos[player.id]}/><span><b>{player.name}</b><small>{player.interestedDivisions} · {decisionReminderDetailText(details)}</small></span><em className={`decision-reminder-badge ${details.state}`}>{details.label}</em></button>)}</div></section>}
    {isAdmin&&<button className="dashboard-finance-card" onClick={()=>setPage('finance')}><WalletCards/><div><span className="eyebrow">ADMINISTRATOR ONLY</span><h2>Season finance</h2><p>{confirmed.length} confirmed players · {formatCurrency(billed)} billed</p></div><strong>{formatCurrency(outstanding)}<small>outstanding</small></strong><ArrowRight/></button>}
    <section className="dashboard-email-progress"><div><span className="eyebrow">COMMUNICATION PROGRESS</span><h2>Email centre</h2><p>Every planned message is checked before coaches copy or open it in their email app.</p></div><button onClick={()=>setPage('emails')}><span className="email-progress-item warning"><AlertTriangle/>{emailCounts.needs}<small>Needs info</small></span><span className="email-progress-item"><Mail/>{emailCounts.ready}<small>Ready</small></span><span className="email-progress-item reviewed"><ClipboardCheck/>{emailCounts.reviewed}<small>Reviewed</small></span><span className="email-progress-item sent"><CheckCircle2/>{emailCounts.sent}<small>Sent</small></span><ArrowRight/></button></section>
    <section className="dashboard-grid">
      <div className="panel"><div className="panel-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest player updates</h2></div><button className="text-button" onClick={()=>setPage('players')}>Open players <ArrowRight/></button></div><div className="activity-list">{recent.map(player=>{const rating=averageRating(player);return <div key={player.id} className="activity-row"><PlayerAvatar player={player} photo={playerPhotos[player.id]}/><div><b>{player.name}</b><span>{player.decision==='Offer accepted'?'Confirmed squad':player.recommendation||player.decision} · {rating?`${rating.toFixed(1)} rating`:'Not assessed'}</span></div><time>{player.updatedAt?new Date(player.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'Sample'}</time></div>})}</div></div>
      <div className="quick-actions"><button onClick={()=>setPage('schedule')}><CalendarDays/><div><b>Club schedule</b><span>{nextSession?`${eventTypeLabel(nextSession.eventType)} · ${formatSessionDate(nextSession.date)} · ${nextSession.title}`:'Add the first club event'}</span></div><ArrowRight/></button><button onClick={()=>setPage('players')}><Users/><div><b>Assess players</b><span>Rate skills and record recommendations</span></div><ArrowRight/></button><button onClick={()=>setPage('emails')}><Mail/><div><b>Email centre</b><span>Review, copy and track communications</span></div><ArrowRight/></button><button onClick={()=>setPage('teams')}><ShieldCheck/><div><b>Team overview</b><span>See squad progress by team</span></div><ArrowRight/></button></div>
    </section>
    {focusView&&<div className="modal-backdrop dashboard-focus-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setFocusView(null)}}><section className="dashboard-focus-modal" role="dialog" aria-modal="true" aria-label={focusTitle}><header><div><span className="eyebrow">COACH DASHBOARD</span><h2>{focusTitle}</h2><p>{focusDescription}</p></div><button onClick={()=>setFocusView(null)} aria-label="Close player view"><X/></button></header><div className="dashboard-focus-list">{focusPlayers.map(player=>{const deadline=deadlineFor(player);return <button key={player.id} onClick={()=>openFocusPlayer(player)}><PlayerAvatar player={player} photo={playerPhotos[player.id]}/><span><b>{player.name}</b><small>{focusView==='deadlines'?`${deadlineStateLabel(deadline.state)} · ${formatDeadline(deadline.effectiveDeadline)}`:`${player.position} · ${player.interestedDivisions} · ${player.recommendation||player.decision}`}</small></span>{focusView==='starred'&&<Star className="focus-star"/>}<ArrowRight/></button>})}{!focusPlayers.length&&<div className="dashboard-focus-empty">{focusView==='starred'?<Star/>:focusView==='recommended'?<UserRoundCheck/>:<CalendarClock/>}<b>No players to show</b><span>{focusView==='starred'?'Star players from the Players page to build your shortlist.':focusView==='recommended'?'No relevant player recommendations are waiting.':'No sent offer or waiting-list emails currently have an active response window.'}</span></div>}</div><footer><span>{focusPlayers.length} player{focusPlayers.length===1?'':'s'}</span><button className="secondary" onClick={()=>setFocusView(null)}>Close</button></footer></section></div>}
  </>
}
