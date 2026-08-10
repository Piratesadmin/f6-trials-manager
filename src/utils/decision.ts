import type { Player, PlayerDecisionDraft } from '../types'

export function decisionDraftFor(player: Player): PlayerDecisionDraft {
  return {
    decision: player.decision,
    recommendation: player.recommendation,
    suitableTeams: [...player.suitableTeams],
    offers: player.offers.map(offer => ({ ...offer })),
    offeredTeam: player.offeredTeam || '',
    offeredPosition: player.offeredPosition || '',
    rejectionReason: player.rejectionReason || '',
    teamConsideration: { ...player.teamConsideration },
    emailReviewStatus: player.emailReviewStatus,
  }
}

function sameStringSet(left: string[], right: string[]) {
  return left.length === right.length && left.every(value => right.includes(value))
}

function sameStringMap(left: Record<string, string>, right: Record<string, string>) {
  const leftEntries = Object.entries(left)
  return leftEntries.length === Object.keys(right).length && leftEntries.every(([key, value]) => right[key] === value)
}

export function sameDecisionDraft(left: PlayerDecisionDraft, right: PlayerDecisionDraft) {
  return left.decision === right.decision
    && left.recommendation === right.recommendation
    && sameStringSet(left.suitableTeams, right.suitableTeams)
    && left.offers.length === right.offers.length
    && left.offers.every((offer, index) => {
      const other = right.offers[index]
      return other?.team === offer.team && other.position === offer.position && other.squadRole === offer.squadRole
    })
    && (left.offeredTeam || '') === (right.offeredTeam || '')
    && (left.offeredPosition || '') === (right.offeredPosition || '')
    && (left.rejectionReason || '') === (right.rejectionReason || '')
    && sameStringMap(left.teamConsideration, right.teamConsideration)
    && left.emailReviewStatus === right.emailReviewStatus
}

export function applyDecisionDraft(player: Player, draft: PlayerDecisionDraft): Player {
  return {
    ...player,
    ...draft,
    suitableTeams: [...draft.suitableTeams],
    offers: draft.offers.map(offer => ({ ...offer })),
    teamConsideration: { ...draft.teamConsideration },
  }
}
