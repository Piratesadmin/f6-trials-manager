import type { TrialSession } from '../types'

export function normaliseTrialSession(id: string, value: Partial<TrialSession>): TrialSession {
  return {
    id,
    title: value.title || 'Trial session',
    date: value.date || '',
    startTime: value.startTime || '',
    endTime: value.endTime || '',
    venue: value.venue || '',
    notes: value.notes || '',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    updatedBy: value.updatedBy,
  }
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
