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

export type AssessmentSnapshot = {
  id: string
  assessment: Assessment
  average: number
  recommendation: Recommendation
  strengths: string
  developmentAreas: string
  suitableTeams: string[]
  recordedAt: number
  recordedBy: string
}

export type Recommendation =
  | ''
  | 'Strong offer'
  | 'Offer'
  | 'Waiting list'
  | 'Refer to another team'
  | 'Needs discussion'
  | 'Not suitable'

export type EmailReviewStatus = 'draft' | 'reviewed' | 'sent'
export type EmailType = 'offer' | 'alternative' | 'rejection' | 'waiting-list' | 'squad-confirmation'
export type TrialResponseStatus = '' | 'Going' | 'Not answered' | "Can't go"
export type SquadRole = 'Starting six' | 'Frequent player' | 'Rotational player' | 'Development / improvement role' | 'Training squad' | 'Role to be discussed'

export type PlayerOffer = {
  team: string
  position: string
  squadRole: SquadRole
  includeSquadRole: boolean
}

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
  cc?: string[]
  sentAt: number
  sentBy: string
}

export type TeamEmailDetails = {
  adminEmail: string
  trainingDay: string
  trainingTime: string
  venue: string
  competition: string
  calendarColor: string
}

export type EmailSettings = {
  clubName: string
  clubEmail: string
  defaultCoachName: string
  defaultResponseDeadline: string
  teamDetails: Record<string, TeamEmailDetails>
  currentCoachName?: string
  teamCoachNames?: Record<string, string>
  teamSignatories?: Record<string, string[]>
}

export type TrialRegistration = {
  responseStatus: TrialResponseStatus
  paid: boolean
  attended: boolean
}

export type Player = {
  id: string
  name: string
  email: string
  dateOfBirth: string
  interestedDivisions: string
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
  trialRegistrations: Record<string, TrialRegistration>
  decision: Decision
  offeredTeam?: string
  offeredPosition?: string
  confirmedTeams: Record<string, string>
  offers: PlayerOffer[]
  rejectionReason?: string
  notes: string
  assessment: Assessment
  assessmentHistory?: Record<string, AssessmentSnapshot>
  recommendation: Recommendation
  strengths: string
  developmentAreas: string
  suitableTeams: string[]
  bibNumber: string
  teamConsideration: Record<string, string>
  emailReviewStatus: EmailReviewStatus
  emailDraft: PlayerEmailDraft
  communicationHistory: Record<string, CommunicationHistoryEntry>
  returningPlayer?: boolean
  updatedAt?: number
  updatedBy?: string
}

export type PlayerDecisionDraft = Pick<Player, 'decision' | 'recommendation' | 'suitableTeams' | 'offers' | 'offeredTeam' | 'offeredPosition' | 'rejectionReason' | 'teamConsideration' | 'emailReviewStatus'>
export type PlayerDecisionSaveResult = 'saved' | 'conflict'

export type PageKey = 'dashboard' | 'schedule' | 'players' | 'emails' | 'teams' | 'finance' | 'activity' | 'archive' | 'settings'
export type PlayerTab = 'overview' | 'assessment' | 'decision'
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
  fullPaymentDueDate: string
  instalmentOneDueDate: string
  instalmentTwoDueDate: string
  directDebitDueDates: string[]
  updatedAt?: number
  updatedBy?: string
}

export type ClubEventType = 'trial' | 'training' | 'game'
export type GameLocation = '' | 'Home' | 'Away'
export type RecurrenceRule = '' | 'weekly' | 'fortnightly' | 'monthly'
export type SessionAttendanceStatus = 'present' | 'absent' | 'excused'
export type SessionPhotos = Record<string, Record<string, string>>

export type TrialSession = {
  id: string
  eventType: ClubEventType
  title: string
  date: string
  startTime: string
  endTime: string
  venue: string
  teams: string[]
  opponent: string
  competition: string
  gameLocation: GameLocation
  recurrenceRule: RecurrenceRule
  recurrenceGroupId: string
  notes: string
  attendance: Record<string, SessionAttendanceStatus>
  createdAt?: number
  updatedAt?: number
  updatedBy?: string
}

export type CoachRole = 'admin' | 'team-admin' | 'coach' | 'assistant-coach'

export type CoachProfile = {
  uid: string
  displayName: string
  email: string
  role: CoachRole
  teams: Record<string, boolean>
}

export type ActivityCategory = 'player' | 'schedule' | 'email' | 'team' | 'finance' | 'settings' | 'access' | 'import' | 'season'
export type ActivityEntityType = 'player' | 'session' | 'team' | 'season' | 'settings'

export type ActivityLogEntry = {
  id: string
  timestamp: number
  actorUid: string
  actorName: string
  actorEmail: string
  category: ActivityCategory
  action: string
  summary: string
  detail: string
  team: string
  entityType: ActivityEntityType
  entityId: string
  season: string
}

export type ActivityDraft = Omit<ActivityLogEntry, 'id' | 'timestamp' | 'actorUid' | 'actorName' | 'actorEmail' | 'season'>

export type SeasonSettings = {
  currentSeason: string
  trialsMode: boolean
  updatedAt?: number
  updatedBy?: string
}

export type ArchivedPlayerReason = 'Final rejection cleanup' | 'Outside confirmed squad cleanup'

export type ArchivedPlayerRecord = {
  id: string
  seasonName: string
  archivedAt: number
  archivedBy: string
  archiveReason: ArchivedPlayerReason
  player: Player
  photo: string
}

export type ArchivedPlayersMap = Record<string, ArchivedPlayerRecord>

export type SeasonArchiveSummary = {
  players: number
  confirmedPlayers: number
  sessions: number
  communicationsSent: number
  amountBilled: number
  amountPaid: number
}

export type SeasonArchiveSnapshot = {
  players: Record<string, Player>
  archivedPlayers: ArchivedPlayersMap
  trialSessions: Record<string, TrialSession>
  teamPlans: TeamPlans
  playerFinance: PlayerFinanceMap
  financeSettings: FinanceSettings
  emailSettings: EmailSettings
}

export type SeasonArchive = {
  id: string
  seasonName: string
  nextSeasonName: string
  archivedAt: number
  archivedBy: string
  summary: SeasonArchiveSummary
  snapshot: SeasonArchiveSnapshot
}
