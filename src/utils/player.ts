import type { Assessment, AssessmentKey, Player } from '../types'

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
  if ((player.decision?.includes('Offer') || player.decision === 'Alternative offer')) {
    const offeredTeam = player.offeredTeam || player.appliedTeam
    if (offeredTeam && !consideration[offeredTeam]) consideration[offeredTeam] = player.offeredPosition || player.position
  }

  const history = player.communicationHistory && typeof player.communicationHistory === 'object'
    ? player.communicationHistory
    : {}
  const sentDecision = player.decision === 'Offer sent' || player.decision === 'Offer accepted' || player.decision === 'Rejection sent' || player.decision === 'Waiting list sent'
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
    trialResponseStatus: player.trialResponseStatus === 'Going' || player.trialResponseStatus === 'Not answered' || player.trialResponseStatus === "Can't go" ? player.trialResponseStatus : '',
    paid: Boolean(player.paid),
    attended: Boolean(player.attended),
    notes: player.notes || '',
    assessment,
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
