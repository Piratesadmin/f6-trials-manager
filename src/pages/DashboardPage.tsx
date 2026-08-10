import { AlertTriangle, ArrowRight, CalendarClock, CalendarDays, CheckCircle2, ClipboardCheck, Mail, ShieldCheck, Users, WalletCards } from 'lucide-react'
import type { EmailSettings, FinanceSettings, PageKey, Player, PlayerFinanceMap, TeamPlans, TrialSession } from '../types'
import { PageHeader } from '../components/PageHeader'
import { NotificationDropdown } from '../components/NotificationDropdown'
import { StatsCards } from '../components/StatsCards'
import { averageRating } from '../utils/player'
import { emailQueueStatus, emailTypeFor } from '../utils/email'
import { eventTypeLabel, formatSessionDate } from '../utils/schedule'
import { effectiveAmountOwed, emptyPlayerFinance, formatCurrency, outstandingAmount } from '../utils/finance'
import { decisionReminderDetailText, decisionReminderDetails, responseDeadlineDetails } from '../utils/deadline'

type Props={
  players:Player[]
  sessions:TrialSession[]
  settings:EmailSettings
  teamPlans:TeamPlans
  setPage:(page:PageKey)=>void
  openPlayer:(playerId:string)=>void
  openSchedule:(sessionId:string)=>void
  assignedTeams:string[]
  isAdmin:boolean
  finances:PlayerFinanceMap
  financeSettings:FinanceSettings
}

