import { get, ref, update } from 'firebase/database'
import { auth, database } from '../firebase'
import type { CoachInvoice, CoachInvoiceEdit } from '../types'
import { createActivityEntry } from '../utils/activity'
import { prepareInvoiceEdit } from '../utils/invoiceEditing'
import { normaliseCoachInvoice, normaliseTimesheetEntryMap } from '../utils/timesheets'

export async function updateCoachInvoice(invoice:CoachInvoice,edit:CoachInvoiceEdit){
  if(!database||!auth?.currentUser)throw new Error('Sign in to Club Manager before editing an invoice.')
  const user=auth.currentUser
  try{
    const [invoiceSnapshot,entrySnapshot]=await Promise.all([
      get(ref(database,`coachInvoices/${invoice.coachUid}/${invoice.id}`)),
      get(ref(database,`coachTimesheetEntries/${invoice.coachUid}`)),
    ])
    const current=normaliseCoachInvoice(invoice.coachUid,invoice.id,invoiceSnapshot.val())
    if(!current)throw new Error('That invoice no longer exists.')
    if(JSON.stringify(current)!==JSON.stringify(invoice))throw new Error('This invoice has changed. Close and reopen it before making corrections.')
    const existing=normaliseTimesheetEntryMap({[invoice.coachUid]:entrySnapshot.val()})[invoice.coachUid]||{}
    const result=prepareInvoiceEdit(current,existing,edit,user.email||'Administrator')
    const audit=createActivityEntry({category:'finance',action:'coach_invoice_edited',summary:`Edited coach invoice ${result.invoice.invoiceNumber}`,detail:`${invoice.totalHours} hrs / £${invoice.totalAmount.toFixed(2)} → ${result.invoice.totalHours} hrs / £${result.invoice.totalAmount.toFixed(2)}. ${edit.note.trim()}`.slice(0,500),team:'',entityType:'settings',entityId:invoice.id},{uid:user.uid,name:(user.email||'Administrator').slice(0,120),email:user.email||''},result.invoice.season)
    const updates:Record<string,unknown>={}
    const changedFields=['invoiceNumber','season','entryIds','entryRates','feeAdjustment','feeNote','totalHours','totalAmount','lastEditedAt','lastEditedBy','lastEditNote'] as const
    changedFields.forEach(key=>{updates[`coachInvoices/${invoice.coachUid}/${invoice.id}/${key}`]=result.invoice[key]})
    if(!Object.keys(current.rateBreakdown).length)updates[`coachInvoices/${invoice.coachUid}/${invoice.id}/hourlyRate`]=result.invoice.hourlyRate
    result.entries.forEach(entry=>{updates[`coachTimesheetEntries/${invoice.coachUid}/${entry.id}`]=entry})
    result.removedIds.forEach(id=>{updates[`coachTimesheetEntries/${invoice.coachUid}/${id}`]=null})
    updates[`auditLog/${audit.id}`]={...audit,invoiceBefore:current,entriesBefore:current.entryIds.map(id=>existing[id]).filter(Boolean),invoiceAfter:result.invoice,entriesAfter:result.entries}
    // Existing rules restrict edits to administrators. Save linked records together.
    await update(ref(database),updates)
    return result
  }catch(reason){
    const code=typeof reason==='object'&&reason!==null&&'code' in reason?String(reason.code).toLowerCase():''
    if(code.includes('permission'))throw new Error('Invoice changes were not saved. Sign in with an administrator account and check that the current database rules are published.')
    if(code.includes('network')||code.includes('disconnected'))throw new Error('Invoice changes were not saved. Check your connection and try again.')
    throw reason
  }
}
