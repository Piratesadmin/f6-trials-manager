import { useMemo, useState } from 'react'
import { Check, CheckCircle2, Download, FileText, Search, WalletCards, X } from 'lucide-react'
import { teams } from '../data/constants'
import type { ExpenseClaim, ExpenseStatus } from '../types'
import { expenseClaimReference, expenseStatuses } from '../utils/expenses'
import { formatCurrency } from '../utils/finance'

type Props={claims:ExpenseClaim[];updateStatus:(claim:ExpenseClaim,status:ExpenseStatus)=>Promise<void>}
const csvCell=(value:string|number)=>`"${String(value).replaceAll('"','""')}"`

export function FinanceExpenses({claims,updateStatus}:Props){
  const [query,setQuery]=useState('')
  const [team,setTeam]=useState('All teams')
  const [status,setStatus]=useState<'All statuses'|ExpenseStatus>('All statuses')
  const [busyId,setBusyId]=useState('')
  const sorted=useMemo(()=>[...claims].sort((a,b)=>b.submittedAt-a.submittedAt),[claims])
  const visible=sorted.filter(claim=>{
    const search=query.trim().toLowerCase()
    return (team==='All teams'||(team==='Club-wide'?claim.team==='':claim.team===team))&&(status==='All statuses'||claim.status===status)&&(!search||`${claim.claimantName} ${claim.claimantEmail} ${claim.supplier} ${claim.description} ${claim.category} ${claim.receiptReference}`.toLowerCase().includes(search))
  })
  const totals=(claimStatus:ExpenseStatus)=>claims.filter(claim=>claim.status===claimStatus).reduce((total,claim)=>total+claim.amount,0)
  const changeStatus=async(claim:ExpenseClaim,next:ExpenseStatus)=>{setBusyId(claim.id);try{await updateStatus(claim,next)}finally{setBusyId('')}}
  const exportCsv=()=>{
    const header=['Reference','Submitted','Claimant','Email','Purchase date','Team / area','Category','Supplier','Description','Amount','Receipt reference','Notes','Status','Updated by','Updated at']
    const rows=visible.map(claim=>[expenseClaimReference(claim),new Date(claim.submittedAt).toISOString(),claim.claimantName,claim.claimantEmail,claim.purchaseDate,claim.team||'Club-wide',claim.category,claim.supplier,claim.description,claim.amount.toFixed(2),claim.receiptReference,claim.notes,claim.status,claim.updatedByName,new Date(claim.updatedAt).toISOString()])
    const url=URL.createObjectURL(new Blob([[header,...rows].map(row=>row.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`f6-expenses-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url)
  }
  return <>
    <section className="stats expense-finance-stats"><div><FileText/><span>Submitted</span><b>{formatCurrency(totals('Submitted'))}</b><small>{claims.filter(claim=>claim.status==='Submitted').length} awaiting review</small></div><div><Check/><span>Approved</span><b>{formatCurrency(totals('Approved'))}</b><small>Approved and awaiting payment</small></div><div><CheckCircle2/><span>Paid</span><b>{formatCurrency(totals('Paid'))}</b><small>{claims.filter(claim=>claim.status==='Paid').length} completed claims</small></div><div><X/><span>Rejected</span><b>{claims.filter(claim=>claim.status==='Rejected').length}</b><small>{formatCurrency(totals('Rejected'))} not approved</small></div></section>
    <section className="panel finance-expenses-panel"><div className="finance-expense-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search claimant, supplier or item"/></label><select value={team} onChange={event=>setTeam(event.target.value)}><option>All teams</option><option>Club-wide</option>{teams.map(name=><option key={name}>{name}</option>)}</select><select value={status} onChange={event=>setStatus(event.target.value as typeof status)}><option>All statuses</option>{expenseStatuses.map(name=><option key={name}>{name}</option>)}</select><button className="secondary" disabled={!visible.length} onClick={exportCsv}><Download/>Export</button></div><div className="finance-expense-table-wrap"><table className="finance-expense-table"><thead><tr><th>Claimant</th><th>Purchase</th><th>Supplier / reference</th><th>Amount</th><th>Status</th><th>Finance action</th></tr></thead><tbody>{visible.map(claim=><tr key={claim.id}><td><b>{claim.claimantName}</b><small>{claim.claimantEmail}</small><em>{expenseClaimReference(claim)}</em></td><td><b>{claim.description}</b><small>{new Date(`${claim.purchaseDate}T12:00:00`).toLocaleDateString('en-GB')} · {claim.team||'Club-wide'} · {claim.category}</small>{claim.notes&&<em>{claim.notes}</em>}</td><td><b>{claim.supplier}</b><small>{claim.receiptReference||'No receipt reference supplied'}</small></td><td><strong>{formatCurrency(claim.amount)}</strong></td><td><span className={`expense-status ${claim.status.toLowerCase()}`}>{claim.status}</span>{claim.paidAt&&<small>Paid {new Date(claim.paidAt).toLocaleDateString('en-GB')}</small>}</td><td><div className="expense-finance-actions">{claim.status==='Submitted'&&<><button className="approve" disabled={busyId===claim.id} onClick={()=>void changeStatus(claim,'Approved')}><Check/>Approve</button><button className="reject" disabled={busyId===claim.id} onClick={()=>void changeStatus(claim,'Rejected')}><X/>Reject</button></>}{claim.status==='Approved'&&<><button className="paid" disabled={busyId===claim.id} onClick={()=>void changeStatus(claim,'Paid')}><WalletCards/>Mark paid</button><button className="reject" disabled={busyId===claim.id} onClick={()=>void changeStatus(claim,'Rejected')}><X/>Reject</button></>}{(claim.status==='Paid'||claim.status==='Rejected')&&<span>Complete</span>}</div></td></tr>)}</tbody></table>{!visible.length&&<div className="expense-empty"><FileText/><b>No expense claims match</b><span>New claims appear here as soon as an authorised person submits them.</span></div>}</div></section>
  </>
}