export function DashboardPage({players,sessions,settings,teamPlans,setPage,openPlayer,openSchedule,assignedTeams,isAdmin,finances,financeSettings}:Props){
  const recent=[...players].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,5)
  const emailPlayers=players.filter(player=>emailTypeFor(player))
  const deadlineFor=(player:Player)=>responseDeadlineDetails(player,sessions,settings.defaultResponseDeadline)
  const emailCounts={
    needs:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))==='needs-info').length,
    ready:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))==='ready').length,
    reviewed:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))==='reviewed').length,
    sent:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))==='sent').length,
  }
  const pendingDeadlinePlayers=emailPlayers.filter(player=>emailTypeFor(player)!=='rejection'&&emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))!=='sent')
  const overdueDeadlines=pendingDeadlinePlayers.filter(player=>deadlineFor(player).state==='overdue').length
  const approachingDeadlines=pendingDeadlinePlayers.filter(player=>['due-soon','approaching'].includes(deadlineFor(player).state)).length
  const decisionReminders=players.map(player=>({player,details:decisionReminderDetails(player,sessions)})).filter(item=>item.details.state!=='none').sort((a,b)=>b.details.hoursSinceSession-a.details.hoursSinceSession)
  const decisionCounts={needed:decisionReminders.filter(item=>item.details.state==='needed').length,pending:decisionReminders.filter(item=>item.details.state==='pending').length,overdue:decisionReminders.filter(item=>item.details.state==='overdue').length}
  const today=new Date().toISOString().slice(0,10)
  const nextSession=[...sessions].filter(session=>session.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime))[0]
  const confirmed=players.filter(player=>player.decision==='Offer accepted')
  const financeRecords=confirmed.map(player=>({player,finance:finances[player.id]||emptyPlayerFinance(player.id)}))
  const billed=financeRecords.reduce((total,{player,finance})=>total+effectiveAmountOwed(player,finance,financeSettings),0)
  const outstanding=financeRecords.reduce((total,{player,finance})=>total+outstandingAmount(finance,effectiveAmountOwed(player,finance,financeSettings)),0)

  return <>
    <PageHeader title="Club dashboard" subtitle="A live overview of trials, squads, communications and decisions." action={<div className="dashboard-header-actions"><NotificationDropdown players={players} sessions={sessions} assignedTeams={assignedTeams} isAdmin={isAdmin} openPlayer={openPlayer} openSchedule={openSchedule}/><button className="primary" onClick={()=>setPage('players')}>View players</button></div>}/>
    <StatsCards players={players}/>
    {decisionReminders.length>0&&<section className={`dashboard-decision-reminders ${decisionCounts.overdue?'has-overdue':''}`}><div className="decision-reminder-heading"><AlertTriangle/><div><span className="eyebrow">POST-TRIAL DECISIONS</span><h2>{decisionCounts.overdue?`${decisionCounts.overdue} decision${decisionCounts.overdue===1?' is':'s are'} overdue`:`${decisionReminders.length} player decision${decisionReminders.length===1?' is':'s are'} waiting`}</h2><p>These reminders begin as soon as an attended player’s scheduled session finishes.</p></div><button className="secondary" onClick={()=>setPage('players')}>Review players <ArrowRight/></button></div><div className="decision-reminder-counts"><span className="needed"><b>{decisionCounts.needed}</b>Decision needed</span><span className="pending"><b>{decisionCounts.pending}</b>Decision pending</span><span className="overdue"><b>{decisionCounts.overdue}</b>Overdue</span></div><div className="decision-reminder-list">{decisionReminders.slice(0,5).map(({player,details})=><button key={player.id} onClick={()=>openPlayer(player.id)}><span className="avatar">{player.name.split(' ').map(part=>part[0]).join('').slice(0,2)}</span><span><b>{player.name}</b><small>{player.appliedTeam} · {decisionReminderDetailText(details)}</small></span><em className={`decision-reminder-badge ${details.state}`}>{details.label}</em></button>)}</div></section>}
    {isAdmin&&<button className="dashboard-finance-card" onClick={()=>setPage('finance')}><WalletCards/><div><span className="eyebrow">ADMINISTRATOR ONLY</span><h2>Season finance</h2><p>{confirmed.length} confirmed players · {formatCurrency(billed)} billed</p></div><strong>{formatCurrency(outstanding)}<small>outstanding</small></strong><ArrowRight/></button>}
    {(overdueDeadlines>0||approachingDeadlines>0)&&<button className={`dashboard-deadline-alert ${overdueDeadlines?'overdue':''}`} onClick={()=>setPage('emails')}><CalendarClock/><div><span className="eyebrow">RESPONSE DEADLINES</span><h2>{overdueDeadlines?`${overdueDeadlines} overdue deadline${overdueDeadlines===1?'':'s'}`:`${approachingDeadlines} deadline${approachingDeadlines===1?' is':'s are'} approaching`}</h2><p>{overdueDeadlines&&approachingDeadlines?`${approachingDeadlines} more due within 48 hours. `:''}Open the Email Centre to review these players.</p></div><ArrowRight/></button>}
    <section className="dashboard-email-progress"><div><span className="eyebrow">COMMUNICATION PROGRESS</span><h2>Email centre</h2><p>Every planned message is checked before coaches copy or open it in their email app.</p></div><button onClick={()=>setPage('emails')}><span className="email-progress-item warning"><AlertTriangle/>{emailCounts.needs}<small>Needs info</small></span><span className="email-progress-item"><Mail/>{emailCounts.ready}<small>Ready</small></span><span className="email-progress-item reviewed"><ClipboardCheck/>{emailCounts.reviewed}<small>Reviewed</small></span><span className="email-progress-item sent"><CheckCircle2/>{emailCounts.sent}<small>Sent</small></span><ArrowRight/></button></section>
    <section className="dashboard-grid">
      <div className="panel"><div className="panel-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest player updates</h2></div><button className="text-button" onClick={()=>setPage('players')}>Open players <ArrowRight/></button></div><div className="activity-list">{recent.map(player=>{const rating=averageRating(player);return <div key={player.id} className="activity-row"><div className="avatar">{player.name.split(' ').map(part=>part[0]).join('')}</div><div><b>{player.name}</b><span>{player.decision==='Offer accepted'?'Confirmed squad':player.recommendation||player.decision} · {rating?`${rating.toFixed(1)} rating`:'Not assessed'}</span></div><time>{player.updatedAt?new Date(player.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'Sample'}</time></div>})}</div></div>
      <div className="quick-actions"><button onClick={()=>setPage('schedule')}><CalendarDays/><div><b>Club schedule</b><span>{nextSession?`${eventTypeLabel(nextSession.eventType)} · ${formatSessionDate(nextSession.date)} · ${nextSession.title}`:'Add the first club event'}</span></div><ArrowRight/></button><button onClick={()=>setPage('players')}><Users/><div><b>Assess players</b><span>Rate skills and record recommendations</span></div><ArrowRight/></button><button onClick={()=>setPage('emails')}><Mail/><div><b>Email centre</b><span>Review, copy and track communications</span></div><ArrowRight/></button><button onClick={()=>setPage('teams')}><ShieldCheck/><div><b>Team overview</b><span>See squad progress by team</span></div><ArrowRight/></button></div>
    </section>
  </>
}
