import { ArrowRight, Mail, ShieldCheck, Users } from 'lucide-react'
import type { PageKey, Player } from '../types'
import { PageHeader } from '../components/PageHeader'
import { StatsCards } from '../components/StatsCards'

export function DashboardPage({players,setPage}:{players:Player[];setPage:(page:PageKey)=>void}){
  const recent=[...players].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,5)
  return <><PageHeader title="Trials dashboard" subtitle="A live overview of sign-ups, decisions and team progress." action={<button className="primary" onClick={()=>setPage('players')}>View players</button>}/><StatsCards players={players}/><section className="dashboard-grid"><div className="panel"><div className="panel-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest player updates</h2></div><button className="text-button" onClick={()=>setPage('players')}>Open players <ArrowRight/></button></div><div className="activity-list">{recent.map(p=><div key={p.id} className="activity-row"><div className="avatar">{p.name.split(' ').map(x=>x[0]).join('')}</div><div><b>{p.name}</b><span>{p.appliedTeam} · {p.decision}</span></div><time>{p.updatedAt?new Date(p.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'Sample'}</time></div>)}</div></div><div className="quick-actions"><button onClick={()=>setPage('players')}><Users/><div><b>Review players</b><span>Search, assess and update decisions</span></div><ArrowRight/></button><button onClick={()=>setPage('emails')}><Mail/><div><b>Email centre</b><span>Review offers and rejections</span></div><ArrowRight/></button><button onClick={()=>setPage('teams')}><ShieldCheck/><div><b>Team overview</b><span>See squad progress by team</span></div><ArrowRight/></button></div></section></>
}
