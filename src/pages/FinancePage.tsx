import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AlertTriangle, Banknote, BarChart3, CheckCircle2, Download, Search, WalletCards, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { teams } from '../data/constants'
import type { FinanceSettings, PaymentPlan, Player, PlayerFinance, PlayerFinanceMap, PlayerPhotos } from '../types'
import { confirmedTeam, effectiveAmountOwed, emptyPlayerFinance, feeBandForTeam, formatCurrency, outstandingAmount, paymentDeadlineDetails, paymentPlans, paymentStatus, standardFeeForPlayer, standardFeeForTeam } from '../utils/finance'
import { confirmedPositionForTeam, confirmedTeamNames, isConfirmedForTeam } from '../utils/player'

type Props = {
  players: Player[]
  playerPhotos: PlayerPhotos
  finances: PlayerFinanceMap
  financeSettings: FinanceSettings
  saveFinance: (finance: PlayerFinance) => void | Promise<void>
  onOpenPlayer: (id: string) => void
}

const chartColours=['#ef6c19','#ffcf18','#7c3aed','#16a34a','#2563eb','#db2777','#0f766e','#dc2626']

function pieStyle(values:number[],colours=chartColours):CSSProperties{
  const total=values.reduce((sum,value)=>sum+value,0)
  if(!total)return{background:'#e5e7eb'}
  let cursor=0
  const stops=values.map((value,index)=>{
    const start=cursor
    cursor+=(value/total)*100
    return `${colours[index%colours.length]} ${start}% ${cursor}%`
  })
  return{background:`conic-gradient(${stops.join(',')})`}
}

