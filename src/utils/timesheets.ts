import { teams } from '../data/constants'
import type { CoachHourlyRate, CoachHourlyRateMap, CoachInvoice, CoachInvoiceMap, CoachTimesheetEntry, CoachTimesheetEntryMap, TimesheetActivity } from '../types'

export const timesheetActivities: TimesheetActivity[] = ['Training','Match','Trial','Other']

const safeText=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):''
const safeDate=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:''
const safeNumber=(value:unknown,max=100000)=>{const amount=Number(value);return Number.isFinite(amount)?Math.min(max,Math.max(0,Math.round(amount*100)/100)):0}
const recordValue=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}

function normaliseTeamRates(value:unknown){
  return Object.fromEntries(Object.entries(recordValue(value)).flatMap(([team,rate])=>teams.includes(team)?[[team,safeNumber(rate,1000)]]:[]))
}

export function normaliseCoachHourlyRate(coachUid:string,value:unknown):CoachHourlyRate|null{
  if(!value||typeof value!=='object')return null
  const incoming=value as Partial<CoachHourlyRate>
  return{coachUid,hourlyRate:safeNumber(incoming.hourlyRate,1000),teamRates:normaliseTeamRates(incoming.teamRates),updatedAt:typeof incoming.updatedAt==='number'?incoming.updatedAt:0,updatedBy:safeText(incoming.updatedBy,120)}
}

export function hourlyRateForTeam(rate:CoachHourlyRate|undefined,team:string){
  return rate?.teamRates[team]??rate?.hourlyRate??0
}

export function normaliseTimesheetEntry(coachUid:string,id:string,value:unknown):CoachTimesheetEntry|null{
  if(!value||typeof value!=='object')return null
  const incoming=value as Partial<CoachTimesheetEntry>
  const date=safeDate(incoming.date)
  const hours=safeNumber(incoming.hours,24)
  if(!date||!hours)return null
  return{
    id,
    coachUid,
    coachName:safeText(incoming.coachName,120),
    coachEmail:safeText(incoming.coachEmail,200),
    date,
    team:typeof incoming.team==='string'&&teams.includes(incoming.team)?incoming.team:'',
    activity:timesheetActivities.includes(incoming.activity as TimesheetActivity)?incoming.activity as TimesheetActivity:'Other',
    hours,
    notes:safeText(incoming.notes,500),
    season:safeText(incoming.season,60),
    invoiceId:safeText(incoming.invoiceId,100),
    createdAt:typeof incoming.createdAt==='number'?incoming.createdAt:Date.now(),
    updatedAt:typeof incoming.updatedAt==='number'?incoming.updatedAt:Date.now(),
  }
}

export function normaliseCoachInvoice(coachUid:string,id:string,value:unknown):CoachInvoice|null{
  if(!value||typeof value!=='object')return null
  const incoming=value as Partial<CoachInvoice>
  const entryIds=Array.isArray(incoming.entryIds)?incoming.entryIds.filter((entryId):entryId is string=>typeof entryId==='string'&&Boolean(entryId)).slice(0,200):[]
  if(!entryIds.length||typeof incoming.submittedAt!=='number')return null
  return{
    id,
    invoiceNumber:safeText(incoming.invoiceNumber,80)||`F6-${id.slice(0,8).toUpperCase()}`,
    coachUid,
    coachName:safeText(incoming.coachName,120),
    coachEmail:safeText(incoming.coachEmail,200),
    entryIds,
    totalHours:safeNumber(incoming.totalHours,10000),
    hourlyRate:safeNumber(incoming.hourlyRate,1000),
    rateBreakdown:normaliseTeamRates(incoming.rateBreakdown),
    totalAmount:safeNumber(incoming.totalAmount,1000000),
    season:safeText(incoming.season,60),
    status:incoming.status==='Paid'?'Paid':'Submitted',
    submittedAt:incoming.submittedAt,
    ...(typeof incoming.paidAt==='number'?{paidAt:incoming.paidAt}:{}),
    ...(typeof incoming.paidBy==='string'?{paidBy:safeText(incoming.paidBy,120)}:{}),
  }
}

export function normaliseCoachHourlyRateMap(value:unknown):CoachHourlyRateMap{
  return Object.fromEntries(Object.entries(recordValue(value)).flatMap(([coachUid,record])=>{const rate=normaliseCoachHourlyRate(coachUid,record);return rate?[[coachUid,rate]]:[]}))
}

