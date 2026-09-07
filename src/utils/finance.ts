import type { CustomPaymentRule, FinanceCommunication, FinancePayment, FinanceSettings, PaymentPlan, Player, PlayerFinance } from '../types'
import { confirmedPositionForTeam, confirmedTeamAssignments, confirmedTeamNames } from './player'
import { defaultFinanceForecast, normaliseFinanceForecast } from './financeForecast'

export const paymentPlans: Exclude<PaymentPlan, ''>[] = ['Fully paid', '2 instalments', 'Standing order', 'Non paying', 'Custom']
export const nvlTeams = ['Aces', 'Ravens']
export const defaultFinanceSettings: FinanceSettings = { nvlFee: 0, lvaFee: 0, fullPaymentDueDate: '', instalmentOneDueDate: '', instalmentTwoDueDate: '', standingOrderDueDates: [], customPaymentRules: [], bankName: '', bankAccountName: '', sortCode: '', accountNumber: '', financeContactEmail: '', bankPaymentInstructions: '', forecast: defaultFinanceForecast }

export function confirmedTeam(player: Player) {
  const assignments=confirmedTeamAssignments(player)
  return player.offeredTeam&&assignments[player.offeredTeam]?player.offeredTeam:confirmedTeamNames(player)[0]||''
}

export function confirmedPosition(player: Player, team=confirmedTeam(player)) {
  return team?confirmedPositionForTeam(player,team):player.position||player.offeredPosition||'Unassigned'
}

export function emptyPlayerFinance(playerId: string): PlayerFinance {
  return { playerId, amountOwed: 0, usesStandardFee: true, amountPaid: 0, paymentPlan: '2 instalments', customPaymentRuleId: '', notes: '', paymentReference: '', payments: {}, communications: {} }
}

function safeMoney(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100) / 100) : 0
}

export function normalisePlayerFinance(playerId: string, value: unknown): PlayerFinance {
  const incoming = value && typeof value === 'object' ? value as Partial<PlayerFinance> : {}
  const legacyPlan = (incoming.paymentPlan as unknown) === 'Direct debit' ? 'Standing order' : incoming.paymentPlan
  const paymentPlan: PaymentPlan = paymentPlans.includes(legacyPlan as Exclude<PaymentPlan, ''>) ? legacyPlan as PaymentPlan : '2 instalments'
  const payments=normaliseRecord<FinancePayment>(incoming.payments,item=>{
    if(typeof item.id!=='string'||typeof item.date!=='string'||typeof item.reference!=='string'||typeof item.description!=='string')return null
    const amount=safeMoney(item.amount)
    if(!amount)return null
    return{id:item.id,date:item.date,reference:item.reference,description:item.description,amount,source:item.source==='manual'?'manual':'statement-pdf',recordedAt:typeof item.recordedAt==='number'?item.recordedAt:Date.now(),...(typeof item.statementName==='string'?{statementName:item.statementName}:{}),...(typeof item.recordedBy==='string'?{recordedBy:item.recordedBy}:{})}
  })
  const communications=normaliseRecord<FinanceCommunication>(incoming.communications,item=>{
    if(typeof item.id!=='string'||typeof item.kind!=='string'||!['payment-instructions','payment-reminder','payment-receipt'].includes(item.kind)||typeof item.subject!=='string')return null
    return{id:item.id,kind:item.kind as FinanceCommunication['kind'],subject:item.subject,recordedAt:typeof item.recordedAt==='number'?item.recordedAt:Date.now(),...(typeof item.recordedBy==='string'?{recordedBy:item.recordedBy}:{})}
  })
  return {
    playerId,
    amountOwed: safeMoney(incoming.amountOwed),
    usesStandardFee: typeof incoming.usesStandardFee === 'boolean' ? incoming.usesStandardFee : !safeMoney(incoming.amountOwed),
    amountPaid: safeMoney(incoming.amountPaid),
    paymentPlan,
    customPaymentRuleId: typeof incoming.customPaymentRuleId === 'string' ? incoming.customPaymentRuleId : '',
    notes: typeof incoming.notes === 'string' ? incoming.notes : '',
    paymentReference: typeof incoming.paymentReference === 'string' ? incoming.paymentReference : '',
    payments,
    communications,
    ...(typeof incoming.chargeCreatedAt === 'number' ? {chargeCreatedAt:incoming.chargeCreatedAt} : {}),
    ...(typeof incoming.updatedAt === 'number' ? {updatedAt:incoming.updatedAt} : {}),
    ...(typeof incoming.updatedBy === 'string' ? {updatedBy:incoming.updatedBy} : {}),
  }
}

