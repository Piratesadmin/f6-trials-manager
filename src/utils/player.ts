import type { Assessment, AssessmentKey, AssessmentSnapshot, Player, TrialRegistration, TrialResponseStatus } from '../types'
import { normaliseOffers } from './offers'

export const assessmentFields: { key: AssessmentKey; label: string; hint: string }[] = [
  { key: 'serving', label: 'Serving', hint: 'Consistency, control and pressure' },
  { key: 'passing', label: 'Passing', hint: 'Platform, accuracy and serve receive' },
  { key: 'setting', label: 'Setting', hint: 'Hands, location and decision-making' },
  { key: 'attacking', label: 'Attacking', hint: 'Timing, range and effectiveness' },
  { key: 'blocking', label: 'Blocking', hint: 'Positioning, timing and hand shape' },
  { key: 'defence', label: 'Defence', hint: 'Reading, control and court coverage' },
  { key: 'movement', label: 'Movement', hint: 'Footwork, transition and balance' },
  { key: 'communication', label: 'Communication', hint: 'Clarity, confidence and teamwork' },
  { key: 'attitude', label: 'Attitude', hint: 'Coachability, effort and response' },
  { key: 'overallLevel', label: 'Overall level', hint: 'Current competitive playing level' },
]

export function emptyAssessment(): Assessment {
  return {
    serving: 0,
    passing: 0,
    setting: 0,
    attacking: 0,
    blocking: 0,
    defence: 0,
    movement: 0,
    communication: 0,
    attitude: 0,
    overallLevel: 0,
  }
}

function normaliseScore(value: unknown) {
  const score = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(score) ? Math.min(5, Math.max(0, Math.round(score))) : 0
}

function normaliseTrialResponseStatus(value: unknown): TrialResponseStatus {
  return value === 'Going' || value === 'Not answered' || value === "Can't go" ? value : ''
}

function normaliseTrialRegistration(value: unknown): TrialRegistration | null {
  if (!value || typeof value !== 'object') return null
  const incoming = value as Partial<TrialRegistration>
  return {
    responseStatus: normaliseTrialResponseStatus(incoming.responseStatus),
    paid: Boolean(incoming.paid),
    attended: Boolean(incoming.attended),
  }
}

export function trialRegistrationsFor(player: Player): Record<string, TrialRegistration> {
  const registrations = player.trialRegistrations && typeof player.trialRegistrations === 'object'
    ? Object.fromEntries(Object.entries(player.trialRegistrations).flatMap(([sessionId, value]) => {
      const registration = normaliseTrialRegistration(value)
      return sessionId && registration ? [[sessionId, registration]] : []
    }))
    : {}
  if (player.trialSessionId && !registrations[player.trialSessionId]) {
    registrations[player.trialSessionId] = {
      responseStatus: normaliseTrialResponseStatus(player.trialResponseStatus),
      paid: Boolean(player.paid),
      attended: Boolean(player.attended),
    }
  }
  return registrations
}

export function trialRegistrationFor(player: Player, sessionId: string) {
  return trialRegistrationsFor(player)[sessionId]
}

export function setTrialRegistration(player: Player, sessionId: string, registration: TrialRegistration | null): Player {
  const trialRegistrations = trialRegistrationsFor(player)
  if (registration) trialRegistrations[sessionId] = registration
  else delete trialRegistrations[sessionId]
  const clearsLegacyRegistration = !registration && player.trialSessionId === sessionId
  return {
    ...player,
    trialRegistrations,
    ...(clearsLegacyRegistration ? { trialSessionId: '', trialDate: 'Not assigned', trialResponseStatus: '' as const, paid: false, attended: false } : {}),
  }
}

