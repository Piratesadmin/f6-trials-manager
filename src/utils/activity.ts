import type { ActivityDraft, ActivityLogEntry, Player } from '../types'
import { trialRegistrationsFor } from './player'

export function createActivityEntry(draft: ActivityDraft, actor: { uid: string; name: string; email: string }, season: string): ActivityLogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    actorUid: actor.uid,
    actorName: actor.name || actor.email || 'Club user',
    actorEmail: actor.email,
    category: draft.category,
    action: draft.action,
    summary: draft.summary,
    detail: draft.detail || '',
    team: draft.team || '',
    entityType: draft.entityType,
    entityId: draft.entityId || '',
    season,
  }
}

export function normaliseActivityEntry(id: string, value: unknown): ActivityLogEntry | null {
  if (!value || typeof value !== 'object') return null
  const entry = value as Partial<ActivityLogEntry>
  if (typeof entry.timestamp !== 'number' || typeof entry.summary !== 'string') return null
  return {
    id,
    timestamp: entry.timestamp,
    actorUid: typeof entry.actorUid === 'string' ? entry.actorUid : '',
    actorName: typeof entry.actorName === 'string' ? entry.actorName : 'Club user',
    actorEmail: typeof entry.actorEmail === 'string' ? entry.actorEmail : '',
    category: entry.category || 'player',
    action: typeof entry.action === 'string' ? entry.action : 'updated',
    summary: entry.summary,
    detail: typeof entry.detail === 'string' ? entry.detail : '',
    team: typeof entry.team === 'string' ? entry.team : '',
    entityType: entry.entityType || 'settings',
    entityId: typeof entry.entityId === 'string' ? entry.entityId : '',
    season: typeof entry.season === 'string' ? entry.season : '',
  }
}

export function describePlayerChange(before: Player | undefined, after: Player): ActivityDraft | null {
  if (!before) return { category: 'player', action: 'created', summary: `Added ${after.name}`, detail: `${after.position} · ${after.interestedDivisions} applicant`, team: after.suitableTeams[0] || '', entityType: 'player', entityId: after.id }
  const team = after.offeredTeam || after.suitableTeams[0] || ''
  if (before.decision !== after.decision) return { category: 'player', action: 'decision_changed', summary: `${after.name}: ${after.decision}`, detail: `Decision changed from ${before.decision} to ${after.decision}.`, team, entityType: 'player', entityId: after.id }
  if (before.recommendation !== after.recommendation) return { category: 'player', action: 'recommendation_changed', summary: `${after.name}: ${after.recommendation || 'Recommendation cleared'}`, detail: before.recommendation ? `Previous recommendation: ${before.recommendation}.` : 'Coach recommendation recorded.', team, entityType: 'player', entityId: after.id }
  if (JSON.stringify(before.offers || []) !== JSON.stringify(after.offers || [])) {
    const labels = after.offers.map(offer => `${offer.team} (${offer.position}, ${offer.squadRole})`).join(', ')
    return { category: 'team', action: 'offer_options_changed', summary: `${after.name}: ${after.offers.length} team option${after.offers.length === 1 ? '' : 's'} prepared`, detail: labels || 'All team options removed.', team, entityType: 'player', entityId: after.id }
  }
  const beforePlans = Object.keys(before.teamConsideration || {})
  const afterPlans = Object.keys(after.teamConsideration || {})
  const added = afterPlans.find(name => !beforePlans.includes(name))
  const removed = beforePlans.find(name => !afterPlans.includes(name))
  if (added) return { category: 'team', action: 'player_added_to_plan', summary: `${after.name} added to ${added} plan`, detail: `${after.teamConsideration[added] || after.position} position`, team: added, entityType: 'player', entityId: after.id }
  if (removed) return { category: 'team', action: 'player_removed_from_plan', summary: `${after.name} removed from ${removed} plan`, detail: afterPlans.length ? `Now being considered by ${afterPlans.join(', ')}.` : 'No longer in an active team plan.', team: removed, entityType: 'player', entityId: after.id }
  const beforeRegistrations=trialRegistrationsFor(before)
  const afterRegistrations=trialRegistrationsFor(after)
  const addedSession=Object.keys(afterRegistrations).find(sessionId=>!beforeRegistrations[sessionId])
  const removedSession=Object.keys(beforeRegistrations).find(sessionId=>!afterRegistrations[sessionId])
  if (addedSession) return { category: 'schedule', action: 'player_assigned', summary: `${after.name} assigned to a trial event`, detail: `Event ${addedSession}`, team, entityType: 'player', entityId: after.id }
  if (removedSession) return { category: 'schedule', action: 'player_unassigned', summary: `${after.name} removed from a trial event`, detail: `Event ${removedSession}`, team, entityType: 'player', entityId: after.id }
  const updatedSession=Object.keys(afterRegistrations).find(sessionId=>JSON.stringify(beforeRegistrations[sessionId])!==JSON.stringify(afterRegistrations[sessionId]))
  if (updatedSession) {
    const previous=beforeRegistrations[updatedSession]
    const current=afterRegistrations[updatedSession]
    if (previous?.attended!==current.attended) return { category: 'schedule', action: 'attendance_changed', summary: `${after.name} marked ${current.attended ? 'attended' : 'not attended'}`, detail: `Event ${updatedSession}`, team, entityType: 'player', entityId: after.id }
    if (previous?.paid!==current.paid) return { category: 'finance', action: 'trial_payment_changed', summary: `${after.name} marked ${current.paid ? 'paid' : 'not paid'} for a trial event`, detail: `Event ${updatedSession}`, team, entityType: 'player', entityId: after.id }
  }
  return null
}

export const activityCategoryLabels: Record<ActivityLogEntry['category'], string> = {
  player: 'Players', schedule: 'Schedule', email: 'Emails', team: 'Teams', finance: 'Finance', settings: 'Settings', access: 'Access', import: 'Imports', season: 'Season',
}