export function normaliseFinanceSettings(value: unknown): FinanceSettings {
  const incoming = value && typeof value === 'object' ? value as Partial<FinanceSettings> & {directDebitDueDates?:unknown} : {}
  const safeDate=(date:unknown)=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:''
  return {
    nvlFee: safeMoney(incoming.nvlFee),
    lvaFee: safeMoney(incoming.lvaFee),
    fullPaymentDueDate: safeDate(incoming.fullPaymentDueDate),
    instalmentOneDueDate: safeDate(incoming.instalmentOneDueDate),
    instalmentTwoDueDate: safeDate(incoming.instalmentTwoDueDate),
    standingOrderDueDates: Array.isArray(incoming.standingOrderDueDates||incoming.directDebitDueDates) ? [...new Set((incoming.standingOrderDueDates||incoming.directDebitDueDates as unknown[]).map(safeDate).filter(Boolean))].sort() : [],
    customPaymentRules: Array.isArray(incoming.customPaymentRules) ? incoming.customPaymentRules.map((value,index)=>{
      const rule=value&&typeof value==='object'?value as Partial<CustomPaymentRule>:{}
      const feeMode:CustomPaymentRule['feeMode']=rule.feeMode==='fixed'||rule.feeMode==='percentage'?rule.feeMode:'existing'
      return{id:typeof rule.id==='string'&&rule.id?rule.id:`custom-${index+1}`,name:typeof rule.name==='string'&&rule.name.trim()?rule.name.trim():`Custom arrangement ${index+1}`,description:typeof rule.description==='string'?rule.description:'',feeMode,feeValue:feeMode==='percentage'?Math.min(100,safeMoney(rule.feeValue)):safeMoney(rule.feeValue),dueDates:Array.isArray(rule.dueDates)?[...new Set(rule.dueDates.map(safeDate).filter(Boolean))].sort():[]}
    }).slice(0,30) : [],
    bankName: typeof incoming.bankName==='string'?incoming.bankName:'',
    bankAccountName: typeof incoming.bankAccountName==='string'?incoming.bankAccountName:'',
    sortCode: typeof incoming.sortCode==='string'?incoming.sortCode:'',
    accountNumber: typeof incoming.accountNumber==='string'?incoming.accountNumber:'',
    financeContactEmail: typeof incoming.financeContactEmail==='string'?incoming.financeContactEmail:'',
    bankPaymentInstructions: typeof incoming.bankPaymentInstructions==='string'?incoming.bankPaymentInstructions:'',
    forecast: normaliseFinanceForecast(incoming.forecast),
    ...(typeof incoming.updatedAt === 'number' ? {updatedAt:incoming.updatedAt} : {}),
    ...(typeof incoming.updatedBy === 'string' ? {updatedBy:incoming.updatedBy} : {}),
  }
}

function normaliseRecord<T>(value:unknown,normalise:(item:Partial<T>)=>T|null):Record<string,T>{
  if(!value||typeof value!=='object'||Array.isArray(value))return{}
  return Object.entries(value).reduce<Record<string,T>>((result,[key,item])=>{
    if(item&&typeof item==='object'){const next=normalise(item as Partial<T>);if(next)result[key]=next}
    return result
  },{})
}

export function recordedAmountPaid(finance:PlayerFinance){
  return Math.round((finance.amountPaid+Object.values(finance.payments).reduce((total,payment)=>total+payment.amount,0))*100)/100
}

