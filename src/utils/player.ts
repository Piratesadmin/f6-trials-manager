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
  const assessment = emptyAssessment()
  const incoming = player.assessment as Partial<Assessment> | undefined
  assessmentFields.forEach(({ key }) => {
    assessment[key] = normaliseScore(incoming?.[key])
  })

  return {
    ...player,
    attended: Boolean(player.attended),
    notes: player.notes || '',
    assessment,
    recommendation: player.recommendation || '',
    strengths: player.strengths || '',
    developmentAreas: player.developmentAreas || '',
    suitableTeams: Array.isArray(player.suitableTeams) ? player.suitableTeams.filter(Boolean) : [],
    bibNumber: player.bibNumber == null ? '' : String(player.bibNumber),
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
