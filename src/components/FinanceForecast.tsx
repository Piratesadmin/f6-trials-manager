import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Calculator, Check, Plus, RefreshCw, Save, Trash2, TrendingUp } from 'lucide-react'
import { teams } from '../data/constants'
import type { FinanceForecast, FinanceForecastTeam, Player } from '../types'
import { financeForecastSummary } from '../utils/financeForecast'
import { formatCurrency } from '../utils/finance'
import { confirmedTeamNames } from '../utils/player'

type Props = {
  forecast: FinanceForecast
  players: Player[]
  saveForecast: (forecast: FinanceForecast) => void | Promise<void>
}

const inputFields: Array<{key:keyof FinanceForecastTeam; label:string; short:string; step?:number; money?:boolean}> = [
  {key:'homeGames',label:'Home games',short:'Home'},
  {key:'awayGames',label:'Away games',short:'Away'},
  {key:'gameHours',label:'Hours per game',short:'Game hrs',step:.25},
  {key:'gameVenueHourlyRate',label:'Game venue cost per hour',short:'Game venue',step:.01,money:true},
  {key:'officialsPerHomeGame',label:'Officials cost per home game',short:'Officials',step:.01,money:true},
  {key:'trainingSessions',label:'Training sessions',short:'Training'},
  {key:'trainingHours',label:'Hours per training session',short:'Training hrs',step:.25},
  {key:'trainingVenueHourlyRate',label:'Training venue cost per hour',short:'Training venue',step:.01,money:true},
  {key:'coachHourlyRate',label:'Coach cost per hour',short:'Coach',step:.01,money:true},
]

function moneyClass(value:number){return value<0?'negative':value>0?'positive':''}