export function paymentReferenceFor(player:Player){
  return `F6-${player.id.replace(/[^a-z0-9]/gi,'').slice(0,10).toUpperCase()}`
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

export function customPaymentRuleFor(finance:PlayerFinance,settings:FinanceSettings){
  return finance.paymentPlan==='Custom'?settings.customPaymentRules.find(rule=>rule.id===finance.customPaymentRuleId):undefined
}

export function effectiveAmountOwed(player: Player, finance: PlayerFinance, settings: FinanceSettings) {
  if(finance.paymentPlan==='Non paying')return 0
  const standardFee=standardFeeForPlayer(player,settings)
  const rule=customPaymentRuleFor(finance,settings)
  if(finance.paymentPlan==='Custom'&&!rule)return 0
  if(rule?.feeMode==='fixed')return rule.feeValue
  if(rule?.feeMode==='percentage')return Math.round(standardFee*rule.feeValue)/100
  return finance.usesStandardFee ? standardFee : finance.amountOwed
}

export function outstandingAmount(finance: PlayerFinance, amountOwed = finance.amountOwed) {
  return Math.max(0, Math.round((amountOwed - recordedAmountPaid(finance)) * 100) / 100)
}

export function paymentStatus(finance: PlayerFinance, amountOwed = finance.amountOwed) {
  if(finance.paymentPlan==='Non paying')return 'Non paying' as const
  if (!amountOwed) return 'Fee not set' as const
  if (recordedAmountPaid(finance) >= amountOwed) return 'Paid' as const
  if (recordedAmountPaid(finance) > 0) return 'Part paid' as const
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
  const amountPaid=recordedAmountPaid(finance)
  if(finance.paymentPlan==='Non paying')return{state:'complete',label:'No payment required',nextDueDate:'',requiredByNow:0,shortfall:0}
  const customRule=customPaymentRuleFor(finance,settings)
  if(finance.paymentPlan==='Custom'&&!customRule)return{state:'none',label:'Custom rule not selected',nextDueDate:'',requiredByNow:0,shortfall:0}
  if(!amountOwed||amountPaid>=amountOwed)return{state:'complete',label:!amountOwed&&customRule?'No payment required by rule':'Paid in full',nextDueDate:'',requiredByNow:amountOwed,shortfall:0}
  const schedule:{date:string;required:number}[]=[]
  if(finance.paymentPlan==='Fully paid'&&settings.fullPaymentDueDate)schedule.push({date:settings.fullPaymentDueDate,required:amountOwed})
  if(finance.paymentPlan==='2 instalments'){
    if(settings.instalmentOneDueDate)schedule.push({date:settings.instalmentOneDueDate,required:Math.round(amountOwed*50)/100})
    if(settings.instalmentTwoDueDate)schedule.push({date:settings.instalmentTwoDueDate,required:amountOwed})
  }
  if(finance.paymentPlan==='Standing order'&&settings.standingOrderDueDates.length){
    settings.standingOrderDueDates.forEach((date,index)=>schedule.push({date,required:Math.round(amountOwed*((index+1)/settings.standingOrderDueDates.length)*100)/100}))
  }
  if(finance.paymentPlan==='Custom'&&customRule?.dueDates.length){
    customRule.dueDates.forEach((date,index)=>schedule.push({date,required:Math.round(amountOwed*((index+1)/customRule.dueDates.length)*100)/100}))
  }
  schedule.sort((a,b)=>a.date.localeCompare(b.date))
  if(!finance.paymentPlan||!schedule.length)return{state:'none',label:finance.paymentPlan?'Dates not set':'Plan not selected',nextDueDate:'',requiredByNow:0,shortfall:0}
  const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const passed=schedule.filter(item=>item.date<today)
  const requiredByNow=passed.at(-1)?.required||0
  const shortfall=Math.max(0,Math.round((requiredByNow-amountPaid)*100)/100)
  if(shortfall>0){const missed=passed.at(-1);return{state:'overdue',label:`${formatCurrency(shortfall)} overdue${missed?` since ${dateLabel(missed.date)}`:''}`,nextDueDate:missed?.date||'',requiredByNow,shortfall}}
  const next=schedule.find(item=>item.date>=today)
  if(!next)return{state:amountPaid>=amountOwed?'complete':'upcoming',label:amountPaid>=amountOwed?'Paid in full':`${formatCurrency(outstandingAmount(finance,amountOwed))} remaining`,nextDueDate:'',requiredByNow,shortfall:0}
  const days=Math.ceil((new Date(`${next.date}T12:00:00`).getTime()-new Date(`${today}T12:00:00`).getTime())/86400000)
  return{state:days<=14?'due-soon':'upcoming',label:`Next payment ${dateLabel(next.date)}`,nextDueDate:next.date,requiredByNow,shortfall:0}
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
}
