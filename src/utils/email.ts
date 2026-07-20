import type { Player } from '../types'

export function emailFor(player: Player) {
  const first = player.name.split(' ')[0]
  if (player.decision === 'Offer planned' || player.decision === 'Offer sent') {
    return `Hi ${first},\n\nThank you for attending the Flaming Six trials.\n\nWe were really impressed with your performance and would like to offer you a place with ${player.offeredTeam || player.appliedTeam} for the upcoming season, primarily playing as a ${player.offeredPosition || player.position}.\n\nPlease confirm whether you would like to accept your place by [response deadline].\n\nKind regards,\n[Coach name]\nFlaming Six Volleyball Club`
  }
  if (player.decision === 'Alternative offer') {
    return `Hi ${first},\n\nThank you for attending the Flaming Six trials and for expressing an interest in joining ${player.appliedTeam}.\n\nAlthough we are unable to offer you a place with ${player.appliedTeam}, we were impressed with your performance and believe you would be a good fit for ${player.offeredTeam || '[alternative team]'}. We would therefore like to offer you a place, primarily as a ${player.offeredPosition || player.position}.\n\nPlease let us know by [response deadline] whether you would like to accept.\n\nKind regards,\n[Coach name]\nFlaming Six Volleyball Club`
  }
  return `Hi ${first},\n\nThank you for attending the Flaming Six trials and for the time and effort you put into the session.\n\n${player.rejectionReason === 'Position already filled' ? `Unfortunately, we had a particularly high number of players competing for places in the ${player.position} position.` : player.rejectionReason === 'Team level or profile fit' ? 'After reviewing the trial sessions and the particular requirements of our teams, we are unfortunately unable to offer you a place at this time.' : 'We had a very high level of interest and only a limited number of places available. Unfortunately, we are not able to offer you a place for the upcoming season.'}\n\nWe appreciate your interest in Flaming Six and wish you all the best with your volleyball this season.\n\nKind regards,\n[Coach name]\nFlaming Six Volleyball Club`
}
