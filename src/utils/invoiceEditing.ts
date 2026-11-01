import type { CoachInvoice, CoachInvoiceEdit, CoachTimesheetEntry } from '../types'
import { teams } from '../data/constants'
import { timesheetActivities, timesheetAmount, totalTimesheetHours } from './timesheets'

const validId=(value:string)=>/^[A-Za-z0-9_-]{1,100}$/.test(value)

export function prepareInvoiceEdit(invoice:CoachInvoice,existing:Record<string,CoachTimesheetEntry>,edit:CoachInvoiceEdit,actor:string,updatedAt=Date.now()){
  const invoiceNumber=edit.invoiceNumber.trim(),season=edit.season.trim(),note=edit.note.trim(),feeNote=edit.feeNote.trim()
  if(invoiceNumber.length<2||invoiceNumber.length>80)throw new Error('Enter an invoice number between 2 and 80 characters.')
  if(!season||season.length>60)throw new Error('Enter a season of no more than 60 characters.')
  if(note.length<3||note.length>500)throw new Error('Explain the correction in 3 to 500 characters.')
  if(!Number.isFinite(edit.feeAdjustment)||Math.abs(edit.feeAdjustment)>1000000)throw new Error('Enter a valid fee adjustment.')
  if(feeNote.length>200||edit.feeAdjustment!==0&&!feeNote)throw new Error('Describe the additional fee or discount in no more than 200 characters.')
  if(!edit.entries.length||edit.entries.length>200)throw new Error('An invoice must have between 1 and 200 time entries.')
  for(const id of invoice.entryIds){
    if(!existing[id]||existing[id].invoiceId!==invoice.id||existing[id].updatedAt!==edit.entryVersions[id])throw new Error('A time entry has changed. Close and reopen the invoice before editing it again.')
  }
  const ids=new Set<string>()
  const entryRates:Record<string,number>={}
  const entries=edit.entries.map(row=>{
    if(!validId(row.id)||ids.has(row.id))throw new Error('Each time entry must have a unique valid ID.')
    ids.add(row.id)
    const previous=existing[row.id]
    if(previous&&(!invoice.entryIds.includes(row.id)||previous.invoiceId!==invoice.id))throw new Error('A time entry belongs to another invoice or draft. Reopen the invoice and try again.')
    if(invoice.entryIds.includes(row.id)&&(!previous||previous.updatedAt!==row.updatedAt))throw new Error('A time entry has changed. Close and reopen the invoice before editing it again.')
    const parsedDate=new Date(`${row.date}T12:00:00Z`)
    if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||Number.isNaN(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==row.date)throw new Error('Enter a valid date for every time entry.')
    if(!teams.includes(row.team)||!timesheetActivities.includes(row.activity))throw new Error('Choose a valid team and activity for every time entry.')
    const minutes=Math.round(row.hours*60)
    if(!Number.isFinite(row.hours)||minutes<1||minutes>1440||Math.abs(row.hours*60-minutes)>0.000001)throw new Error('Each duration must be between 1 minute and 24 hours, in whole minutes.')
    if(!Number.isFinite(row.hourlyRate)||row.hourlyRate<0||row.hourlyRate>1000)throw new Error('Each hourly rate must be between £0 and £1,000.')
    if(row.notes.trim().length>500)throw new Error('Work details must be no more than 500 characters.')
    entryRates[row.id]=Math.round(row.hourlyRate*100)/100
    return {...previous,id:row.id,coachUid:invoice.coachUid,coachName:invoice.coachName,coachEmail:invoice.coachEmail,date:row.date,team:row.team,activity:row.activity,hours:minutes/60,notes:row.notes.trim(),season,invoiceId:invoice.id,createdAt:previous?.createdAt??updatedAt,updatedAt} satisfies CoachTimesheetEntry
  })
  // Original team rates remain the fallback; corrections can vary by session.
  const feeAdjustment=Math.round(edit.feeAdjustment*100)/100
  const totalAmount=Math.round((entries.reduce((total,row)=>total+timesheetAmount(row.hours,entryRates[row.id]),0)+feeAdjustment)*100)/100
  if(totalAmount<0||totalAmount>1000000)throw new Error('The invoice total must be between £0 and £1,000,000.')
  const removedIds=invoice.entryIds.filter(id=>!ids.has(id))
  for(const id of removedIds){
    if(!existing[id]||existing[id].invoiceId!==invoice.id)throw new Error('A time entry has changed. Close and reopen the invoice before editing it again.')
  }
  const totalHours=totalTimesheetHours(entries)
  // Older records without a team-rate snapshot require a matching summary rate
  // under the existing database rules. Actual session rates remain in entryRates.
  const hourlyRate=Object.keys(invoice.rateBreakdown).length?invoice.hourlyRate:totalAmount/totalHours
  if(hourlyRate>1000)throw new Error('This older invoice must have an effective hourly rate no greater than £1,000.')
  const updated:CoachInvoice={...invoice,invoiceNumber,season,entryIds:entries.map(row=>row.id),entryRates,feeAdjustment,feeNote,hourlyRate,totalHours,totalAmount,lastEditedAt:updatedAt,lastEditedBy:actor.slice(0,120),lastEditNote:note}
  return {invoice:updated,entries,removedIds}
}
