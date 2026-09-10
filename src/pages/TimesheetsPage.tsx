import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Banknote, Check, CheckCircle2, Clock3, FileText, Plus, ReceiptText, Send, Trash2, UserRoundCog, Users } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import type { CoachHourlyRate, CoachHourlyRateMap, CoachInvoice, CoachInvoiceMap, CoachProfile, CoachTimesheetEntry, CoachTimesheetEntryMap, TimesheetActivity } from '../types'
import { formatCurrency } from '../utils/finance'
import { assignedTeamNames } from '../utils/access'
import { formatHours, hourlyRateForTeam, timesheetActivities, timesheetAmount, timesheetAmountForEntries, totalTimesheetHours } from '../utils/timesheets'

type Props = {
  isAdmin: boolean
  currentUid: string
  currentEmail: string
  currentProfile: CoachProfile | null
  currentSeason: string
  coachProfiles: CoachProfile[]
  hourlyRates: CoachHourlyRateMap
  entries: CoachTimesheetEntryMap
  invoices: CoachInvoiceMap
  saveHourlyRate: (coachUid:string,teamRates:Record<string,number>)=>void|Promise<void>
  saveEntry: (entry:CoachTimesheetEntry)=>void|Promise<void>
  deleteEntry: (entry:CoachTimesheetEntry)=>void|Promise<void>
  submitInvoice: (coachUid:string,entryIds:string[])=>void|Promise<void>
  markInvoicePaid: (invoice:CoachInvoice)=>void|Promise<void>
}

const today=()=>new Date().toISOString().slice(0,10)
const dateLabel=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
const invoiceRateSummary=(invoice:CoachInvoice)=>Object.keys(invoice.rateBreakdown).length?Object.entries(invoice.rateBreakdown).map(([team,rate])=>`${team} ${formatCurrency(rate)}/hr`).join(' · '):`${formatCurrency(invoice.hourlyRate)}/hr`

export function TimesheetsPage(props:Props){
  if(props.isAdmin)return <TreasurerTimesheets {...props}/>
  return <CoachTimesheets {...props}/>
}

