export type Decision =
  | 'Awaiting decision'
  | 'Offer planned'
  | 'Alternative offer'
  | 'Rejection planned'
  | 'Offer sent'
  | 'Rejection sent'

export type AssessmentKey =
  | 'serving'
  | 'passing'
  | 'setting'
  | 'attacking'
  | 'blocking'
  | 'defence'
  | 'movement'
  | 'communication'
  | 'attitude'
  | 'overallLevel'

export type Assessment = Record<AssessmentKey, number>

export type Recommendation =
  | ''
  | 'Strong offer'
  | 'Offer'
  | 'Waiting list'
  | 'Refer to another team'
  | 'Needs discussion'
  | 'Not suitable'

export type Player = {
  id: string
  name: string
  email: string
  appliedTeam: string
  position: string
  trialDate: string
  attended: boolean
  decision: Decision
  offeredTeam?: string
  offeredPosition?: string
  rejectionReason?: string
  notes: string
  assessment: Assessment
  recommendation: Recommendation
  strengths: string
  developmentAreas: string
  suitableTeams: string[]
  bibNumber: string
  teamConsideration: Record<string, string>
  updatedAt?: number
  updatedBy?: string
}

export type PageKey = 'dashboard' | 'players' | 'emails' | 'teams' | 'settings'
export type PlayerTab = 'overview' | 'assessment' | 'decision' | 'email'
export type SyncState = 'live' | 'saving' | 'offline'
export type PositionTargets = Record<string, number>
export type TeamPlans = Record<string, PositionTargets>
