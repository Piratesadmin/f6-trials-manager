import type { Player, TrialResponseStatus, TrialSession } from '../types'
import { emptyAssessment } from './player'

type Cell = string | number | boolean | Date | null | undefined
type Row = Cell[]

export type ParsedTrialWorkbook = {
  mode: 'players' | 'trial-session'
  session: Omit<TrialSession, 'id'> | null
  players: Omit<Player, 'id'>[]
  warnings: string[]
  sourceSheet: string
}

const clean = (value: string) => value.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()

function text(value: Cell) {
  if (value instanceof Date) return `${String(value.getDate()).padStart(2, '0')}.${String(value.getMonth() + 1).padStart(2, '0')}.${value.getFullYear()}`
  return value == null ? '' : String(value).trim()
}

function responseStatus(value: string): TrialResponseStatus {
  const normalised = clean(value)
  if (normalised.includes("can't go") || normalised.includes('cannot go') || normalised.includes('declined')) return "Can't go"
  if (normalised.includes('not answered') || normalised.includes('unanswered')) return 'Not answered'
  if (/^going(?:\s|\(|$)/.test(normalised)) return 'Going'
  return ''
}

function normalisePosition(value: string) {
  const normalised = clean(value)
  if (!normalised || normalised === 'none' || normalised === 'n/a') return ''
  const positions: Record<string, string> = {
    setter: 'Setter', outside: 'Outside', middle: 'Middle', opposite: 'Opposite', libero: 'Libero',
    'all rounder': 'All-rounder', 'all-rounder': 'All-rounder',
  }
  return positions[normalised] || value.trim()
}

const headerAliases = {
  name: ['name', 'full name', 'player name'],
  firstName: ['first name', 'firstname', 'given name'],
  lastName: ['last name', 'lastname', 'surname', 'family name'],
  email: ['email', 'email address', 'e-mail'],
  dateOfBirth: ['date of birth', 'dob', 'birth date'],
  interestedDivisions: ['what division(s) are you interested in playing for?', 'interested divisions', 'division(s)', 'divisions'],
  position: ['what position do you primarily play?', 'primary position', 'position'],
  secondaryPosition: ["do you have a second position you'd like you play?", "do you have a second position you'd like to play?", 'second position', 'secondary position'],
  playingExperience: ['what is your past playing experience?', 'past playing experience', 'playing experience', 'experience'],
  highestLevelPlayed: ['highest level played in england/internationally', 'highest level played', 'highest playing level'],
} as const

type HeaderKey = keyof typeof headerAliases
type HeaderMap = Partial<Record<HeaderKey, number>>

function headerMap(row: Row): HeaderMap | null {
  const values = row.map(cell => clean(text(cell)))
  const result: HeaderMap = {}
  for (const [key, aliases] of Object.entries(headerAliases) as [HeaderKey, readonly string[]][]) {
    const index = values.findIndex(value => aliases.includes(value))
    if (index >= 0) result[key] = index
  }
  return result.email != null && (result.name != null || result.firstName != null || result.lastName != null) ? result : null
}

function cell(row: Row, headers: HeaderMap, key: HeaderKey) {
  const index = headers[key]
  return index == null ? '' : text(row[index])
}

function statusLookup(rows: Row[]) {
  const lookup = new Map<string, TrialResponseStatus>()
  const headerIndex = rows.findIndex(row => {
    const values = row.map(item => clean(text(item)))
    return values.includes('status') && values.includes('name') && values.includes('email')
  })
  if (headerIndex < 0) return lookup
  const headers = rows[headerIndex].map(item => clean(text(item)))
  const statusIndex = headers.indexOf('status')
  const nameIndex = headers.indexOf('name')
  const emailIndex = headers.indexOf('email')
  rows.slice(headerIndex + 1).forEach(row => {
    const status = responseStatus(text(row[statusIndex]))
    const email = clean(text(row[emailIndex]))
    const name = clean(text(row[nameIndex]))
    if (!status) return
    if (email) lookup.set(`email:${email}`, status)
    if (name) lookup.set(`name:${name}`, status)
  })
  return lookup
}

function parseSessionLine(value: string) {
  const match = value.match(/(?:mon|tue|wed|thu|fri|sat|sun)?\s*(\d{1,2})\.?\s+([a-z]+)(?:\s+(\d{4}))?\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/i)
  if (!match) return { date: '', startTime: '', endTime: '' }
  const months: Record<string, number> = { january:1, february:2, march:3, april:4, may:5, june:6, july:7, august:8, september:9, october:10, november:11, december:12 }
  const month = months[match[2].toLowerCase()]
  if (!month) return { date: '', startTime: match[4], endTime: match[5] }
  const year = Number(match[3]) || new Date().getFullYear()
  return { date: `${year}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`, startTime: match[4], endTime: match[5] }
}

function parsePlayers(rows: Row[], responseLookup: Map<string, TrialResponseStatus>) {
  const players: Omit<Player, 'id'>[] = []
  let headers: HeaderMap | null = null
  let sectionStatus: TrialResponseStatus = ''

  for (const row of rows) {
    const first = text(row[0])
    const markerStatus = responseStatus(first)
    if (markerStatus && !text(row[1]).includes('@')) {
      sectionStatus = markerStatus
      continue
    }
    const possibleHeaders = headerMap(row)
    if (possibleHeaders) {
      headers = possibleHeaders
      continue
    }
    if (!headers) continue
    const name = cell(row, headers, 'name') || [cell(row, headers, 'firstName'), cell(row, headers, 'lastName')].filter(Boolean).join(' ')
    const email = clean(cell(row, headers, 'email'))
    if (!name && !email) continue
    const status = responseLookup.get(`email:${email}`) || responseLookup.get(`name:${clean(name)}`) || sectionStatus
    const interestedDivisions = cell(row, headers, 'interestedDivisions')
    players.push({
      name,
      email,
      dateOfBirth: cell(row, headers, 'dateOfBirth'),
      interestedDivisions,
      position: normalisePosition(cell(row, headers, 'position')) || 'Unassigned',
      secondaryPosition: normalisePosition(cell(row, headers, 'secondaryPosition')),
      playingExperience: cell(row, headers, 'playingExperience'),
      highestLevelPlayed: cell(row, headers, 'highestLevelPlayed'),
      photoUrl: '',
      trialDate: 'Not assigned',
      trialSessionId: '',
      trialResponseStatus: status,
      paid: false,
      attended: false,
      decision: 'Awaiting decision',
      notes: '',
      assessment: emptyAssessment(),
      recommendation: '',
      strengths: '',
      developmentAreas: '',
      suitableTeams: [],
      bibNumber: '',
      teamConsideration: {},
      offers: [],
      emailReviewStatus: 'draft',
      emailDraft: { responseDeadline: '', coachName: '', personalMessage: '' },
      communicationHistory: {},
    })
  }
  return players
}

export async function parseTrialWorkbook(file: File): Promise<ParsedTrialWorkbook> {
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const workbookSheets = await readXlsxFile(file)
  const sheetNames = workbookSheets.map(item => item.sheet)
  if (!sheetNames.length) throw new Error('The Excel workbook does not contain any worksheets.')

  const sheets = new Map<string, Row[]>(workbookSheets.map(item => [item.sheet, item.data as unknown as Row[]]))

  const importName = sheetNames.find(name => clean(name) === 'for import')
  const printName = sheetNames.find(name => clean(name) === 'for print')
  const responseLookup = importName ? statusLookup(sheets.get(importName) || []) : new Map<string, TrialResponseStatus>()
  const sourceSheet = printName || sheetNames.find(name => (sheets.get(name) || []).some(row => headerMap(row))) || sheetNames[0]
  const rows = sheets.get(sourceSheet) || []
  const metadata = [text(rows[0]?.[0]), text(rows[1]?.[0]), text(rows[2]?.[0])]
  const timing = parseSessionLine(metadata[1])
  const players = parsePlayers(rows, responseLookup)
  if (!players.length) throw new Error('No player table with Name and Email columns was found in this workbook.')
  const mode: ParsedTrialWorkbook['mode'] = printName || importName || timing.date ? 'trial-session' : 'players'

  const warnings: string[] = []
  if (mode === 'trial-session') {
    if (!timing.date) warnings.push('The session date could not be read automatically. Check it before importing.')
    if (!metadata[0]) warnings.push('The session name was not found. Add one before importing.')
    if (!players.some(player => player.trialResponseStatus)) warnings.push('No Going/Not answered/Can\'t go responses were detected.')
  }

  return {
    mode,
    session: mode === 'trial-session' ? {
      eventType: 'trial',
      title: metadata[0] || 'Trial session',
      date: timing.date,
      startTime: timing.startTime,
      endTime: timing.endTime,
      venue: metadata[2],
      teams: [],
      opponent: '',
      competition: '',
      gameLocation: '',
      recurrenceRule: '',
      recurrenceGroupId: '',
      notes: `Imported from ${file.name}`,
      attendance: {},
    } : null,
    players,
    warnings,
    sourceSheet,
  }
}