function CoachTimesheets({currentUid,currentEmail,currentProfile,currentSeason,hourlyRates,entries,invoices,saveEntry,deleteEntry,submitInvoice}:Props){
  const assignedTeams=assignedTeamNames(currentProfile)
  const [form,setForm]=useState<{date:string;team:string;activity:TimesheetActivity;hours:number;notes:string}>(()=>({date:today(),team:assignedTeams[0]||'',activity:'Training',hours:1.5,notes:''}))
  const [busy,setBusy]=useState<'add'|'submit'|string>('')
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{if(!form.team&&assignedTeams[0])setForm(current=>({...current,team:assignedTeams[0]}))},[assignedTeams,form.team])
  const coachEntries=useMemo(()=>Object.values(entries[currentUid]||{}).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt),[entries,currentUid])
  const drafts=coachEntries.filter(entry=>!entry.invoiceId)
  const coachInvoices=useMemo(()=>Object.values(invoices[currentUid]||{}).sort((a,b)=>b.submittedAt-a.submittedAt),[invoices,currentUid])
  const rate=hourlyRates[currentUid]
  const draftHours=totalTimesheetHours(drafts)
  const draftAmount=timesheetAmountForEntries(drafts,rate)
  const missingRateTeams=[...new Set(drafts.filter(entry=>!hourlyRateForTeam(rate,entry.team)).map(entry=>entry.team))]
  const assignedRates=assignedTeams.map(team=>({team,rate:hourlyRateForTeam(rate,team)}))
  const ratesSet=assignedRates.filter(item=>item.rate>0).length
  const outstanding=coachInvoices.filter(invoice=>invoice.status==='Submitted').reduce((total,invoice)=>total+invoice.totalAmount,0)
  const paid=coachInvoices.filter(invoice=>invoice.status==='Paid'&&invoice.season===currentSeason).reduce((total,invoice)=>total+invoice.totalAmount,0)
  const add=async(event:FormEvent)=>{
    event.preventDefault()
    if(!currentProfile||!form.team||!form.date||form.hours<=0)return
    setBusy('add');setNotice('');setError('')
    try{
      const timestamp=Date.now()
      await saveEntry({id:crypto.randomUUID(),coachUid:currentUid,coachName:currentProfile.displayName,coachEmail:currentEmail,date:form.date,team:form.team,activity:form.activity,hours:Math.round(form.hours*100)/100,notes:form.notes.trim(),season:currentSeason,invoiceId:'',createdAt:timestamp,updatedAt:timestamp})
      setForm(current=>({...current,date:today(),hours:1.5,notes:''}));setNotice('Hours added to your draft timesheet.')
    }catch(reason){setError(reason instanceof Error?reason.message:'The hours could not be saved.')}finally{setBusy('')}
  }
  const remove=async(entry:CoachTimesheetEntry)=>{
    if(!window.confirm(`Remove ${formatHours(entry.hours)} from ${dateLabel(entry.date)}?`))return
    setBusy(entry.id);setError('');try{await deleteEntry(entry)}catch(reason){setError(reason instanceof Error?reason.message:'The entry could not be removed.')}finally{setBusy('')}
  }
  const submit=async()=>{
    if(missingRateTeams.length||!drafts.length)return
    const rateSummary=[...new Set(drafts.map(entry=>entry.team))].map(team=>`${team} at ${formatCurrency(hourlyRateForTeam(rate,team))}/hr`).join(', ')
    if(!window.confirm(`Submit ${formatHours(draftHours)} (${rateSummary}) to the treasurer? Submitted entries can no longer be edited.`))return
    setBusy('submit');setNotice('');setError('')
    try{await submitInvoice(currentUid,drafts.map(entry=>entry.id));setNotice('Invoice submitted to the treasurer.')}catch(reason){setError(reason instanceof Error?reason.message:'The invoice could not be submitted.')}finally{setBusy('')}
  }
  if(!currentProfile||!['coach','assistant-coach'].includes(currentProfile.role))return <><PageHeader title="Timesheets" subtitle="Coaching hours and invoice submissions."/><section className="timesheet-access-message"><Clock3/><h2>Timesheets are for coaches</h2><p>An administrator must set this account as Coach or Assistant coach before hours can be submitted.</p></section></>
  return <>
    <PageHeader title="Timesheets" subtitle={`Record coaching hours and submit them to the treasurer for ${currentSeason}.`}/>
    <section className="stats timesheet-stats"><div><Banknote/><span>Your hourly {assignedTeams.length>1?'rates':'rate'}</span><b>{assignedTeams.length>1?`${ratesSet} of ${assignedTeams.length} set`:assignedRates[0]?.rate?formatCurrency(assignedRates[0].rate):'Not set'}</b><small>{assignedTeams.length>1?assignedRates.map(item=>`${item.team}: ${item.rate?formatCurrency(item.rate):'not set'}`).join(' · '):assignedRates[0]?.rate?'Set by the treasurer':'You can record hours while you wait'}</small></div><div><Clock3/><span>Draft hours</span><b>{formatHours(draftHours)}</b><small>{drafts.length} unsubmitted entr{drafts.length===1?'y':'ies'}</small></div><div><ReceiptText/><span>Awaiting payment</span><b>{formatCurrency(outstanding)}</b><small>{coachInvoices.filter(invoice=>invoice.status==='Submitted').length} submitted invoice{coachInvoices.filter(invoice=>invoice.status==='Submitted').length===1?'':'s'}</small></div><div><CheckCircle2/><span>Paid this season</span><b>{formatCurrency(paid)}</b><small>Invoices marked paid</small></div></section>
    {assignedRates.some(item=>!item.rate)&&<div className="timesheet-rate-warning"><UserRoundCog/><div><b>{assignedTeams.length>1?'One or more team rates have not been set':'Your hourly rate has not been set'}</b><span>You may add draft hours now, but cannot invoice hours for {assignedRates.filter(item=>!item.rate).map(item=>item.team).join(', ')||'a team'} until the treasurer sets the rate.</span></div></div>}{error&&<p className="timesheet-error">{error}</p>}
    <div className="timesheet-coach-layout">
      <section className="panel timesheet-entry-panel"><header><div><span className="eyebrow">NEW ENTRY</span><h2>Add coaching hours</h2></div><Plus/></header><form onSubmit={add}><label>Date<input type="date" max={today()} required value={form.date} onChange={event=>setForm({...form,date:event.target.value})}/></label><label>Team<select required value={form.team} onChange={event=>setForm({...form,team:event.target.value})}><option value="">Choose team</option>{assignedTeams.map(team=><option key={team}>{team}</option>)}</select></label><label>Activity<select value={form.activity} onChange={event=>setForm({...form,activity:event.target.value as TimesheetActivity})}>{timesheetActivities.map(activity=><option key={activity}>{activity}</option>)}</select></label><label>Hours<input type="number" min="0.25" max="24" step="0.25" required value={form.hours||''} onChange={event=>setForm({...form,hours:Number(event.target.value)})}/></label><label className="timesheet-notes">Work completed<textarea maxLength={500} rows={4} value={form.notes} onChange={event=>setForm({...form,notes:event.target.value})} placeholder="Session, fixture, age group, or other useful detail…"/></label><button className="primary" disabled={busy==='add'||!assignedTeams.length}>{busy==='add'?'Adding…':<><Plus/>Add to timesheet</>}</button>{!assignedTeams.length&&<p className="timesheet-form-help">Ask an administrator to assign this account to a team.</p>}</form></section>
      <section className="panel timesheet-draft-panel"><header><div><span className="eyebrow">DRAFT TIMESHEET</span><h2>Hours ready to invoice</h2></div><strong>{formatHours(draftHours)}</strong></header>{notice&&<p className="timesheet-notice"><Check/>{notice}</p>}{drafts.length?<><div className="timesheet-entry-list">{drafts.map(entry=><article key={entry.id}><span className={`timesheet-activity ${entry.activity.toLowerCase()}`}>{entry.activity}</span><div><b>{entry.team}</b><span>{entry.notes||'No additional details'}</span><small>{dateLabel(entry.date)} · {hourlyRateForTeam(rate,entry.team)?`${formatCurrency(hourlyRateForTeam(rate,entry.team))}/hr`:'Rate not set'}</small></div><strong>{formatHours(entry.hours)}</strong><button aria-label={`Delete ${entry.activity} entry from ${entry.date}`} disabled={busy===entry.id} onClick={()=>void remove(entry)}><Trash2/></button></article>)}</div><footer><div><span>{missingRateTeams.length?`Rate needed for ${missingRateTeams.join(', ')}`:'Invoice value using each team rate'}</span><b>{formatCurrency(draftAmount)}</b></div><button className="primary" disabled={Boolean(missingRateTeams.length)||busy==='submit'} onClick={()=>void submit()}>{busy==='submit'?'Submitting…':<><Send/>Submit invoice</>}</button></footer></>:<TimesheetEmpty icon={<Clock3/>} title="No draft hours" text="Add a coaching entry to begin your next invoice."/>}</section>
    </div>
    <InvoiceHistory invoices={coachInvoices} entries={entries} own/>
  </>
}

