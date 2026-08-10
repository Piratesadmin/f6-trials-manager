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
  const role = incoming.role === 'admin' ? 'admin' : incoming.role === 'team-admin' ? 'team-admin' : 'coach'
  const assignedTeams = teams.filter(team => assigned[team] === true)
  return {
    uid,
    email: typeof incoming.email === 'string' ? incoming.email : fallbackEmail,
    displayName: typeof incoming.displayName === 'string' && incoming.displayName.trim() ? incoming.displayName : createCoachProfile(uid, fallbackEmail).displayName,
    role,
    teams: Object.fromEntries((role === 'team-admin' ? assignedTeams.slice(0,1) : assignedTeams).map(team => [team, true])),
  }
}

export function assignedTeamNames(profile: CoachProfile | null) {
  return profile ? teams.filter(team => profile.teams[team]) : []
}

export function assignedCoachNameForTeam(profiles: CoachProfile[], team: string, preferredEmail = '') {
  const assigned = profiles
    .filter(profile => profile.role !== 'admin' && profile.teams[team] && profile.displayName.trim())
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
  const preferred = preferredEmail.trim().toLowerCase()
  return (preferred ? assigned.find(profile => profile.email.trim().toLowerCase() === preferred) : undefined)?.displayName.trim()
    || assigned.find(profile => profile.role === 'team-admin')?.displayName.trim()
    || assigned[0]?.displayName.trim()
    || ''
}
