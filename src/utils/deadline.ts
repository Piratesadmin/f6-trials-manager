import type { Player, TrialSession } from '../types'

export type DeadlineState = 'none' | 'on-track' | 'approaching' | 'due-soon' | 'overdue'
export type DecisionReminderState = 'none' | 'needed' | 'pending' | 'overdue'

export type ResponseDeadlineDetails = {
  scheduledDeadline: string
  effectiveDeadline: string
  source: 'player' | 'schedule' | 'fallback' | 'none'
  state: DeadlineState
  exceedsScheduleLimit: boolean
  session?: TrialSession
}

function localDateTime(date: string, time: string) {
  if (!date) return null
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = (time || '23:59').split(':').map(Number)
  const value = new Date(year, month - 1, day, hours || 0, minutes || 0)
  return Number.isNaN(value.getTime()) ? null : value
}

function sessionFinishDate(session: TrialSession) {
  return localDateTime(session.date, session.endTime || session.startTime || '23:59')
}

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function parseDeadline(value: string) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return localDateTime(value, '23:59')
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function scheduledResponseDeadline(player: Player, sessions: TrialSession[]) {
  const session = sessions.find(item => item.id === player.trialSessionId && item.eventType === 'trial')
  if (!session) return { value: '', session: undefined }
  const sessionFinish = sessionFinishDate(session)
  if (!sessionFinish) return { value: '', session }
  const deadline = new Date(sessionFinish.getTime() + 72 * 60 * 60 * 1000)
  return { value: toLocalInputValue(deadline), session }
}

export type DecisionReminderDetails = {
  state: DecisionReminderState
  label: string
  hoursSinceSession: number
  session?: TrialSession
}

export function decisionReminderDetails(player: Player, sessions: TrialSession[], now = new Date()): DecisionReminderDetails {
  const session = sessions.find(item => item.id === player.trialSessionId && item.eventType === 'trial')
  if (!session || !player.attended || player.decision !== 'Awaiting decision') return { state: 'none', label: '', hoursSinceSession: 0, session }
  const finish = sessionFinishDate(session)
  if (!finish) return { state: 'none', label: '', hoursSinceSession: 0, session }
  const hoursSinceSession = (now.getTime() - finish.getTime()) / 3_600_000
  if (hoursSinceSession < 0) return { state: 'none', label: '', hoursSinceSession, session }
  if (hoursSinceSession < 24) return { state: 'needed', label: 'Decision needed', hoursSinceSession, session }
  if (hoursSinceSession < 72) return { state: 'pending', label: 'Decision pending', hoursSinceSession, session }
  return { state: 'overdue', label: 'Decision overdue', hoursSinceSession, session }
}

export function decisionReminderDetailText(details: DecisionReminderDetails) {
  if (details.state === 'none') return ''
  const hours = Math.max(0, Math.floor(details.hoursSinceSession))
  if (hours < 24) return 'Trial finished today'
  if (hours < 48) return 'Trial finished 1 day ago'
  return `Trial finished ${Math.floor(hours / 24)} days ago`
}

export function responseDeadlineDetails(player: Player, sessions: TrialSession[], fallbackDeadline = '', now = new Date()): ResponseDeadlineDetails {
  const scheduled = scheduledResponseDeadline(player, sessions)
  const effectiveDeadline = player.emailDraft.responseDeadline || scheduled.value || fallbackDeadline
  const source = player.emailDraft.responseDeadline ? 'player' : scheduled.value ? 'schedule' : fallbackDeadline ? 'fallback' : 'none'
  const effectiveDate = parseDeadline(effectiveDeadline)
  const scheduledDate = parseDeadline(scheduled.value)
  const exceedsScheduleLimit = Boolean(player.emailDraft.responseDeadline && effectiveDate && scheduledDate && effectiveDate.getTime() > scheduledDate.getTime())
  let state: DeadlineState = 'none'
  if (effectiveDate) {
    const hours = (effectiveDate.getTime() - now.getTime()) / 3_600_000
    state = hours < 0 ? 'overdue' : hours <= 24 ? 'due-soon' : hours <= 48 ? 'approaching' : 'on-track'
  }
  return { scheduledDeadline: scheduled.value, effectiveDeadline, source, state, exceedsScheduleLimit, session: scheduled.session }
}

export function formatDeadline(value: string) {
  const date = parseDeadline(value)
  if (!date) return value || 'Not set'
  const hasTime = value.includes('T')
  return date.toLocaleString('en-GB', hasTime
    ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function deadlineStateLabel(state: DeadlineState) {
  if (state === 'overdue') return 'Deadline overdue'
  if (state === 'due-soon') return 'Due within 24 hours'
  if (state === 'approaching') return 'Due within 48 hours'
  if (state === 'on-track') return 'Deadline scheduled'
  return 'No deadline'
}
