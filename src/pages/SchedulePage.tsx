import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, CreditCard, Edit3, FileSpreadsheet, MapPin, Plus, Search, Trash2, UserCheck, Users, X } from 'lucide-react'
import type { Player, TrialSession } from '../types'
import { PageHeader } from '../components/PageHeader'
import { formatSessionDate, sessionTime, trialDateLabel } from '../utils/schedule'

type SessionDraft = Omit<TrialSession, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>
type RosterView = 'assigned' | 'unassigned' | 'all'

type Props = {
  sessions: TrialSession[]
  players: Player[]
  saveSession: (session: TrialSession) => void | Promise<void>
  deleteSession: (sessionId: string) => void | Promise<void>
  savePlayer: (player: Player) => void | Promise<void>
  openPlayer: (playerId: string) => void
  onImport: () => void
}

const blankDraft = (date = ''): SessionDraft => ({ title: 'Trial session', date, startTime: '', endTime: '', venue: '', notes: '' })

export function SchedulePage({ sessions, players, saveSession, deleteSession, savePlayer, openPlayer, onImport }: Props) {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [selectedId, setSelectedId] = useState('')
  const [editor, setEditor] = useState<TrialSession | SessionDraft | null>(null)
  const [query, setQuery] = useState('')
  const [rosterView, setRosterView] = useState<RosterView>('assigned')

  const orderedSessions = useMemo(() => [...sessions].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)), [sessions])
  const selected = orderedSessions.find(session => session.id === selectedId)

  useEffect(() => {
    if (selectedId && sessions.some(session => session.id === selectedId)) return
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const first = orderedSessions.find(session => session.date >= todayKey) || orderedSessions[0]
    if (first) {
      setSelectedId(first.id)
      setYear(Number(first.date.slice(0, 4)) || today.getFullYear())
    }
  }, [orderedSessions, selectedId, sessions, today])

  const assigned = selected ? players.filter(player => player.trialSessionId === selected.id) : []
  const sameDaySessions = selected ? orderedSessions.filter(session => session.date === selected.date) : []
  const paidCount = assigned.filter(player => player.paid).length
  const attendedCount = assigned.filter(player => player.attended).length
  const search = query.trim().toLowerCase()
  const roster = selected ? [...players]
    .filter(player => {
      const isAssigned = player.trialSessionId === selected.id
      const viewMatches = rosterView === 'all' || (rosterView === 'assigned' ? isAssigned : !isAssigned)
      const text = `${player.name} ${player.email} ${player.appliedTeam} ${player.position} ${player.bibNumber}`.toLowerCase()
      return viewMatches && text.includes(search)
    })
    .sort((a, b) => Number(b.trialSessionId === selected.id) - Number(a.trialSessionId === selected.id) || a.name.localeCompare(b.name)) : []

  const openDate = (date: string, dateSessions: TrialSession[]) => {
    if (dateSessions[0]) {
      setSelectedId(dateSessions[0].id)
      setRosterView('assigned')
      return
    }
    setEditor(blankDraft(date))
  }

  const assign = async (player: Player) => {
    if (!selected) return
    const alreadyAssigned = player.trialSessionId === selected.id
    await savePlayer({
      ...player,
      trialSessionId: alreadyAssigned ? '' : selected.id,
      trialDate: alreadyAssigned ? 'Not assigned' : trialDateLabel(selected.date),
      trialResponseStatus: alreadyAssigned ? '' : player.trialResponseStatus === 'Not answered' ? 'Not answered' : 'Going',
      paid: false,
      attended: false,
    })
  }

  const saveEditor = async (draft: TrialSession | SessionDraft) => {
    const session: TrialSession = 'id' in draft ? draft : { ...draft, id: crypto.randomUUID() }
    await saveSession(session)
    setSelectedId(session.id)
    setYear(Number(session.date.slice(0, 4)) || year)
    setEditor(null)
  }

  const removeSession = async () => {
    if (!selected) return
    const message = assigned.length
      ? `Delete ${selected.title}? ${assigned.length} assigned player${assigned.length === 1 ? '' : 's'} will become unassigned.`
      : `Delete ${selected.title}?`
    if (!window.confirm(message)) return
    await deleteSession(selected.id)
    setSelectedId('')
  }

  return <>
    <PageHeader title="Schedule" subtitle="Plan trial dates, build each session roster and track payment and attendance." action={<div className="schedule-header-actions"><button className="secondary" onClick={onImport}><FileSpreadsheet/> Import Excel</button><button className="primary" onClick={() => setEditor(blankDraft())}><Plus/> Add trial session</button></div>}/>

    <section className="schedule-year-toolbar">
      <div><span className="eyebrow">YEARLY CALENDAR</span><h2>{year}</h2></div>
      <div><button aria-label="Previous year" onClick={() => setYear(value => value - 1)}><ChevronLeft/></button><button onClick={() => setYear(today.getFullYear())}>This year</button><button aria-label="Next year" onClick={() => setYear(value => value + 1)}><ChevronRight/></button></div>
    </section>

    <section className="schedule-layout">
      <div className="year-calendar">
        {Array.from({ length: 12 }, (_, month) => <MonthCalendar key={month} year={year} month={month} sessions={orderedSessions} selectedId={selectedId} onSelect={openDate}/>) }
      </div>

      <aside className="session-panel">
        {!selected && <div className="schedule-empty"><CalendarDays/><h3>No session selected</h3><p>Select an existing session or choose an empty calendar day to create one.</p><button className="primary" onClick={() => setEditor(blankDraft())}><Plus/> Add session</button></div>}
        {selected && <>
          {sameDaySessions.length > 1 && <div className="same-day-sessions"><span>Sessions on this day</span><div>{sameDaySessions.map(session=><button key={session.id} className={session.id===selected.id?'active':''} onClick={()=>setSelectedId(session.id)}>{session.startTime||'Any time'} · {session.title}</button>)}</div></div>}
          <header className="session-detail-header"><div><span className="eyebrow">SELECTED SESSION</span><h2>{selected.title}</h2><p><CalendarDays/>{formatSessionDate(selected.date)}</p><p><Clock3/>{sessionTime(selected)}</p>{selected.venue && <p><MapPin/>{selected.venue}</p>}</div><div><button onClick={() => setEditor(selected)} aria-label="Edit session"><Edit3/></button><button className="danger" onClick={removeSession} aria-label="Delete session"><Trash2/></button></div></header>
          {selected.notes && <p className="session-notes">{selected.notes}</p>}
          <div className="session-stats"><div><Users/><b>{assigned.length}</b><span>Assigned</span></div><div><CreditCard/><b>{paidCount}</b><span>Paid</span></div><div><UserCheck/><b>{attendedCount}</b><span>Attended</span></div></div>
          <div className="roster-heading"><div><span className="eyebrow">SESSION ROSTER</span><h3>Players</h3></div><div className="roster-tabs"><button className={rosterView === 'assigned' ? 'active' : ''} onClick={() => setRosterView('assigned')}>Assigned</button><button className={rosterView === 'unassigned' ? 'active' : ''} onClick={() => setRosterView('unassigned')}>Add players</button><button className={rosterView === 'all' ? 'active' : ''} onClick={() => setRosterView('all')}>All</button></div></div>
          <label className="schedule-search"><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, team, position or bib"/></label>
          <div className="session-roster">
            {roster.map(player => {
              const isAssigned = player.trialSessionId === selected.id
              return <div className={`session-player ${isAssigned ? 'assigned' : ''}`} key={player.id}>
                <button className="session-player-name" onClick={() => openPlayer(player.id)}><span className="avatar">{player.name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2)}</span><span><b>{player.name}</b><small>{player.appliedTeam} · {player.position}{player.bibNumber ? ` · #${player.bibNumber}` : ''}</small>{player.trialResponseStatus&&<em className={`rsvp-status ${player.trialResponseStatus==='Going'?'going':player.trialResponseStatus==='Not answered'?'unanswered':'cannot-go'}`}>{player.trialResponseStatus}</em>}</span></button>
                {isAssigned ? <div className="session-player-actions"><button className={`status-toggle ${player.paid ? 'complete' : ''}`} onClick={() => savePlayer({ ...player, paid: !player.paid })}><CreditCard/>{player.paid ? 'Paid' : 'Not paid'}</button><button className={`status-toggle ${player.attended ? 'complete' : ''}`} onClick={() => savePlayer({ ...player, attended: !player.attended })}><UserCheck/>{player.attended ? 'Attended' : 'Not attended'}</button><button className="unassign-button" onClick={() => assign(player)}><X/>Unassign</button></div> : <button className="assign-button" onClick={() => assign(player)}><Plus/>Assign</button>}
              </div>
            })}
            {!roster.length && <div className="empty-state compact">No players match this view.</div>}
          </div>
        </>}
      </aside>
    </section>
    {editor && <SessionEditor session={editor} onClose={() => setEditor(null)} onSave={saveEditor}/>} 
  </>
}

