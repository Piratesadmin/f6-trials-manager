import { useEffect, useState } from 'react'
import { ChevronRight, Filter, Search, Star } from 'lucide-react'
import type { Player, PlayerDecisionDraft, PlayerDecisionSaveResult, PlayerStars, PlayerTab, TrialSession } from '../types'
import { teams } from '../data/constants'
import { averageRating } from '../utils/player'
import { PageHeader } from '../components/PageHeader'
import { PlayerProfile } from '../components/PlayerProfile'
import { activeFilterCount, emptyPlayerFilters, PlayerFilters, type PlayerFilterValues } from '../components/PlayerFilters'
import { decisionReminderDetailText, decisionReminderDetails } from '../utils/deadline'
import { confirmedTeam } from '../utils/finance'
import { divisionValues, playerMatchesDivision } from '../utils/division'

type Props = {
  players: Player[]
  sessions: TrialSession[]
  selectedId: string
  openPlayer: (id: string, tab: PlayerTab) => void
  query: string
  setQuery: (query: string) => void
  teamFilter: string
  setTeamFilter: (team: string) => void
  assignedTeams: string[]
  teamDivisions: Record<string,string>
  save: (player: Player) => void
  saveDecision: (playerId: string, expected: PlayerDecisionDraft, next: PlayerDecisionDraft) => Promise<PlayerDecisionSaveResult>
  saveAssessment: (player: Player) => Promise<void>
  onImport: () => void
  activeTab: PlayerTab
  setActiveTab: (tab: PlayerTab) => void
  playerStars: PlayerStars
  currentCoachId: string
  toggleStar: (playerId: string) => void | Promise<void>
  selectedPhoto: string
  uploadPhoto: (player: Player, file: File) => Promise<void>
  removePhoto: (player: Player) => Promise<void>
  trialsMode: boolean
}

const recommendationClass = (recommendation: Player['recommendation']) => recommendation ? `recommendation-${recommendation.toLowerCase().replaceAll(' ', '-')}` : 'recommendation-none'

