import type { ArchivedPlayersMap, EmailSettings, FinanceSettings, Player, PlayerFinanceMap, SeasonArchive, SeasonSettings, TeamPlans, TrialSession } from '../types'
import { effectiveAmountOwed, emptyPlayerFinance } from './finance'

export const defaultSeasonSettings: SeasonSettings = { currentSeason: `${new Date().getFullYear()} season`, trialsMode: true }

export function normaliseSeasonSettings(value: unknown): SeasonSettings {
  const incoming = value && typeof value === 'object' ? value as Partial<SeasonSettings> : {}
  return {
    currentSeason: typeof incoming.currentSeason === 'string' && incoming.currentSeason.trim() ? incoming.currentSeason.trim().slice(0, 60) : defaultSeasonSettings.currentSeason,
    trialsMode: typeof incoming.trialsMode === 'boolean' ? incoming.trialsMode : true,
    updatedAt: typeof incoming.updatedAt === 'number' ? incoming.updatedAt : undefined,
    updatedBy: typeof incoming.updatedBy === 'string' ? incoming.updatedBy : undefined,
  }
}

export function createSeasonArchive(input: {
  seasonName: string
  nextSeasonName: string
  archivedBy: string
  players: Player[]
  sessions: TrialSession[]
  teamPlans: TeamPlans
  playerFinance: PlayerFinanceMap
  financeSettings: FinanceSettings
  emailSettings: EmailSettings
  archivedPlayers: ArchivedPlayersMap
}): SeasonArchive {
  const id = `${Date.now()}-${crypto.randomUUID()}`
  const confirmed = input.players.filter(player => player.decision === 'Offer accepted')
  const amountBilled = confirmed.reduce((total, player) => total + effectiveAmountOwed(player, input.playerFinance[player.id] || emptyPlayerFinance(player.id), input.financeSettings), 0)
  const amountPaid = confirmed.reduce((total, player) => total + (input.playerFinance[player.id]?.amountPaid || 0), 0)
  const communicationsSent = input.players.reduce((total, player) => total + Object.keys(player.communicationHistory || {}).length, 0)
  const archive: SeasonArchive = {
    id,
    seasonName: input.seasonName,
    nextSeasonName: input.nextSeasonName,
    archivedAt: Date.now(),
    archivedBy: input.archivedBy,
    summary: { players: input.players.length, confirmedPlayers: confirmed.length, sessions: input.sessions.length, communicationsSent, amountBilled, amountPaid },
    snapshot: {
      players: Object.fromEntries(input.players.map(player => [player.id, player])),
      archivedPlayers: Object.fromEntries(Object.entries(input.archivedPlayers).map(([playerId,record])=>[playerId,{...record,photo:''}])),
      trialSessions: Object.fromEntries(input.sessions.map(session => [session.id, session])),
      teamPlans: input.teamPlans,
      playerFinance: input.playerFinance,
      financeSettings: input.financeSettings,
      emailSettings: input.emailSettings,
    },
  }
  return JSON.parse(JSON.stringify(archive)) as SeasonArchive
}

export function normaliseSeasonArchive(id: string, value: unknown): SeasonArchive | null {
  if (!value || typeof value !== 'object') return null
  const archive = value as SeasonArchive
  if (!archive.snapshot || !archive.summary || typeof archive.seasonName !== 'string') return null
  return { ...archive, id, snapshot: { ...archive.snapshot, archivedPlayers: archive.snapshot.archivedPlayers || {} } }
}
