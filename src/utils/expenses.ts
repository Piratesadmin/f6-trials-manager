import type { ExpenseCategory, ExpenseClaim, ExpenseStatus } from '../types'

export const expenseCategories:ExpenseCategory[]=['Equipment','Kit & clothing','Training supplies','Venue','Travel','Officials','Events','Rewards & awards','Food & refreshments','Medical & first aid','Membership & affiliation','League & registration','Marketing & printing','Technology & software','Professional services','Fundraising','Storage','Other']
export const expenseStatuses:ExpenseStatus[]=['Submitted','Approved','Rejected','Paid']

const text=(value:unknown)=>typeof value==='string'?value:''
const timestamp=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:0
const money=(value:unknown)=>{const amount=Number(value);return Number.isFinite(amount)?Math.max(0,Math.round(amount*100)/100):0}

export function normaliseExpenseClaim(id:string,value:unknown,fallbackUid=''):ExpenseClaim|null{
  if(!value||typeof value!=='object'||Array.isArray(value))return null
  const item=value as Partial<ExpenseClaim>
  const category=expenseCategories.includes(item.category as ExpenseCategory)?item.category as ExpenseCategory:'Other'
  const status=expenseStatuses.includes(item.status as ExpenseStatus)?item.status as ExpenseStatus:'Submitted'
  const claim:ExpenseClaim={
    id,
    claimantUid:text(item.claimantUid)||fallbackUid,
    claimantName:text(item.claimantName),
    claimantEmail:text(item.claimantEmail),
    purchaseDate:text(item.purchaseDate),
    team:text(item.team),
    category,
    supplier:text(item.supplier),
    description:text(item.description),
    amount:money(item.amount),
    receiptReference:text(item.receiptReference),
    notes:text(item.notes),
    status,
    submittedAt:timestamp(item.submittedAt),
    updatedAt:timestamp(item.updatedAt),
    updatedByUid:text(item.updatedByUid),
    updatedByName:text(item.updatedByName),
  }
  if(text(item.decisionNote))claim.decisionNote=text(item.decisionNote)
  if(timestamp(item.decidedAt))claim.decidedAt=timestamp(item.decidedAt)
  if(timestamp(item.paidAt))claim.paidAt=timestamp(item.paidAt)
  return claim.claimantUid&&claim.claimantName&&claim.purchaseDate&&claim.supplier&&claim.description&&claim.amount>0?claim:null
}

export function expenseClaimsFromFirebase(value:unknown):ExpenseClaim[]{
  if(!value||typeof value!=='object'||Array.isArray(value))return[]
  return Object.entries(value as Record<string,unknown>).flatMap(([uid,claims])=>{
    if(!claims||typeof claims!=='object'||Array.isArray(claims))return[]
    return Object.entries(claims as Record<string,unknown>).flatMap(([id,item])=>{const claim=normaliseExpenseClaim(id,item,uid);return claim?[claim]:[]})
  })
}

export function expenseClaimReference(claim:ExpenseClaim){
  return `EXP-${new Date(claim.submittedAt).toISOString().slice(2,10).replaceAll('-','')}-${claim.id.slice(0,6).toUpperCase()}`
}
