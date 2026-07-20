import { BarChart3, Cloud, CloudOff, LogOut, Mail, Settings, ShieldCheck, Users } from 'lucide-react'
import type { PageKey, Player, SyncState } from '../types'
import { teams } from '../data/constants'

type Props = {
  page: PageKey
  setPage: (page: PageKey) => void
  players: Player[]
  teamFilter: string
  setTeamFilter: (team: string) => void
  syncState: SyncState
  signedIn: boolean
  onSignOut: () => void
}

const navItems = [
  { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  { key: 'players' as const, label: 'Players', icon: Users },
  { key: 'emails' as const, label: 'Emails', icon: Mail },
  { key: 'teams' as const, label: 'Teams', icon: ShieldCheck },
  { key: 'settings' as const, label: 'Settings', icon: Settings },
]

export function Sidebar({page,setPage,players,teamFilter,setTeamFilter,syncState,signedIn,onSignOut}:Props){
  return <aside className="sidebar">
    <div className="brand"><div className="logo">F6</div><div><b>Trials Manager</b><span>2026 season</span></div></div>
    <nav>{navItems.map(({key,label,icon:Icon})=><button key={key} className={page===key?'active':''} onClick={()=>setPage(key)}><Icon/>{label}</button>)}</nav>
    <div className="team-list"><p>TEAMS</p>{teams.map(team=><button key={team} className={teamFilter===team?'team-active':''} onClick={()=>{setTeamFilter(team);setPage('players')}}>{team}<span>{players.filter(p=>p.appliedTeam===team).length}</span></button>)}</div>
    <div className="account-box"><div className={`sync ${syncState}`}>{syncState==='live'?<Cloud/>:<CloudOff/>}{syncState==='live'?'Live and synced':syncState==='saving'?'Syncing…':'Local demo'}</div>{signedIn&&<button onClick={onSignOut}><LogOut/> Sign out</button>}</div>
  </aside>
}
