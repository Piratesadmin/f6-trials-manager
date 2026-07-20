import { ChevronRight, Filter, Search, Star } from 'lucide-react'
import type { Player, PlayerTab } from '../types'
import { teams } from '../data/constants'
import { averageRating } from '../utils/player'
import { PageHeader } from '../components/PageHeader'
import { PlayerProfile } from '../components/PlayerProfile'

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
}

const recommendationClass = (recommendation: Player['recommendation']) => recommendation ? `recommendation-${recommendation.toLowerCase().replaceAll(' ', '-')}` : 'recommendation-none'

export function PlayersPage({ players, selectedId, setSelectedId, query, setQuery, teamFilter, setTeamFilter, save, onImport, activeTab, setActiveTab }: Props) {
  const search = query.trim().toLowerCase()
  const filtered = players.filter(player => {
    const matchesTeam = teamFilter === 'All teams' || player.appliedTeam === teamFilter
    const searchable = `${player.name} ${player.email} ${player.position} ${player.bibNumber} ${player.recommendation}`.toLowerCase()
    return matchesTeam && searchable.includes(search)
  })
  const selected = players.find(player => player.id === selectedId) || filtered[0] || players[0]

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
          <button className="icon" aria-label="Player filters"><Filter/></button>
        </div>
        <div className="list-summary"><span>{filtered.length} player{filtered.length === 1 ? '' : 's'}</span>{teamFilter !== 'All teams' && <button onClick={() => setTeamFilter('All teams')}>Clear team filter</button>}</div>
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
      <PlayerProfile player={selected} activeTab={activeTab} setActiveTab={setActiveTab} save={save}/>
    </section>
  </>
}
