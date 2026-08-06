import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Mail, ShieldCheck, Users, WalletCards } from 'lucide-react'
import type { EmailSettings, FinanceSettings, PageKey, Player, PlayerFinanceMap, TeamPlans, TrialSession } from '../types'
import { PageHeader } from '../components/PageHeader'
import { StatsCards } from '../components/StatsCards'
import { averageRating } from '../utils/player'
import { emailQueueStatus, emailTypeFor } from '../utils/email'
import { formatSessionDate } from '../utils/schedule'
import { effectiveAmountOwed, emptyPlayerFinance, formatCurrency, outstandingAmount } from '../utils/finance'

type Props={
  players:Player[]
  sessions:TrialSession[]
  settings:EmailSettings
  teamPlans:TeamPlans
  setPage:(page:PageKey)=>void
  isAdmin:boolean
  finances:PlayerFinanceMap
  financeSettings:FinanceSettings
}

export function DashboardPage({players,sessions,settings,teamPlans,setPage,isAdmin,finances,financeSettings}:Props){
  const recent=[...players].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,5)
  const emailPlayers=players.filter(player=>emailTypeFor(player))
  const emailCounts={
    needs:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans)==='needs-info').length,
    ready:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans)==='ready').length,
    reviewed:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans)==='reviewed').length,
    sent:emailPlayers.filter(player=>emailQueueStatus(player,settings,players,teamPlans)==='sent').length,
  }
  const today=new Date().toISOString().slice(0,10)
  const nextSession=[...sessions].filter(session=>session.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime))[0]
  const confirmed=players.filter(player=>player.decision==='Offer accepted')
  const financeRecords=confirmed.map(player=>({player,finance:finances[player.id]||emptyPlayerFinance(player.id)}))
  const billed=financeRecords.reduce((total,{player,finance})=>total+effectiveAmountOwed(player,finance,financeSettings),0)
  const outstanding=financeRecords.reduce((total,{player,finance})=>total+outstandingAmount(finance,effectiveAmountOwed(player,finance,financeSettings)),0)

  return <>
    <PageHeader title="Club dashboard" subtitle="A live overview of trials, squads, communications and decisions." action={<button className="primary" onClick={()=>setPage('players')}>View players</button>}/>
    <StatsCards players={players}/>
    {isAdmin&&<button className="dashboard-finance-card" onClick={()=>setPage('finance')}><WalletCards/><div><span className="eyebrow">ADMINISTRATOR ONLY</span><h2>Season finance</h2><p>{confirmed.length} confirmed players · {formatCurrency(billed)} billed</p></div><strong>{formatCurrency(outstanding)}<small>outstanding</small></strong><ArrowRight/></button>}
    <section className="dashboard-email-progress"><div><span className="eyebrow">COMMUNICATION PROGRESS</span><h2>Email centre</h2><p>Every planned message is checked before coaches copy or open it in their email app.</p></div><button onClick={()=>setPage('emails')}><span className="email-progress-item warning"><AlertTriangle/>{emailCounts.needs}<small>Needs info</small></span><span className="email-progress-item"><Mail/>{emailCounts.ready}<small>Ready</small></span><span className="email-progress-item reviewed"><ClipboardCheck/>{emailCounts.reviewed}<small>Reviewed</small></span><span className="email-progress-item sent"><CheckCircle2/>{emailCounts.sent}<small>Sent</small></span><ArrowRight/></button></section>
    <section className="dashboard-grid">
      <div className="panel"><div className="panel-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest player updates</h2></div><button className="text-button" onClick={()=>setPage('players')}>Open players <ArrowRight/></button></div><div className="activity-list">{recent.map(player=>{const rating=averageRating(player);return <div key={player.id} className="activity-row"><div className="avatar">{player.name.split(' ').map(part=>part[0]).join('')}</div><div><b>{player.name}</b><span>{player.decision==='Offer accepted'?'Confirmed squad':player.recommendation||player.decision} · {rating?`${rating.toFixed(1)} rating`:'Not assessed'}</span></div><time>{player.updatedAt?new Date(player.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'Sample'}</time></div>})}</div></div>
      <div className="quick-actions"><button onClick={()=>setPage('schedule')}><CalendarDays/><div><b>Trial schedule</b><span>{nextSession?`${formatSessionDate(nextSession.date)} · ${nextSession.title}`:'Add the first trial session'}</span></div><ArrowRight/></button><button onClick={()=>setPage('players')}><Users/><div><b>Assess players</b><span>Rate skills and record recommendations</span></div><ArrowRight/></button><button onClick={()=>setPage('emails')}><Mail/><div><b>Email centre</b><span>Review, copy and track communications</span></div><ArrowRight/></button><button onClick={()=>setPage('teams')}><ShieldCheck/><div><b>Team overview</b><span>See squad progress by team</span></div><ArrowRight/></button></div>
    </section>
  </>
}
