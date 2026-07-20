import { Mail, Send } from 'lucide-react'
import type { Player } from '../types'
import { PageHeader } from '../components/PageHeader'
export function EmailsPage({players,onOpen}:{players:Player[];onOpen:(id:string)=>void}){
  const ready=players.filter(p=>p.decision==='Offer planned'||p.decision==='Alternative offer'||p.decision==='Rejection planned')
  const sent=players.filter(p=>p.decision==='Offer sent'||p.decision==='Rejection sent')
  return <><PageHeader title="Email centre" subtitle="See which player emails are ready and which have already been sent."/><section className="email-overview"><div className="panel"><div className="panel-head"><div><span className="eyebrow">READY TO SEND</span><h2>{ready.length} emails prepared</h2></div><Mail/></div><div className="email-list">{ready.length?ready.map(p=><button key={p.id} onClick={()=>onOpen(p.id)}><div className="avatar">{p.name.split(' ').map(x=>x[0]).join('')}</div><div><b>{p.name}</b><span>{p.decision} · {p.appliedTeam}</span></div><Send/></button>):<div className="empty-state compact">No emails are currently waiting.</div>}</div></div><div className="panel"><div className="panel-head"><div><span className="eyebrow">SENT</span><h2>{sent.length} completed emails</h2></div></div><div className="email-list">{sent.map(p=><button key={p.id} onClick={()=>onOpen(p.id)}><div className="avatar">{p.name.split(' ').map(x=>x[0]).join('')}</div><div><b>{p.name}</b><span>{p.decision}</span></div></button>)}</div></div></section></>
}
