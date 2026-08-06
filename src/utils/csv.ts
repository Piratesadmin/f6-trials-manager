import type { Player } from '../types'
import { emptyAssessment } from './player'

export type CsvField = 'name' | 'firstName' | 'lastName' | 'email' | 'dateOfBirth' | 'interestedDivisions' | 'appliedTeam' | 'position' | 'secondaryPosition' | 'playingExperience' | 'highestLevelPlayed' | 'photoUrl' | 'trialDate'
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
  dateOfBirth: ['date of birth', 'dob', 'birth date'],
  interestedDivisions: ['what division(s) are you interested in playing for?', 'divisions interested', 'interested divisions', 'division(s)', 'divisions'],
  appliedTeam: ['team', 'team preference', 'preferred team', 'team applied for', 'which team'],
  position: ['what position do you primarily play?', 'position', 'primary position', 'preferred position', 'playing position'],
  secondaryPosition: ["do you have a second position you'd like you play?", "do you have a second position you'd like to play?", 'second position', 'secondary position'],
  playingExperience: ['what is your past playing experience?', 'past playing experience', 'playing experience', 'experience'],
  highestLevelPlayed: ['highest level played in england/internationally', 'highest level played', 'highest playing level', 'playing level'],
  photoUrl: ['player photo', 'photo url', 'photograph', 'photo'],
  trialDate: ['trial date', 'trial session', 'session', 'preferred trial date', 'date'],
}

export function suggestMapping(headers: string[]): CsvMapping {
  const normalised = headers.map(header => ({ header, value: header.toLowerCase().trim() }))
  const find = (field: CsvField) => {
    const exact = normalised.find(item => aliases[field].some(alias => item.value === alias))
    if (exact) return exact.header
    return normalised.find(item => aliases[field].some(alias => alias.length > 4 && item.value.includes(alias)))?.header || ''
  }
  return {
    name: find('name'),
    firstName: find('firstName'),
    lastName: find('lastName'),
    email: find('email'),
    dateOfBirth: find('dateOfBirth'),
    interestedDivisions: find('interestedDivisions'),
    appliedTeam: find('appliedTeam'),
    position: find('position'),
    secondaryPosition: find('secondaryPosition'),
    playingExperience: find('playingExperience'),
    highestLevelPlayed: find('highestLevelPlayed'),
    photoUrl: find('photoUrl'),
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
    const interestedDivisions = value(row, mapping.interestedDivisions)
    const matchedTeam = interestedDivisions.split(/[,;/|]/).map(item => item.trim()).find(item => ['Aces','Ravens','Cobras','Coyotes','Llamas','Meerkats','Leopards','Pirates'].includes(item))
    return {
      name: fullName || combinedName,
      email: value(row, mapping.email).toLowerCase(),
      dateOfBirth: value(row, mapping.dateOfBirth),
      interestedDivisions,
      appliedTeam: value(row, mapping.appliedTeam) || matchedTeam || 'Unassigned',
      position: value(row, mapping.position) || 'Unassigned',
      secondaryPosition: value(row, mapping.secondaryPosition),
      playingExperience: value(row, mapping.playingExperience),
      highestLevelPlayed: value(row, mapping.highestLevelPlayed),
      photoUrl: value(row, mapping.photoUrl),
      trialDate: value(row, mapping.trialDate) || 'Not assigned',
      trialSessionId: '',
      trialResponseStatus: '',
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
      emailReviewStatus: 'draft',
      emailDraft: { responseDeadline: '', coachName: '', personalMessage: '' },
      communicationHistory: {},
    }
  })
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
