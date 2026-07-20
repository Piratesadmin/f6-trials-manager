import { useState } from 'react'
import { ChevronRight, Filter, Search, Star } from 'lucide-react'
import type { EmailSettings, Player, PlayerTab, TeamPlans } from '../types'
import { teams } from '../data/constants'
import { averageRating } from '../utils/player'
import { PageHeader } from '../components/PageHeader'
import { PlayerProfile } from '../components/PlayerProfile'
import { activeFilterCount, emptyPlayerFilters, PlayerFilters, type PlayerFilterValues } from '../components/PlayerFilters'

type Props = {
  players: Player[]
  selectedId: string
  setSelectedId: (id: string) => void
  query: string
  setQuery: (query: string) => void
  teamFilter: string
  setTeamFilter: (team: string) => void
  save: (player: Player) => void
  onImport: () => void
  activeTab: PlayerTab
  setActiveTab: (tab: PlayerTab) => void
  emailSettings: EmailSettings
  teamPlans: TeamPlans
  markSent: (player: Player) => void | Promise<void>
}

const recommendationClass = (recommendation: Player['recommendation']) => recommendation ? `recommendation-${recommendation.toLowerCase().replaceAll(' ', '-')}` : 'recommendation-none'

export function PlayersPage({ players, selectedId, setSelectedId, query, setQuery, teamFilter, setTeamFilter, save, onImport, activeTab, setActiveTab, emailSettings, teamPlans, markSent }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<PlayerFilterValues>(emptyPlayerFilters)
  const search = query.trim().toLowerCase()
  const filtered = players.filter(player => {
    const matchesTeam = teamFilter === 'All teams' || player.appliedTeam === teamFilter
    const matchesPosition = !filters.positions.length || filters.positions.includes(player.position)
    const matchesAttendance = filters.attendance === 'all' || (filters.attendance === 'attended' ? player.attended : !player.attended)
    const rating = averageRating(player)
    const matchesAssessment = filters.assessment === 'all' || (filters.assessment === 'assessed' ? rating > 0 : rating === 0)
    const matchesRecommendation = filters.recommendation === 'all' || player.recommendation === filters.recommendation
    const matchesDecision = filters.decision === 'all' || player.decision === filters.decision
    const matchesRating = !filters.minimumRating || rating >= filters.minimumRating
    const searchable = `${player.name} ${player.email} ${player.position} ${player.bibNumber} ${player.recommendation}`.toLowerCase()
    return matchesTeam && matchesPosition && matchesAttendance && matchesAssessment && matchesRecommendation && matchesDecision && matchesRating && searchable.includes(search)
  })
  const selected = filtered.find(player => player.id === selectedId) || filtered[0] || players.find(player => player.id === selectedId) || players[0]
  const extraFilterCount = activeFilterCount(filters)

  if (!selected) return <div className="empty-state">No players found.</div>

  const selectPlayer = (id: string) => {
    setSelectedId(id)
    setActiveTab('overview')
  }

  return <>
    <PageHeader title="Players" subtitle="Review profiles, record shared assessments and prepare decisions." action={<button className="primary" onClick={onImport}>+ Import players</button>}/>
    <section className="workspace player-workspace">
      <div className="list-panel">
        <div className="toolbar">
          <label><Search/><input placeholder="Search name, bib or position" value={query} onChange={event => setQuery(event.target.value)}/></label>
          <select value={teamFilter} onChange={event => setTeamFilter(event.target.value)}><option>All teams</option>{teams.map(team => <option key={team}>{team}</option>)}</select>
          <button className={`icon filter-trigger ${filtersOpen || extraFilterCount ? 'active' : ''}`} aria-label="Player filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><Filter/>{extraFilterCount > 0 && <span>{extraFilterCount}</span>}</button>
        </div>
        {filtersOpen && <PlayerFilters filters={filters} setFilters={setFilters} onClose={() => setFiltersOpen(false)}/>} 
        <div className="list-summary"><span>{filtered.length} of {players.length} player{players.length === 1 ? '' : 's'}</span>{(teamFilter !== 'All teams' || extraFilterCount > 0) && <button onClick={() => { setTeamFilter('All teams'); setFilters(emptyPlayerFilters) }}>Clear all filters</button>}</div>
        <div className="rows player-cards">
          {filtered.map(player => {
            const rating = averageRating(player)
            return <button key={player.id} className={`player-row player-card ${selected.id === player.id ? 'selected' : ''}`} onClick={() => selectPlayer(player.id)}>
              <div className="player-rating"><Star/><b>{rating ? rating.toFixed(1) : '—'}</b></div>
              <div className="player-main"><div><b>{player.name}</b>{player.bibNumber && <span className="list-bib">#{player.bibNumber}</span>}</div><span>{player.appliedTeam} · {player.position}</span><small className={`recommendation-badge ${recommendationClass(player.recommendation)}`}>{player.recommendation || player.decision}</small></div>
              <ChevronRight/>
            </button>
          })}
          {!filtered.length && <div className="empty-state compact">No players match these filters.</div>}
        </div>
      </div>
      <PlayerProfile player={selected} players={players} activeTab={activeTab} setActiveTab={setActiveTab} save={save} emailSettings={emailSettings} teamPlans={teamPlans} markSent={markSent}/>
    </section>
  </>
}
