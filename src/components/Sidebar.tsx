import { Archive, BarChart3, CalendarDays, Cloud, CloudOff, History, LogOut, Mail, Settings, ShieldCheck, Users, WalletCards } from 'lucide-react'
import type { CoachRole, PageKey, Player, SyncState } from '../types'
import { teams } from '../data/constants'
import { ClubLogo } from './ClubLogo'
import { confirmedTeam } from '../utils/finance'
import { teamMatchesInterestedDivisions } from '../utils/division'

type Props = {
  page: PageKey
  setPage: (page: PageKey) => void
  players: Player[]
  selectedTeam: string
  openTeam: (team: string) => void
  syncState: SyncState
  signedIn: boolean
  accountEmail?: string
  accountName?: string
  sharedAccount: boolean
  assignedTeams: string[]
  isAdmin: boolean
  accountRole: CoachRole | null
  currentSeason: string
  trialsMode: boolean
  onSignOut: () => void
  teamDivisions: Record<string,string>
}

const navItems = [
  { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  { key: 'schedule' as const, label: 'Schedule', icon: CalendarDays },
  { key: 'players' as const, label: 'Players', icon: Users },
  { key: 'emails' as const, label: 'Emails', icon: Mail },
  { key: 'teams' as const, label: 'Teams', icon: ShieldCheck },
  { key: 'finance' as const, label: 'Finance', icon: WalletCards, adminOnly: true },
  { key: 'activity' as const, label: 'Activity', icon: History, adminOnly: true },
  { key: 'archive' as const, label: 'Seasons', icon: Archive, adminOnly: true },
  { key: 'settings' as const, label: 'Settings', icon: Settings, adminOnly: true },
]

export function Sidebar({page,setPage,players,selectedTeam,openTeam,syncState,signedIn,accountEmail,accountName,sharedAccount,assignedTeams,isAdmin,accountRole,currentSeason,trialsMode,onSignOut,teamDivisions}:Props){
  return <aside className="sidebar">
    <div className="brand"><ClubLogo/><div><b>Club Manager</b><span>Flaming Six · {currentSeason}</span><em className={`sidebar-mode ${trialsMode?'trials':'season'}`}>{trialsMode?'Trials Mode':'Club Mode'}</em></div></div>
    <nav>{navItems.filter(item=>(!item.adminOnly||isAdmin)&&(trialsMode||item.key!=='emails')).map(({key,label,icon:Icon})=><button key={key} className={page===key?'active':''} onClick={()=>setPage(key)}><Icon/>{label}</button>)}{signedIn&&<button className="mobile-sign-out" onClick={onSignOut} aria-label="Sign out" title="Sign out"><LogOut/>Sign out</button>}</nav>
    <div className="team-list"><p>TEAMS</p>{teams.map(team=><button key={team} className={page==='teams'&&selectedTeam===team?'team-active':''} onClick={()=>openTeam(team)}>{team}<span>{players.filter(player=>trialsMode?(player.suitableTeams.includes(team)||teamMatchesInterestedDivisions(player,team,teamDivisions)):confirmedTeam(player)===team).length}</span></button>)}</div>
    <div className="account-box"><div className={`sync ${syncState}`}>{syncState==='live'?<Cloud/>:<CloudOff/>}{syncState==='live'?'Live and synced':syncState==='saving'?'Syncing…':'Local demo'}</div>{signedIn&&<div className="signed-in-account"><Users/><span><b>{sharedAccount?'Shared PIN admin':accountName||(isAdmin?'Administrator':accountRole==='team-admin'?'Team administrator':'Coach account')}</b>{accountName&&!sharedAccount&&<small>{isAdmin?'Administrator':accountRole==='team-admin'?'Team administrator':'Coach'}</small>}<small>{accountEmail}</small><small>{isAdmin?'All teams':assignedTeams.length?assignedTeams.join(', '):'No team assigned'}</small></span></div>}{signedIn&&<button onClick={onSignOut}><LogOut/> Sign out</button>}</div>
  </aside>
}