export function normaliseTimesheetEntryMap(value:unknown):CoachTimesheetEntryMap{
  return Object.fromEntries(Object.entries(recordValue(value)).map(([coachUid,group])=>[coachUid,Object.fromEntries(Object.entries(recordValue(group)).flatMap(([id,record])=>{const entry=normaliseTimesheetEntry(coachUid,id,record);return entry?[[id,entry]]:[]}))]))
}

export function normaliseCoachInvoiceMap(value:unknown):CoachInvoiceMap{
  return Object.fromEntries(Object.entries(recordValue(value)).map(([coachUid,group])=>[coachUid,Object.fromEntries(Object.entries(recordValue(group)).flatMap(([id,record])=>{const invoice=normaliseCoachInvoice(coachUid,id,record);return invoice?[[id,invoice]]:[]}))]))
}

export function totalTimesheetHours(entries:CoachTimesheetEntry[]){
  return Math.round(entries.reduce((total,entry)=>total+entry.hours,0)*100)/100
}

export function timesheetAmount(hours:number,hourlyRate:number){
  return Math.round(hours*hourlyRate*100)/100
}

export function timesheetAmountForEntries(entries:CoachTimesheetEntry[],rate:CoachHourlyRate|undefined){
  return Math.round(entries.reduce((total,entry)=>total+entry.hours*hourlyRateForTeam(rate,entry.team),0)*100)/100
}

export function rateBreakdownForEntries(entries:CoachTimesheetEntry[],rate:CoachHourlyRate|undefined){
  return Object.fromEntries([...new Set(entries.map(entry=>entry.team))].filter(Boolean).map(team=>[team,hourlyRateForTeam(rate,team)]))
}

export function coachInvoicesForSeason(invoices:CoachInvoiceMap,season:string){
  return Object.values(invoices).flatMap(group=>Object.values(group)).filter(invoice=>invoice.season===season).sort((a,b)=>b.submittedAt-a.submittedAt)
}

export function coachInvoiceFinanceSummary(invoices:CoachInvoiceMap,entries:CoachTimesheetEntryMap,season:string){
  const seasonInvoices=coachInvoicesForSeason(invoices,season)
  const byTeam=Object.fromEntries(teams.map(team=>[team,{hours:0,invoiced:0,submitted:0,paid:0}]))
  seasonInvoices.forEach(invoice=>{
    const rows=invoice.entryIds.map(id=>entries[invoice.coachUid]?.[id]).filter((entry):entry is CoachTimesheetEntry=>Boolean(entry))
    if(!rows.length&&Object.keys(invoice.rateBreakdown).length===1){
      const team=Object.keys(invoice.rateBreakdown)[0]
      if(byTeam[team]){byTeam[team].hours+=invoice.totalHours;byTeam[team].invoiced+=invoice.totalAmount;byTeam[team][invoice.status==='Paid'?'paid':'submitted']+=invoice.totalAmount}
      return
    }
    rows.forEach(entry=>{
      if(!byTeam[entry.team])return
      const amount=entry.hours*(invoice.rateBreakdown[entry.team]??invoice.hourlyRate)
      byTeam[entry.team].hours+=entry.hours
      byTeam[entry.team].invoiced+=amount
      byTeam[entry.team][invoice.status==='Paid'?'paid':'submitted']+=amount
    })
  })
  Object.values(byTeam).forEach(team=>{team.hours=Math.round(team.hours*100)/100;team.invoiced=Math.round(team.invoiced*100)/100;team.submitted=Math.round(team.submitted*100)/100;team.paid=Math.round(team.paid*100)/100})
  return{
    invoices:seasonInvoices,
    totalHours:Math.round(seasonInvoices.reduce((total,invoice)=>total+invoice.totalHours,0)*100)/100,
    totalAmount:Math.round(seasonInvoices.reduce((total,invoice)=>total+invoice.totalAmount,0)*100)/100,
    submittedAmount:Math.round(seasonInvoices.filter(invoice=>invoice.status==='Submitted').reduce((total,invoice)=>total+invoice.totalAmount,0)*100)/100,
    paidAmount:Math.round(seasonInvoices.filter(invoice=>invoice.status==='Paid').reduce((total,invoice)=>total+invoice.totalAmount,0)*100)/100,
    byTeam,
  }
}

export function formatHours(hours:number){
  return `${hours.toLocaleString('en-GB',{maximumFractionDigits:2})} hr${hours===1?'':'s'}`
}
