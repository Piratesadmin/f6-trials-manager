import { FormEvent, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { onValue, ref, set, update } from 'firebase/database'
import { Users, Mail, Search, Filter, UserCheck, UserX, Clock3, ChevronRight, Copy, CheckCircle2, LogOut, Cloud, CloudOff } from 'lucide-react'
import { auth, database, firebaseConfigured, sharedLoginEmail } from './firebase'
import './App.css'

type Decision = 'Awaiting decision' | 'Offer planned' | 'Alternative offer' | 'Rejection planned' | 'Offer sent' | 'Rejection sent'
type Player = {
  id:string; name:string; email:string; appliedTeam:string; position:string; trialDate:string; attended:boolean; decision:Decision; offeredTeam?:string; offeredPosition?:string; rejectionReason?:string; notes:string; updatedAt?:number; updatedBy?:string
}

const teams = ['Aces','Ravens','Cobras','Coyotes','Llamas','Meerkats','Leopards','Pirates']
const positions = ['Setter','Outside','Middle','Opposite','Libero','All-rounder']
const reasons = ['Very high number of applicants','Limited squad spaces','Position already filled','Team level or profile fit','Training availability does not match','No suitable team currently available']
const initialPlayers: Player[] = [
  {id:'1',name:'Alex Morgan',email:'alex@example.com',appliedTeam:'Cobras',position:'Setter',trialDate:'11 Aug 2026',attended:true,decision:'Awaiting decision',notes:'Good hands and communication.'},
  {id:'2',name:'Jamie Patel',email:'jamie@example.com',appliedTeam:'Ravens',position:'Outside',trialDate:'11 Aug 2026',attended:true,decision:'Offer planned',offeredTeam:'Ravens',offeredPosition:'Outside',notes:'Strong passer.'},
  {id:'3',name:'Sam Taylor',email:'sam@example.com',appliedTeam:'Cobras',position:'Libero',trialDate:'18 Aug 2026',attended:true,decision:'Alternative offer',offeredTeam:'Meerkats',offeredPosition:'Libero',notes:'Better fit for Meerkats.'},
  {id:'4',name:'Jordan Lee',email:'jordan@example.com',appliedTeam:'Pirates',position:'Middle',trialDate:'18 Aug 2026',attended:false,decision:'Awaiting decision',notes:''},
]

function emailFor(p:Player){
  const first=p.name.split(' ')[0]
  if(p.decision==='Offer planned' || p.decision==='Offer sent') return `Hi ${first},\n\nThank you for attending the Flaming Six trials.\n\nWe were really impressed with your performance and would like to offer you a place with ${p.offeredTeam || p.appliedTeam} for the upcoming season, primarily playing as a ${p.offeredPosition || p.position}.\n\nPlease confirm whether you would like to accept your place by [response deadline].\n\nKind regards,\n[Coach name]\nFlaming Six Volleyball Club`
  if(p.decision==='Alternative offer') return `Hi ${first},\n\nThank you for attending the Flaming Six trials and for expressing an interest in joining ${p.appliedTeam}.\n\nAlthough we are unable to offer you a place with ${p.appliedTeam}, we were impressed with your performance and believe you would be a good fit for ${p.offeredTeam || '[alternative team]'}. We would therefore like to offer you a place, primarily as a ${p.offeredPosition || p.position}.\n\nPlease let us know by [response deadline] whether you would like to accept.\n\nKind regards,\n[Coach name]\nFlaming Six Volleyball Club`
  return `Hi ${first},\n\nThank you for attending the Flaming Six trials and for the time and effort you put into the session.\n\n${p.rejectionReason==='Position already filled' ? `Unfortunately, we had a particularly high number of players competing for places in the ${p.position} position.` : p.rejectionReason==='Team level or profile fit' ? 'After reviewing the trial sessions and the particular requirements of our teams, we are unfortunately unable to offer you a place at this time.' : 'We had a very high level of interest and only a limited number of places available. Unfortunately, we are not able to offer you a place for the upcoming season.'}\n\nWe appreciate your interest in Flaming Six and wish you all the best with your volleyball this season.\n\nKind regards,\n[Coach name]\nFlaming Six Volleyball Club`
}

function Login({onDemo}:{onDemo:()=>void}){
  const [pin,setPin]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const submit=async(e:FormEvent)=>{
    e.preventDefault(); setError(''); setBusy(true)
    try{
      if(!auth || !firebaseConfigured) throw new Error('Firebase has not been configured yet.')
      if(!sharedLoginEmail) throw new Error('The shared club login email has not been configured.')
      await signInWithEmailAndPassword(auth,sharedLoginEmail,pin)
      setPin('')
    }catch(err){
      const message=err instanceof Error ? err.message : ''
      if(message.includes('invalid-credential') || message.includes('wrong-password') || message.includes('invalid-login-credentials')) setError('That PIN is incorrect. Please try again.')
      else if(message.includes('too-many-requests')) setError('Too many attempts. Wait a few minutes and try again.')
      else setError(message.replace('Firebase: ','') || 'Unable to unlock the portal.')
    }finally{setBusy(false)}
  }
  return <div className="login-page"><form className="login-card pin-card" onSubmit={submit}><div className="logo login-logo">F6</div><h1>Coach Trials Portal</h1><p>Enter the Flaming Six club PIN to continue.</p>
    <label>Club PIN<input className="pin-input" type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} required autoComplete="current-password" maxLength={12} autoFocus placeholder="••••••" aria-label="Club PIN"/></label>
    {error&&<div className="login-error">{error}</div>}
    <button className="primary login-button" disabled={busy||pin.length<4}>{busy?'Unlocking…':'Open trials manager'}</button>
    <p className="pin-help">Use the shared PIN provided by the club committee.</p>
    {!firebaseConfigured&&<><div className="setup-warning">Firebase is not configured. Add the GitHub repository secrets described in the README.</div><button type="button" className="demo-button" onClick={onDemo}>Open local demo</button></>}
  </form></div>
}

