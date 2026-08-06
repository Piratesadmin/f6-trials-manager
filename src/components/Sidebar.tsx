import { BarChart3, CalendarDays, Cloud, CloudOff, LogOut, Mail, Settings, ShieldCheck, Users, WalletCards } from 'lucide-react'
import type { CoachRole, PageKey, Player, SyncState } from '../types'
import { teams } from '../data/constants'
import { ClubLogo } from './ClubLogo'

type Props = {
  page: PageKey
  setPage: (page: PageKey) => void
  players: Player[]
  teamFilter: string
  setTeamFilter: (team: string) => void
  syncState: SyncState
  signedIn: boolean
  accountEmail?: string
  sharedAccount: boolean
  assignedTeams: string[]
  isAdmin: boolean
  accountRole: CoachRole | null
  onSignOut: () => void
}

const navItems = [
  { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  { key: 'schedule' as const, label: 'Schedule', icon: CalendarDays },
  { key: 'players' as const, label: 'Players', icon: Users },
  { key: 'emails' as const, label: 'Emails', icon: Mail },
  { key: 'teams' as const, label: 'Teams', icon: ShieldCheck },
  { key: 'finance' as const, label: 'Finance', icon: WalletCards, adminOnly: true },
  { key: 'settings' as const, label: 'Settings', icon: Settings },
]

export function Sidebar({page,setPage,players,teamFilter,setTeamFilter,syncState,signedIn,accountEmail,sharedAccount,assignedTeams,isAdmin,accountRole,onSignOut}:Props){
  return <aside className="sidebar">
    <div className="brand"><ClubLogo/><div><b>Club Manager</b><span>Flaming Six · 2026</span></div></div>
    <nav>{navItems.filter(item=>!item.adminOnly||isAdmin).map(({key,label,icon:Icon})=><button key={key} className={page===key?'active':''} onClick={()=>setPage(key)}><Icon/>{label}</button>)}</nav>
    <div className="team-list"><p>TEAMS</p>{teams.map(team=><button key={team} className={teamFilter===team?'team-active':''} onClick={()=>{setTeamFilter(team);setPage('players')}}>{team}<span>{players.filter(p=>p.appliedTeam===team).length}</span></button>)}</div>
    <div className="account-box"><div className={`sync ${syncState}`}>{syncState==='live'?<Cloud/>:<CloudOff/>}{syncState==='live'?'Live and synced':syncState==='saving'?'Syncing…':'Local demo'}</div>{signedIn&&<div className="signed-in-account"><Users/><span><b>{sharedAccount?'Shared PIN admin':isAdmin?'Administrator':accountRole==='team-admin'?'Team administrator':'Coach account'}</b><small>{accountEmail}</small><small>{isAdmin?'All teams':assignedTeams.length?assignedTeams.join(', '):'No team assigned'}</small></span></div>}{signedIn&&<button onClick={onSignOut}><LogOut/> Sign out</button>}</div>
  </aside>
}
