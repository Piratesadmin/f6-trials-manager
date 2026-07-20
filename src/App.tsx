import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { onValue, ref, set, update } from 'firebase/database'
import { auth, database, firebaseConfigured, sharedLoginEmail } from './firebase'
import { defaultEmailSettings, initialPlayers } from './data/constants'
import type { EmailSettings, PageKey, Player, PlayerTab, SyncState, TeamPlans } from './types'
import { normalisePlayer } from './utils/player'
import { createDefaultTeamPlans, normaliseTeamPlans } from './utils/teamPlanner'
import { buildCommunication, normaliseEmailSettings, sentDecisionFor } from './utils/email'
import { Login } from './components/Login'
import { CsvImportModal } from './components/CsvImportModal'
import { Sidebar } from './components/Sidebar'
import { DashboardPage } from './pages/DashboardPage'
import { PlayersPage } from './pages/PlayersPage'
import { EmailsPage } from './pages/EmailsPage'
import { TeamsPage } from './pages/TeamsPage'
import { SettingsPage } from './pages/SettingsPage'
import './App.css'

export default function App(){
  const [user,setUser]=useState<User|null>(null)
  const [authLoading,setAuthLoading]=useState(firebaseConfigured)
  const [demo,setDemo]=useState(!firebaseConfigured)
  const [page,setPage]=useState<PageKey>('dashboard')
  const [players,setPlayers]=useState<Player[]>(()=>{
    const stored = JSON.parse(localStorage.getItem('f6players') || 'null') as Player[] | null
    return (stored || initialPlayers).map(normalisePlayer)
  })
  const [selectedId,setSelectedId]=useState(players[0]?.id||'')
  const [query,setQuery]=useState('')
  const [teamFilter,setTeamFilter]=useState('All teams')
  const [syncState,setSyncState]=useState<SyncState>(firebaseConfigured?'saving':'offline')
  const [importOpen,setImportOpen]=useState(false)
  const [playerTab,setPlayerTab]=useState<PlayerTab>('overview')
  const [teamPlans,setTeamPlans]=useState<TeamPlans>(()=>{
    const stored = JSON.parse(localStorage.getItem('f6teamplans') || 'null') as TeamPlans | null
    return normaliseTeamPlans(stored || createDefaultTeamPlans())
  })
  const [emailSettings,setEmailSettings]=useState<EmailSettings>(()=>{
    const stored = JSON.parse(localStorage.getItem('f6emailsettings') || 'null') as EmailSettings | null
    return normaliseEmailSettings(stored || defaultEmailSettings)
  })

  useEffect(()=>{if(!auth)return;return onAuthStateChanged(auth,u=>{setUser(u);setAuthLoading(false)})},[])
  useEffect(()=>{if(!database||!user||demo)return;const playersRef=ref(database,'players');return onValue(playersRef,snapshot=>{const value=snapshot.val() as Record<string,Omit<Player,'id'>>|null;if(!value){const seed=Object.fromEntries(initialPlayers.map(({id,...p})=>[id,p]));set(playersRef,seed);return}const next=Object.entries(value).map(([id,p])=>normalisePlayer({id,...p} as Player));setPlayers(next);setSelectedId(current=>next.some(p=>p.id===current)?current:(next[0]?.id||''));setSyncState('live')},()=>setSyncState('offline'))},[user,demo])
  useEffect(()=>{if(!database||!user||demo)return;const plansRef=ref(database,'teamPlans');return onValue(plansRef,snapshot=>{const value=snapshot.val() as TeamPlans|null;if(!value){set(plansRef,createDefaultTeamPlans());return}setTeamPlans(normaliseTeamPlans(value));setSyncState('live')},()=>setSyncState('offline'))},[user,demo])
  useEffect(()=>{if(!database||!user||demo)return;const settingsRef=ref(database,'emailSettings');return onValue(settingsRef,snapshot=>{const value=snapshot.val() as EmailSettings|null;if(!value){set(settingsRef,defaultEmailSettings);return}setEmailSettings(normaliseEmailSettings(value));setSyncState('live')},()=>setSyncState('offline'))},[user,demo])

  const save=async(updated:Player)=>{const stamped={...normalisePlayer(updated),updatedAt:Date.now(),updatedBy:user?.email||'Local demo'};if(database&&user&&!demo){setSyncState('saving');const{id,...data}=stamped;await update(ref(database,`players/${id}`),data)}else{const next=players.map(p=>p.id===stamped.id?stamped:p);setPlayers(next);localStorage.setItem('f6players',JSON.stringify(next))}}
  const importPlayers=async(newPlayers:Omit<Player,'id'>[])=>{
    const stamped=newPlayers.map(player=>({...player,id:crypto.randomUUID(),updatedAt:Date.now(),updatedBy:user?.email||'Local demo'}))
    if(database&&user&&!demo){
      setSyncState('saving')
      const updates=Object.fromEntries(stamped.map(({id,...data})=>[`players/${id}`,data]))
      await update(ref(database),updates)
    }else{
      const next=[...players,...stamped]
      setPlayers(next)
      localStorage.setItem('f6players',JSON.stringify(next))
    }
    if(stamped[0])setSelectedId(stamped[0].id)
    setPlayerTab('overview')
    setPage('players')
  }
  const saveTeamTarget=async(team:string,position:string,target:number)=>{
    const next={...teamPlans,[team]:{...teamPlans[team],[position]:target}}
    setTeamPlans(next)
    if(database&&user&&!demo){setSyncState('saving');await set(ref(database,`teamPlans/${team}/${position}`),target)}else{localStorage.setItem('f6teamplans',JSON.stringify(next))}
  }
  const saveEmailSettings=async(settings:EmailSettings)=>{
    const next=normaliseEmailSettings(settings)
    setEmailSettings(next)
    if(database&&user&&!demo){setSyncState('saving');await set(ref(database,'emailSettings'),next)}else{localStorage.setItem('f6emailsettings',JSON.stringify(next))}
  }
  const markEmailSent=async(player:Player)=>{
    const entry=buildCommunication(player,emailSettings,user?.email||'Local demo')
    await save({ ...player, decision: sentDecisionFor(player), emailReviewStatus: 'sent', communicationHistory: { ...player.communicationHistory, [entry.id]: entry } })
  }
  const openPlayer=(id:string,tab:PlayerTab)=>{setSelectedId(id);setPlayerTab(tab);setPage('players')}

  if(authLoading)return <div className="loading-page">Loading F6 Trials Manager…</div>
  if(!user&&!demo)return <Login onDemo={()=>setDemo(true)}/>

  return <div className="app"><Sidebar page={page} setPage={setPage} players={players} teamFilter={teamFilter} setTeamFilter={setTeamFilter} syncState={syncState} signedIn={Boolean(user)} accountEmail={user?.email || undefined} sharedAccount={Boolean(user?.email && user.email === sharedLoginEmail)} onSignOut={()=>auth&&signOut(auth)}/><main>{page==='dashboard'&&<DashboardPage players={players} settings={emailSettings} teamPlans={teamPlans} setPage={setPage}/>} {page==='players'&&<PlayersPage players={players} selectedId={selectedId} setSelectedId={setSelectedId} query={query} setQuery={setQuery} teamFilter={teamFilter} setTeamFilter={setTeamFilter} save={save} onImport={()=>setImportOpen(true)} activeTab={playerTab} setActiveTab={setPlayerTab} emailSettings={emailSettings} teamPlans={teamPlans} markSent={markEmailSent}/>} {page==='emails'&&<EmailsPage players={players} settings={emailSettings} teamPlans={teamPlans} save={save} markSent={markEmailSent} onOpen={id=>openPlayer(id,'email')}/>} {page==='teams'&&<TeamsPage players={players} teamPlans={teamPlans} savePlayer={save} saveTarget={saveTeamTarget} onOpenPlayer={id=>openPlayer(id,'assessment')}/>} {page==='settings'&&<SettingsPage settings={emailSettings} save={saveEmailSettings}/>}</main>{importOpen&&<CsvImportModal existingPlayers={players} onClose={()=>setImportOpen(false)} onImport={importPlayers}/>}</div>
}