function MonthCalendar({ year, month, sessions, selectedId, onSelect }: { year: number; month: number; sessions: TrialSession[]; selectedId: string; onSelect: (date: string, sessions: TrialSession[]) => void }) {
  const name = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long' })
  const days = new Date(year, month + 1, 0).getDate()
  const leading = (new Date(year, month, 1).getDay() + 6) % 7
  const cells = Array.from({ length: leading + days }, (_, index) => index < leading ? null : index - leading + 1)
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return <section className="month-card"><h3>{name}</h3><div className="month-weekdays">{['M','T','W','T','F','S','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="month-days">{cells.map((day, index) => {
    if (!day) return <span key={`blank-${index}`}></span>
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const daySessions = sessions.filter(session => session.date === date)
    const selected = daySessions.some(session => session.id === selectedId)
    return <button key={date} className={`${daySessions.length ? 'has-session' : ''} ${selected ? 'selected' : ''} ${date === todayKey ? 'today' : ''}`} onClick={() => onSelect(date, daySessions)} aria-label={`${formatSessionDate(date)}${daySessions.length ? `, ${daySessions.length} trial session${daySessions.length === 1 ? '' : 's'}` : ', add trial session'}`}><span>{day}</span>{daySessions.length > 0 && <i>{daySessions.length}</i>}</button>
  })}</div></section>
}

