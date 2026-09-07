import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AlertTriangle, Banknote, BarChart3, Calculator, CheckCircle2, Download, Landmark, Mail, ReceiptText, Search, WalletCards, X } from 'lucide-react'
import { FinanceForecastPage } from '../components/FinanceForecast'
import { PlayerPaymentDrawer, StatementReconciliation } from '../components/FinancePaymentTools'
import { PageHeader } from '../components/PageHeader'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { teams } from '../data/constants'
import type { FinanceForecast, FinanceSettings, FinanceView, PaymentPlan, Player, PlayerFinance, PlayerFinanceMap, PlayerPhotos } from '../types'
import { confirmedTeam, customPaymentRuleFor, effectiveAmountOwed, emptyPlayerFinance, feeBandForTeam, formatCurrency, outstandingAmount, paymentDeadlineDetails, paymentPlans, paymentReferenceFor, paymentStatus, recordedAmountPaid, standardFeeForPlayer, standardFeeForTeam } from '../utils/finance'
import { confirmedPositionForTeam, confirmedTeamNames, isConfirmedForTeam } from '../utils/player'

type Props = {
  players: Player[]
  playerPhotos: PlayerPhotos
  finances: PlayerFinanceMap
  financeSettings: FinanceSettings
  saveFinance: (finance: PlayerFinance) => void | Promise<void>
  saveForecast: (forecast: FinanceForecast) => void | Promise<void>
  onOpenPlayer: (id: string) => void
  clubName: string
  view: FinanceView
  setView: (view:FinanceView)=>void
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

export function FinancePage({ players, playerPhotos, finances, financeSettings, saveFinance, saveForecast, onOpenPlayer, clubName, view, setView }: Props) {
  const confirmed = useMemo(() => players.filter(player => Boolean(confirmedTeam(player))), [players])
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState('All teams')
  const [plan, setPlan] = useState<PaymentPlan | 'All plans'>('All plans')
  const [deadlineFilter,setDeadlineFilter]=useState<'All deadlines'|'Overdue'|'Due soon'|'On track'>('All deadlines')
  const [sort,setSort]=useState<'Name A–Z'|'Name Z–A'|'Outstanding high–low'|'Outstanding low–high'|'Deadline soonest'>('Name A–Z')
  const [insightsOpen,setInsightsOpen]=useState(false)
  const [statementOpen,setStatementOpen]=useState(false)
  const [paymentPlayerId,setPaymentPlayerId]=useState('')
  const [selectedPlayerIds,setSelectedPlayerIds]=useState<Set<string>>(()=>new Set())
  const [paymentQueue,setPaymentQueue]=useState<string[]>([])
  const [chargeBusy,setChargeBusy]=useState(false)
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
  const sortedFiltered=filtered.slice().sort((a,b)=>{
    if(sort==='Name Z–A')return b.player.name.localeCompare(a.player.name)
    if(sort==='Outstanding high–low')return b.outstanding-a.outstanding||a.player.name.localeCompare(b.player.name)
    if(sort==='Outstanding low–high')return a.outstanding-b.outstanding||a.player.name.localeCompare(b.player.name)
    if(sort==='Deadline soonest')return (a.deadline.nextDueDate||'9999-12-31').localeCompare(b.deadline.nextDueDate||'9999-12-31')||a.player.name.localeCompare(b.player.name)
    return a.player.name.localeCompare(b.player.name)
  })
  useEffect(()=>setSelectedPlayerIds(new Set()),[query,team,plan,deadlineFilter])
  const billed=entries.reduce((total,entry)=>total+entry.owed,0)
  const collected=entries.reduce((total,entry)=>total+recordedAmountPaid(entry.finance),0)
  const outstanding=entries.reduce((total,entry)=>total+entry.outstanding,0)
  const collectionRate=billed?Math.min(100,Math.round((collected/billed)*100)):0
  const overdueEntries=entries.filter(entry=>entry.deadline.state==='overdue')
  const teamMetrics=teams.map((teamName,index)=>{
    const memberships=entries.filter(entry=>isConfirmedForTeam(entry.player,teamName)).map(entry=>{
      const teamCount=Math.max(1,confirmedTeamNames(entry.player).length)
      const customRule=customPaymentRuleFor(entry.finance,financeSettings)
      const usesStandardByTeam=entry.finance.paymentPlan!=='Non paying'&&entry.finance.usesStandardFee&&(!customRule||customRule.feeMode==='existing')
      const billed=usesStandardByTeam?standardFeeForTeam(teamName,financeSettings):entry.owed/teamCount
      const totalPaid=recordedAmountPaid(entry.finance)
      const paid=entry.owed?totalPaid*(billed/entry.owed):totalPaid/teamCount
      return{billed,paid,outstanding:Math.max(0,billed-paid)}
    })
    return{team:teamName,colour:chartColours[index],players:memberships.length,billed:memberships.reduce((sum,row)=>sum+row.billed,0),paid:memberships.reduce((sum,row)=>sum+row.paid,0),outstanding:memberships.reduce((sum,row)=>sum+row.outstanding,0)}
  })
  const arrangementMetrics=paymentPlans.map((item,index)=>({label:item,colour:chartColours[[3,1,4,6,5][index]],count:entries.filter(entry=>entry.finance.paymentPlan===item).length}))

  const exportCsv = () => {
    const quote = (value: string | number) => `"${String(value).replaceAll('"','""')}"`
    const lines = [['Player','Email','Teams / positions','Fee bands','Fee basis','Payment plan','Amount owed','Amount paid','Outstanding','Payment schedule','Next / missed date','Status','Payment reference','Notes'].map(quote).join(',')]
    entries.forEach(({player,finance,owed,outstanding:balance,deadline}) => {const rule=customPaymentRuleFor(finance,financeSettings);const feeBasis=finance.paymentPlan==='Non paying'?'Non-paying exemption':rule?.feeMode==='fixed'?`Fixed by rule: ${rule.name}`:rule?.feeMode==='percentage'?`${rule.feeValue}% of standard: ${rule.name}`:finance.usesStandardFee?'Standard per team':'Custom total';const arrangement=finance.paymentPlan==='Custom'?`Custom – ${rule?.name||'Rule not selected'}`:finance.paymentPlan;lines.push([player.name,player.email,confirmedTeamNames(player).map(name=>`${name} (${confirmedPositionForTeam(player,name)})`).join(' / '),confirmedTeamNames(player).map(feeBandForTeam).join(' + '),feeBasis,arrangement,owed.toFixed(2),recordedAmountPaid(finance).toFixed(2),balance.toFixed(2),deadline.label,deadline.nextDueDate,paymentStatus(finance,owed),finance.paymentReference,finance.notes].map(quote).join(','))})
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href=url; link.download='f6-confirmed-squad-finance.csv'; link.click(); URL.revokeObjectURL(url)
  }
  const createMissingCharges=async()=>{
    const missing=entries.filter(entry=>entry.owed>0&&!entry.finance.chargeCreatedAt)
    if(!missing.length)return
    setChargeBusy(true)
    try{for(const {player,finance} of missing)await saveFinance({...finance,paymentReference:finance.paymentReference||paymentReferenceFor(player),chargeCreatedAt:Date.now()})}finally{setChargeBusy(false)}
  }
  const paymentPlayer=players.find(player=>player.id===paymentPlayerId)
  const openSinglePlayer=(playerId:string)=>{setPaymentQueue([]);setPaymentPlayerId(playerId)}
  const startSelected=()=>{
    const ordered=sortedFiltered.map(entry=>entry.player.id).filter(id=>selectedPlayerIds.has(id))
    if(!ordered.length)return
    setPaymentPlayerId(ordered[0]);setPaymentQueue(ordered.slice(1))
  }
  const closePaymentPlayer=()=>{
    if(paymentQueue.length){setPaymentPlayerId(paymentQueue[0]);setPaymentQueue(paymentQueue.slice(1));return}
    setPaymentPlayerId('');setSelectedPlayerIds(new Set())
  }
  const stopPaymentQueue=()=>{setPaymentQueue([]);setPaymentPlayerId('');setSelectedPlayerIds(new Set())}
  const allVisibleSelected=Boolean(sortedFiltered.length)&&sortedFiltered.every(entry=>selectedPlayerIds.has(entry.player.id))
  const toggleAllVisible=()=>setSelectedPlayerIds(current=>{
    const next=new Set(current)
    if(allVisibleSelected)sortedFiltered.forEach(entry=>next.delete(entry.player.id));else sortedFiltered.forEach(entry=>next.add(entry.player.id))
    return next
  })
  const toggleSelected=(playerId:string)=>setSelectedPlayerIds(current=>{const next=new Set(current);if(next.has(playerId))next.delete(playerId);else next.add(playerId);return next})
  const paymentTools=<>{statementOpen&&<StatementReconciliation players={confirmed} finances={finances} settings={financeSettings} saveFinance={saveFinance} onClose={()=>setStatementOpen(false)}/>} {paymentPlayer&&<PlayerPaymentDrawer player={paymentPlayer} finance={finances[paymentPlayer.id]||emptyPlayerFinance(paymentPlayer.id)} settings={financeSettings} clubName={clubName} saveFinance={saveFinance} onClose={closePaymentPlayer} batchRemaining={paymentQueue.length} onStopBatch={paymentQueue.length?stopPaymentQueue:undefined}/>}</>

  if(view==='forecast')return <>
    <PageHeader title="Finance: forecast" subtitle="Plan season income, delivery costs and club P&L in one shared model."/>
    <FinanceSubnav view={view} setView={setView}/>
    <FinanceForecastPage forecast={financeSettings.forecast} players={players} saveForecast={saveForecast}/>
  </>

  if(view==='payments')return <>
    <PageHeader title="Finance: payments & emails" subtitle="Review every membership payment and finance communication in one place." action={<div className="finance-header-actions"><button className="secondary" onClick={()=>setStatementOpen(true)}><Landmark/>Import PDF statement</button><button className="secondary" onClick={exportCsv}><Download/>Export finance CSV</button></div>}/>
    <FinanceSubnav view={view} setView={setView}/>
    <FinanceActivityPage entries={entries} playerPhotos={playerPhotos} onManage={openSinglePlayer}/>
    {paymentTools}
  </>

  return <>
    <PageHeader title="Finance" subtitle="Administrator-only season fee tracking and bank-transfer reconciliation." action={<div className="finance-header-actions"><button className="secondary" disabled={chargeBusy} onClick={()=>void createMissingCharges()}><Banknote/>{chargeBusy?'Creating…':'Create missing charges'}</button><button className="secondary" onClick={()=>setStatementOpen(true)}><Landmark/>Import PDF statement</button><button className="secondary" onClick={exportCsv}><Download/>Export CSV</button><button className="primary" onClick={()=>setInsightsOpen(true)}><BarChart3/>Insights</button></div>}/>
    <FinanceSubnav view={view} setView={setView}/>
    <section className="finance-security-note"><WalletCards/><div><b>Private treasurer workspace</b><span>Season fees are held in a separate Firebase area. Coaches cannot read or change these records.</span></div></section>
    <section className="stats finance-stats">
      <div className={overdueEntries.length?'finance-overdue-stat':''}>{overdueEntries.length?<AlertTriangle/>:<CheckCircle2/>}<span>Overdue players</span><b>{overdueEntries.length}</b><small>{confirmed.length} confirmed players</small></div>
      <div><Banknote/><span>Fees billed</span><b>{formatCurrency(billed)}</b><small>NVL/LVA standards plus overrides</small></div>
      <div><WalletCards/><span>Collected</span><b>{formatCurrency(collected)}</b><small>{collectionRate}% of billed fees</small></div>
      <div><Banknote/><span>Outstanding</span><b>{formatCurrency(outstanding)}</b><small>Still to collect</small></div>
    </section>
    <section className="finance-panel">
      <div className="finance-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search player, team or position"/></label><select value={team} onChange={event=>setTeam(event.target.value)}><option>All teams</option>{teams.map(item=><option key={item}>{item}</option>)}</select><select value={plan} onChange={event=>setPlan(event.target.value as PaymentPlan|'All plans')}><option>All plans</option>{paymentPlans.map(item=><option key={item}>{item}</option>)}</select><select value={deadlineFilter} onChange={event=>setDeadlineFilter(event.target.value as typeof deadlineFilter)}><option>All deadlines</option><option>Overdue</option><option>Due soon</option><option>On track</option></select><select aria-label="Sort finance players" value={sort} onChange={event=>setSort(event.target.value as typeof sort)}><option>Name A–Z</option><option>Name Z–A</option><option>Outstanding high–low</option><option>Outstanding low–high</option><option>Deadline soonest</option></select><button className={`finance-select-all ${allVisibleSelected?'selected':''}`} disabled={!sortedFiltered.length} onClick={toggleAllVisible}><span className="finance-check-box">{allVisibleSelected?'✓':''}</span>{allVisibleSelected?'Clear visible':`Select all ${sortedFiltered.length}`}</button><button className="primary finance-start-selected" disabled={!selectedPlayerIds.size} onClick={startSelected}>Start selected{selectedPlayerIds.size?` (${selectedPlayerIds.size})`:''}</button></div>
      {overdueEntries.length>0&&<div className="finance-overdue-banner"><AlertTriangle/><div><b>{overdueEntries.length} player payment{overdueEntries.length===1?' is':'s are'} overdue</b><span>{formatCurrency(overdueEntries.reduce((total,entry)=>total+entry.deadline.shortfall,0))} should have been collected by now.</span></div><button onClick={()=>setDeadlineFilter('Overdue')}>Show overdue players</button></div>}
      <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th className="finance-select-column"><input type="checkbox" aria-label="Select all visible finance players" checked={allVisibleSelected} onChange={toggleAllVisible}/></th><th>Confirmed player</th><th>Arrangement</th><th>Fee basis / owed</th><th>Amount paid</th><th>Outstanding</th><th>Payment deadline</th><th>Status / tools</th></tr></thead><tbody>{sortedFiltered.map(({player,finance})=><FinanceRow key={player.id} player={player} photo={playerPhotos[player.id]} finance={finance} financeSettings={financeSettings} saveFinance={saveFinance} selected={selectedPlayerIds.has(player.id)} toggleSelected={()=>toggleSelected(player.id)} onOpen={()=>onOpenPlayer(player.id)} onManage={()=>openSinglePlayer(player.id)}/>)}</tbody></table>{!sortedFiltered.length&&<div className="finance-empty"><WalletCards/><b>No confirmed players match these filters.</b><span>Adjust the filters or set a player’s decision to Offer accepted.</span></div>}</div>
    </section>
    {insightsOpen&&<><button className="finance-drawer-backdrop" aria-label="Close financial insights" onClick={()=>setInsightsOpen(false)}></button><aside className="finance-insights-drawer" aria-label="Financial insights"><header><div><span className="eyebrow">TREASURER OVERVIEW</span><h2>Financial insights</h2><p>Live totals across every confirmed squad.</p></div><button onClick={()=>setInsightsOpen(false)} aria-label="Close financial insights"><X/></button></header><div className="insight-scroll">
      <section className="insight-card collection-card"><div><span className="eyebrow">COLLECTION PROGRESS</span><h3>{collectionRate}% collected</h3></div><div className="donut-chart" role="img" aria-label={`${collectionRate}% of fees collected`} style={pieStyle([Math.min(collected,billed),outstanding],['#16a34a','#fee2e2'])}><span><b>{formatCurrency(collected)}</b><small>received</small></span></div><div className="chart-legend compact"><span><i style={{background:'#16a34a'}}></i>Collected <b>{formatCurrency(collected)}</b></span><span><i style={{background:'#ef4444'}}></i>Outstanding <b>{formatCurrency(outstanding)}</b></span></div></section>
      <section className="insight-card"><span className="eyebrow">OUTSTANDING BY TEAM</span><h3>Where the balance sits</h3><div className="chart-pair"><div className="pie-chart" role="img" aria-label="Outstanding balance split by team" style={pieStyle(teamMetrics.map(item=>item.outstanding))}></div><div className="chart-legend">{teamMetrics.filter(item=>item.players).map(item=><span key={item.team}><i style={{background:item.colour}}></i>{item.team}<b>{formatCurrency(item.outstanding)}</b></span>)}</div></div></section>
      <section className="insight-card"><span className="eyebrow">PAYMENT ARRANGEMENTS</span><h3>How players are paying</h3><div className="chart-pair"><div className="donut-chart small" role="img" aria-label="Players by payment arrangement" style={pieStyle(arrangementMetrics.map(item=>item.count),arrangementMetrics.map(item=>item.colour))}><span><b>{confirmed.length}</b><small>players</small></span></div><div className="chart-legend">{arrangementMetrics.map(item=><span key={item.label}><i style={{background:item.colour}}></i>{item.label}<b>{item.count}</b></span>)}</div></div></section>
      <section className="insight-card team-balance-card"><span className="eyebrow">TEAM BALANCES</span><h3>Billed, paid and outstanding</h3>{teamMetrics.filter(item=>item.players).map(item=>{const progress=item.billed?Math.min(100,(item.paid/item.billed)*100):0;return <div className="team-balance-row" key={item.team}><div><b>{item.team}</b><span>{item.players} player{item.players===1?'':'s'} · {feeBandForTeam(item.team)}</span><strong>{formatCurrency(item.outstanding)}</strong></div><div className="team-balance-track"><i style={{width:`${progress}%`,background:item.colour}}></i></div><small>{formatCurrency(item.paid)} of {formatCurrency(item.billed)} collected</small></div>})}</section>
    </div></aside></>}
    {paymentTools}
  </>
}

function FinanceSubnav({view,setView}:{view:FinanceView;setView:(view:FinanceView)=>void}){
  return <nav className="finance-subnav" aria-label="Finance sections"><button className={view==='overview'?'active':''} onClick={()=>setView('overview')}><BarChart3/>Overview</button><button className={view==='forecast'?'active':''} onClick={()=>setView('forecast')}><Calculator/>Forecast</button><button className={view==='payments'?'active':''} onClick={()=>setView('payments')}><ReceiptText/>Payments & emails</button></nav>
}

function FinanceActivityPage({entries,playerPhotos,onManage}:{entries:Array<{player:Player;finance:PlayerFinance;owed:number;outstanding:number}>;playerPhotos:PlayerPhotos;onManage:(playerId:string)=>void}){
  const [query,setQuery]=useState('')
  const [team,setTeam]=useState('All teams')
  const search=query.trim().toLowerCase()
  const visible=entries.filter(({player,finance})=>(team==='All teams'||isConfirmedForTeam(player,team))&&`${player.name} ${player.email} ${confirmedTeamNames(player).join(' ')} ${finance.paymentReference} ${Object.values(finance.payments).map(payment=>`${payment.reference} ${payment.description}`).join(' ')} ${Object.values(finance.communications).map(item=>item.subject).join(' ')}`.toLowerCase().includes(search))
  const payments=visible.flatMap(({player,finance})=>[
    ...(finance.amountPaid>0?[{id:`opening-${player.id}`,player,amount:finance.amountPaid,date:'',description:'Opening / manually entered amount',reference:finance.paymentReference,source:'Manual balance',recordedAt:finance.updatedAt||0}]:[]),
    ...Object.values(finance.payments).map(payment=>({id:payment.id,player,amount:payment.amount,date:payment.date,description:payment.description,reference:payment.reference,source:payment.source==='statement-pdf'?(payment.statementName||'PDF statement'):'Manual payment',recordedAt:payment.recordedAt})),
  ]).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.recordedAt-a.recordedAt)
  const emails=visible.flatMap(({player,finance})=>Object.values(finance.communications).map(communication=>({communication,player}))).sort((a,b)=>b.communication.recordedAt-a.communication.recordedAt)
  const playersWithActivity=new Set([...payments.map(row=>row.player.id),...emails.map(row=>row.player.id)]).size
  return <>
    <section className="stats finance-activity-stats"><div><Banknote/><span>Payments recorded</span><b>{payments.length}</b><small>{formatCurrency(payments.reduce((total,row)=>total+row.amount,0))} in this view</small></div><div><Mail/><span>Emails recorded</span><b>{emails.length}</b><small>Instructions, reminders and receipts</small></div><div><ReceiptText/><span>Players with activity</span><b>{playersWithActivity}</b><small>{visible.length} confirmed players in view</small></div></section>
    <section className="finance-activity-page"><div className="finance-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search player, reference, email or team"/></label><select value={team} onChange={event=>setTeam(event.target.value)}><option>All teams</option>{teams.map(item=><option key={item}>{item}</option>)}</select><select defaultValue="" onChange={event=>{if(event.target.value)onManage(event.target.value);event.currentTarget.value='' }}><option value="">Open player tools…</option>{visible.slice().sort((a,b)=>a.player.name.localeCompare(b.player.name)).map(({player})=><option key={player.id} value={player.id}>{player.name}</option>)}</select></div>
      <div className="finance-history-grid">
        <section className="finance-history-panel"><header><div><span className="eyebrow">PAYMENT LEDGER</span><h2>Payments</h2></div><strong>{payments.length}</strong></header>{payments.length?<div className="finance-history-list">{payments.map(row=><article key={`${row.player.id}-${row.id}`}><PlayerAvatar player={row.player} photo={playerPhotos[row.player.id]}/><div><b>{row.player.name}</b><span>{row.description}</span><small>{row.date?new Date(`${row.date}T12:00:00`).toLocaleDateString('en-GB'):'Opening balance'} · {row.reference||'No reference'} · {row.source}</small></div><strong>{formatCurrency(row.amount)}</strong><button onClick={()=>onManage(row.player.id)}>Open</button></article>)}</div>:<FinanceHistoryEmpty icon={<Banknote/>} title="No payments recorded" text="Import a statement or record a payment from a player's finance drawer."/>}</section>
        <section className="finance-history-panel"><header><div><span className="eyebrow">COMMUNICATION HISTORY</span><h2>Finance emails</h2></div><strong>{emails.length}</strong></header>{emails.length?<div className="finance-history-list email-history">{emails.map(({communication,player})=><article key={`${player.id}-${communication.id}`}><PlayerAvatar player={player} photo={playerPhotos[player.id]}/><div><b>{player.name}</b><span>{communication.kind==='payment-instructions'?'Payment instructions':communication.kind==='payment-reminder'?'Payment reminder':'Payment receipt'}</span><small>{new Date(communication.recordedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})} · {communication.subject}</small></div><button onClick={()=>onManage(player.id)}>Open</button></article>)}</div>:<FinanceHistoryEmpty icon={<Mail/>} title="No finance emails recorded" text="Open a player's finance drawer to prepare and record an email."/>}</section>
      </div>
    </section>
  </>
}

