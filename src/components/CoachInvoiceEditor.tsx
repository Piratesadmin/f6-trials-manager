import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { CoachInvoice, CoachInvoiceEdit, CoachTimesheetEntryMap, TimesheetActivity } from '../types'
import { teams } from '../data/constants'
import { formatCurrency } from '../utils/finance'
import { formatHours, invoiceEntryRate, timesheetActivities, timesheetAmount } from '../utils/timesheets'

type EntryForm={id:string;date:string;team:string;activity:TimesheetActivity;hours:string;minutes:string;notes:string;hourlyRate:string;updatedAt:number}
type Props={invoice:CoachInvoice;entries:CoachTimesheetEntryMap;busy:boolean;close:()=>void;save:(edit:CoachInvoiceEdit)=>Promise<void>}

export function CoachInvoiceEditor({invoice,entries,busy,close,save}:Props){
  const [number,setNumber]=useState(invoice.invoiceNumber)
  const [season,setSeason]=useState(invoice.season)
  const [rows,setRows]=useState<EntryForm[]>(()=>invoice.entryIds.flatMap(id=>{
    const entry=entries[invoice.coachUid]?.[id]
    if(!entry)return []
    const minutes=Math.round(entry.hours*60)
    return [{id,date:entry.date,team:entry.team,activity:entry.activity,hours:String(Math.floor(minutes/60)),minutes:String(minutes%60),notes:entry.notes,hourlyRate:invoiceEntryRate(invoice,entry).toFixed(2),updatedAt:entry.updatedAt}]
  }))
  const [entryVersions]=useState(()=>Object.fromEntries(rows.map(row=>[row.id,row.updatedAt])))
  const [missingEntries]=useState(rows.length!==invoice.entryIds.length)
  const [fee,setFee]=useState(()=>String(invoice.feeAdjustment??Math.round((invoice.totalAmount-rows.reduce((total,row)=>total+timesheetAmount((Number(row.hours)*60+Number(row.minutes))/60,Number(row.hourlyRate)),0))*100)/100))
  const [feeNote,setFeeNote]=useState(invoice.feeNote||(Number(fee)!==0?'Previous invoice adjustment':''))
  const [note,setNote]=useState('')
  const [error,setError]=useState('')
  const formRef=useRef<HTMLFormElement>(null)
  const duration=(row:EntryForm)=>(Number(row.hours)*60+Number(row.minutes))/60
  const subtotal=Math.round(rows.reduce((total,row)=>total+timesheetAmount(duration(row),Number(row.hourlyRate)),0)*100)/100
  const total=Math.round((subtotal+Number(fee))*100)/100
  const totalHours=rows.reduce((total,row)=>total+duration(row),0)
  const change=(id:string,patch:Partial<EntryForm>)=>setRows(current=>current.map(row=>row.id===id?{...row,...patch}:row))
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    formRef.current?.focus()
    return ()=>{document.body.style.overflow=previousOverflow;previous?.focus()}
  },[])
  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    if(busy||missingEntries)return
    setError('')
    if(rows.some(row=>!Number.isInteger(Number(row.hours))||!Number.isInteger(Number(row.minutes))||Number(row.hours)<0||Number(row.minutes)<0||Number(row.minutes)>59||duration(row)<=0||duration(row)>24)){
      setError('Each duration must be between 1 minute and 24 hours. Minutes must be between 0 and 59.');return
    }
    try{
      await save({invoiceNumber:number.trim(),season:season.trim(),entries:rows.map(row=>({id:row.id,date:row.date,team:row.team,activity:row.activity,hours:duration(row),notes:row.notes,hourlyRate:Number(row.hourlyRate),updatedAt:row.updatedAt})),entryVersions,feeAdjustment:Number(fee),feeNote:feeNote.trim(),note:note.trim()})
    }catch(reason){setError(reason instanceof Error?reason.message:'The invoice could not be saved. Please try again.')}
  }
  const add=()=>{
    const team=rows.at(-1)?.team||teams[0]
    setRows(current=>[...current,{id:crypto.randomUUID(),date:new Date().toISOString().slice(0,10),team,activity:'Training',hours:'1',minutes:'30',notes:'',hourlyRate:rows.find(row=>row.team===team)?.hourlyRate||String(invoice.rateBreakdown[team]??invoice.hourlyRate),updatedAt:0}])
  }
  return <div className="modal-backdrop coach-invoice-edit-backdrop" onMouseDown={event=>{if(!busy&&event.target===event.currentTarget)close()}}>
    <form ref={formRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="coach-invoice-edit-title" aria-busy={busy} className="panel coach-invoice-edit-modal" onSubmit={event=>void submit(event)} onKeyDown={event=>{
      if(event.key==='Escape'&&!busy){event.stopPropagation();close()}
      if(event.key==='Tab'){
        const focusable=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)'))
        const first=focusable[0],last=focusable.at(-1)
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===formRef.current)){event.preventDefault();last?.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
      }
    }}>
      <header><div><span className="eyebrow">INVOICE CORRECTION</span><h2 id="coach-invoice-edit-title">Edit {invoice.invoiceNumber}</h2><p>{invoice.coachName||invoice.coachEmail}</p></div><button type="button" disabled={busy} className="coach-invoice-edit-close" onClick={close} aria-label="Close invoice editor"><X/></button></header>
      {invoice.status==='Paid'&&<p className="coach-invoice-paid-warning">This invoice is marked paid. Corrections update the record and keep its original payment date.</p>}
      {missingEntries&&<p className="timesheet-error" role="alert">Some time entries could not be loaded. Close the editor and refresh before making corrections.</p>}
      <fieldset disabled={busy} className="coach-invoice-edit-fields">
        <div className="coach-invoice-edit-numbers"><label>Invoice number<input required minLength={2} maxLength={80} value={number} onChange={event=>setNumber(event.target.value)}/></label><label>Season<input required maxLength={60} value={season} onChange={event=>setSeason(event.target.value)}/></label></div>
        <div className="coach-invoice-logs-heading"><h3>Time entries</h3><button type="button" className="secondary" disabled={rows.length>=200||missingEntries} onClick={add}><Plus/>Add entry</button></div>
        <div className="coach-invoice-edit-logs">{rows.map((row,index)=><fieldset key={row.id} className="coach-invoice-edit-log"><legend>Entry {index+1}</legend>
          <div className="coach-invoice-log-fields">
            <label>Date<input type="date" required value={row.date} onChange={event=>change(row.id,{date:event.target.value})}/></label>
            <label>Team<select required value={row.team} onChange={event=>change(row.id,{team:event.target.value})}>{!teams.includes(row.team)&&<option value="">Choose team</option>}{teams.map(team=><option key={team}>{team}</option>)}</select></label>
            <label>Activity<select value={row.activity} onChange={event=>change(row.id,{activity:event.target.value as TimesheetActivity})}>{timesheetActivities.map(activity=><option key={activity}>{activity}</option>)}</select></label>
            <div className="coach-invoice-log-duration"><label>Hours<input type="number" min="0" max="24" step="1" required value={row.hours} onChange={event=>change(row.id,{hours:event.target.value})}/></label><label>Minutes<input type="number" min="0" max="59" step="1" required value={row.minutes} onChange={event=>change(row.id,{minutes:event.target.value})}/></label></div>
            <label>Hourly rate (£)<input type="number" min="0" max="1000" step="0.01" required value={row.hourlyRate} onChange={event=>change(row.id,{hourlyRate:event.target.value})}/></label>
            <div className="coach-invoice-log-amount"><span>Entry amount</span><strong>{formatCurrency(timesheetAmount(duration(row),Number(row.hourlyRate)))}</strong></div>
          </div>
          <label>Work completed<textarea maxLength={500} rows={2} value={row.notes} onChange={event=>change(row.id,{notes:event.target.value})}/></label>
          <button type="button" className="coach-invoice-remove-entry" disabled={rows.length===1} onClick={()=>setRows(current=>current.filter(entry=>entry.id!==row.id))} aria-label={`Remove entry ${index+1}`}><Trash2/>Remove entry</button>
        </fieldset>)}</div>
        <div className="coach-invoice-edit-numbers"><label>Additional fee / discount (£)<input type="number" min="-1000000" max="1000000" step="0.01" required value={fee} onChange={event=>setFee(event.target.value)}/><small>Use a negative amount for a discount.</small></label><label>Fee / discount description<input maxLength={200} required={Number(fee)!==0} value={feeNote} onChange={event=>setFeeNote(event.target.value)} placeholder="e.g. Travel expenses"/></label></div>
        <div className="coach-invoice-edit-summary" aria-live="polite"><div><span>Total time</span><b>{formatHours(totalHours)}</b></div><div><span>Time entries</span><b>{formatCurrency(subtotal)}</b></div><div><span>Invoice total</span><strong>{formatCurrency(total)}</strong></div></div>
        <label>Reason for edit<textarea required minLength={3} maxLength={500} rows={2} value={note} onChange={event=>setNote(event.target.value)} placeholder="Explain the correction for the activity log"/></label>
      </fieldset>
      {error&&<p className="timesheet-error" role="alert">{error}</p>}
      <footer><button type="button" className="secondary" disabled={busy} onClick={close}>Cancel</button><button type="submit" className="primary" disabled={busy||missingEntries||!rows.length}>{busy?'Saving…':'Save invoice changes'}</button></footer>
    </form>
  </div>
}
