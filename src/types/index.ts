export type Decision =
  | 'Awaiting decision'
  | 'Offer planned'
  | 'Alternative offer'
  | 'Rejection planned'
  | 'Waiting list planned'
  | 'Offer sent'
  | 'Rejection sent'
  | 'Waiting list sent'

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

export type EmailReviewStatus = 'draft' | 'reviewed' | 'sent'
export type EmailType = 'offer' | 'alternative' | 'rejection' | 'waiting-list'

export type PlayerEmailDraft = {
  responseDeadline: string
  coachName: string
  personalMessage: string
}

export type CommunicationHistoryEntry = {
  id: string
  type: EmailType
  subject: string
  body: string
  recipient: string
  sentAt: number
  sentBy: string
}

export type TeamEmailDetails = {
  trainingDay: string
  trainingTime: string
  venue: string
  competition: string
}

export type EmailSettings = {
  clubName: string
  defaultCoachName: string
  defaultResponseDeadline: string
  teamDetails: Record<string, TeamEmailDetails>
}

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
  emailReviewStatus: EmailReviewStatus
  emailDraft: PlayerEmailDraft
  communicationHistory: Record<string, CommunicationHistoryEntry>
  updatedAt?: number
  updatedBy?: string
}

export type PageKey = 'dashboard' | 'players' | 'emails' | 'teams' | 'settings'
export type PlayerTab = 'overview' | 'assessment' | 'decision' | 'email'
export type SyncState = 'live' | 'saving' | 'offline'
export type PositionTargets = Record<string, number>
export type TeamPlans = Record<string, PositionTargets>

export type CoachRole = 'admin' | 'coach'

export type CoachProfile = {
  uid: string
  displayName: string
  email: string
  role: CoachRole
  teams: Record<string, boolean>
}
