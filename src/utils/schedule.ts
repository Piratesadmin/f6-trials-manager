import type { ClubEventType, SessionAttendanceStatus, TrialSession } from '../types'
import { teams } from '../data/constants'

export function normaliseTrialSession(id: string, value: Partial<TrialSession>): TrialSession {
  const attendance = value.attendance && typeof value.attendance === 'object'
    ? Object.fromEntries(Object.entries(value.attendance).filter((entry): entry is [string, SessionAttendanceStatus] => Boolean(entry[0]) && (entry[1] === 'present' || entry[1] === 'absent' || entry[1] === 'excused')))
    : {}
  return {
    id,
    eventType: value.eventType === 'training' || value.eventType === 'game' ? value.eventType : 'trial',
    title: value.title || 'Trial session',
    date: value.date || '',
    startTime: value.startTime || '',
    endTime: value.endTime || '',
    venue: value.venue || '',
    teams: Array.isArray(value.teams) ? value.teams.filter(team => teams.includes(team)) : [],
    opponent: value.opponent || '',
    competition: value.competition || '',
    gameLocation: value.gameLocation === 'Home' || value.gameLocation === 'Away' ? value.gameLocation : '',
    recurrenceRule: value.recurrenceRule === 'weekly' || value.recurrenceRule === 'fortnightly' || value.recurrenceRule === 'monthly' ? value.recurrenceRule : '',
    recurrenceGroupId: value.recurrenceGroupId || '',
    notes: value.notes || '',
    attendance,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    updatedBy: value.updatedBy,
  }
}

const importMatchText = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

export function trialSessionMatchesImport(existing: TrialSession, incoming: Pick<TrialSession, 'eventType' | 'title' | 'date' | 'startTime'>) {
  return existing.eventType === 'trial'
    && incoming.eventType === 'trial'
    && existing.date === incoming.date
    && existing.startTime === incoming.startTime
    && importMatchText(existing.title) === importMatchText(incoming.title)
}

export function eventTypeLabel(type: ClubEventType) {
  if (type === 'training') return 'Training'
  if (type === 'game') return 'Game'
  return 'Trial'
}

export function localDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatSessionDate(date: string, options?: Intl.DateTimeFormatOptions) {
  if (!date) return 'Date not set'
  return localDate(date).toLocaleDateString('en-GB', options || { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function trialDateLabel(date: string) {
  return formatSessionDate(date, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function sessionTime(session: TrialSession) {
  if (!session.startTime) return 'Time not set'
  return session.endTime ? `${session.startTime}–${session.endTime}` : session.startTime
}
