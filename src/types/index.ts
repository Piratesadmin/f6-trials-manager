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

export type PageKey = 'dashboard' | 'signups' | 'schedule' | 'players' | 'emails' | 'teams' | 'timesheets' | 'finance' | 'activity' | 'archive' | 'settings' | 'welfare'
export type PlayerTab = 'overview' | 'assessment' | 'decision'
export type FinanceView = 'overview' | 'forecast' | 'payments'
export type SyncState = 'live' | 'saving' | 'offline'
export type PositionTargets = Record<string, number>
export type TeamPlans = Record<string, PositionTargets>
export type PlayerStars = Record<string, boolean>
export type PlayerPhotos = Record<string, string>

export type PaymentPlan = '' | 'Fully paid' | '2 instalments' | 'Standing order' | 'Non paying' | 'Custom'

export type CustomPaymentRuleFeeMode = 'existing' | 'fixed' | 'percentage'

export type CustomPaymentRule = {
  id: string
  name: string
  description: string
  feeMode: CustomPaymentRuleFeeMode
  feeValue: number
  dueDates: string[]
}

export type FinancePayment = {
  id: string
  date: string
  amount: number
  reference: string
  description: string
  source: 'statement-pdf' | 'manual'
  statementName?: string
  recordedAt: number
  recordedBy?: string
}

export type FinanceCommunicationKind = 'payment-instructions' | 'payment-reminder' | 'payment-receipt'

export type FinanceCommunication = {
  id: string
  kind: FinanceCommunicationKind
  subject: string
  recordedAt: number
  recordedBy?: string
}

export type PlayerFinance = {
  playerId: string
  amountOwed: number
  usesStandardFee: boolean
  amountPaid: number
  paymentPlan: PaymentPlan
  customPaymentRuleId: string
  notes: string
  paymentReference: string
  chargeCreatedAt?: number
  payments: Record<string, FinancePayment>
  communications: Record<string, FinanceCommunication>
  updatedAt?: number
  updatedBy?: string
}

export type PlayerFinanceMap = Record<string, PlayerFinance>

export type FinanceForecastTeam = {
  fullPlayers: number
  halfPlayers: number
  paygIncome: number
  fullFee: number
  halfFee: number
  homeGames: number
  awayGames: number
  gameHours: number
  gameVenueHourlyRate: number
  officialsPerHomeGame: number
  trainingSessions: number
  trainingHours: number
  trainingVenueHourlyRate: number
  coachHourlyRate: number
}

export type FinanceForecastCostLine = {
  id: string
  label: string
  teamAmounts: Record<string, number>
}

export type FinanceForecastClubCost = {
  id: string
  label: string
  amount: number
}

export type FinanceForecast = {
  seasonName: string
  sourceNote: string
  teams: Record<string, FinanceForecastTeam>
  extraCosts: FinanceForecastCostLine[]
  clubCosts: FinanceForecastClubCost[]
  updatedAt?: number
  updatedBy?: string
}

export type FinanceSettings = {
  nvlFee: number
  lvaFee: number
  fullPaymentDueDate: string
  instalmentOneDueDate: string
  instalmentTwoDueDate: string
  standingOrderDueDates: string[]
  customPaymentRules: CustomPaymentRule[]
  bankName: string
  bankAccountName: string
  sortCode: string
  accountNumber: string
  financeContactEmail: string
  bankPaymentInstructions: string
  forecast: FinanceForecast
  updatedAt?: number
  updatedBy?: string
}

export type TimesheetActivity = 'Training' | 'Match' | 'Trial' | 'Other'

export type CoachHourlyRate = {
  coachUid: string
  hourlyRate: number
  teamRates: Record<string, number>
  updatedAt: number
  updatedBy: string
}

export type CoachHourlyRateMap = Record<string, CoachHourlyRate>

export type CoachTimesheetEntry = {
  id: string
  coachUid: string
  coachName: string
  coachEmail: string
  date: string
  team: string
  activity: TimesheetActivity
  hours: number
  notes: string
  season: string
  invoiceId: string
  createdAt: number
  updatedAt: number
}

export type CoachTimesheetEntryMap = Record<string, Record<string, CoachTimesheetEntry>>

export type CoachInvoiceStatus = 'Submitted' | 'Paid'

export type CoachInvoice = {
  id: string
  invoiceNumber: string
  coachUid: string
  coachName: string
  coachEmail: string
  entryIds: string[]
  totalHours: number
  hourlyRate: number
  rateBreakdown: Record<string, number>
  totalAmount: number
  season: string
  status: CoachInvoiceStatus
  submittedAt: number
  paidAt?: number
  paidBy?: string
}

export type CoachInvoiceMap = Record<string, Record<string, CoachInvoice>>

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

export type CoachRole = 'admin' | 'team-admin' | 'coach' | 'assistant-coach' | 'welfare'

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