function FinanceHistoryEmpty({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="finance-history-empty">{icon}<b>{title}</b><span>{text}</span></div>}

function FinanceRow({ player, photo, finance, financeSettings, saveFinance, selected, toggleSelected, onOpen, onManage }: { player: Player; photo?:string; finance: PlayerFinance; financeSettings:FinanceSettings; saveFinance: Props['saveFinance'];selected:boolean;toggleSelected:()=>void;onOpen:()=>void;onManage:()=>void }) {
  const [draft,setDraft]=useState(finance)
  useEffect(()=>setDraft(finance),[finance])
  const commit=(updates:Partial<PlayerFinance>={})=>saveFinance({...draft,...updates,playerId:player.id})
  const standardFee=standardFeeForPlayer(player,financeSettings)
  const feeBands=confirmedTeamNames(player).map(feeBandForTeam).join(' + ')
  const customRule=customPaymentRuleFor(draft,financeSettings)
  const owed=effectiveAmountOwed(player,draft,financeSettings)
  const status=paymentStatus(draft,owed)
  const deadline=paymentDeadlineDetails(draft,owed,financeSettings)
  const changePaymentPlan=(paymentPlan:PaymentPlan)=>{
    const customPaymentRuleId=paymentPlan==='Custom'?(draft.customPaymentRuleId||financeSettings.customPaymentRules[0]?.id||''):draft.customPaymentRuleId
    const next={...draft,paymentPlan,customPaymentRuleId}
    setDraft(next);saveFinance(next)
  }
  const changeCustomRule=(customPaymentRuleId:string)=>{
    const next={...draft,paymentPlan:'Custom' as const,customPaymentRuleId}
    setDraft(next);saveFinance(next)
  }
  const changeFeeBasis=(usesStandardFee:boolean)=>{
    const amountOwed=!usesStandardFee&&!draft.amountOwed?standardFee:draft.amountOwed
    const next={...draft,usesStandardFee,amountOwed}
    setDraft(next);saveFinance(next)
  }
  return <tr>
    <td className="finance-select-column"><input type="checkbox" aria-label={`Select ${player.name}`} checked={selected} onChange={toggleSelected}/></td>
    <td><button className="finance-player" onClick={onOpen}><PlayerAvatar player={player} photo={photo}/><div><b>{player.name}</b><small>{confirmedTeamNames(player).map(team=>`${team} · ${confirmedPositionForTeam(player,team)}`).join(' / ')}</small></div></button></td>
    <td><div className="finance-plan-selects"><select value={draft.paymentPlan} onChange={event=>changePaymentPlan(event.target.value as PaymentPlan)}>{paymentPlans.map(item=><option key={item}>{item}</option>)}</select>{draft.paymentPlan==='Custom'&&<><select aria-label={`${player.name} custom payment rule`} value={draft.customPaymentRuleId} onChange={event=>changeCustomRule(event.target.value)}><option value="">Select custom rule…</option>{financeSettings.customPaymentRules.map(rule=><option key={rule.id} value={rule.id}>{rule.name}</option>)}</select>{customRule?.description&&<small className="finance-rule-note">{customRule.description}</small>}{!financeSettings.customPaymentRules.length&&<small className="finance-rule-note">Create custom rules in Settings.</small>}</>}</div></td>
    <td>{draft.paymentPlan==='Non paying'?<div className="finance-exempt-fee"><b>{formatCurrency(0)}</b><small>Coach / team-admin exemption</small></div>:customRule&&customRule.feeMode!=='existing'?<div className="finance-rule-fee"><b>{formatCurrency(owed)}</b><small>{customRule.feeMode==='fixed'?'Fixed by rule':`${customRule.feeValue}% of standard fee`}</small></div>:<><select className="fee-basis-select" value={draft.usesStandardFee?'standard':'custom'} onChange={event=>changeFeeBasis(event.target.value==='standard')}><option value="standard">Standard {feeBands}</option><option value="custom">Custom total</option></select><div className={`money-input ${draft.usesStandardFee?'standard':''}`}><span>£</span><input aria-label={`${player.name} amount owed`} disabled={draft.usesStandardFee} min="0" step="0.01" type="number" value={owed||''} onChange={event=>setDraft(current=>({...current,amountOwed:Number(event.target.value)}))} onBlur={()=>commit()}/></div></>}</td>
    <td><div className="money-input"><span>£</span><input aria-label={`${player.name} opening or manual amount paid`} min="0" step="0.01" type="number" value={draft.amountPaid||''} onChange={event=>setDraft(current=>({...current,amountPaid:Number(event.target.value)}))} onBlur={()=>commit()}/></div><small className="finance-recorded-total">Total: {formatCurrency(recordedAmountPaid(draft))}</small><input className="finance-notes" value={draft.notes} onChange={event=>setDraft(current=>({...current,notes:event.target.value}))} onBlur={()=>commit()} placeholder="Payment note…"/></td>
    <td><strong>{formatCurrency(outstandingAmount(draft,owed))}</strong></td>
    <td><span className={`payment-deadline-status ${deadline.state}`}>{deadline.state==='overdue'&&<AlertTriangle/>}{deadline.label}</span></td>
    <td><span className={`finance-status ${status.toLowerCase().replaceAll(' ','-')}`}>{status}</span><button className="finance-manage-button" onClick={onManage}><Landmark/>Payments & emails</button></td>
  </tr>
}
