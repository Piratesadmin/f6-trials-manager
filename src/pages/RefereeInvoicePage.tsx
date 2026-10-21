import {useEffect, useState, type FormEvent} from 'react'
import {AlertTriangle, CheckCircle2, FileText, LoaderCircle, ReceiptText, ShieldCheck, UploadCloud} from 'lucide-react'
import {getRefereeInvoiceInvite, submitRefereeInvoice, type RefereeInvoiceAttachment, type RefereeInvoiceInvite} from '../refereeInvoices/api'
import {ClubLogo} from '../components/ClubLogo'
import '../refereeInvoices.css'

function readFile(file:File){
  return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read that file.'));reader.onload=()=>{const value=String(reader.result||'');const comma=value.indexOf(',');if(comma<0)reject(new Error('The file could not be prepared.'));else resolve(value.slice(comma+1))};reader.readAsDataURL(file)})
}

export function RefereeInvoicePage({token}:{token:string}){
  const[invite,setInvite]=useState<RefereeInvoiceInvite|null>(null)
  const[loading,setLoading]=useState(true)
  const[busy,setBusy]=useState(false)
  const[error,setError]=useState('')
  const[done,setDone]=useState(false)
  const[travelReceipt,setTravelReceipt]=useState<File|null>(null)
  const[claimTravel,setClaimTravel]=useState(false)
  const[refereeName,setRefereeName]=useState('')
  const[email,setEmail]=useState('')
  const[feeAmount,setFeeAmount]=useState('')
  const[travelAmount,setTravelAmount]=useState('')
  const[bankAccountName,setBankAccountName]=useState('')
  const[bankSortCode,setBankSortCode]=useState('')
  const[bankAccountNumber,setBankAccountNumber]=useState('')
  const[notes,setNotes]=useState('')
  useEffect(()=>{let active=true;setLoading(true);getRefereeInvoiceInvite(token).then(result=>{if(active)setInvite(result)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'This invoice link could not be opened.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[token])
  const onReceipt=(selected:File|null)=>{setError('');if(!selected){setTravelReceipt(null);return}if(!['application/pdf','image/jpeg','image/png'].includes(selected.type)){setError('Choose a PDF, JPEG or PNG receipt.');return}if(selected.size>2*1024*1024){setError('The receipt must be 2 MB or smaller.');return}setTravelReceipt(selected)}
  const submit=async(event:FormEvent)=>{event.preventDefault();if(!invite||!token)return;setBusy(true);setError('');try{let travelReceiptUpload:RefereeInvoiceAttachment|undefined;if(claimTravel&&travelReceipt)travelReceiptUpload={name:travelReceipt.name,contentType:travelReceipt.type,base64:await readFile(travelReceipt)};await submitRefereeInvoice(token,{refereeName,email,feeAmount:Number(feeAmount),travelAmount:claimTravel?Number(travelAmount):0,bankAccountName,bankSortCode,bankAccountNumber,notes,...(travelReceiptUpload?{travelReceipt:travelReceiptUpload}:{})});setDone(true)}catch(reason){setError(reason instanceof Error?reason.message:'Your invoice could not be submitted. Please try again.')}finally{setBusy(false)}}
  const alreadySubmitted=done||invite?.submitted
  const invoiceDate=invite?new Date(`${invite.fixtureDate}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):''
  return <main className="referee-invoice-public">
    <header className="referee-invoice-brand"><ClubLogo variant="sidebar"/><span>FLAMING SIX VOLLEYBALL CLUB</span></header>
    <section className="referee-invoice-form-card">
      {loading?<div className="referee-invoice-state"><LoaderCircle className="spin"/><b>Checking your invoice link…</b></div>:error&&!invite?<div className="referee-invoice-state error"><AlertTriangle/><h1>Link unavailable</h1><p>{error}</p><span>Contact the club finance team to request a new link.</span></div>:alreadySubmitted?<div className="referee-invoice-state success"><CheckCircle2/><span className="eyebrow">INVOICE RECEIVED</span><h1>Thank you, {invite?.roleLabel.toLowerCase()}.</h1><p>Your invoice for <b>{invite?.fixtureTitle}</b> has been sent to the F6 finance team.</p><small>You can close this page. Contact the finance team if you need to change anything.</small></div>:invite?<>
        <header><span className="eyebrow">REFEREE INVOICE SUBMISSION</span><h1>Submit your invoice</h1><p>Enter your match fee and payment details. Travel can be claimed separately with a receipt.</p></header>
        <section className="referee-invoice-fixture"><ReceiptText/><div><b>{invite.fixtureTitle}</b><span>{invoiceDate} · {invite.team} · {invite.roleLabel}</span>{invite.competition&&<small>{invite.competition}{invite.venue?` · ${invite.venue}`:''}</small>}</div></section>
        <form onSubmit={event=>void submit(event)}>
          <label>Your full name<input autoComplete="name" required minLength={2} maxLength={120} value={refereeName} onChange={event=>setRefereeName(event.target.value)}/></label>
          <label>Email address<input type="email" autoComplete="email" required maxLength={200} value={email} onChange={event=>setEmail(event.target.value)}/></label>
          <div className="referee-invoice-fields"><label>Invoice number<input readOnly value={invite.invoiceNumber}/></label><label>Match fee (£)<input required type="number" min="0.01" max="10000" step="0.01" value={feeAmount} onChange={event=>setFeeAmount(event.target.value)}/></label></div>
          <section className="referee-travel-claim">
            <label className="referee-travel-toggle"><input type="checkbox" checked={claimTravel} onChange={event=>{setClaimTravel(event.target.checked);if(!event.target.checked){setTravelAmount('');setTravelReceipt(null)}}}/><span><b>Claim travel expenses</b><small>Optional · added to your match fee</small></span></label>
            {claimTravel&&<div className="referee-travel-details"><label>Travel amount (£)<input required type="number" min="0.01" max="10000" step="0.01" value={travelAmount} onChange={event=>setTravelAmount(event.target.value)}/></label><div className="referee-file-field"><label>Receipt / proof <small>Required for travel claims · PDF, JPEG or PNG · up to 2 MB</small><span className="referee-invoice-upload"><UploadCloud/><span>{travelReceipt?travelReceipt.name:'Choose travel receipt'}</span><input type="file" accept="application/pdf,image/jpeg,image/png" required onChange={event=>onReceipt(event.target.files?.[0]||null)}/></span></label>{travelReceipt&&<span className="referee-invoice-file"><FileText/>{travelReceipt.name}<button type="button" onClick={()=>onReceipt(null)}>Remove</button></span>}</div></div>}
          </section>
          <fieldset className="referee-bank-details"><legend>Bank details for payment</legend><p>Visible only to club finance administrators.</p><label>Account holder name<input autoComplete="cc-name" required minLength={2} maxLength={120} value={bankAccountName} onChange={event=>setBankAccountName(event.target.value)}/></label><div className="referee-invoice-fields"><label>Sort code<input inputMode="numeric" autoComplete="off" required minLength={6} maxLength={8} placeholder="12-34-56" value={bankSortCode} onChange={event=>setBankSortCode(event.target.value)}/></label><label>Account number<input inputMode="numeric" autoComplete="off" required minLength={8} maxLength={10} placeholder="12345678" value={bankAccountNumber} onChange={event=>setBankAccountNumber(event.target.value)}/></label></div></fieldset>
          <label>Additional details <small>Optional</small><textarea maxLength={1200} rows={3} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Add a note for the finance team"/></label>
          {error&&<div className="referee-invoice-error"><AlertTriangle/>{error}</div>}
          <div className="referee-invoice-privacy"><ShieldCheck/><span>Bank details and travel receipts are securely shared with the club finance team for payment processing.</span></div>
          <button className="primary" disabled={busy}>{busy?<><LoaderCircle className="spin"/> Sending invoice…</>:<><ReceiptText/> Submit invoice</>}</button>
        </form>
      </>:null}
    </section>
    <footer className="referee-invoice-footer">This link is personal to your match official role. Please don’t forward it.</footer>
  </main>
}