export function confirmedTeamAssignments(player: Player): Record<string, string> {
  const incoming = player.confirmedTeams && typeof player.confirmedTeams === 'object' ? player.confirmedTeams : {}
  const assignments = Object.fromEntries(Object.entries(incoming).filter(([team, position]) => Boolean(team) && typeof position === 'string' && Boolean(position)))
  if (player.decision === 'Offer accepted') {
    const legacyTeam = player.offeredTeam || player.offers?.[0]?.team || ''
    if (legacyTeam && !assignments[legacyTeam]) {
      const offer = player.offers?.find(item => item.team === legacyTeam)
      assignments[legacyTeam] = offer?.position || player.offeredPosition || player.position || 'Unassigned'
    }
  }
  return assignments
}

export function confirmedTeamNames(player: Player) {
  return Object.keys(confirmedTeamAssignments(player))
}

export function isConfirmedForTeam(player: Player, team: string) {
  return Boolean(confirmedTeamAssignments(player)[team])
}

export function confirmedPositionForTeam(player: Player, team: string) {
  return confirmedTeamAssignments(player)[team] || player.offers?.find(offer => offer.team === team)?.position || player.position || 'Unassigned'
}

export function setConfirmedTeam(player: Player, team: string, position: string | null): Player {
  const confirmedTeams = confirmedTeamAssignments(player)
  if (position) confirmedTeams[team] = position
  else delete confirmedTeams[team]
  const currentPrimary = player.offeredTeam && confirmedTeams[player.offeredTeam] ? player.offeredTeam : ''
  const offeredTeam = currentPrimary || Object.keys(confirmedTeams)[0] || player.offeredTeam || ''
  return {
    ...player,
    confirmedTeams,
    offeredTeam,
    offeredPosition: confirmedTeams[offeredTeam] || player.offers?.find(offer => offer.team === offeredTeam)?.position || player.offeredPosition || '',
  }
}

