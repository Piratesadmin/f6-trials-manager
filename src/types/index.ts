export type Decision =
  | 'Awaiting decision'
  | 'Offer planned'
  | 'Alternative offer'
  | 'Rejection planned'
  | 'Offer sent'
  | 'Rejection sent'

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
  updatedAt?: number
  updatedBy?: string
}

export type PageKey = 'dashboard' | 'players' | 'emails' | 'teams' | 'settings'
export type SyncState = 'live' | 'saving' | 'offline'