function TreasurerTimesheets({coachProfiles,hourlyRates,entries,invoices,saveHourlyRate,markInvoicePaid}:Props){
  const coaches=coachProfiles.filter(profile=>profile.role==='coach'||profile.role==='assistant-coach').sort((a,b)=>a.displayName.localeCompare(b.displayName))
  const allInvoices=Object.values(invoices).flatMap(group=>Object.values(group)).sort((a,b)=>b.submittedAt-a.submittedAt)
  const [filter,setFilter]=useState<'All'|'Submitted'|'Paid'>('Submitted')
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const visible=filter==='All'?allInvoices:allInvoices.filter(invoice=>invoice.status===filter)
  const submitted=allInvoices.filter(invoice=>invoice.status==='Submitted')
  const paid=allInvoices.filter(invoice=>invoice.status==='Paid')
  const coachesMissingRates=coaches.filter(coach=>assignedTeamNames(coach).some(team=>!hourlyRateForTeam(hourlyRates[coach.uid],team))).length
  const pay=async(invoice:CoachInvoice)=>{setBusy(invoice.id);setError('');try{await markInvoicePaid(invoice)}catch(reason){setError(reason instanceof Error?reason.message:'The invoice could not be updated.')}finally{setBusy('')}}
  return <>
    <PageHeader title="Timesheets" subtitle="Set coaching rates, review submitted hours, and manage coach invoices."/>
    <section className="stats timesheet-stats"><div><Users/><span>Paid coaches</span><b>{coaches.length}</b><small>{coachesMissingRates} coach{coachesMissingRates===1?'':'es'} with team rates still to set</small></div><div><Clock3/><span>Hours submitted</span><b>{formatHours(submitted.reduce((total,invoice)=>total+invoice.totalHours,0))}</b><small>Awaiting treasurer payment</small></div><div><ReceiptText/><span>Invoices to pay</span><b>{formatCurrency(submitted.reduce((total,invoice)=>total+invoice.totalAmount,0))}</b><small>{submitted.length} submitted invoice{submitted.length===1?'':'s'}</small></div><div><CheckCircle2/><span>Paid invoices</span><b>{formatCurrency(paid.reduce((total,invoice)=>total+invoice.totalAmount,0))}</b><small>{paid.length} invoice{paid.length===1?'':'s'} completed</small></div></section>
    <section className="panel timesheet-rates-panel"><header><div><span className="eyebrow">TREASURER SETTINGS</span><h2>Coach hourly rates</h2><p>Coaches assigned to multiple teams can have a separate rate for each team. Existing invoices keep the rates they were submitted with.</p></div><Banknote/></header>{coaches.length?<div className="timesheet-rate-list">{coaches.map(coach=><CoachRateRow key={coach.uid} coach={coach} current={hourlyRates[coach.uid]} save={saveHourlyRate}/>)}</div>:<TimesheetEmpty icon={<Users/>} title="No coach accounts" text="Coach and Assistant coach accounts will appear here after they are created in Settings."/>}</section>
    <section className="panel timesheet-invoices-panel"><header><div><span className="eyebrow">COACH INVOICES</span><h2>Submitted invoices</h2></div><select aria-label="Filter coach invoices" value={filter} onChange={event=>setFilter(event.target.value as typeof filter)}><option>All</option><option>Submitted</option><option>Paid</option></select></header>{error&&<p className="timesheet-error within-panel">{error}</p>}{visible.length?<div className="treasurer-invoice-list">{visible.map(invoice=><article key={invoice.id}><div className="invoice-main"><span className={`invoice-status ${invoice.status.toLowerCase()}`}>{invoice.status}</span><div><b>{invoice.coachName||invoice.coachEmail}</b><span>{invoice.invoiceNumber} · {invoice.season}</span><small>Submitted {new Date(invoice.submittedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}</small></div><div className="invoice-total"><span>{formatHours(invoice.totalHours)} · {invoiceRateSummary(invoice)}</span><strong>{formatCurrency(invoice.totalAmount)}</strong></div>{invoice.status==='Submitted'?<button className="primary" disabled={busy===invoice.id} onClick={()=>void pay(invoice)}>{busy===invoice.id?'Saving…':<><Check/>Mark paid</>}</button>:<div className="invoice-paid-date"><CheckCircle2/><span>Paid {invoice.paidAt?new Date(invoice.paidAt).toLocaleDateString('en-GB'):'—'}</span></div>}</div><InvoiceEntries invoice={invoice} entries={entries}/></article>)}</div>:<TimesheetEmpty icon={<ReceiptText/>} title="No matching invoices" text="Submitted coach invoices will appear here."/>}</section>
  </>
}

function CoachRateRow({coach,current,save}:{coach:CoachProfile;current?:CoachHourlyRate;save:(coachUid:string,teamRates:Record<string,number>)=>void|Promise<void>}){
  const assignedTeams=assignedTeamNames(coach)
  const ratesFromCurrent=()=>Object.fromEntries(assignedTeams.map(team=>[team,hourlyRateForTeam(current,team)]))
  const [rates,setRates]=useState<Record<string,number>>(ratesFromCurrent)
  const [saved,setSaved]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  useEffect(()=>setRates(ratesFromCurrent()),[current,coach.teams])
  const submit=async()=>{setBusy(true);setError('');try{await save(coach.uid,rates);setSaved(true);window.setTimeout(()=>setSaved(false),1600)}catch(reason){setError(reason instanceof Error?reason.message:'The rates could not be saved.')}finally{setBusy(false)}}
  return <article><div className="rate-coach-avatar">{coach.displayName.slice(0,2).toUpperCase()}</div><div><b>{coach.displayName}</b><span>{coach.role==='assistant-coach'?'Assistant coach':'Coach'} · {assignedTeams.join(', ')||'No team assigned'}</span><small>{coach.email}</small></div><div className="coach-team-rate-fields">{assignedTeams.map(team=><label key={team}>{assignedTeams.length>1?team:'Hourly rate'}<div><span>£</span><input aria-label={`${team} hourly rate`} type="number" min="0" max="1000" step="0.01" value={rates[team]||''} onChange={event=>{setRates({...rates,[team]:Number(event.target.value)});setSaved(false);setError('')}}/></div></label>)}{!assignedTeams.length&&<small>Assign this coach to a team before setting a rate.</small>}</div><button className="secondary" disabled={busy||!assignedTeams.length} onClick={()=>void submit()}>{saved?<><Check/>Saved</>:busy?'Saving…':'Save rates'}</button>{error&&<small className="rate-save-error">{error}</small>}</article>
}

function InvoiceHistory({invoices,entries,own=false}:{invoices:CoachInvoice[];entries:CoachTimesheetEntryMap;own?:boolean}){
  return <section className="panel timesheet-history-panel"><header><div><span className="eyebrow">{own?'YOUR INVOICES':'INVOICES'}</span><h2>Invoice history</h2></div><FileText/></header>{invoices.length?<div className="coach-invoice-list">{invoices.map(invoice=><article key={invoice.id}><div><span className={`invoice-status ${invoice.status.toLowerCase()}`}>{invoice.status}</span><b>{invoice.invoiceNumber}</b><small>{new Date(invoice.submittedAt).toLocaleDateString('en-GB')} · {invoice.season}</small></div><div><span>{formatHours(invoice.totalHours)} · {invoiceRateSummary(invoice)}</span><strong>{formatCurrency(invoice.totalAmount)}</strong></div><InvoiceEntries invoice={invoice} entries={entries}/></article>)}</div>:<TimesheetEmpty icon={<FileText/>} title="No invoices submitted" text="Your submitted invoices and payment status will appear here."/>}</section>
}

function InvoiceEntries({invoice,entries}:{invoice:CoachInvoice;entries:CoachTimesheetEntryMap}){
  const rows=invoice.entryIds.map(id=>entries[invoice.coachUid]?.[id]).filter((entry):entry is CoachTimesheetEntry=>Boolean(entry)).sort((a,b)=>a.date.localeCompare(b.date))
  return <details className="invoice-entries"><summary>View {rows.length} time entr{rows.length===1?'y':'ies'}</summary><div>{rows.map(entry=>{const rate=invoice.rateBreakdown[entry.team]??invoice.hourlyRate;return <span key={entry.id}><time>{dateLabel(entry.date)}</time><b>{entry.team} · {entry.activity}</b><em>{entry.notes||'—'}</em><span className="invoice-entry-value"><strong>{formatHours(entry.hours)}</strong><small>{formatCurrency(rate)}/hr · {formatCurrency(timesheetAmount(entry.hours,rate))}</small></span></span>})}</div></details>
}

function TimesheetEmpty({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){
  return <div className="timesheet-empty">{icon}<b>{title}</b><span>{text}</span></div>
}