function SessionEditor({ session, onClose, onSave }: { session: TrialSession | SessionDraft; onClose: () => void; onSave: (session: TrialSession | SessionDraft) => void | Promise<void> }) {
  const [draft, setDraft] = useState(session)
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try { await onSave(draft) } finally { setBusy(false) }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="session-modal" onSubmit={submit}><header><div><span className="eyebrow">TRIAL SESSION</span><h2>{'id' in session ? 'Edit session' : 'Add session'}</h2></div><button type="button" onClick={onClose} aria-label="Close session editor"><X/></button></header><div className="session-form-grid"><label className="full-width">Session name<input required value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Women's Division 1 trials"/></label><label>Date<input required type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })}/></label><label>Venue<input value={draft.venue} onChange={event => setDraft({ ...draft, venue: event.target.value })} placeholder="Sports hall or venue"/></label><label>Start time<input type="time" value={draft.startTime} onChange={event => setDraft({ ...draft, startTime: event.target.value })}/></label><label>End time<input type="time" value={draft.endTime} onChange={event => setDraft({ ...draft, endTime: event.target.value })}/></label><label className="full-width">Session notes<textarea value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} placeholder="Arrival instructions, courts, equipment or coach notes…"/></label></div><footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : <><Check/>Save session</>}</button></footer></form></div>
}