export function FinancePage({ players, playerPhotos, finances, financeSettings, saveFinance, onOpenPlayer }: Props) {
  const confirmed = useMemo(() => players.filter(player => Boolean(confirmedTeam(player))), [players])
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState('All teams')
  const [plan, setPlan] = useState<PaymentPlan | 'All plans'>('All plans')
  const [deadlineFilter,setDeadlineFilter]=useState<'All deadlines'|'Overdue'|'Due soon'|'On track'>('All deadlines')
  const [insightsOpen,setInsightsOpen]=useState(false)
  const search = query.trim().toLowerCase()
  const entries=confirmed.map(player=>{
    const finance=finances[player.id]||emptyPlayerFinance(player.id)
    const owed=effectiveAmountOwed(player,finance,financeSettings)
    return{player,finance,owed,outstanding:outstandingAmount(finance,owed),deadline:paymentDeadlineDetails(finance,owed,financeSettings)}
  })
  const filtered = entries.filter(({player,finance,deadline}) => {
    const matchesDeadline=deadlineFilter==='All deadlines'||(deadlineFilter==='Overdue'&&deadline.state==='overdue')||(deadlineFilter==='Due soon'&&deadline.state==='due-soon')||(deadlineFilter==='On track'&&!['overdue','none'].includes(deadline.state))
    return (team === 'All teams' || isConfirmedForTeam(player,team))
      && (plan === 'All plans' || finance.paymentPlan === plan)
      && matchesDeadline
      && `${player.name} ${player.email} ${confirmedTeamNames(player).map(name=>`${name} ${confirmedPositionForTeam(player,name)}`).join(' ')}`.toLowerCase().includes(search)
  })
  const billed=entries.reduce((total,entry)=>total+entry.owed,0)
  const collected=entries.reduce((total,entry)=>total+entry.finance.amountPaid,0)
  const outstanding=entries.reduce((total,entry)=>total+entry.outstanding,0)
  const collectionRate=billed?Math.min(100,Math.round((collected/billed)*100)):0
  const overdueEntries=entries.filter(entry=>entry.deadline.state==='overdue')
  const teamMetrics=teams.map((teamName,index)=>{
    const memberships=entries.filter(entry=>isConfirmedForTeam(entry.player,teamName)).map(entry=>{
      const teamCount=Math.max(1,confirmedTeamNames(entry.player).length)
      const billed=entry.finance.usesStandardFee?standardFeeForTeam(teamName,financeSettings):entry.owed/teamCount
      const paid=entry.owed?entry.finance.amountPaid*(billed/entry.owed):entry.finance.amountPaid/teamCount
      return{billed,paid,outstanding:Math.max(0,billed-paid)}
    })
    return{team:teamName,colour:chartColours[index],players:memberships.length,billed:memberships.reduce((sum,row)=>sum+row.billed,0),paid:memberships.reduce((sum,row)=>sum+row.paid,0),outstanding:memberships.reduce((sum,row)=>sum+row.outstanding,0)}
  })
  const arrangementMetrics=[...paymentPlans,'Not selected' as const].map((item,index)=>({label:item,colour:chartColours[[3,1,4,7][index]],count:entries.filter(entry=>item==='Not selected'?!entry.finance.paymentPlan:entry.finance.paymentPlan===item).length}))

  const exportCsv = () => {
    const quote = (value: string | number) => `"${String(value).replaceAll('"','""')}"`
    const lines = [['Player','Email','Teams / positions','Fee bands','Fee basis','Payment plan','Amount owed','Amount paid','Outstanding','Payment schedule','Next / missed date','Status','Notes'].map(quote).join(',')]
    entries.forEach(({player,finance,owed,outstanding:balance,deadline}) => lines.push([player.name,player.email,confirmedTeamNames(player).map(name=>`${name} (${confirmedPositionForTeam(player,name)})`).join(' / '),confirmedTeamNames(player).map(feeBandForTeam).join(' + '),finance.usesStandardFee?'Standard per team':'Custom total',finance.paymentPlan,owed.toFixed(2),finance.amountPaid.toFixed(2),balance.toFixed(2),deadline.label,deadline.nextDueDate,paymentStatus(finance,owed),finance.notes].map(quote).join(',')))
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href=url; link.download='f6-confirmed-squad-finance.csv'; link.click(); URL.revokeObjectURL(url)
  }

  return <>
    <PageHeader title="Finance" subtitle="Administrator-only season fee tracking for confirmed squads." action={<div className="finance-header-actions"><button className="secondary" onClick={exportCsv}><Download/>Export CSV</button><button className="primary" onClick={()=>setInsightsOpen(true)}><BarChart3/>Financial insights</button></div>}/>
    <section className="finance-security-note"><WalletCards/><div><b>Private treasurer workspace</b><span>Season fees are held in a separate Firebase area. Coaches cannot read or change these records.</span></div></section>
    <section className="stats finance-stats">
      <div className={overdueEntries.length?'finance-overdue-stat':''}>{overdueEntries.length?<AlertTriangle/>:<CheckCircle2/>}<span>Overdue players</span><b>{overdueEntries.length}</b><small>{confirmed.length} confirmed players</small></div>
      <div><Banknote/><span>Fees billed</span><b>{formatCurrency(billed)}</b><small>NVL/LVA standards plus overrides</small></div>
      <div><WalletCards/><span>Collected</span><b>{formatCurrency(collected)}</b><small>{collectionRate}% of billed fees</small></div>
      <div><Banknote/><span>Outstanding</span><b>{formatCurrency(outstanding)}</b><small>Still to collect</small></div>
    </section>
    <section className="finance-panel">
      <div className="finance-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search player, team or position"/></label><select value={team} onChange={event=>setTeam(event.target.value)}><option>All teams</option>{teams.map(item=><option key={item}>{item}</option>)}</select><select value={plan} onChange={event=>setPlan(event.target.value as PaymentPlan|'All plans')}><option>All plans</option><option value="">Not selected</option>{paymentPlans.map(item=><option key={item}>{item}</option>)}</select><select value={deadlineFilter} onChange={event=>setDeadlineFilter(event.target.value as typeof deadlineFilter)}><option>All deadlines</option><option>Overdue</option><option>Due soon</option><option>On track</option></select></div>
      {overdueEntries.length>0&&<div className="finance-overdue-banner"><AlertTriangle/><div><b>{overdueEntries.length} player payment{overdueEntries.length===1?' is':'s are'} overdue</b><span>{formatCurrency(overdueEntries.reduce((total,entry)=>total+entry.deadline.shortfall,0))} should have been collected by now.</span></div><button onClick={()=>setDeadlineFilter('Overdue')}>Show overdue players</button></div>}
      <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Confirmed player</th><th>Arrangement</th><th>Fee basis / owed</th><th>Amount paid</th><th>Outstanding</th><th>Payment deadline</th><th>Status</th></tr></thead><tbody>{filtered.map(({player,finance})=><FinanceRow key={player.id} player={player} photo={playerPhotos[player.id]} finance={finance} financeSettings={financeSettings} saveFinance={saveFinance} onOpen={()=>onOpenPlayer(player.id)}/>)}</tbody></table>{!filtered.length&&<div className="finance-empty"><WalletCards/><b>No confirmed players match these filters.</b><span>Adjust the filters or set a player’s decision to Offer accepted.</span></div>}</div>
    </section>
    {insightsOpen&&<><button className="finance-drawer-backdrop" aria-label="Close financial insights" onClick={()=>setInsightsOpen(false)}></button><aside className="finance-insights-drawer" aria-label="Financial insights"><header><div><span className="eyebrow">TREASURER OVERVIEW</span><h2>Financial insights</h2><p>Live totals across every confirmed squad.</p></div><button onClick={()=>setInsightsOpen(false)} aria-label="Close financial insights"><X/></button></header><div className="insight-scroll">
      <section className="insight-card collection-card"><div><span className="eyebrow">COLLECTION PROGRESS</span><h3>{collectionRate}% collected</h3></div><div className="donut-chart" role="img" aria-label={`${collectionRate}% of fees collected`} style={pieStyle([Math.min(collected,billed),outstanding],['#16a34a','#fee2e2'])}><span><b>{formatCurrency(collected)}</b><small>received</small></span></div><div className="chart-legend compact"><span><i style={{background:'#16a34a'}}></i>Collected <b>{formatCurrency(collected)}</b></span><span><i style={{background:'#ef4444'}}></i>Outstanding <b>{formatCurrency(outstanding)}</b></span></div></section>
      <section className="insight-card"><span className="eyebrow">OUTSTANDING BY TEAM</span><h3>Where the balance sits</h3><div className="chart-pair"><div className="pie-chart" role="img" aria-label="Outstanding balance split by team" style={pieStyle(teamMetrics.map(item=>item.outstanding))}></div><div className="chart-legend">{teamMetrics.filter(item=>item.players).map(item=><span key={item.team}><i style={{background:item.colour}}></i>{item.team}<b>{formatCurrency(item.outstanding)}</b></span>)}</div></div></section>
      <section className="insight-card"><span className="eyebrow">PAYMENT ARRANGEMENTS</span><h3>How players are paying</h3><div className="chart-pair"><div className="donut-chart small" role="img" aria-label="Players by payment arrangement" style={pieStyle(arrangementMetrics.map(item=>item.count),arrangementMetrics.map(item=>item.colour))}><span><b>{confirmed.length}</b><small>players</small></span></div><div className="chart-legend">{arrangementMetrics.map(item=><span key={item.label}><i style={{background:item.colour}}></i>{item.label}<b>{item.count}</b></span>)}</div></div></section>
      <section className="insight-card team-balance-card"><span className="eyebrow">TEAM BALANCES</span><h3>Billed, paid and outstanding</h3>{teamMetrics.filter(item=>item.players).map(item=>{const progress=item.billed?Math.min(100,(item.paid/item.billed)*100):0;return <div className="team-balance-row" key={item.team}><div><b>{item.team}</b><span>{item.players} player{item.players===1?'':'s'} · {feeBandForTeam(item.team)}</span><strong>{formatCurrency(item.outstanding)}</strong></div><div className="team-balance-track"><i style={{width:`${progress}%`,background:item.colour}}></i></div><small>{formatCurrency(item.paid)} of {formatCurrency(item.billed)} collected</small></div>})}</section>
    </div></aside></>}
  </>
}

