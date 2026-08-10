import { positions, teams } from '../data/constants'
import type { Player, PositionTargets, TeamPlans } from '../types'
import { offerForTeam, primaryOffer } from './offers'

export const defaultPositionTargets: PositionTargets = {
  Setter: 2,
  Outside: 5,
  Middle: 4,
  Opposite: 2,
  Libero: 2,
  'All-rounder': 2,
}

export const minimumSquadSize = 17

export function teamTargetTotal(targets: PositionTargets | undefined) {
  return positions.reduce((total, position) => total + (targets?.[position] || 0), 0)
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
    })) as PositionTargets
    const deficit = Math.max(0, minimumSquadSize - teamTargetTotal(targets))
    if (deficit) targets['All-rounder'] += deficit
    return [team, targets]
  }))
}

export function minimumTargetForPosition(targets: PositionTargets, position: string) {
  const otherTargets = positions.reduce((total, item) => item === position ? total : total + (targets[item] || 0), 0)
  return Math.max(0, minimumSquadSize - otherTargets)
}

export function teamPlansNeedMinimumUpgrade(value: TeamPlans) {
  return teams.some(team => !value[team] || teamTargetTotal(value[team]) < minimumSquadSize)
}

export function offeredTeam(player: Player) {
  if (!player.decision.includes('Offer') && player.decision !== 'Alternative offer') return ''
  return primaryOffer(player)?.team || player.offeredTeam || player.appliedTeam
}

export function assignmentForTeam(player: Player, team: string) {
  const offer = offerForTeam(player, team)
  if (offer) return offer.position
  if (player.decision === 'Offer accepted') return ''
  return player.teamConsideration[team] || ''
}

export function isPlannedForTeam(player: Player, team: string) {
  return Boolean(assignmentForTeam(player, team))
}

export function recommendationMatchesTeam(player: Player, team: string) {
  return player.appliedTeam === team || player.suitableTeams.includes(team)
}
