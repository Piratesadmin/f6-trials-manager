import {useCallback, useEffect, useMemo, useState} from 'react'
import {AlertTriangle, Check, ClipboardCopy, ExternalLink, FileText, LoaderCircle, RefreshCw, Send, ShieldCheck} from 'lucide-react'
import type {MatchCentreMatch, RefereeInvoice, RefereeInvoiceMap, RefereeInvoiceStatus, RefereeRole, TrialSession} from '../types'
import {getMatchCentre} from '../matchCentre/api'
import {appHashFor} from '../utils/navigation'
import {createRefereeInvoiceLinks, getRefereeInvoiceAttachmentUrl, updateRefereeInvoiceStatus} from '../refereeInvoices/api'
import '../refereeFinance.css'

type Fixture={id:string;date:string;title:string;team:string;opponent:string;venue:string;competition:string}
const roles:RefereeRole[]=['first-referee','second-referee','scorer']
const roleLabels:Record<RefereeRole,string>={'first-referee':'1st referee','second-referee':'2nd referee',scorer:'Scorer'}
const fixtureDate=(date:string)=>{const value=new Date(`${date}T12:00:00`);return Number.isNaN(value.getTime())?date:value.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
const homeTeamFor=(match:MatchCentreMatch)=>match.homeTeam.toLowerCase().includes(match.clubTeam.toLowerCase())||(match.clubTeam==='Aces'&&match.homeTeam==='London Aces')||(match.clubTeam==='Ravens'&&match.homeTeam==='London Ravens')
const safeFixtureId=(value:string)=>`fixture-${value.replace(/[^A-Za-z0-9_-]/g,'-')}`

export function FinanceRefereeInvoices({sessions,invoices,canManage}:{sessions:TrialSession[];invoices:RefereeInvoiceMap;canManage:boolean}){
  const[matches,setMatches]=useState<MatchCentreMatch[]>([])
  const[loading,setLoading]=useState(true)
  const[feedError,setFeedError]=useState('')
  const[busyFixture,setBusyFixture]=useState('')
  const[error,setError]=useState('')
  const[notice,setNotice]=useState('')
  const[links,setLinks]=useState<Record<string,Partial<Record<RefereeRole,string>>>>({})
  const[copyStatus,setCopyStatus]=useState('')
  const[downloading,setDownloading]=useState('')
  const loadMatches=useCallback(async()=>{setLoading(true);setFeedError('');try{setMatches((await getMatchCentre(false)).fixtures)}catch(reason){setFeedError(reason instanceof Error?reason.message:'Official fixtures could not be loaded.')}finally{setLoading(false)}},[])
  useEffect(()=>{void loadMatches()},[loadMatches])
  const fixtures=useMemo(()=>{
    const rows:Fixture[]=[]
    const usedSessionIds=new Set<string>()
    for(const match of matches){
      if(!homeTeamFor(match))continue
      const opponent=match.awayTeam
      const existing=sessions.find(session=>session.eventType==='game'&&session.gameLocation==='Home'&&session.date===match.date&&session.teams.includes(match.clubTeam)&&session.opponent.toLowerCase()===opponent.toLowerCase())
      const id=existing?.id||safeFixtureId(match.id)
      if(existing)usedSessionIds.add(existing.id)
      rows.push({id,date:match.date,title:existing?.title||`${match.homeTeam} vs ${match.awayTeam}`,team:match.clubTeam,opponent,venue:existing?.venue||match.venue,competition:existing?.competition||match.competition})
    }
    for(const session of sessions){
      if(session.eventType!=='game'||session.gameLocation!=='Home'||usedSessionIds.has(session.id)||rows.some(row=>row.date===session.date&&row.team===session.teams[0]&&row.opponent.toLowerCase()===session.opponent.toLowerCase()))continue
      rows.push({id:session.id,date:session.date,title:session.title,team:session.teams[0]||'F6',opponent:session.opponent||'Opponent TBC',venue:session.venue,competition:session.competition})
    }
    return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.team.localeCompare(b.team)||a.opponent.localeCompare(b.opponent))
  },[matches,sessions])
  const createLinks=async(fixture:Fixture)=>{setBusyFixture(fixture.id);setError('');setNotice('');try{const result=await createRefereeInvoiceLinks({fixtureId:fixture.id,fixtureDate:fixture.date,fixtureTitle:fixture.title,team:fixture.team,opponent:fixture.opponent,venue:fixture.venue,competition:fixture.competition});const created=Object.fromEntries(Object.entries(result.links).map(([role,token])=>[role,`${window.location.origin}${window.location.pathname}${appHashFor({page:'referee-invoice',refereeToken:token})}`])) as Partial<Record<RefereeRole,string>>;setLinks(current=>({...current,[fixture.id]:{...current[fixture.id],...created}}));setNotice(Object.keys(created).length?`Share links are ready for ${fixture.title}.`:`There are no outstanding referee links to create for ${fixture.title}.`)}catch(reason){setError(reason instanceof Error?reason.message:'Could not create referee invoice links.')}finally{setBusyFixture('')}}
  const copy=async(fixtureId:string,role:RefereeRole)=>{const value=links[fixtureId]?.[role];if(!value)return;try{await navigator.clipboard.writeText(value);setCopyStatus(`${fixtureId}-${role}`);window.setTimeout(()=>setCopyStatus(''),1800)}catch{setError('Copy was blocked by your browser. Select and copy the link text instead.')}}
  const setStatus=async(invoice:RefereeInvoice,status:RefereeInvoiceStatus)=>{setBusyFixture(invoice.fixtureId);setError('');try{await updateRefereeInvoiceStatus(invoice.fixtureId,invoice.role,status)}catch(reason){setError(reason instanceof Error?reason.message:'Could not update invoice status.')}finally{setBusyFixture('')}}
  const openAttachment=async(invoice:RefereeInvoice,kind:'invoice'|'travel-receipt')=>{const key=`${invoice.fixtureId}-${invoice.role}-${kind}`;setDownloading(key);setError('');try{const url=await getRefereeInvoiceAttachmentUrl(invoice.fixtureId,invoice.role,kind);window.open(url,'_blank','noopener,noreferrer')}catch(reason){setError(reason instanceof Error?reason.message:'Could not open invoice file.')}finally{setDownloading('')}}
  const money=(amount:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(amount||0)
  return <section className="referee-finance-panel">
    <header className="referee-finance-heading"><div><span className="eyebrow">MATCH OFFICIALS</span><h2>Referee invoices</h2><p>Create separate secure invoice links for the first referee, second referee and scorer on each home fixture.</p></div><button className="secondary" onClick={()=>void loadMatches()} disabled={loading}>{loading?<LoaderCircle className="spin"/>:<RefreshCw/>} Refresh fixtures</button></header>
    <div className="referee-finance-security"><ShieldCheck/><span>Invoice files, travel receipts and bank details are private to finance admins.</span></div>
    {error&&<div className="referee-finance-alert error"><AlertTriangle/>{error}</div>}{notice&&<div className="referee-finance-alert success"><Check/>{notice}</div>}{feedError&&<div className="referee-finance-alert warning"><AlertTriangle/>Could not refresh official fixtures: {feedError} Showing home fixtures already on the club schedule.</div>}
    {loading&&!fixtures.length?<div className="referee-finance-empty"><LoaderCircle className="spin"/><b>Loading official home fixtures…</b></div>:!fixtures.length?<div className="referee-finance-empty"><Send/><b>No home fixtures found</b><span>Refresh the Match Centre feed or mark a game as Home in the club schedule.</span></div>:<div className="referee-fixture-list">{fixtures.map(fixture=>{
      const fixtureInvoices=invoices[fixture.id]||{}
      const pending=roles.filter(role=>!fixtureInvoices[role]||fixtureInvoices[role]?.status==='Link ready'||fixtureInvoices[role]?.status==='Rejected')
      return <article className="referee-fixture-card" key={fixture.id}>
        <header><div><span className="eyebrow">{fixtureDate(fixture.date)} · {fixture.team} · HOME</span><h3>{fixture.title}</h3><p>{fixture.competition}{fixture.venue?` · ${fixture.venue}`:''}</p></div><button className="secondary" disabled={!canManage||Boolean(busyFixture)||!pending.length} onClick={()=>void createLinks(fixture)}>{busyFixture===fixture.id?<LoaderCircle className="spin"/>:<Send/>}{pending.some(role=>fixtureInvoices[role])?'Regenerate pending links':'Create 3 invoice links'}</button></header>
        <div className="referee-role-list">{roles.map(role=>{
          const invoice=fixtureInvoices[role]
          const link=links[fixture.id]?.[role]
          const rowBusy=busyFixture===fixture.id
          const invoiceFileKey=`${fixture.id}-${role}-invoice`
          const receiptFileKey=`${fixture.id}-${role}-travel-receipt`
          return <section className="referee-role-row" key={role}>
            <div className="referee-role-label"><span className="referee-role-icon">{role==='scorer'?'S':role==='first-referee'?'1':'2'}</span><div><b>{roleLabels[role]}</b><small>{invoice?.refereeName?`${invoice.refereeName} · ${invoice.email}`:invoice?.status==='Link ready'?'Link issued — awaiting invoice':'Awaiting link'}</small></div></div>
            <div className="referee-role-amount">{invoice&&invoice.status!=='Link ready'?<><strong>{money(invoice.amount)}</strong><small>Fee {money(invoice.feeAmount)}{invoice.travelAmount?` + travel ${money(invoice.travelAmount)}`:''} · Invoice {invoice.invoiceNumber}</small></>:<small>{invoice?.status||'Not started'}</small>}</div>
            <span className={`referee-invoice-status ${String(invoice?.status||'Not started').toLowerCase().replaceAll(' ','-')}`}>{invoice?.status||'Not started'}</span>
            {link&&<div className="referee-share-link"><input aria-label={`${roleLabels[role]} invoice link`} readOnly value={link}/><button className="secondary" onClick={()=>void copy(fixture.id,role)}>{copyStatus===`${fixture.id}-${role}`?<Check/>:<ClipboardCopy/>}{copyStatus===`${fixture.id}-${role}`?'Copied':'Copy link'}</button></div>}
            {invoice?.status!=='Link ready'&&invoice?.bankAccountName&&<div className="referee-bank-summary"><b>Bank details</b><span>{invoice.bankAccountName}</span><span>Sort code {invoice.bankSortCode} · Account {invoice.bankAccountNumber}</span></div>}
            {invoice?.notes&&<p className="referee-invoice-notes">{invoice.notes}</p>}
            {invoice?.attachmentPath&&<button className="referee-attachment-button" disabled={downloading===invoiceFileKey} onClick={()=>void openAttachment(invoice,'invoice')}>{downloading===invoiceFileKey?<LoaderCircle className="spin"/>:<FileText/>}Open {invoice.attachmentName||'invoice document'} <ExternalLink/></button>}
            {invoice?.travelReceiptPath&&<button className="referee-attachment-button" disabled={downloading===receiptFileKey} onClick={()=>void openAttachment(invoice,'travel-receipt')}>{downloading===receiptFileKey?<LoaderCircle className="spin"/>:<FileText/>}Open travel receipt {invoice.travelReceiptName||''} <ExternalLink/></button>}
            {invoice?.status==='Submitted'&&<div className="referee-review-actions"><button className="secondary" disabled={rowBusy||!canManage} onClick={()=>void setStatus(invoice,'Rejected')}>Reject / request changes</button><button className="primary" disabled={rowBusy||!canManage} onClick={()=>void setStatus(invoice,'Approved')}>Approve invoice</button></div>}
            {invoice?.status==='Approved'&&<div className="referee-review-actions"><button className="primary" disabled={rowBusy||!canManage} onClick={()=>void setStatus(invoice,'Paid')}>Mark paid</button></div>}
          </section>
        })}</div>
      </article>
    })}</div>}
  </section>
}
