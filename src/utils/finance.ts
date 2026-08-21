import type { FinanceSettings, PaymentPlan, Player, PlayerFinance } from '../types'
import { confirmedPositionForTeam, confirmedTeamAssignments, confirmedTeamNames } from './player'

export const paymentPlans: Exclude<PaymentPlan, ''>[] = ['Fully paid', '2 instalments', 'Direct debit']
export const nvlTeams = ['Aces', 'Ravens']
export const defaultFinanceSettings: FinanceSettings = { nvlFee: 0, lvaFee: 0, fullPaymentDueDate: '', instalmentOneDueDate: '', instalmentTwoDueDate: '', directDebitDueDates: [] }

export function confirmedTeam(player: Player) {
  const assignments=confirmedTeamAssignments(player)
  return player.offeredTeam&&assignments[player.offeredTeam]?player.offeredTeam:confirmedTeamNames(player)[0]||''
}

export function confirmedPosition(player: Player, team=confirmedTeam(player)) {
  return team?confirmedPositionForTeam(player,team):player.position||player.offeredPosition||'Unassigned'
}

export function emptyPlayerFinance(playerId: string): PlayerFinance {
  return { playerId, amountOwed: 0, usesStandardFee: true, amountPaid: 0, paymentPlan: '', notes: '' }
}

function safeMoney(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100) / 100) : 0
}

export function normalisePlayerFinance(playerId: string, value: unknown): PlayerFinance {
  const incoming = value && typeof value === 'object' ? value as Partial<PlayerFinance> : {}
  const paymentPlan: PaymentPlan = paymentPlans.includes(incoming.paymentPlan as Exclude<PaymentPlan, ''>) ? incoming.paymentPlan as PaymentPlan : ''
  return {
    playerId,
    amountOwed: safeMoney(incoming.amountOwed),
    usesStandardFee: typeof incoming.usesStandardFee === 'boolean' ? incoming.usesStandardFee : !safeMoney(incoming.amountOwed),
    amountPaid: safeMoney(incoming.amountPaid),
    paymentPlan,
    notes: typeof incoming.notes === 'string' ? incoming.notes : '',
    updatedAt: typeof incoming.updatedAt === 'number' ? incoming.updatedAt : undefined,
    updatedBy: typeof incoming.updatedBy === 'string' ? incoming.updatedBy : undefined,
  }
}

export function normaliseFinanceSettings(value: unknown): FinanceSettings {
  const incoming = value && typeof value === 'object' ? value as Partial<FinanceSettings> : {}
  const safeDate=(date:unknown)=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:''
  return {
    nvlFee: safeMoney(incoming.nvlFee),
    lvaFee: safeMoney(incoming.lvaFee),
    fullPaymentDueDate: safeDate(incoming.fullPaymentDueDate),
    instalmentOneDueDate: safeDate(incoming.instalmentOneDueDate),
    instalmentTwoDueDate: safeDate(incoming.instalmentTwoDueDate),
    directDebitDueDates: Array.isArray(incoming.directDebitDueDates) ? [...new Set(incoming.directDebitDueDates.map(safeDate).filter(Boolean))].sort() : [],
    updatedAt: typeof incoming.updatedAt === 'number' ? incoming.updatedAt : undefined,
    updatedBy: typeof incoming.updatedBy === 'string' ? incoming.updatedBy : undefined,
  }
}

export function feeBandForTeam(team: string) {
  return nvlTeams.includes(team) ? 'NVL' as const : 'LVA' as const
}

export function standardFeeForTeam(team: string, settings: FinanceSettings) {
  return feeBandForTeam(team) === 'NVL' ? settings.nvlFee : settings.lvaFee
}

export function standardFeeForPlayer(player: Player, settings: FinanceSettings) {
  return confirmedTeamNames(player).reduce((total,team)=>total+standardFeeForTeam(team,settings),0)
}

export function effectiveAmountOwed(player: Player, finance: PlayerFinance, settings: FinanceSettings) {
  return finance.usesStandardFee ? standardFeeForPlayer(player, settings) : finance.amountOwed
}

export function outstandingAmount(finance: PlayerFinance, amountOwed = finance.amountOwed) {
  return Math.max(0, Math.round((amountOwed - finance.amountPaid) * 100) / 100)
}

export function paymentStatus(finance: PlayerFinance, amountOwed = finance.amountOwed) {
  if (!amountOwed) return 'Fee not set' as const
  if (finance.amountPaid >= amountOwed) return 'Paid' as const
  if (finance.amountPaid > 0) return 'Part paid' as const
  return 'Outstanding' as const
}

export type PaymentDeadlineState = 'none' | 'upcoming' | 'due-soon' | 'overdue' | 'complete'

export type PaymentDeadlineDetails = {
  state: PaymentDeadlineState
  label: string
  nextDueDate: string
  requiredByNow: number
  shortfall: number
}

const dateLabel=(date:string)=>date?new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):''

export function paymentDeadlineDetails(finance:PlayerFinance,amountOwed:number,settings:FinanceSettings,now=new Date()):PaymentDeadlineDetails{
  if(!amountOwed||finance.amountPaid>=amountOwed)return{state:'complete',label:'Paid in full',nextDueDate:'',requiredByNow:amountOwed,shortfall:0}
  const schedule:{date:string;required:number}[]=[]
  if(finance.paymentPlan==='Fully paid'&&settings.fullPaymentDueDate)schedule.push({date:settings.fullPaymentDueDate,required:amountOwed})
  if(finance.paymentPlan==='2 instalments'){
    if(settings.instalmentOneDueDate)schedule.push({date:settings.instalmentOneDueDate,required:Math.round(amountOwed*50)/100})
    if(settings.instalmentTwoDueDate)schedule.push({date:settings.instalmentTwoDueDate,required:amountOwed})
  }
  if(finance.paymentPlan==='Direct debit'&&settings.directDebitDueDates.length){
    settings.directDebitDueDates.forEach((date,index)=>schedule.push({date,required:Math.round(amountOwed*((index+1)/settings.directDebitDueDates.length)*100)/100}))
  }
  schedule.sort((a,b)=>a.date.localeCompare(b.date))
  if(!finance.paymentPlan||!schedule.length)return{state:'none',label:finance.paymentPlan?'Dates not set':'Plan not selected',nextDueDate:'',requiredByNow:0,shortfall:0}
  const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const passed=schedule.filter(item=>item.date<today)
  const requiredByNow=passed.at(-1)?.required||0
  const shortfall=Math.max(0,Math.round((requiredByNow-finance.amountPaid)*100)/100)
  if(shortfall>0){const missed=passed.at(-1);return{state:'overdue',label:`${formatCurrency(shortfall)} overdue${missed?` since ${dateLabel(missed.date)}`:''}`,nextDueDate:missed?.date||'',requiredByNow,shortfall}}
  const next=schedule.find(item=>item.date>=today)
  if(!next)return{state:finance.amountPaid>=amountOwed?'complete':'upcoming',label:finance.amountPaid>=amountOwed?'Paid in full':`${formatCurrency(outstandingAmount(finance,amountOwed))} remaining`,nextDueDate:'',requiredByNow,shortfall:0}
  const days=Math.ceil((new Date(`${next.date}T12:00:00`).getTime()-new Date(`${today}T12:00:00`).getTime())/86400000)
  return{state:days<=14?'due-soon':'upcoming',label:`Next payment ${dateLabel(next.date)}`,nextDueDate:next.date,requiredByNow,shortfall:0}
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
}