export function FinanceForecastPage({forecast,players,saveForecast}:Props){
  const [draft,setDraft]=useState(forecast)
  const [saving,setSaving]=useState(false)
  const [saved,setSaved]=useState(false)
  useEffect(()=>setDraft(forecast),[forecast])
  const summary=useMemo(()=>financeForecastSummary(draft),[draft])
  const dirty=JSON.stringify(draft)!==JSON.stringify(forecast)
  const canSave=dirty||!forecast.updatedAt

  const updateTeam=(team:string,key:keyof FinanceForecastTeam,value:number)=>setDraft(current=>({
    ...current,
    teams:{...current.teams,[team]:{...current.teams[team],[key]:Math.max(0,Number.isFinite(value)?value:0)}},
  }))
  const save=async()=>{
    setSaving(true)
    try{await saveForecast(draft);setSaved(true);window.setTimeout(()=>setSaved(false),1800)}finally{setSaving(false)}
  }
  const useCurrentSquads=()=>setDraft(current=>({
    ...current,
    teams:Object.fromEntries(teams.map(team=>[team,{...current.teams[team],fullPlayers:players.filter(player=>confirmedTeamNames(player).includes(team)).length,halfPlayers:0}]))
  }))
  const updateExtra=(id:string,team:string,value:number)=>setDraft(current=>({...current,extraCosts:current.extraCosts.map(line=>line.id===id?{...line,teamAmounts:{...line.teamAmounts,[team]:Math.max(0,value||0)}}:line)}))
  const updateExtraLabel=(id:string,label:string)=>setDraft(current=>({...current,extraCosts:current.extraCosts.map(line=>line.id===id?{...line,label}:line)}))
  const addExtra=()=>setDraft(current=>({...current,extraCosts:[...current.extraCosts,{id:`cost-${Date.now()}`,label:'New cost',teamAmounts:Object.fromEntries(teams.map(team=>[team,0]))}]}))
  const removeExtra=(id:string)=>setDraft(current=>({...current,extraCosts:current.extraCosts.filter(line=>line.id!==id)}))
  const updateClubCost=(id:string,field:'label'|'amount',value:string|number)=>setDraft(current=>({...current,clubCosts:current.clubCosts.map(line=>line.id===id?{...line,[field]:field==='amount'?Math.max(0,Number(value)||0):String(value)}:line)}))
  const addClubCost=()=>setDraft(current=>({...current,clubCosts:[...current.clubCosts,{id:`club-${Date.now()}`,label:'New club-wide cost',amount:0}]}))
  const removeClubCost=(id:string)=>setDraft(current=>({...current,clubCosts:current.clubCosts.filter(line=>line.id!==id)}))

  return <>
    <section className="finance-forecast-intro">
      <div><span className="eyebrow">SEASON MODEL</span><h2>Income and cost forecast</h2><p>Enter every team assumption here. Totals recalculate immediately and the saved model is included in Firebase, system backups and the season archive.</p></div>
      <div className="forecast-controls"><label><span>Forecast name</span><input value={draft.seasonName} maxLength={60} onChange={event=>setDraft({...draft,seasonName:event.target.value})}/></label><button className="secondary" onClick={useCurrentSquads}><RefreshCw/>Use current squad counts</button><button className="primary" disabled={!canSave||saving} onClick={()=>void save()}>{saved?<Check/>:<Save/>}{saving?'Saving…':saved?'Saved':'Save forecast'}</button></div>
    </section>
    <section className="forecast-source-note"><Calculator/><label><span>Source / assumptions note</span><input value={draft.sourceNote} maxLength={300} onChange={event=>setDraft({...draft,sourceNote:event.target.value})}/></label></section>
    <section className="stats forecast-stats">
      <div><TrendingUp/><span>Forecast income</span><b>{formatCurrency(summary.income)}</b><small>{summary.fullFeeEquivalents.toFixed(1)} full-fee equivalents</small></div>
      <div><Calculator/><span>Team costs</span><b>{formatCurrency(summary.teamCosts)}</b><small>Training, matches and extra costs</small></div>
      <div><Calculator/><span>Club-wide costs</span><b>{formatCurrency(summary.clubCosts)}</b><small>Held once at club level</small></div>
      <div className={summary.net<0?'forecast-loss-stat':''}>{summary.net<0?<AlertTriangle/>:<TrendingUp/>}<span>Forecast net</span><b>{formatCurrency(summary.net)}</b><small>Break-even full fee {formatCurrency(summary.breakEvenFullFee)}</small></div>
    </section>
    <section className="forecast-panel">
      <header><div><span className="eyebrow">TEAM SUMMARY</span><h2>Forecast P&amp;L</h2><p>Team contribution is shown before club-wide costs.</p></div></header>
      <div className="forecast-table-wrap"><table className="forecast-summary-table"><thead><tr><th>Team</th><th>Income</th><th>Training</th><th>Home games</th><th>Away games</th><th>Extra costs</th><th>Total cost</th><th>Contribution</th></tr></thead><tbody>{teams.map(team=>{const result=summary.teamResults[team];return <tr key={team}><th>{team}</th><td>{formatCurrency(result.income)}</td><td>{formatCurrency(result.trainingCost)}</td><td>{formatCurrency(result.homeGameCost)}</td><td>{formatCurrency(result.awayGameCost)}</td><td>{formatCurrency(result.extraCost)}</td><td>{formatCurrency(result.totalCost)}</td><td className={moneyClass(result.contribution)}><strong>{formatCurrency(result.contribution)}</strong></td></tr>})}</tbody><tfoot><tr><th>All teams</th><td>{formatCurrency(summary.income)}</td><td colSpan={4}></td><td>{formatCurrency(summary.teamCosts)}</td><td className={moneyClass(summary.income-summary.teamCosts)}><strong>{formatCurrency(summary.income-summary.teamCosts)}</strong></td></tr><tr><th>Club forecast</th><td colSpan={5}>After {formatCurrency(summary.clubCosts)} club-wide costs</td><td>{formatCurrency(summary.totalCost)}</td><td className={moneyClass(summary.net)}><strong>{formatCurrency(summary.net)}</strong></td></tr></tfoot></table></div>
    </section>
    <section className="forecast-panel">
      <header><div><span className="eyebrow">INCOME INPUTS</span><h2>Membership and PAYG income</h2><p>Fees can differ by team. Half-fee players are priced separately.</p></div><button className="secondary" onClick={useCurrentSquads}><RefreshCw/>Use current squad counts</button></header>
      <div className="forecast-table-wrap"><table className="forecast-input-table"><thead><tr><th>Team</th><th>Full players</th><th>Half players</th><th>PAYG income</th><th>Full fee</th><th>Half fee</th><th>Forecast income</th></tr></thead><tbody>{teams.map(team=>{const input=draft.teams[team];return <tr key={team}><th>{team}</th><td><ForecastNumber label={`${team} full players`} value={input.fullPlayers} onChange={value=>updateTeam(team,'fullPlayers',value)}/></td><td><ForecastNumber label={`${team} half players`} value={input.halfPlayers} onChange={value=>updateTeam(team,'halfPlayers',value)}/></td><td><ForecastNumber money label={`${team} PAYG income`} value={input.paygIncome} onChange={value=>updateTeam(team,'paygIncome',value)}/></td><td><ForecastNumber money label={`${team} full fee`} value={input.fullFee} onChange={value=>updateTeam(team,'fullFee',value)}/></td><td><ForecastNumber money label={`${team} half fee`} value={input.halfFee} onChange={value=>updateTeam(team,'halfFee',value)}/></td><td><strong>{formatCurrency(summary.teamResults[team].income)}</strong></td></tr>})}</tbody></table></div>
    </section>
    <section className="forecast-panel">
      <header><div><span className="eyebrow">DELIVERY INPUTS</span><h2>Training and match costs</h2><p>Training cost = sessions × hours × (venue + coach). Home games also include venue and officials; away games include coaching time.</p></div></header>
      <div className="forecast-table-wrap"><table className="forecast-input-table forecast-delivery-table"><thead><tr><th>Team</th>{inputFields.map(field=><th key={field.key} title={field.label}>{field.short}{field.money?' (£)':''}</th>)}<th>Operating cost</th></tr></thead><tbody>{teams.map(team=><tr key={team}><th>{team}</th>{inputFields.map(field=><td key={field.key}><ForecastNumber label={`${team} ${field.label}`} money={field.money} step={field.step} value={draft.teams[team][field.key]} onChange={value=>updateTeam(team,field.key,value)}/></td>)}<td><strong>{formatCurrency(summary.teamResults[team].operatingCost)}</strong></td></tr>)}</tbody></table></div>
    </section>
    <section className="forecast-panel">
      <header><div><span className="eyebrow">TEAM EXTRA COSTS</span><h2>Equipment, registrations and other costs</h2><p>Add or rename rows as needed. Every amount is assigned directly to a team, matching the source model.</p></div><button className="secondary" onClick={addExtra}><Plus/>Add cost row</button></header>
      <div className="forecast-table-wrap"><table className="forecast-input-table forecast-extra-table"><thead><tr><th>Cost</th>{teams.map(team=><th key={team}>{team}</th>)}<th>Total</th><th></th></tr></thead><tbody>{draft.extraCosts.map(line=>{const total=teams.reduce((sum,team)=>sum+(line.teamAmounts[team]||0),0);return <tr key={line.id}><th><input aria-label={`${line.label} cost name`} value={line.label} maxLength={80} onChange={event=>updateExtraLabel(line.id,event.target.value)}/></th>{teams.map(team=><td key={team}><ForecastNumber money label={`${line.label} for ${team}`} value={line.teamAmounts[team]||0} onChange={value=>updateExtra(line.id,team,value)}/></td>)}<td><strong>{formatCurrency(total)}</strong></td><td><button className="forecast-remove" disabled={draft.extraCosts.length===1} aria-label={`Remove ${line.label}`} onClick={()=>removeExtra(line.id)}><Trash2/></button></td></tr>})}</tbody><tfoot><tr><th>Extra cost total</th>{teams.map(team=><td key={team}>{formatCurrency(summary.teamResults[team].extraCost)}</td>)}<td>{formatCurrency(teams.reduce((sum,team)=>sum+summary.teamResults[team].extraCost,0))}</td><td></td></tr></tfoot></table></div>
    </section>
    <section className="forecast-panel forecast-club-costs">
      <header><div><span className="eyebrow">CLUB-WIDE COSTS</span><h2>Costs held once at club level</h2><p>Use this for costs that should affect the club forecast without being duplicated across team rows.</p></div><button className="secondary" onClick={addClubCost}><Plus/>Add club cost</button></header>
      {draft.clubCosts.length?<div className="club-cost-list">{draft.clubCosts.map(line=><div key={line.id}><input aria-label="Club cost name" value={line.label} maxLength={80} onChange={event=>updateClubCost(line.id,'label',event.target.value)}/><ForecastNumber money label={`${line.label} amount`} value={line.amount} onChange={value=>updateClubCost(line.id,'amount',value)}/><strong>{formatCurrency(line.amount)}</strong><button className="forecast-remove" aria-label={`Remove ${line.label}`} onClick={()=>removeClubCost(line.id)}><Trash2/></button></div>)}<footer><span>Club-wide cost total</span><strong>{formatCurrency(summary.clubCosts)}</strong></footer></div>:<div className="forecast-empty-costs"><Calculator/><b>No separate club-wide costs</b><span>Team-assigned extra costs are already included above.</span></div>}
    </section>
    <div className="forecast-save-bar"><span>{dirty?'You have unsaved forecast changes.':forecast.updatedAt?`Last saved ${new Date(forecast.updatedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}.`:'The source assumptions are ready to save.'}</span><button className="primary" disabled={!canSave||saving} onClick={()=>void save()}>{saved?<Check/>:<Save/>}{saving?'Saving…':saved?'Saved':'Save forecast'}</button></div>
  </>
}

function ForecastNumber({label,value,onChange,step=1,money=false}:{label:string;value:number;onChange:(value:number)=>void;step?:number;money?:boolean}){
  return <label className={`forecast-number ${money?'money':''}`}><span>{money?'£':''}</span><input aria-label={label} type="number" min="0" step={step} value={value} onChange={event=>onChange(Number(event.target.value))}/></label>
}
