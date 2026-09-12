import { useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, CheckCircle2, Clock3, Mail, MapPin, Phone, Search, ShieldCheck, UserPlus, Volleyball } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { clubSignupStatusLabel, clubSignupStatuses, type ClubSignup, type ClubSignupStatus } from '../signup/types'
import '../signup/Signup.css'

type Props={signups:ClubSignup[];ready:boolean;loadError:string;readOnly:boolean;updateStatus:(id:string,status:ClubSignupStatus)=>Promise<void>}
const date=(value:number)=>value?new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—'

export function SignupInboxPage({signups,ready,loadError,readOnly,updateStatus}:Props){
  const [status,setStatus]=useState<ClubSignupStatus|'all'>('new')
  const [query,setQuery]=useState('')
  const [selectedId,setSelectedId]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const visible=useMemo(()=>signups.filter(item=>(status==='all'||item.status===status)&&`${item.name} ${item.email} ${item.primaryPosition} ${item.interestedDivisions.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())),[signups,status,query])
  const selected=signups.find(item=>item.id===selectedId)||visible[0]||null
  const counts=Object.fromEntries(clubSignupStatuses.map(value=>[value,signups.filter(item=>item.status===value).length])) as Record<ClubSignupStatus,number>
  const changeStatus=async(next:ClubSignupStatus)=>{if(!selected||readOnly)return;setBusy(true);setError('');try{await updateStatus(selected.id,next)}catch{setError('The sign-up status could not be updated. Please try again.')}finally{setBusy(false)}}
  return <>
    <PageHeader title="Club sign-ups" subtitle="Expressions of interest submitted through the public club form." action={<a className="secondary signup-public-link" href="/signup" target="_blank" rel="noreferrer"><UserPlus/>Open public form</a>}/>
    <section className="signup-manager-stats"><button className={status==='new'?'active':''} onClick={()=>setStatus('new')}><UserPlus/><span>New</span><b>{counts.new}</b></button><button className={status==='contacted'?'active':''} onClick={()=>setStatus('contacted')}><Phone/><span>Contacted</span><b>{counts.contacted}</b></button><button className={status==='closed'?'active':''} onClick={()=>setStatus('closed')}><CheckCircle2/><span>Closed</span><b>{counts.closed}</b></button></section>
    {readOnly&&<div className="signup-readonly"><ShieldCheck/>You can view sign-ups, but this Welfare account cannot change their status.</div>}
    {loadError&&<div className="signup-error signup-load-error">{loadError}</div>}
    <section className="signup-manager-layout panel">
      <aside className="signup-manager-list"><div className="signup-manager-tools"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search sign-ups"/></label><select aria-label="Filter sign-ups" value={status} onChange={event=>setStatus(event.target.value as ClubSignupStatus|'all')}><option value="all">All statuses</option>{clubSignupStatuses.map(value=><option value={value} key={value}>{clubSignupStatusLabel(value)}</option>)}</select></div>{!ready?<div className="signup-manager-empty">Loading sign-ups…</div>:visible.length?visible.map(item=><button key={item.id} className={selected?.id===item.id?'active':''} onClick={()=>setSelectedId(item.id)}>{item.profilePhoto?<img className="signup-list-photo" src={item.profilePhoto} alt=""/>:<span className="signup-list-initials">{item.name.split(' ').map(part=>part[0]).join('').slice(0,2)}</span>}<span><b>{item.name}</b><small>{item.primaryPosition} · {item.interestedDivisions.join(', ')}</small></span><i className={item.status}>{clubSignupStatusLabel(item.status)}</i><time>{date(item.createdAt)}</time></button>):<div className="signup-manager-empty"><UserPlus/><b>No matching sign-ups</b><span>New expressions of interest will appear here.</span></div>}</aside>
      <div className="signup-manager-detail">{selected?<><header><div className="signup-detail-identity">{selected.profilePhoto?<img src={selected.profilePhoto} alt={`${selected.name} profile`}/>:<span>{selected.name.split(' ').map(part=>part[0]).join('').slice(0,2)}</span>}<div><span className={`signup-status ${selected.status}`}>{clubSignupStatusLabel(selected.status)}</span><h2>{selected.name}</h2><p>Submitted {date(selected.createdAt)} · {selected.id}</p></div></div>{!readOnly&&<select value={selected.status} disabled={busy} onChange={event=>void changeStatus(event.target.value as ClubSignupStatus)}>{clubSignupStatuses.map(value=><option value={value} key={value}>{clubSignupStatusLabel(value)}</option>)}</select>}</header>{error&&<div className="signup-error">{error}</div>}
        <div className="signup-contact-actions"><a href={`mailto:${selected.email}`}><Mail/>{selected.email}</a><a href={`tel:${selected.phone}`}><Phone/>{selected.phone}</a></div>
        <section className="signup-detail-section"><h3>Player details</h3><div className="signup-detail-grid"><Detail icon={<CalendarDays/>} label="Date of birth" value={new Date(`${selected.dateOfBirth}T12:00:00`).toLocaleDateString('en-GB',{dateStyle:'long'})}/><Detail icon={<Volleyball/>} label="Playing category" value={selected.playingCategory}/><Detail icon={<Volleyball/>} label="Interested divisions" value={selected.interestedDivisions.join(', ')}/><Detail icon={<Volleyball/>} label="Positions" value={`${selected.primaryPosition}${selected.secondaryPosition?` / ${selected.secondaryPosition}`:''}`}/><Detail icon={<ShieldCheck/>} label="Highest level" value={selected.highestLevelPlayed}/><Detail icon={<MapPin/>} label="Current / recent club" value={selected.currentClub||'Not provided'}/></div></section>
        <TextBlock title="Playing experience" value={selected.playingExperience}/><TextBlock title="Availability" value={selected.availability}/>{selected.notes&&<TextBlock title="Additional information" value={selected.notes}/>} {selected.heardAboutUs&&<TextBlock title="How they heard about us" value={selected.heardAboutUs}/>} {(selected.guardianName||selected.guardianEmail||selected.guardianPhone)&&<section className="signup-detail-section guardian"><h3>Parent or guardian</h3><p><b>{selected.guardianName}</b><span>{selected.guardianEmail} · {selected.guardianPhone}</span></p></section>}
        {selected.handledBy&&<div className="signup-handled"><Clock3/>Last updated by {selected.handledBy} on {date(selected.updatedAt)}</div>}
      </>:<div className="signup-manager-empty detail"><UserPlus/><h2>Select a sign-up</h2><p>Contact details and playing information will appear here.</p></div>}</div>
    </section>
  </>
}

function Detail({icon,label,value}:{icon:ReactNode;label:string;value:string}){return <div>{icon}<span><small>{label}</small><b>{value||'Not provided'}</b></span></div>}
function TextBlock({title,value}:{title:string;value:string}){return <section className="signup-detail-section"><h3>{title}</h3><p>{value}</p></section>}
