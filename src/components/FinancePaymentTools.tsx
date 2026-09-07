import { useMemo, useState } from 'react'
import { AlertTriangle, Banknote, Check, FileText, Landmark, Mail, Plus, ReceiptText, Upload, X } from 'lucide-react'
import type { FinanceCommunicationKind, FinancePayment, FinanceSettings, Player, PlayerFinance, PlayerFinanceMap } from '../types'
import { customPaymentRuleFor, effectiveAmountOwed, emptyPlayerFinance, formatCurrency, outstandingAmount, paymentReferenceFor, recordedAmountPaid } from '../utils/finance'
import { extractStatementCandidates, type StatementCandidate } from '../utils/bankStatement'

type SaveFinance=(finance:PlayerFinance)=>void|Promise<void>
type ReconcileRow=StatementCandidate&{playerId:string;include:boolean}

const referenceKey=(value:string)=>value.replace(/[^a-z0-9]/gi,'').toUpperCase()
const today=()=>new Date().toISOString().slice(0,10)
const dueDateLabel=(date:string)=>date?new Date(`${date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'date to be confirmed'

function financeEmailSchedule(finance:PlayerFinance,amountOwed:number,settings:FinanceSettings){
  if(finance.paymentPlan==='Non paying')return{introduction:'Your account is recorded as Non paying because you are a playing coach or team administrator. No membership fee is due.',lines:'• Amount due: £0.00'}
  if(finance.paymentPlan==='Fully paid'){
    const date=dueDateLabel(settings.fullPaymentDueDate)
    return{introduction:`Your payment arrangement is Fully paid. The full fee of ${formatCurrency(amountOwed)} is due in one payment by ${date}.`,lines:`• Full payment: ${formatCurrency(amountOwed)} due ${date}`}
  }
  if(finance.paymentPlan==='Standing order'){
    const dates=settings.standingOrderDueDates
    if(!dates.length)return{introduction:'Your payment arrangement is Standing order. The collection dates are still to be confirmed.',lines:'• Standing-order dates: to be confirmed'}
    const totalPence=Math.round(amountOwed*100)
    const regularPence=Math.floor(totalPence/dates.length)
    const lines=dates.map((date,index)=>{
      const pence=index===dates.length-1?totalPence-(regularPence*(dates.length-1)):regularPence
      return`• Payment ${index+1}: ${formatCurrency(pence/100)} due ${dueDateLabel(date)}`
    }).join('\n')
    return{introduction:`Your payment arrangement is Standing order. The total fee is split across ${dates.length} scheduled payment${dates.length===1?'':'s'}; only the first payment is due initially.`,lines}
  }
  if(finance.paymentPlan==='Custom'){
    const rule=customPaymentRuleFor(finance,settings)
    if(!rule)return{introduction:'Your custom payment arrangement is still to be confirmed.',lines:'• Custom arrangement: to be confirmed'}
    const dates=rule.dueDates
    if(!dates.length)return{introduction:`Your payment arrangement is ${rule.name}. The payment dates are still to be confirmed.`,lines:`• Total fee: ${formatCurrency(amountOwed)}`}
    const totalPence=Math.round(amountOwed*100)
    const regularPence=Math.floor(totalPence/dates.length)
    const lines=dates.map((date,index)=>`• Payment ${index+1}: ${formatCurrency((index===dates.length-1?totalPence-(regularPence*(dates.length-1)):regularPence)/100)} due ${dueDateLabel(date)}`).join('\n')
    return{introduction:`Your custom payment arrangement is ${rule.name}. The total fee is split across ${dates.length} scheduled payment${dates.length===1?'':'s'}.`,lines}
  }
  const first=Math.round(amountOwed*50)/100
  const second=Math.round((amountOwed-first)*100)/100
  const firstDate=dueDateLabel(settings.instalmentOneDueDate)
  const secondDate=dueDateLabel(settings.instalmentTwoDueDate)
  return{introduction:`Your payment arrangement is 2 instalments. Only the first half of the fee, ${formatCurrency(first)}, is due initially by ${firstDate}; the full ${formatCurrency(amountOwed)} is not due at once.`,lines:`• First instalment: ${formatCurrency(first)} due ${firstDate}\n• Second instalment: ${formatCurrency(second)} due ${secondDate}`}
}

export function StatementReconciliation({players,finances,settings,saveFinance,onClose}:{players:Player[];finances:PlayerFinanceMap;settings:FinanceSettings;saveFinance:SaveFinance;onClose:()=>void}){
  const [rows,setRows]=useState<ReconcileRow[]>([])
  const [filename,setFilename]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [saved,setSaved]=useState(0)
  const chargedPlayers=useMemo(()=>players.filter(player=>finances[player.id]?.paymentReference),[players,finances])
  const existingIds=useMemo(()=>new Set(Object.values(finances).flatMap(finance=>Object.keys(finance.payments||{}))),[finances])
  const chooseFile=async(file:File|undefined)=>{
    setRows([]);setSaved(0);setError('');setFilename(file?.name||'')
    if(!file)return
    setBusy(true)
    try{
      const result=await extractStatementCandidates(file)
      setRows(result.candidates.map(candidate=>{
        const rawKey=referenceKey(`${candidate.reference} ${candidate.description}`)
        const match=chargedPlayers.find(player=>rawKey.includes(referenceKey(finances[player.id].paymentReference)))
        const remaining=match?outstandingAmount(finances[match.id],effectiveAmountOwed(match,finances[match.id],settings)):0
        const safeAmount=Boolean(match)&&candidate.amount<=remaining
        return{...candidate,playerId:match?.id||'',include:safeAmount&&!existingIds.has(candidate.id)}
      }))
    }catch(reason){setError(reason instanceof Error?reason.message:'The PDF could not be read.')}finally{setBusy(false)}
  }
  const change=(id:string,updates:Partial<ReconcileRow>)=>setRows(current=>current.map(row=>row.id===id?{...row,...updates}:row))
  const selected=rows.filter(row=>row.include&&row.playerId&&row.amount>0&&!existingIds.has(row.id))
  const confirm=async()=>{
    if(!selected.length)return
    setBusy(true);setError('')
    try{
      const updates=new Map<string,PlayerFinance>()
      selected.forEach(row=>{
        const current=updates.get(row.playerId)||finances[row.playerId]||emptyPlayerFinance(row.playerId)
        const payment:FinancePayment={id:row.id,date:row.date,amount:row.amount,reference:row.reference||current.paymentReference,description:row.description,source:'statement-pdf',statementName:filename,recordedAt:Date.now()}
        updates.set(row.playerId,{...current,payments:{...current.payments,[payment.id]:payment}})
      })
      for(const finance of updates.values())await saveFinance(finance)
      setSaved(selected.length);setRows(current=>current.map(row=>selected.some(item=>item.id===row.id)?{...row,include:false}:row))
    }catch(reason){setError(reason instanceof Error?reason.message:'The matched payments could not be saved.')}finally{setBusy(false)}
  }
  return <Modal title="Reconcile a PDF statement" eyebrow="BANK STATEMENT" onClose={onClose} wide>
    <div className="statement-import-intro"><Landmark/><div><b>The PDF stays in this browser</b><span>Only payments you approve below are saved. The original document is never uploaded to Firebase.</span></div></div>
    <label className="statement-file-picker"><Upload/>{busy?'Reading statement…':filename||'Choose statement PDF'}<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';void chooseFile(file)}}/></label>
    <p className="statement-format-note">Provisional parser: date, description/reference, transaction amount and balance. Because the supplied example has no visible statement data, verify every amount before importing.</p>
    {error&&<p className="finance-tool-error"><AlertTriangle/>{error}</p>}{saved>0&&<p className="finance-tool-success"><Check/>{saved} payment{saved===1?'':'s'} recorded.</p>}
    {rows.length>0&&<div className="statement-review"><table><thead><tr><th>Use</th><th>Date</th><th>Description / reference</th><th>Money in</th><th>Match to player</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className={existingIds.has(row.id)?'duplicate':''}><td><input type="checkbox" checked={row.include} disabled={existingIds.has(row.id)} onChange={event=>change(row.id,{include:event.target.checked})}/></td><td><input type="date" value={row.date} onChange={event=>change(row.id,{date:event.target.value})}/></td><td><input value={row.description} onChange={event=>change(row.id,{description:event.target.value})}/><small>{row.reference||`PDF page ${row.page}`}</small></td><td><div className="money-input"><span>£</span><input type="number" min="0" step="0.01" value={row.amount||''} onChange={event=>change(row.id,{amount:Number(event.target.value)})}/></div></td><td><select value={row.playerId} onChange={event=>change(row.id,{playerId:event.target.value,include:Boolean(event.target.value)})}><option value="">Unmatched</option>{chargedPlayers.map(player=><option key={player.id} value={player.id}>{player.name} · {finances[player.id].paymentReference}</option>)}</select>{existingIds.has(row.id)&&<small>Already imported</small>}</td></tr>)}</tbody></table></div>}
    <div className="finance-modal-actions"><button className="secondary" onClick={onClose}>Close</button><button className="primary" disabled={busy||!selected.length} onClick={()=>void confirm()}><Check/>Import {selected.length||''} matched payment{selected.length===1?'':'s'}</button></div>
  </Modal>
}

export function PlayerPaymentDrawer({player,finance,settings,clubName,saveFinance,onClose,batchRemaining=0,onStopBatch}:{player:Player;finance:PlayerFinance;settings:FinanceSettings;clubName:string;saveFinance:SaveFinance;onClose:()=>void;batchRemaining?:number;onStopBatch?:()=>void}){
  const [kind,setKind]=useState<FinanceCommunicationKind>('payment-instructions')
  const [personalMessage,setPersonalMessage]=useState('')
  const [manual,setManual]=useState({date:today(),amount:0,reference:'',description:''})
  const [notice,setNotice]=useState('')
  const owed=effectiveAmountOwed(player,finance,settings)
  const paid=recordedAmountPaid(finance)
  const balance=outstandingAmount(finance,owed)
  const reference=finance.paymentReference||paymentReferenceFor(player)
  const bankReady=Boolean(settings.bankAccountName&&settings.sortCode&&settings.accountNumber)
  const latestPayment=Object.values(finance.payments).sort((a,b)=>b.date.localeCompare(a.date)||b.recordedAt-a.recordedAt)[0]
  const createCharge=async()=>{await saveFinance({...finance,paymentReference:reference,chargeCreatedAt:finance.chargeCreatedAt||Date.now()});setNotice('Charge and payment reference created.')}
  const paymentLines=[settings.bankName&&`Bank: ${settings.bankName}`,`Account name: ${settings.bankAccountName}`,`Sort code: ${settings.sortCode}`,`Account number: ${settings.accountNumber}`,`Payment reference: ${reference}`,settings.bankPaymentInstructions].filter(Boolean).join('\n')
  const schedule=financeEmailSchedule(finance,owed,settings)
  const scheduleBlock=`${schedule.introduction}\n\nPayment schedule:\n${schedule.lines}`
  const nonPaying=finance.paymentPlan==='Non paying'
  const firstName=player.name.trim().split(/\s+/)[0]||player.name
  const templates={
    'payment-instructions':nonPaying?{subject:`${clubName} membership fee exemption – ${player.name}`,body:`Hi ${firstName},\n\n${schedule.introduction}\n\nThere is nothing for you to pay.`}:{subject:`${clubName} membership fee – ${player.name}`,body:`Hi ${firstName},\n\nYour total membership fee is ${formatCurrency(owed)}.\n\n${scheduleBlock}\n\nPlease use the following bank details for each payment:\n\n${paymentLines}`},
    'payment-reminder':nonPaying?{subject:`${clubName} membership fee exemption – ${player.name}`,body:`Hi ${firstName},\n\nYour account remains marked as Non paying and there is no outstanding membership balance.`}:{subject:`Reminder: ${formatCurrency(balance)} membership fee outstanding`,body:`Hi ${firstName},\n\nThis is a reminder that ${formatCurrency(balance)} remains outstanding on your ${formatCurrency(owed)} membership fee. We have recorded ${formatCurrency(paid)} so far.\n\n${scheduleBlock}\n\nPlease use the following bank details for each payment:\n\n${paymentLines}`},
    'payment-receipt':{subject:`Receipt for your ${clubName} membership payment`,body:`Hi ${firstName},\n\nThank you. We have recorded your payment${latestPayment?` of ${formatCurrency(latestPayment.amount)} received on ${new Date(`${latestPayment.date}T12:00:00`).toLocaleDateString('en-GB')}`:''}. Your total paid is ${formatCurrency(paid)} and your remaining balance is ${formatCurrency(balance)}.${balance>0?`\n\n${scheduleBlock}`:''}`},
  }[kind]
  const body=[templates.body,personalMessage.trim(),`Kind regards,\n${clubName} Finance Team`,settings.financeContactEmail].filter(Boolean).join('\n\n')
  const openDraft=()=>{window.location.href=`mailto:${encodeURIComponent(player.email)}?${new URLSearchParams({subject:templates.subject,body}).toString()}`}
  const recordSent=async()=>{const id=crypto.randomUUID();await saveFinance({...finance,communications:{...finance.communications,[id]:{id,kind,subject:templates.subject,recordedAt:Date.now()}}});setNotice('Email recorded as sent.')}
  const addManual=async()=>{if(!manual.amount||!manual.date)return;const id=`manual-${crypto.randomUUID()}`;const payment:FinancePayment={id,date:manual.date,amount:manual.amount,reference:manual.reference||reference,description:manual.description||'Manual bank payment',source:'manual',recordedAt:Date.now()};await saveFinance({...finance,payments:{...finance.payments,[id]:payment}});setManual({date:today(),amount:0,reference:'',description:''});setNotice('Manual payment recorded.')}
  return <><button className="finance-drawer-backdrop" aria-label="Close payment details" onClick={onClose}></button><aside className="payment-tools-drawer"><header><div><span className="eyebrow">MEMBERSHIP PAYMENT</span><h2>{player.name}</h2><p>{formatCurrency(paid)} paid · {formatCurrency(balance)} remaining</p></div><button onClick={onClose} aria-label="Close"><X/></button></header><div className="payment-tools-scroll">
    {onStopBatch&&<section className="finance-batch-progress"><div><span className="eyebrow">BATCH PROCESS</span><b>{batchRemaining} player{batchRemaining===1?'':'s'} after this one</b><small>Close this drawer to continue to the next selected player.</small></div><button onClick={onStopBatch}>Stop batch</button></section>}
    {!finance.chargeCreatedAt?<section className="payment-charge-card"><Banknote/><div><h3>Create membership charge</h3><p>{formatCurrency(owed)} · reference <strong>{reference}</strong></p><button className="primary" disabled={!owed} onClick={()=>void createCharge()}><Plus/>Create charge</button></div></section>:<section className="payment-reference-card"><span>Payment reference</span><strong>{reference}</strong><small>Created {new Date(finance.chargeCreatedAt).toLocaleDateString('en-GB')}</small></section>}
    {!bankReady&&!nonPaying&&<p className="finance-tool-error"><AlertTriangle/>Add the club bank account in Settings before drafting payment instructions.</p>}{notice&&<p className="finance-tool-success"><Check/>{notice}</p>}
    <section className="finance-email-tool"><div className="finance-email-tabs"><button className={kind==='payment-instructions'?'selected':''} onClick={()=>setKind('payment-instructions')}>Instructions</button><button className={kind==='payment-reminder'?'selected':''} onClick={()=>setKind('payment-reminder')}>Reminder</button><button className={kind==='payment-receipt'?'selected':''} onClick={()=>setKind('payment-receipt')}>Receipt</button></div><label>Optional personal message<textarea value={personalMessage} onChange={event=>setPersonalMessage(event.target.value)} placeholder="Add a short note…"/></label><div className="finance-email-preview"><b>{templates.subject}</b><pre>{body}</pre></div><div className="finance-email-actions"><button className="secondary" disabled={!player.email||(!bankReady&&!nonPaying&&kind!=='payment-receipt')} onClick={openDraft}><Mail/>Open email draft</button><button className="secondary" onClick={()=>void recordSent()}><Check/>Record sent</button></div></section>
    <section className="manual-payment-card"><h3>Record a payment manually</h3><div><label>Date<input type="date" value={manual.date} onChange={event=>setManual({...manual,date:event.target.value})}/></label><label>Amount<div className="money-input"><span>£</span><input type="number" min="0" step="0.01" value={manual.amount||''} onChange={event=>setManual({...manual,amount:Number(event.target.value)})}/></div></label><label>Reference<input value={manual.reference} onChange={event=>setManual({...manual,reference:event.target.value})} placeholder={reference}/></label><label>Description<input value={manual.description} onChange={event=>setManual({...manual,description:event.target.value})}/></label></div><button className="secondary" disabled={!manual.amount||!manual.date} onClick={()=>void addManual()}><Plus/>Record payment</button></section>
    <section className="payment-ledger"><h3><ReceiptText/>Payment ledger</h3>{Object.values(finance.payments).length?<div>{Object.values(finance.payments).sort((a,b)=>b.date.localeCompare(a.date)).map(payment=><article key={payment.id}><FileText/><span><b>{payment.description}</b><small>{new Date(`${payment.date}T12:00:00`).toLocaleDateString('en-GB')} · {payment.reference}</small></span><strong>{formatCurrency(payment.amount)}</strong></article>)}</div>:<p>No statement or manual payments recorded yet.</p>}{finance.amountPaid>0&&<small>Opening/manual amount carried forward: {formatCurrency(finance.amountPaid)}</small>}</section>
  </div></aside></>
}

function Modal({title,eyebrow,onClose,wide,children}:{title:string;eyebrow:string;onClose:()=>void;wide?:boolean;children:React.ReactNode}){
  return <><button className="finance-modal-backdrop" aria-label="Close" onClick={onClose}></button><section className={`finance-modal ${wide?'wide':''}`} role="dialog" aria-modal="true"><header><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button onClick={onClose} aria-label="Close"><X/></button></header><div className="finance-modal-body">{children}</div></section></>
}
