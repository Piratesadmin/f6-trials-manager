import { teams } from '../data/constants'
import type { CoachProfile } from '../types'

export function createCoachProfile(uid: string, email: string, admin = false): CoachProfile {
  return {
    uid,
    email,
    displayName: email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
    role: admin ? 'admin' : 'coach',
    teams: {},
  }
}

export function normaliseCoachProfile(uid: string, value: unknown, fallbackEmail = ''): CoachProfile {
  const incoming = value && typeof value === 'object' ? value as Partial<CoachProfile> : {}
  const assigned = incoming.teams && typeof incoming.teams === 'object' ? incoming.teams : {}
  return {
    uid,
    email: typeof incoming.email === 'string' ? incoming.email : fallbackEmail,
    displayName: typeof incoming.displayName === 'string' && incoming.displayName.trim() ? incoming.displayName : createCoachProfile(uid, fallbackEmail).displayName,
    role: incoming.role === 'admin' ? 'admin' : 'coach',
    teams: Object.fromEntries(teams.filter(team => assigned[team] === true).map(team => [team, true])),
  }
}

export function assignedTeamNames(profile: CoachProfile | null) {
  return profile ? teams.filter(team => profile.teams[team]) : []
}
