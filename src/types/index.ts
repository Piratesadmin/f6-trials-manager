export type Decision =
  | 'Awaiting decision'
  | 'Offer planned'
  | 'Alternative offer'
  | 'Rejection planned'
  | 'Waiting list planned'
  | 'Offer sent'
  | 'Offer accepted'
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
export type TrialResponseStatus = '' | 'Going' | 'Not answered' | "Can't go"

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
  dateOfBirth: string
  interestedDivisions: string
  appliedTeam: string
  position: string
  secondaryPosition: string
  playingExperience: string
  highestLevelPlayed: string
  photoUrl: string
  trialDate: string
  trialSessionId: string
  trialResponseStatus: TrialResponseStatus
  paid: boolean
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

export type PageKey = 'dashboard' | 'schedule' | 'players' | 'emails' | 'teams' | 'finance' | 'settings'
export type PlayerTab = 'overview' | 'assessment' | 'decision' | 'email'
export type SyncState = 'live' | 'saving' | 'offline'
export type PositionTargets = Record<string, number>
export type TeamPlans = Record<string, PositionTargets>
export type PlayerStars = Record<string, boolean>
export type PlayerPhotos = Record<string, string>

export type PaymentPlan = '' | 'Fully paid' | '2 instalments' | 'Direct debit'

export type PlayerFinance = {
  playerId: string
  amountOwed: number
  usesStandardFee: boolean
  amountPaid: number
  paymentPlan: PaymentPlan
  notes: string
  updatedAt?: number
  updatedBy?: string
}

export type PlayerFinanceMap = Record<string, PlayerFinance>

export type FinanceSettings = {
  nvlFee: number
  lvaFee: number
  updatedAt?: number
  updatedBy?: string
}

export type TrialSession = {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  venue: string
  notes: string
  createdAt?: number
  updatedAt?: number
  updatedBy?: string
}

export type CoachRole = 'admin' | 'team-admin' | 'coach'

export type CoachProfile = {
  uid: string
  displayName: string
  email: string
  role: CoachRole
  teams: Record<string, boolean>
}
