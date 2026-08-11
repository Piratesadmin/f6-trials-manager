export const systemBackupPaths = [
  'players',
  'trialSessions',
  'teamPlans',
  'emailSettings',
  'financeSettings',
  'seasonSettings',
  'playerFinance',
  'playerStars',
  'playerPhotos',
  'sessionPhotos',
  'coachProfiles',
  'archivedPlayers',
  'seasonArchives',
  'auditLog',
] as const

export type SystemBackupPath = typeof systemBackupPaths[number]
export type SystemBackupData = Record<SystemBackupPath, unknown | null>

export type SystemBackup = {
  format: 'f6-club-manager-system-backup'
  schemaVersion: 1
  exportedAt: string
  data: SystemBackupData
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function countRecords(value: unknown) {
  return isRecord(value) ? Object.keys(value).length : 0
}

export function createSystemBackup(data: SystemBackupData): SystemBackup {
  return { format: 'f6-club-manager-system-backup', schemaVersion: 1, exportedAt: new Date().toISOString(), data }
}

export function parseSystemBackup(text: string): SystemBackup {
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error('This is not a valid JSON backup file.') }
  if (!isRecord(parsed) || parsed.format !== 'f6-club-manager-system-backup') throw new Error('This file is not an F6 Club Manager system backup.')
  if (parsed.schemaVersion !== 1) throw new Error('This backup uses an unsupported schema version.')
  if (typeof parsed.exportedAt !== 'string' || Number.isNaN(Date.parse(parsed.exportedAt))) throw new Error('The backup export date is missing or invalid.')
  if (!isRecord(parsed.data)) throw new Error('The backup data is missing or invalid.')
  const backupData = parsed.data as Record<string, unknown>
  const missing = systemBackupPaths.filter(path => !Object.hasOwn(backupData, path))
  if (missing.length) throw new Error(`The backup is incomplete. Missing: ${missing.join(', ')}.`)
  const invalid = systemBackupPaths.filter(path => backupData[path] !== null && !isRecord(backupData[path]))
  if (invalid.length) throw new Error(`The backup contains invalid collections: ${invalid.join(', ')}.`)
  return parsed as SystemBackup
}

export function systemBackupSummary(backup: SystemBackup) {
  const sessionPhotoGroups: unknown[] = isRecord(backup.data.sessionPhotos) ? Object.values(backup.data.sessionPhotos) : []
  return {
    players: countRecords(backup.data.players),
    events: countRecords(backup.data.trialSessions),
    archives: countRecords(backup.data.seasonArchives),
    photos: countRecords(backup.data.playerPhotos) + sessionPhotoGroups.reduce<number>((total, photos) => total + countRecords(photos), 0),
  }
}

export function downloadSystemBackup(backup: SystemBackup, prefix = 'f6-system-backup') {
  const stamp = backup.exportedAt.replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
  link.download = `${prefix}-${stamp}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}
