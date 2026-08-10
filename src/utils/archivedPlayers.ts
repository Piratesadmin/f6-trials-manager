import type { ArchivedPlayerReason, ArchivedPlayerRecord, Player } from '../types'
import { normalisePlayer } from './player'

const validReasons: ArchivedPlayerReason[] = ['Final rejection cleanup', 'Outside confirmed squad cleanup']

export function createArchivedPlayerRecord(input: {
  player: Player
  photo?: string
  seasonName: string
  archivedBy: string
  reason: ArchivedPlayerReason
  archivedAt?: number
}): ArchivedPlayerRecord {
  const record: ArchivedPlayerRecord = {
    id: input.player.id,
    seasonName: input.seasonName,
    archivedAt: input.archivedAt || Date.now(),
    archivedBy: input.archivedBy,
    archiveReason: input.reason,
    player: normalisePlayer(input.player),
    photo: input.photo || '',
  }
  return JSON.parse(JSON.stringify(record)) as ArchivedPlayerRecord
}

export function normaliseArchivedPlayerRecord(id: string, value: unknown): ArchivedPlayerRecord | null {
  if (!value || typeof value !== 'object') return null
  const incoming = value as Partial<ArchivedPlayerRecord>
  if (!incoming.player || typeof incoming.player !== 'object') return null
  const reason = validReasons.includes(incoming.archiveReason as ArchivedPlayerReason)
    ? incoming.archiveReason as ArchivedPlayerReason
    : 'Outside confirmed squad cleanup'
  return {
    id,
    seasonName: typeof incoming.seasonName === 'string' ? incoming.seasonName : '',
    archivedAt: typeof incoming.archivedAt === 'number' ? incoming.archivedAt : 0,
    archivedBy: typeof incoming.archivedBy === 'string' ? incoming.archivedBy : '',
    archiveReason: reason,
    player: normalisePlayer({ ...incoming.player, id } as Player),
    photo: typeof incoming.photo === 'string' ? incoming.photo : '',
  }
}
