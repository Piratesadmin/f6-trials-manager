import { useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Clock3, FileText, PoundSterling, ReceiptText, Send, ShieldCheck, XCircle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import type { ExpenseCategory, ExpenseClaim } from '../types'
import { expenseCategories, expenseClaimReference } from '../utils/expenses'
import { formatCurrency } from '../utils/finance'

type ExpenseDraft={purchaseDate:string;team:string;category:ExpenseCategory;supplier:string;description:string;amount:string;receiptReference:string;notes:string}
type Props={claims:ExpenseClaim[];availableTeams:string[];submitClaim:(draft:ExpenseDraft)=>Promise<void>}

const emptyDraft=(team=''):ExpenseDraft=>({purchaseDate:new Date().toISOString().slice(0,10),team,category:'Equipment',supplier:'',description:'',amount:'',receiptReference:'',notes:''})
const statusIcon={Submitted:Clock3,Approved:ShieldCheck,Rejected:XCircle,Paid:CheckCircle2}

export function ExpensesPage({claims,availableTeams,submitClaim}:Props){
  const [draft,setDraft]=useState<ExpenseDraft>(()=>emptyDraft(availableTeams[0]||''))
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState(false)
  const sorted=useMemo(()=>[...claims].sort((a,b)=>b.submittedAt-a.submittedAt),[claims])
  const submitted=claims.filter(claim=>claim.status==='Submitted'||claim.status==='Approved')
  const submit=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setError('');setSuccess(false)
    try{await submitClaim(draft);setDraft(emptyDraft(availableTeams[0]||''));setSuccess(true);window.setTimeout(()=>setSuccess(false),2500)}catch(caught){setError(caught instanceof Error?caught.message:'The expense claim could not be submitted.')}finally{setBusy(false)}
  }
  return <>
    <PageHeader title="Expenses" subtitle="Submit club purchases for the finance team to review and reimburse."/>
    <section className="expense-summary"><div><ReceiptText/><span>Your claims</span><b>{claims.length}</b></div><div><Clock3/><span>Awaiting action</span><b>{submitted.length}</b></div><div><PoundSterling/><span>Awaiting or approved</span><b>{formatCurrency(submitted.reduce((total,claim)=>total+claim.amount,0))}</b></div></section>
    <section className="expense-layout">
      <form className="panel expense-form" onSubmit={submit}><header><div><span className="eyebrow">NEW CLAIM</span><h2>Claim a club expense</h2><p>Submit one purchase per claim. Once submitted, Finance controls its status.</p></div><ReceiptText/></header><div className="expense-form-grid"><label>Purchase date <strong>*</strong><input required type="date" value={draft.purchaseDate} onChange={event=>setDraft({...draft,purchaseDate:event.target.value})}/></label><label>Team / area<select value={draft.team} onChange={event=>setDraft({...draft,team:event.target.value})}><option value="">Club-wide</option>{availableTeams.map(team=><option key={team}>{team}</option>)}</select></label><label>Category <strong>*</strong><select required value={draft.category} onChange={event=>setDraft({...draft,category:event.target.value as ExpenseCategory})}>{expenseCategories.map(category=><option key={category}>{category}</option>)}</select></label><label>Supplier <strong>*</strong><input required maxLength={120} value={draft.supplier} onChange={event=>setDraft({...draft,supplier:event.target.value})} placeholder="Shop, venue or provider"/></label><label className="wide">What was purchased? <strong>*</strong><textarea required maxLength={1000} value={draft.description} onChange={event=>setDraft({...draft,description:event.target.value})} placeholder="Describe the items or service and why they were needed for the club."/></label><label>Amount <strong>*</strong><div className="expense-money"><span>£</span><input required type="number" min="0.01" max="10000" step="0.01" value={draft.amount} onChange={event=>setDraft({...draft,amount:event.target.value})}/></div></label><label>Receipt / invoice reference<input maxLength={160} value={draft.receiptReference} onChange={event=>setDraft({...draft,receiptReference:event.target.value})} placeholder="Receipt number or secure file reference"/></label><label className="wide">Notes<textarea maxLength={1000} value={draft.notes} onChange={event=>setDraft({...draft,notes:event.target.value})} placeholder="Optional reimbursement or approval information"/></label></div>{error&&<p className="expense-message error">{error}</p>}{success&&<p className="expense-message success"><CheckCircle2/>Expense submitted to Finance.</p>}<footer><span>Keep the original receipt or invoice available for the finance team.</span><button className="primary" disabled={busy}><Send/>{busy?'Submitting…':'Submit expense'}</button></footer></form>
      <section className="panel expense-history"><header><div><span className="eyebrow">YOUR HISTORY</span><h2>Submitted expenses</h2></div><strong>{claims.length}</strong></header>{sorted.length?<div>{sorted.map(claim=>{const Icon=statusIcon[claim.status];return <article key={claim.id}><span className={`expense-history-icon ${claim.status.toLowerCase()}`}><Icon/></span><div><b>{claim.description}</b><span>{claim.supplier} · {claim.team||'Club-wide'} · {claim.category}</span><small>{new Date(`${claim.purchaseDate}T12:00:00`).toLocaleDateString('en-GB')} · {expenseClaimReference(claim)}</small>{claim.decisionNote&&<em>{claim.decisionNote}</em>}</div><strong>{formatCurrency(claim.amount)}</strong><span className={`expense-status ${claim.status.toLowerCase()}`}>{claim.status}</span></article>})}</div>:<div className="expense-empty"><FileText/><b>No expenses submitted</b><span>Your claims and their finance status will appear here.</span></div>}</section>
    </section>
  </>
}

export type {ExpenseDraft}
