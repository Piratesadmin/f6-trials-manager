import type { Player } from '../types'
import { emptyAssessment } from './player'

export type CsvField = 'name' | 'firstName' | 'lastName' | 'email' | 'appliedTeam' | 'position' | 'trialDate'
export type CsvMapping = Record<CsvField, string>

export type ParsedCsv = {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && quoted && next === '"') {
      field += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(field.trim())
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1
      row.push(field.trim())
      if (row.some(value => value !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  row.push(field.trim())
  if (row.some(value => value !== '')) rows.push(row)

  const headers = (rows.shift() || []).map((header, index) => header || `Column ${index + 1}`)
  return {
    headers,
    rows: rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))),
  }
}

const aliases: Record<CsvField, string[]> = {
  name: ['full name', 'name', 'player name'],
  firstName: ['first name', 'firstname', 'given name'],
  lastName: ['last name', 'lastname', 'surname', 'family name'],
  email: ['email', 'email address', 'e-mail'],
  appliedTeam: ['team', 'team preference', 'preferred team', 'team applied for', 'which team'],
  position: ['position', 'primary position', 'preferred position', 'playing position'],
  trialDate: ['trial date', 'trial session', 'session', 'preferred trial date', 'date'],
}

export function suggestMapping(headers: string[]): CsvMapping {
  const normalised = headers.map(header => ({ header, value: header.toLowerCase().trim() }))
  const find = (field: CsvField) => normalised.find(item => aliases[field].some(alias => item.value === alias || item.value.includes(alias)))?.header || ''
  return {
    name: find('name'),
    firstName: find('firstName'),
    lastName: find('lastName'),
    email: find('email'),
    appliedTeam: find('appliedTeam'),
    position: find('position'),
    trialDate: find('trialDate'),
  }
}

function value(row: Record<string, string>, header: string) {
  return header ? (row[header] || '').trim() : ''
}

export function rowsToPlayers(rows: Record<string, string>[], mapping: CsvMapping): Omit<Player, 'id'>[] {
  return rows.map(row => {
    const fullName = value(row, mapping.name)
    const combinedName = [value(row, mapping.firstName), value(row, mapping.lastName)].filter(Boolean).join(' ')
    return {
      name: fullName || combinedName,
      email: value(row, mapping.email).toLowerCase(),
      appliedTeam: value(row, mapping.appliedTeam) || 'Unassigned',
      position: value(row, mapping.position) || 'Unassigned',
      trialDate: value(row, mapping.trialDate) || 'Not assigned',
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
    }
  })
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
