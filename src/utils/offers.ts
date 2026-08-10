import type { Player, PlayerOffer, SquadRole } from '../types'

export const defaultSquadRole: SquadRole = 'Role to be discussed'
export const availableSquadRoles: SquadRole[] = ['Starting six','Frequent player','Rotational player','Development / improvement role','Training squad','Role to be discussed']

export function normaliseOffers(player: Player) {
  const unsafe = player as Player & Record<string, unknown>
  const hasOffersField = Array.isArray(unsafe.offers)
  const incoming = hasOffersField ? unsafe.offers as unknown[] : []
  const seen = new Set<string>()
  const offers = incoming.flatMap<PlayerOffer>(value => {
    if (!value || typeof value !== 'object') return []
    const offer = value as Partial<PlayerOffer>
    if (typeof offer.team !== 'string' || !offer.team || seen.has(offer.team)) return []
    seen.add(offer.team)
    return [{ team: offer.team, position: typeof offer.position === 'string' && offer.position ? offer.position : player.position || 'All-rounder', squadRole: availableSquadRoles.includes(offer.squadRole as SquadRole) ? offer.squadRole as SquadRole : defaultSquadRole }]
  })
  if (!hasOffersField && (player.decision?.includes('Offer') || player.decision === 'Alternative offer')) {
    const team = player.offeredTeam || ''
    if (team) offers.push({ team, position: player.offeredPosition || player.position || 'All-rounder', squadRole: defaultSquadRole })
  }
  return offers
}

export function primaryOffer(player: Player) {
  return player.offers.find(offer => offer.team === player.offeredTeam) || player.offers[0]
}

export function offerForTeam(player: Player, team: string) {
  if (player.decision === 'Offer accepted') return player.offeredTeam === team ? primaryOffer(player) : undefined
  if (!player.decision.includes('Offer') && player.decision !== 'Alternative offer') return undefined
  return player.offers.find(offer => offer.team === team)
}

export function activeOffers(player: Player) {
  if (player.decision === 'Offer accepted') {
    const accepted = primaryOffer(player)
    return accepted ? [accepted] : []
  }
  if (!player.decision.includes('Offer') && player.decision !== 'Alternative offer') return []
  return player.offers
}

export function offerTeamsLabel(player: Player) {
  const offers = activeOffers(player)
  return offers.length ? offers.map(offer => offer.team).join(' / ') : player.offeredTeam || player.suitableTeams.join(' / ')
}

export function squadRolePhrase(role: SquadRole) {
  if (role === 'Starting six') return 'an expected starting-six role'
  if (role === 'Frequent player') return 'an expectation of frequent court time'
  if (role === 'Rotational player') return 'a rotational role'
  if (role === 'Development / improvement role') return 'a development and improvement role'
  if (role === 'Training squad') return 'a training-squad role'
  return 'the exact squad role to be discussed with the coach'
}