export function PlayersPage({ players, sessions, selectedId, openPlayer, query, setQuery, teamFilter, setTeamFilter, assignedTeams, teamDivisions, save, saveDecision, saveAssessment, onImport, activeTab, setActiveTab, playerStars, currentCoachId, toggleStar, selectedPhoto, uploadPhoto, removePhoto, trialsMode }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<PlayerFilterValues>(emptyPlayerFilters)
  const [divisionFilter,setDivisionFilter]=useState('assigned')
  useEffect(()=>{if(!trialsMode&&!['overview','assessment'].includes(activeTab))setActiveTab('overview')},[trialsMode,activeTab,setActiveTab])
  const assignedDivisions=Array.from(new Set(assignedTeams.flatMap(team=>{const division=teamDivisions[team]?.trim();return division?[division]:[]})))
  const divisionOptions=Array.from(new Set([...Object.values(teamDivisions),...players.flatMap(player=>divisionValues(player.interestedDivisions))].map(value=>value.trim()).filter(Boolean))).sort((left,right)=>left.localeCompare(right))
  const search = query.trim().toLowerCase()
  const filtered = players.filter(player => {
    const matchesTeam = teamFilter === 'All teams' || (trialsMode ? player.appliedTeam : confirmedTeam(player)) === teamFilter
    const selectedDivision=divisionFilter.startsWith('division:')?divisionFilter.slice('division:'.length):''
    const matchesDivision=divisionFilter==='all'||(divisionFilter==='assigned'?(assignedDivisions.length===0||assignedDivisions.some(division=>playerMatchesDivision(player,division,teamDivisions))):playerMatchesDivision(player,selectedDivision,teamDivisions))
    const matchesStarred = !filters.starredOnly || Boolean(playerStars[player.id])
    const matchesPosition = !filters.positions.length || filters.positions.includes(player.position)
    const matchesAttendance = filters.attendance === 'all' || (filters.attendance === 'attended' ? player.attended : !player.attended)
    const matchesPayment = filters.payment === 'all' || (filters.payment === 'paid' ? player.paid : !player.paid)
    const matchesSession = filters.sessionId === 'all' || (filters.sessionId === 'unassigned' ? !player.trialSessionId : player.trialSessionId === filters.sessionId)
    const matchesResponse = filters.responseStatus === 'all' || player.trialResponseStatus === filters.responseStatus
    const rating = averageRating(player)
    const matchesAssessment = filters.assessment === 'all' || (filters.assessment === 'assessed' ? rating > 0 : rating === 0)
    const matchesRecommendation = filters.recommendation === 'all' || player.recommendation === filters.recommendation
    const matchesDecision = filters.decision === 'all' || player.decision === filters.decision
    const matchesRating = !filters.minimumRating || rating >= filters.minimumRating
    const searchable = `${player.name} ${player.email} ${player.position} ${player.secondaryPosition} ${player.bibNumber} ${player.recommendation} ${player.interestedDivisions} ${player.playingExperience} ${player.highestLevelPlayed} ${player.trialDate}`.toLowerCase()
    return matchesTeam && matchesDivision && matchesStarred && matchesPosition && matchesAttendance && matchesPayment && matchesSession && matchesResponse && matchesAssessment && matchesRecommendation && matchesDecision && matchesRating && searchable.includes(search)
  })
  const selected = filtered.find(player => player.id === selectedId) || filtered[0]
  const extraFilterCount = activeFilterCount(filters)
  useEffect(()=>{
    if(selected&&selected.id!==selectedId)openPlayer(selected.id,activeTab)
  },[selected,selectedId,activeTab,openPlayer])

  const selectPlayer = (id: string) => {
    openPlayer(id,trialsMode ? 'decision' : 'overview')
  }

  return <>
    <PageHeader title="Players" subtitle={trialsMode?'Review profiles, record shared assessments and prepare decisions.':'View and maintain the club’s active player records.'} action={trialsMode?<button className="primary" onClick={onImport}>+ Import players / schedule</button>:undefined}/>
    <section className="workspace player-workspace">
      <div className="list-panel">
        <div className="toolbar">
          <label><Search/><input placeholder="Search name, bib or position" value={query} onChange={event => setQuery(event.target.value)}/></label>
          <select value={teamFilter} onChange={event => setTeamFilter(event.target.value)}><option>All teams</option>{teams.map(team => <option key={team}>{team}</option>)}</select>
          <select className="division-filter" value={divisionFilter} onChange={event=>setDivisionFilter(event.target.value)} aria-label="Filter players by division"><option value="assigned">My Teams</option><option value="all">All divisions</option>{divisionOptions.map(division=><option value={`division:${division}`} key={division}>{division}</option>)}</select>
          <button className={`icon filter-trigger ${filtersOpen || extraFilterCount ? 'active' : ''}`} aria-label="Player filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><Filter/>{extraFilterCount > 0 && <span>{extraFilterCount}</span>}</button>
        </div>
        {filtersOpen && <PlayerFilters filters={filters} setFilters={setFilters} sessions={sessions} onClose={() => setFiltersOpen(false)}/>} 
        <div className="list-summary"><span>{filtered.length} of {players.length} player{players.length === 1 ? '' : 's'}</span>{(teamFilter !== 'All teams' || (divisionFilter!=='all'&&(divisionFilter!=='assigned'||assignedDivisions.length>0)) || extraFilterCount > 0) && <button onClick={() => { setTeamFilter('All teams'); setDivisionFilter('all'); setFilters(emptyPlayerFilters) }}>Clear all filters</button>}</div>
        <div className="rows player-cards">
          {filtered.map(player => {
            const rating = averageRating(player)
            const starred=Boolean(playerStars[player.id])
            const decisionReminder=decisionReminderDetails(player,sessions)
            return <div key={player.id} className={`player-row player-card ${selected?.id === player.id ? 'selected' : ''}`}>
              <button className={`player-star-toggle ${starred?'starred':''}`} aria-label={`${starred?'Remove':'Add'} ${player.name} ${currentCoachId==='local-demo'?'from the demo shortlist':'from my starred players'}`} title={starred?'Remove from my starred players':'Add to my starred players'} onClick={()=>toggleStar(player.id)}><Star/></button>
              <button className="player-card-open" onClick={() => selectPlayer(player.id)}>
                <div className="player-rating"><Star/><b>{rating ? rating.toFixed(1) : '—'}</b></div>
                <div className="player-main"><div><b>{player.name}</b>{player.bibNumber && <span className="list-bib">#{player.bibNumber}</span>}</div><span>{player.appliedTeam} · {player.position}{player.secondaryPosition?` / ${player.secondaryPosition}`:''}{player.trialResponseStatus?` · ${player.trialResponseStatus}`:''}</span>{decisionReminder.state!=='none'?<small className={`decision-reminder-badge ${decisionReminder.state}`} title={decisionReminderDetailText(decisionReminder)}>{decisionReminder.label}</small>:<small className={`recommendation-badge ${player.decision==='Offer accepted'?'recommendation-offer-accepted':recommendationClass(player.recommendation)}`}>{player.decision==='Offer accepted'?'Offer accepted':player.recommendation || player.decision}</small>}</div>
                <ChevronRight/>
              </button>
            </div>
          })}
          {!filtered.length && <div className="empty-state compact">No players match these filters.</div>}
        </div>
      </div>
      {selected?<PlayerProfile player={selected} sessions={sessions} activeTab={activeTab} setActiveTab={setActiveTab} save={save} saveDecision={saveDecision} saveAssessment={saveAssessment} starred={Boolean(playerStars[selected.id])} toggleStar={()=>toggleStar(selected.id)} photo={selectedPhoto||selected.photoUrl} uploadPhoto={uploadPhoto} removePhoto={removePhoto} trialsMode={trialsMode}/>:<div className="empty-state">No players match the selected team, division and filters.</div>}
    </section>
  </>
}
