import { Check, RotateCcw, SlidersHorizontal, Star, X } from 'lucide-react'
import { positions, recommendations } from '../data/constants'
import type { Decision, Recommendation, TrialResponseStatus, TrialSession } from '../types'
import { formatSessionDate } from '../utils/schedule'

export type AttendanceFilter = 'all' | 'attended' | 'not-attended'
export type AssessmentFilter = 'all' | 'assessed' | 'not-assessed'
export type PaymentFilter = 'all' | 'paid' | 'not-paid'

export type PlayerFilterValues = {
  starredOnly: boolean
  positions: string[]
  attendance: AttendanceFilter
  payment: PaymentFilter
  sessionId: string
  responseStatus: TrialResponseStatus | 'all'
  assessment: AssessmentFilter
  recommendation: Recommendation | 'all'
  decision: Decision | 'all'
  minimumRating: number
}

export const emptyPlayerFilters: PlayerFilterValues = {
  starredOnly: false,
  positions: [],
  attendance: 'all',
  payment: 'all',
  sessionId: 'all',
  responseStatus: 'all',
  assessment: 'all',
  recommendation: 'all',
  decision: 'all',
  minimumRating: 0,
}

export function activeFilterCount(filters: PlayerFilterValues) {
  return Number(filters.starredOnly) + filters.positions.length + Number(filters.attendance !== 'all') + Number(filters.payment !== 'all') + Number(filters.sessionId !== 'all') + Number(filters.responseStatus !== 'all') + Number(filters.assessment !== 'all') + Number(filters.recommendation !== 'all') + Number(filters.decision !== 'all') + Number(filters.minimumRating > 0)
}

type Props = {
  filters: PlayerFilterValues
  setFilters: (filters: PlayerFilterValues) => void
  sessions: TrialSession[]
  onClose: () => void
}

const decisions: Decision[] = ['Awaiting decision','Offer planned','Alternative offer','Waiting list planned','Rejection planned','Offer sent','Offer accepted','Waiting list sent','Rejection sent']

export function PlayerFilters({ filters, setFilters, sessions, onClose }: Props) {
  const togglePosition = (position: string) => setFilters({ ...filters, positions: filters.positions.includes(position) ? filters.positions.filter(item => item !== position) : [...filters.positions, position] })
  const count = activeFilterCount(filters)

  return <section className="player-filter-panel" aria-label="Player filters">
    <header><div><SlidersHorizontal/><div><b>Filter players</b><span>Narrow the list without changing any records.</span></div></div><button onClick={onClose} aria-label="Close player filters"><X/></button></header>
    <div className="filter-section starred-filter"><b>Personal shortlist</b><button className={filters.starredOnly?'selected':''} onClick={()=>setFilters({...filters,starredOnly:!filters.starredOnly})}><Star/>{filters.starredOnly?'Showing my starred players':'Show only my starred players'}{filters.starredOnly&&<Check/>}</button><small>Stars are private to your signed-in individual account.</small></div>
    <div className="filter-section"><b>Playing position</b><div className="position-filter-options">{positions.map(position => <button key={position} className={filters.positions.includes(position) ? 'selected' : ''} onClick={() => togglePosition(position)}>{filters.positions.includes(position) && <Check/>}{position}</button>)}</div></div>
    <div className="filter-grid">
      <label>Trial session<select value={filters.sessionId} onChange={event => setFilters({ ...filters, sessionId: event.target.value })}><option value="all">Any trial session</option><option value="unassigned">Not assigned</option>{[...sessions].filter(session=>session.eventType==='trial').sort((a,b)=>a.date.localeCompare(b.date)).map(session => <option key={session.id} value={session.id}>{formatSessionDate(session.date)} · {session.title}</option>)}</select></label>
      <label>Trial response<select value={filters.responseStatus} onChange={event=>setFilters({...filters,responseStatus:event.target.value as TrialResponseStatus|'all'})}><option value="all">Any response</option><option value="Going">Going</option><option value="Not answered">Not answered</option><option value="Can't go">Can’t go</option><option value="">No response recorded</option></select></label>
      <label>Attendance<select value={filters.attendance} onChange={event => setFilters({ ...filters, attendance: event.target.value as AttendanceFilter })}><option value="all">Any attendance</option><option value="attended">Attended</option><option value="not-attended">Not attended</option></select></label>
      <label>Payment<select value={filters.payment} onChange={event => setFilters({ ...filters, payment: event.target.value as PaymentFilter })}><option value="all">Any payment status</option><option value="paid">Paid</option><option value="not-paid">Not paid</option></select></label>
      <label>Assessment<select value={filters.assessment} onChange={event => setFilters({ ...filters, assessment: event.target.value as AssessmentFilter })}><option value="all">Any assessment</option><option value="assessed">Assessed</option><option value="not-assessed">Not assessed</option></select></label>
      <label>Recommendation<select value={filters.recommendation} onChange={event => setFilters({ ...filters, recommendation: event.target.value as Recommendation | 'all' })}><option value="all">Any recommendation</option>{recommendations.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Decision<select value={filters.decision} onChange={event => setFilters({ ...filters, decision: event.target.value as Decision | 'all' })}><option value="all">Any decision</option>{decisions.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <div className="rating-filter"><div><b>Minimum average rating</b><span>{filters.minimumRating ? `${filters.minimumRating}+ stars` : 'Any rating'}</span></div><input aria-label="Minimum average rating" type="range" min="0" max="5" step="1" value={filters.minimumRating} onChange={event => setFilters({ ...filters, minimumRating: Number(event.target.value) })}/><div className="rating-scale"><span>Any</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div>
    <footer><span>{count ? `${count} active filter${count === 1 ? '' : 's'}` : 'No extra filters applied'}</span><button disabled={!count} onClick={() => setFilters(emptyPlayerFilters)}><RotateCcw/>Clear filters</button></footer>
  </section>
}