function FinanceRow({ player, photo, finance, financeSettings, saveFinance, onOpen }: { player: Player; photo?:string; finance: PlayerFinance; financeSettings:FinanceSettings; saveFinance: Props['saveFinance']; onOpen:()=>void }) {
  const [draft,setDraft]=useState(finance)
  useEffect(()=>setDraft(finance),[finance])
  const commit=(updates:Partial<PlayerFinance>={})=>saveFinance({...draft,...updates,playerId:player.id})
  const standardFee=standardFeeForPlayer(player,financeSettings)
  const feeBands=confirmedTeamNames(player).map(feeBandForTeam).join(' + ')
  const owed=draft.usesStandardFee?standardFee:draft.amountOwed
  const status=paymentStatus(draft,owed)
  const deadline=paymentDeadlineDetails(draft,owed,financeSettings)
  const changeFeeBasis=(usesStandardFee:boolean)=>{
    const amountOwed=!usesStandardFee&&!draft.amountOwed?standardFee:draft.amountOwed
    const next={...draft,usesStandardFee,amountOwed}
    setDraft(next);saveFinance(next)
  }
  return <tr>
    <td><button className="finance-player" onClick={onOpen}><PlayerAvatar player={player} photo={photo}/><div><b>{player.name}</b><small>{confirmedTeamNames(player).map(team=>`${team} · ${confirmedPositionForTeam(player,team)}`).join(' / ')}</small></div></button></td>
    <td><select value={draft.paymentPlan} onChange={event=>{const paymentPlan=event.target.value as PaymentPlan;setDraft(current=>({...current,paymentPlan}));commit({paymentPlan})}}><option value="">Select plan</option>{paymentPlans.map(item=><option key={item}>{item}</option>)}</select></td>
    <td><select className="fee-basis-select" value={draft.usesStandardFee?'standard':'custom'} onChange={event=>changeFeeBasis(event.target.value==='standard')}><option value="standard">Standard {feeBands}</option><option value="custom">Custom total</option></select><div className={`money-input ${draft.usesStandardFee?'standard':''}`}><span>£</span><input aria-label={`${player.name} amount owed`} disabled={draft.usesStandardFee} min="0" step="0.01" type="number" value={owed||''} onChange={event=>setDraft(current=>({...current,amountOwed:Number(event.target.value)}))} onBlur={()=>commit()}/></div></td>
    <td><div className="money-input"><span>£</span><input aria-label={`${player.name} amount paid`} min="0" step="0.01" type="number" value={draft.amountPaid||''} onChange={event=>setDraft(current=>({...current,amountPaid:Number(event.target.value)}))} onBlur={()=>commit()}/></div><input className="finance-notes" value={draft.notes} onChange={event=>setDraft(current=>({...current,notes:event.target.value}))} onBlur={()=>commit()} placeholder="Payment note…"/></td>
    <td><strong>{formatCurrency(outstandingAmount(draft,owed))}</strong></td>
    <td><span className={`payment-deadline-status ${deadline.state}`}>{deadline.state==='overdue'&&<AlertTriangle/>}{deadline.label}</span></td>
    <td><span className={`finance-status ${status.toLowerCase().replaceAll(' ','-')}`}>{status}</span></td>
  </tr>
}
