import { CalendarClock, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { CustomPaymentRule } from '../types'
import { formatCurrency } from '../utils/finance'

type Props = {
  rules: CustomPaymentRule[]
  onChange: (rules: CustomPaymentRule[]) => void
  onSave: () => void | Promise<void>
  saved: boolean
}

const newRule = (): CustomPaymentRule => ({
  id: crypto.randomUUID(),
  name: 'Custom arrangement',
  description: '',
  feeMode: 'existing',
  feeValue: 0,
  dueDates: [],
})

export function FinanceCustomRules({rules,onChange,onSave,saved}:Props){
  const update=(id:string,updates:Partial<CustomPaymentRule>)=>onChange(rules.map(rule=>rule.id===id?{...rule,...updates}:rule))
  const remove=(rule:CustomPaymentRule)=>{
    if(window.confirm(`Delete “${rule.name}”? Players assigned to it will need a new payment arrangement.`))onChange(rules.filter(item=>item.id!==rule.id))
  }
  const addDate=(rule:CustomPaymentRule)=>update(rule.id,{dueDates:[...rule.dueDates,'']})
  const updateDate=(rule:CustomPaymentRule,index:number,date:string)=>update(rule.id,{dueDates:rule.dueDates.map((value,itemIndex)=>itemIndex===index?date:value)})
  const removeDate=(rule:CustomPaymentRule,index:number)=>update(rule.id,{dueDates:rule.dueDates.filter((_,itemIndex)=>itemIndex!==index)})
  return <section className="custom-payment-rules">
    <header><SlidersHorizontal/><div><h3>Custom payment arrangements</h3><p>Create reusable rules for reduced fees, fixed fees, or bespoke payment schedules. They appear under “Custom” for every player.</p></div><button className="secondary" type="button" disabled={rules.length>=30} onClick={()=>onChange([...rules,newRule()])}><Plus/>Add rule</button></header>
    {rules.length?<div className="custom-payment-rule-list">{rules.map((rule,index)=><article key={rule.id}>
      <div className="custom-rule-heading"><span>{index+1}</span><label>Rule name<input value={rule.name} maxLength={60} onChange={event=>update(rule.id,{name:event.target.value})} placeholder="e.g. Playing coach – half fee"/></label><button type="button" aria-label={`Delete ${rule.name}`} onClick={()=>remove(rule)}><Trash2/></button></div>
      <label className="custom-rule-description">Admin note<textarea value={rule.description} maxLength={200} onChange={event=>update(rule.id,{description:event.target.value})} placeholder="Who this arrangement is for and any approval conditions…"/></label>
      <div className="custom-rule-fee"><label>Fee rule<select value={rule.feeMode} onChange={event=>update(rule.id,{feeMode:event.target.value as CustomPaymentRule['feeMode']})}><option value="existing">Keep player fee basis</option><option value="fixed">Fixed total fee</option><option value="percentage">Percentage of standard fee</option></select></label>{rule.feeMode!=='existing'&&<label>{rule.feeMode==='fixed'?'Fixed fee':'Percentage'}<div className="custom-rule-value"><span>{rule.feeMode==='fixed'?'£':'%'}</span><input type="number" min="0" max={rule.feeMode==='percentage'?100:undefined} step="0.01" value={rule.feeValue||''} onChange={event=>update(rule.id,{feeValue:Number(event.target.value)})}/></div><small>{rule.feeMode==='fixed'?formatCurrency(rule.feeValue):`${rule.feeValue}% of the player’s standard team fee`}</small></label>}</div>
      <div className="custom-rule-dates"><div><CalendarClock/><span><b>Payment dates</b><small>The total is split equally across these dates.</small></span><button className="secondary" type="button" onClick={()=>addDate(rule)}><Plus/>Add date</button></div>{rule.dueDates.map((date,dateIndex)=><label key={`${rule.id}-${dateIndex}`}><span>Payment {dateIndex+1}</span><input type="date" value={date} onChange={event=>updateDate(rule,dateIndex,event.target.value)}/><button type="button" aria-label={`Remove payment date ${dateIndex+1} from ${rule.name}`} onClick={()=>removeDate(rule,dateIndex)}><Trash2/></button></label>)}{!rule.dueDates.length&&<p>No dates set — Finance will show “Dates not set” until dates are added.</p>}</div>
    </article>)}</div>:<div className="custom-payment-rules-empty"><SlidersHorizontal/><b>No custom rules yet</b><span>Add one for concessions, volunteers, hardship arrangements, or any other reusable exception.</span></div>}
    <footer><span>Custom arrangements are administrator-only and are included in finance backups and season archives.</span><button className="primary" type="button" onClick={()=>void onSave()}>{saved?'Saved':'Save custom rules'}</button></footer>
  </section>
}