export default function App(){
  const [user,setUser]=useState<User|null>(null)
  const [authLoading,setAuthLoading]=useState(firebaseConfigured)
  const [demo,setDemo]=useState(!firebaseConfigured)
  const [players,setPlayers]=useState<Player[]>(()=>JSON.parse(localStorage.getItem('f6players')||'null')||initialPlayers)
  const [selectedId,setSelectedId]=useState(players[0]?.id || '')
  const [query,setQuery]=useState('')
  const [teamFilter,setTeamFilter]=useState('All teams')
  const [syncState,setSyncState]=useState<'live'|'saving'|'offline'>(firebaseConfigured?'saving':'offline')

  useEffect(()=>{
    if(!auth) return
    return onAuthStateChanged(auth,u=>{setUser(u);setAuthLoading(false)})
  },[])

  useEffect(()=>{
    if(!database || !user || demo) return
    const playersRef=ref(database,'players')
    return onValue(playersRef,snapshot=>{
      const value=snapshot.val() as Record<string,Omit<Player,'id'>>|null
      if(!value){
        const seed=Object.fromEntries(initialPlayers.map(({id,...p})=>[id,p]))
        set(playersRef,seed)
        return
      }
      const next=Object.entries(value).map(([id,p])=>({id,...p}))
      setPlayers(next)
      setSelectedId(current=>next.some(p=>p.id===current)?current:(next[0]?.id||''))
      setSyncState('live')
    },()=>setSyncState('offline'))
  },[user,demo])

  const selected=players.find(p=>p.id===selectedId) || players[0]
  const save=async(updated:Player)=>{
    const stamped={...updated,updatedAt:Date.now(),updatedBy:user?.email||'Local demo'}
    if(database && user && !demo){
      setSyncState('saving')
      const {id,...data}=stamped
      await update(ref(database,`players/${id}`),data)
    }else{
      const next=players.map(p=>p.id===stamped.id?stamped:p)
      setPlayers(next); localStorage.setItem('f6players',JSON.stringify(next))
    }
  }
  const filtered=useMemo(()=>players.filter(p=>(teamFilter==='All teams'||p.appliedTeam===teamFilter)&&(`${p.name} ${p.email} ${p.position}`.toLowerCase().includes(query.toLowerCase()))),[players,query,teamFilter])
  const stats={total:players.length,awaiting:players.filter(p=>p.decision==='Awaiting decision').length,offers:players.filter(p=>p.decision.includes('Offer')).length,rejections:players.filter(p=>p.decision.includes('Rejection')).length}

  if(authLoading) return <div className="loading-page">Loading F6 Trials Manager…</div>
  if(!user&&!demo) return <Login onDemo={()=>setDemo(true)}/>
  if(!selected) return <div className="loading-page">No players found.</div>
  const draft=emailFor(selected)

  return <div className="app">
    <aside><div className="brand"><div className="logo">F6</div><div><b>Trials Manager</b><span>2026 season</span></div></div>
      <nav><button className="active"><Users/> Players</button><button><UserCheck/> Team planner</button><button><Mail/> Emails</button></nav>
      <div className="team-list"><p>TEAMS</p>{teams.map(t=><button key={t} onClick={()=>setTeamFilter(t)}>{t}<span>{players.filter(p=>p.appliedTeam===t).length}</span></button>)}</div>
      <div className="account-box"><div className={`sync ${syncState}`}>{syncState==='live'?<Cloud/>:<CloudOff/>}{syncState==='live'?'Live and synced':syncState==='saving'?'Syncing…':'Local demo'}</div>{user&&<button onClick={()=>auth&&signOut(auth)}><LogOut/> Sign out</button>}</div>
    </aside>
    <main>
      <header><div><h1>Trials dashboard</h1><p>Track every player from sign-up to final decision.</p></div><button className="primary">+ Import players</button></header>
      <section className="stats"><div><Users/><span>Total sign-ups</span><b>{stats.total}</b></div><div><Clock3/><span>Awaiting decision</span><b>{stats.awaiting}</b></div><div><UserCheck/><span>Offers</span><b>{stats.offers}</b></div><div><UserX/><span>Rejections</span><b>{stats.rejections}</b></div></section>
      <section className="workspace">
        <div className="list-panel"><div className="toolbar"><label><Search/><input placeholder="Search players" value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}><option>All teams</option>{teams.map(t=><option key={t}>{t}</option>)}</select><button className="icon"><Filter/></button></div>
          <div className="rows">{filtered.map(p=><button key={p.id} className={`player-row ${selected.id===p.id?'selected':''}`} onClick={()=>setSelectedId(p.id)}><div className="avatar">{p.name.split(' ').map(x=>x[0]).join('')}</div><div className="player-main"><b>{p.name}</b><span>{p.appliedTeam} · {p.position}</span></div><span className={`pill ${p.decision.toLowerCase().replaceAll(' ','-')}`}>{p.decision}</span><ChevronRight/></button>)}</div>
        </div>
        <div className="detail-panel"><div className="profile"><div className="avatar large">{selected.name.split(' ').map(x=>x[0]).join('')}</div><div><h2>{selected.name}</h2><p>{selected.email}</p></div></div>
          <div className="grid"><label>Applied team<select value={selected.appliedTeam} onChange={e=>save({...selected,appliedTeam:e.target.value})}>{teams.map(t=><option key={t}>{t}</option>)}</select></label><label>Primary position<select value={selected.position} onChange={e=>save({...selected,position:e.target.value})}>{positions.map(t=><option key={t}>{t}</option>)}</select></label><label>Decision<select value={selected.decision} onChange={e=>save({...selected,decision:e.target.value as Decision})}>{['Awaiting decision','Offer planned','Alternative offer','Rejection planned','Offer sent','Rejection sent'].map(x=><option key={x}>{x}</option>)}</select></label><label>Attended<select value={selected.attended?'Yes':'No'} onChange={e=>save({...selected,attended:e.target.value==='Yes'})}><option>Yes</option><option>No</option></select></label></div>
          {(selected.decision.includes('Offer')||selected.decision==='Alternative offer')&&<div className="grid conditional"><label>Offered team<select value={selected.offeredTeam||selected.appliedTeam} onChange={e=>save({...selected,offeredTeam:e.target.value})}>{teams.map(t=><option key={t}>{t}</option>)}</select></label><label>Offered position<select value={selected.offeredPosition||selected.position} onChange={e=>save({...selected,offeredPosition:e.target.value})}>{positions.map(t=><option key={t}>{t}</option>)}</select></label></div>}
          {selected.decision.includes('Rejection')&&<label className="full">Rejection reason<select value={selected.rejectionReason||reasons[0]} onChange={e=>save({...selected,rejectionReason:e.target.value})}>{reasons.map(r=><option key={r}>{r}</option>)}</select></label>}
          <label className="full">Coach notes<textarea value={selected.notes} onChange={e=>save({...selected,notes:e.target.value})}/></label>
          <div className="email-card"><div className="email-head"><div><span>EMAIL PREVIEW</span><h3>{selected.decision.includes('Rejection')?'Flaming Six Volleyball Club Trials':'Flaming Six Volleyball Club – Team Offer'}</h3></div><button onClick={()=>navigator.clipboard.writeText(draft)}><Copy/> Copy</button></div><pre>{draft}</pre><button className="send" onClick={()=>save({...selected,decision:selected.decision.includes('Rejection')?'Rejection sent':'Offer sent'})}><CheckCircle2/> Mark email as sent</button></div>
        </div>
      </section>
    </main>
  </div>
}
