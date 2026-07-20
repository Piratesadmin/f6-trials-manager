import { positions, teams } from '../data/constants'
import type { Player, PositionTargets, TeamPlans } from '../types'

export const defaultPositionTargets: PositionTargets = {
  Setter: 2,
  Outside: 5,
  Middle: 4,
  Opposite: 2,
  Libero: 2,
  'All-rounder': 0,
}

export function createDefaultTeamPlans(): TeamPlans {
  return Object.fromEntries(teams.map(team => [team, { ...defaultPositionTargets }]))
}

export function normaliseTeamPlans(value: unknown): TeamPlans {
  const incoming = value && typeof value === 'object' ? value as Record<string, Record<string, unknown>> : {}
  return Object.fromEntries(teams.map(team => {
    const plan = incoming[team] || {}
    const targets = Object.fromEntries(positions.map(position => {
      const number = Number(plan[position])
      return [position, Number.isFinite(number) ? Math.max(0, Math.min(99, Math.round(number))) : defaultPositionTargets[position] || 0]
    }))
    return [team, targets]
  }))
}

export function offeredTeam(player: Player) {
  if (!player.decision.includes('Offer') && player.decision !== 'Alternative offer') return ''
  return player.offeredTeam || player.appliedTeam
}

export function assignmentForTeam(player: Player, team: string) {
  if (player.teamConsideration[team]) return player.teamConsideration[team]
  return offeredTeam(player) === team ? player.offeredPosition || player.position : ''
}

export function isPlannedForTeam(player: Player, team: string) {
  return Boolean(assignmentForTeam(player, team))
}

export function recommendationMatchesTeam(player: Player, team: string) {
  return player.appliedTeam === team || player.suitableTeams.includes(team)
}
