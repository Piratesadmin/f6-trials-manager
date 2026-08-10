import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CalendarDays, ChevronRight, ClipboardList, Dumbbell, Trophy, UserRoundCheck, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Player, TrialSession } from '../types'
import { eventTypeLabel, formatSessionDate, localDate, sessionTime } from '../utils/schedule'

type Props = {
  players: Player[]
  sessions: TrialSession[]
  assignedTeams: string[]
  isAdmin: boolean
  openPlayer: (playerId: string) => void
  openSchedule: (sessionId: string) => void
}

type PlayerNotification = {
  id: string
  playerId: string
  title: string
  detail: string
  teams: string[]
  updatedAt: number
}

type SessionNotification = {
  id: string
  sessionId: string
  title: string
  detail: string
  timing: string
  eventType: TrialSession['eventType']
  startsAt: number
}

const resolvedDecisions = new Set(['Offer accepted', 'Offer sent', 'Rejection sent', 'Waiting list sent'])
const offerRecommendations = new Set(['Strong offer', 'Offer'])

function eventIcon(type: TrialSession['eventType']) {
  if (type === 'training') return <Dumbbell/>
  if (type === 'game') return <Trophy/>
  return <ClipboardList/>
}

function dayTiming(date: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = localDate(date)
  eventDate.setHours(0, 0, 0, 0)
  const days = Math.round((eventDate.getTime() - today.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

function buildPlayerNotifications(players: Player[], assignedTeams: string[], isAdmin: boolean) {
  return players.flatMap<PlayerNotification>(player => {
    if (resolvedDecisions.has(player.decision)) return []
    const candidateTeams = isAdmin
      ? Array.from(new Set([player.appliedTeam, ...player.suitableTeams])).filter(Boolean)
      : assignedTeams
    const relevantTeams = candidateTeams.filter(team => {
      if (player.teamConsideration[team]) return false
      const referred = player.suitableTeams.includes(team) && player.appliedTeam !== team
      const recommended = offerRecommendations.has(player.recommendation) && (player.appliedTeam === team || player.suitableTeams.includes(team))
      return referred || recommended
    })
    if (!relevantTeams.length) return []
    const referrals = relevantTeams.filter(team => player.suitableTeams.includes(team) && player.appliedTeam !== team)
    const teamLabel = relevantTeams.join(' & ')
    const title = referrals.length
      ? `${player.name} referred to ${referrals.join(' & ')}`
      : `${player.name} recommended for ${teamLabel}`
    const detail = `${player.position} · ${player.appliedTeam} applicant · ${player.recommendation || 'Team referral'}`
    return [{ id: `player-${player.id}-${relevantTeams.join('-')}`, playerId: player.id, title, detail, teams: relevantTeams, updatedAt: player.updatedAt || 0 }]
  }).sort((a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title))
}

function buildSessionNotifications(sessions: TrialSession[], assignedTeams: string[], isAdmin: boolean) {
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const through = new Date(today)
  through.setDate(through.getDate() + 7)
  return sessions.flatMap<SessionNotification>(session => {
    if (!session.date) return []
    const eventDate = localDate(session.date)
    if (eventDate < today || eventDate > through) return []
    const relevant = isAdmin || session.eventType === 'trial' || !session.teams.length || session.teams.some(team => assignedTeams.includes(team))
    if (!relevant) return []
    const startsAt = new Date(`${session.date}T${session.startTime || '23:59'}:00`).getTime()
    const endsAt = new Date(`${session.date}T${session.endTime || session.startTime || '23:59'}:00`).getTime()
    if (endsAt < now.getTime()) return []
    const teamLabel = session.teams.length ? session.teams.join(' & ') : 'Whole club'
    const detail = `${formatSessionDate(session.date)} · ${sessionTime(session)} · ${teamLabel}${session.venue ? ` · ${session.venue}` : ''}`
    return [{ id: `session-${session.id}`, sessionId: session.id, title: `${eventTypeLabel(session.eventType)}: ${session.title}`, detail, timing: dayTiming(session.date), eventType: session.eventType, startsAt }]
  }).sort((a, b) => a.startsAt - b.startsAt)
}

export function NotificationDropdown({ players, sessions, assignedTeams, isAdmin, openPlayer, openSchedule }: Props) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const playerNotifications = useMemo(() => buildPlayerNotifications(players, assignedTeams, isAdmin), [players, assignedTeams, isAdmin])
  const sessionNotifications = useMemo(() => buildSessionNotifications(sessions, assignedTeams, isAdmin), [sessions, assignedTeams, isAdmin])
  const total = playerNotifications.length + sessionNotifications.length

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className="notification-wrapper" ref={wrapperRef}>
    <button className={`notification-trigger ${open ? 'active' : ''}`} onClick={() => setOpen(current => !current)} aria-expanded={open} aria-haspopup="dialog" aria-label={`${total} active notifications`}>
      <Bell/>
      {total > 0 && <span>{total > 99 ? '99+' : total}</span>}
    </button>
    {open && <section className="notification-dropdown" role="dialog" aria-label="Notifications">
      <header>
        <div><span className="eyebrow">YOUR CLUB</span><h2>Notifications</h2><p>{total ? `${total} active reminder${total === 1 ? '' : 's'}` : 'You are all caught up'}</p></div>
        <button onClick={() => setOpen(false)} aria-label="Close notifications"><X/></button>
      </header>
      <div className="notification-scroll">
        <NotificationSection title="Players for your teams" count={playerNotifications.length} empty="No new player recommendations for your teams.">
          {playerNotifications.slice(0, 8).map(item => <button className="notification-item player-notification" key={item.id} onClick={() => { setOpen(false); openPlayer(item.playerId) }}>
            <span className="notification-icon"><UserRoundCheck/></span>
            <span><b>{item.title}</b><small>{item.detail}</small><em>{item.teams.join(' · ')}</em></span>
            <ChevronRight/>
          </button>)}
        </NotificationSection>
        <NotificationSection title="Next 7 days" count={sessionNotifications.length} empty="No relevant sessions in the next seven days.">
          {sessionNotifications.map(item => <button className={`notification-item session-notification ${item.eventType}`} key={item.id} onClick={() => { setOpen(false); openSchedule(item.sessionId) }}>
            <span className="notification-icon">{eventIcon(item.eventType)}</span>
            <span><b>{item.title}</b><small>{item.detail}</small><em>{item.timing}</em></span>
            <ChevronRight/>
          </button>)}
        </NotificationSection>
      </div>
      <footer><CalendarDays/><span>Player alerts clear when the player is added to a team plan or reaches a final outcome.</span></footer>
    </section>}
  </div>
}

function NotificationSection({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  return <section className="notification-section">
    <div className="notification-section-heading"><h3>{title}</h3><span>{count}</span></div>
    {count ? children : <p className="notification-empty">{empty}</p>}
  </section>
}