export function normalisePlayer(player: Player): Player {
  const unsafePlayer = player as Player & Record<string, unknown>
  const {
    cell: _cell,
    phone: _phone,
    phoneNumber: _phoneNumber,
    streetAddress: _streetAddress,
    address: _address,
    city: _city,
    postalCode: _postalCode,
    postcode: _postcode,
    appliedTeam: _appliedTeam,
    appliedDivision: _appliedDivision,
    ...safePlayer
  } = unsafePlayer
  const assessment = emptyAssessment()
  const incoming = player.assessment as Partial<Assessment> | undefined
  assessmentFields.forEach(({ key }) => {
    assessment[key] = normaliseScore(incoming?.[key])
  })

  const consideration = player.teamConsideration && typeof player.teamConsideration === 'object'
    ? Object.fromEntries(Object.entries(player.teamConsideration).filter(([team, position]) => Boolean(team) && typeof position === 'string' && Boolean(position)))
    : {}
  const offers = normaliseOffers(player)
  if ((player.decision?.includes('Offer') || player.decision === 'Alternative offer')) offers.forEach(offer=>{if(!consideration[offer.team])consideration[offer.team]=offer.position})
  const primary = offers.find(offer=>offer.team===player.offeredTeam)||offers[0]
  const confirmedTeams = confirmedTeamAssignments({...player,offers})
  const confirmedTeamNames = Object.keys(confirmedTeams)
  const offeredTeam = player.decision === 'Offer accepted' && confirmedTeamNames.length
    ? (player.offeredTeam && confirmedTeams[player.offeredTeam] ? player.offeredTeam : confirmedTeamNames[0])
    : player.offeredTeam || primary?.team || ''

  const history = player.communicationHistory && typeof player.communicationHistory === 'object'
    ? player.communicationHistory
    : {}
  const assessmentHistory = player.assessmentHistory && typeof player.assessmentHistory === 'object'
    ? Object.fromEntries(Object.entries(player.assessmentHistory).flatMap(([id,value])=>{
      if(!value||typeof value!=='object')return[]
      const incomingSnapshot=value as Partial<AssessmentSnapshot>
      const snapshotAssessment=emptyAssessment()
      assessmentFields.forEach(({key})=>{snapshotAssessment[key]=normaliseScore(incomingSnapshot.assessment?.[key])})
      const scores=Object.values(snapshotAssessment).filter(score=>score>0)
      const average=scores.length?scores.reduce((total,score)=>total+score,0)/scores.length:0
      return [[id,{id,assessment:snapshotAssessment,average, recommendation:incomingSnapshot.recommendation||'',strengths:incomingSnapshot.strengths||'',developmentAreas:incomingSnapshot.developmentAreas||'',suitableTeams:Array.isArray(incomingSnapshot.suitableTeams)?incomingSnapshot.suitableTeams.filter(Boolean):[],recordedAt:typeof incomingSnapshot.recordedAt==='number'?incomingSnapshot.recordedAt:0,recordedBy:typeof incomingSnapshot.recordedBy==='string'?incomingSnapshot.recordedBy:''} as AssessmentSnapshot]]
    }))
    : {}
  const trialRegistrations = trialRegistrationsFor(player)
  const inferredReturningPlayer = player.decision === 'Offer accepted'
    && player.emailReviewStatus === 'sent'
    && !Object.keys(history).length
    && !Object.keys(trialRegistrations).length
    && !player.recommendation
  const returningPlayer = Boolean(player.returningPlayer) || inferredReturningPlayer
  const confirmationSent = Object.values(history).some(entry => entry.type === 'squad-confirmation')
  const sentDecision = player.decision === 'Offer sent'
    || player.decision === 'Rejection sent'
    || player.decision === 'Waiting list sent'
    || (player.decision === 'Offer accepted' && (!returningPlayer || confirmationSent))
  const reviewStatus = sentDecision ? 'sent' : player.emailReviewStatus === 'reviewed' ? 'reviewed' : 'draft'

  return {
    ...safePlayer,
    dateOfBirth: player.dateOfBirth || '',
    interestedDivisions: player.interestedDivisions || '',
    secondaryPosition: player.secondaryPosition || '',
    playingExperience: player.playingExperience || '',
    highestLevelPlayed: player.highestLevelPlayed || '',
    photoUrl: player.photoUrl || '',
    trialDate: player.trialDate || 'Not assigned',
    trialSessionId: player.trialSessionId || '',
    trialResponseStatus: normaliseTrialResponseStatus(player.trialResponseStatus),
    paid: Boolean(player.paid),
    attended: Boolean(player.attended),
    trialRegistrations,
    notes: player.notes || '',
    offers,
    offeredTeam,
    offeredPosition: confirmedTeams[offeredTeam] || player.offeredPosition || offers.find(offer=>offer.team===offeredTeam)?.position || primary?.position || '',
    confirmedTeams,
    assessment,
    assessmentHistory,
    recommendation: player.recommendation || '',
    strengths: player.strengths || '',
    developmentAreas: player.developmentAreas || '',
    suitableTeams: Array.isArray(player.suitableTeams) ? player.suitableTeams.filter(Boolean) : [],
    bibNumber: player.bibNumber == null ? '' : String(player.bibNumber),
    teamConsideration: consideration,
    emailReviewStatus: reviewStatus,
    emailDraft: {
      responseDeadline: player.emailDraft?.responseDeadline || '',
      coachName: player.emailDraft?.coachName || '',
      personalMessage: player.emailDraft?.personalMessage || '',
    },
    communicationHistory: history,
    returningPlayer,
  }
}

export function ratingValues(player: Player) {
  return assessmentFields
    .map(({ key }) => player.assessment?.[key] || 0)
    .filter(score => score > 0)
}

export function averageRating(player: Player) {
  const values = ratingValues(player)
  if (!values.length) return 0
  return values.reduce((total, score) => total + score, 0) / values.length
}

export function assessmentCompletion(player: Player) {
  return Math.round((ratingValues(player).length / assessmentFields.length) * 100)
}

export function isAssessed(player: Player) {
  return ratingValues(player).length > 0
}
