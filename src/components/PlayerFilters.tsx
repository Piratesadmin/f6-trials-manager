import { Check, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { positions, recommendations } from '../data/constants'
import type { Decision, Recommendation } from '../types'

export type AttendanceFilter = 'all' | 'attended' | 'not-attended'
export type AssessmentFilter = 'all' | 'assessed' | 'not-assessed'

export type PlayerFilterValues = {
  positions: string[]
  attendance: AttendanceFilter
  assessment: AssessmentFilter
  recommendation: Recommendation | 'all'
  decision: Decision | 'all'
  minimumRating: number
}

export const emptyPlayerFilters: PlayerFilterValues = {
  positions: [],
  attendance: 'all',
  assessment: 'all',
  recommendation: 'all',
  decision: 'all',
  minimumRating: 0,
}

export function activeFilterCount(filters: PlayerFilterValues) {
  return filters.positions.length + Number(filters.attendance !== 'all') + Number(filters.assessment !== 'all') + Number(filters.recommendation !== 'all') + Number(filters.decision !== 'all') + Number(filters.minimumRating > 0)
}

type Props = {
  filters: PlayerFilterValues
  setFilters: (filters: PlayerFilterValues) => void
  onClose: () => void
}

const decisions: Decision[] = ['Awaiting decision','Offer planned','Alternative offer','Waiting list planned','Rejection planned','Offer sent','Waiting list sent','Rejection sent']

export function PlayerFilters({ filters, setFilters, onClose }: Props) {
  const togglePosition = (position: string) => setFilters({ ...filters, positions: filters.positions.includes(position) ? filters.positions.filter(item => item !== position) : [...filters.positions, position] })
  const count = activeFilterCount(filters)

  return <section className="player-filter-panel" aria-label="Player filters">
    <header><div><SlidersHorizontal/><div><b>Filter players</b><span>Narrow the list without changing any records.</span></div></div><button onClick={onClose} aria-label="Close player filters"><X/></button></header>
    <div className="filter-section"><b>Playing position</b><div className="position-filter-options">{positions.map(position => <button key={position} className={filters.positions.includes(position) ? 'selected' : ''} onClick={() => togglePosition(position)}>{filters.positions.includes(position) && <Check/>}{position}</button>)}</div></div>
    <div className="filter-grid">
      <label>Attendance<select value={filters.attendance} onChange={event => setFilters({ ...filters, attendance: event.target.value as AttendanceFilter })}><option value="all">Any attendance</option><option value="attended">Attended</option><option value="not-attended">Not attended</option></select></label>
      <label>Assessment<select value={filters.assessment} onChange={event => setFilters({ ...filters, assessment: event.target.value as AssessmentFilter })}><option value="all">Any assessment</option><option value="assessed">Assessed</option><option value="not-assessed">Not assessed</option></select></label>
      <label>Recommendation<select value={filters.recommendation} onChange={event => setFilters({ ...filters, recommendation: event.target.value as Recommendation | 'all' })}><option value="all">Any recommendation</option>{recommendations.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Decision<select value={filters.decision} onChange={event => setFilters({ ...filters, decision: event.target.value as Decision | 'all' })}><option value="all">Any decision</option>{decisions.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <div className="rating-filter"><div><b>Minimum average rating</b><span>{filters.minimumRating ? `${filters.minimumRating}+ stars` : 'Any rating'}</span></div><input aria-label="Minimum average rating" type="range" min="0" max="5" step="1" value={filters.minimumRating} onChange={event => setFilters({ ...filters, minimumRating: Number(event.target.value) })}/><div className="rating-scale"><span>Any</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div>
    <footer><span>{count ? `${count} active filter${count === 1 ? '' : 's'}` : 'No extra filters applied'}</span><button disabled={!count} onClick={() => setFilters(emptyPlayerFilters)}><RotateCcw/>Clear filters</button></footer>
  </section>
}
