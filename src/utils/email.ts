import type { CommunicationHistoryEntry, EmailSettings, EmailType, Player, TeamPlans } from '../types'
import { isValidEmail } from './csv'
import { defaultEmailSettings, teams } from '../data/constants'

export type EmailIssue = { level: 'blocker' | 'warning'; message: string }
export type EmailQueueStatus = 'needs-info' | 'ready' | 'reviewed' | 'sent'

export function normaliseEmailSettings(value: unknown): EmailSettings {
  const incoming = value && typeof value === 'object' ? value as Partial<EmailSettings> : {}
  const incomingTeams = incoming.teamDetails && typeof incoming.teamDetails === 'object' ? incoming.teamDetails : {}
  return {
    clubName: incoming.clubName || defaultEmailSettings.clubName,
    defaultCoachName: incoming.defaultCoachName || '',
    defaultResponseDeadline: incoming.defaultResponseDeadline || '',
    teamDetails: Object.fromEntries(teams.map(team => {
      const details = incomingTeams[team]
      return [team, {
        trainingDay: details?.trainingDay || '',
        trainingTime: details?.trainingTime || '',
        venue: details?.venue || '',
        competition: details?.competition || '',
      }]
    })),
  }
}

export function latestCommunication(player: Player) {
  return Object.values(player.communicationHistory || {}).sort((a, b) => b.sentAt - a.sentAt)[0]
}

export function emailTypeFor(player: Player): EmailType | null {
  if (player.decision === 'Offer planned' || player.decision === 'Offer sent') return latestCommunication(player)?.type || 'offer'
  if (player.decision === 'Alternative offer') return 'alternative'
  if (player.decision === 'Rejection planned' || player.decision === 'Rejection sent') return 'rejection'
  if (player.decision === 'Waiting list planned' || player.decision === 'Waiting list sent') return 'waiting-list'
  return null
}

export function emailTypeLabel(type: EmailType | null) {
  if (type === 'alternative') return 'Alternative offer'
  if (type === 'waiting-list') return 'Waiting list'
  if (type === 'rejection') return 'Rejection'
  if (type === 'offer') return 'Offer'
  return 'No email'
}

export function effectiveEmailFields(player: Player, settings: EmailSettings) {
  return {
    deadline: player.emailDraft.responseDeadline || settings.defaultResponseDeadline,
    coachName: player.emailDraft.coachName || settings.defaultCoachName,
    personalMessage: player.emailDraft.personalMessage.trim(),
  }
}

function displayDate(value: string) {
  if (!value) return '[response deadline]'
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function emailSubjectFor(player: Player, settings: EmailSettings) {
  const type = emailTypeFor(player)
  if (type === 'offer') return `${settings.clubName} – Team offer`
  if (type === 'alternative') return `${settings.clubName} – Alternative team offer`
  if (type === 'waiting-list') return `${settings.clubName} – Trials waiting list`
  return `${settings.clubName} trials`
}

function teamParagraph(player: Player, settings: EmailSettings) {
  const team = player.offeredTeam || player.appliedTeam
  const details = settings.teamDetails[team]
  if (!details) return ''
  const training = [details.trainingDay, details.trainingTime].filter(Boolean).join(' at ')
  const parts = [training ? `${team} trains ${training}` : '', details.venue ? `at ${details.venue}` : '', details.competition ? `and competes in ${details.competition}` : ''].filter(Boolean)
  return parts.length ? `\n\n${parts.join(' ')}.` : ''
}

export function emailFor(player: Player, settings: EmailSettings) {
  const first = player.name.trim().split(/\s+/)[0] || 'there'
  const type = emailTypeFor(player)
  const { deadline, coachName, personalMessage } = effectiveEmailFields(player, settings)
  const signoff = `Kind regards,\n${coachName || '[Coach name]'}\n${settings.clubName}`
  const personal = personalMessage ? `\n\n${personalMessage}` : ''

  if (type === 'offer') {
    const team = player.offeredTeam || player.appliedTeam || '[team]'
    const position = player.offeredPosition || player.position || '[position]'
    return `Hi ${first},\n\nThank you for attending the ${settings.clubName} trials.\n\nWe were really impressed with your performance and would like to offer you a place with ${team} for the upcoming season, primarily playing as a ${position}.${teamParagraph(player, settings)}${personal}\n\nPlease confirm whether you would like to accept your place by ${displayDate(deadline)}.\n\n${signoff}`
  }
  if (type === 'alternative') {
    const team = player.offeredTeam || '[alternative team]'
    const position = player.offeredPosition || player.position || '[position]'
    return `Hi ${first},\n\nThank you for attending the ${settings.clubName} trials and for expressing an interest in joining ${player.appliedTeam}.\n\nAlthough we are unable to offer you a place with ${player.appliedTeam}, we were impressed with your performance and believe you would be a good fit for ${team}. We would therefore like to offer you a place, primarily as a ${position}.${teamParagraph(player, settings)}${personal}\n\nPlease let us know by ${displayDate(deadline)} whether you would like to accept.\n\n${signoff}`
  }
  if (type === 'waiting-list') {
    return `Hi ${first},\n\nThank you for attending the ${settings.clubName} trials.\n\nWe are not yet able to confirm a place, but we would like to offer you a position on our waiting list while we finalise the squads.${personal}\n\nPlease let us know by ${displayDate(deadline)} if you would like to remain under consideration. We will contact you again as soon as a suitable place becomes available.\n\n${signoff}`
  }
  const reason = player.rejectionReason === 'Position already filled'
    ? `We had a particularly high number of players competing for places in the ${player.position} position.`
    : player.rejectionReason === 'Team level or profile fit'
      ? 'The decision reflects the particular playing levels and positions our teams currently need.'
      : player.rejectionReason === 'Training availability does not match'
        ? 'Unfortunately, the available training arrangements do not match the commitment required by our current squads.'
        : player.rejectionReason === 'No suitable team currently available'
          ? 'Unfortunately, we do not currently have a suitable team place available.'
          : 'We had a very high level of interest and only a limited number of places available.'
  return `Hi ${first},\n\nThank you for attending the ${settings.clubName} trials and for the time and effort you put into the session.\n\n${reason} Unfortunately, we are not able to offer you a place for the upcoming season.${personal}\n\nWe appreciate your interest in ${settings.clubName} and wish you all the best with your volleyball this season.\n\n${signoff}`
}

export function emailValidation(player: Player, settings: EmailSettings, players: Player[], teamPlans: TeamPlans): EmailIssue[] {
  const issues: EmailIssue[] = []
  const type = emailTypeFor(player)
  const { deadline, coachName } = effectiveEmailFields(player, settings)
  if (!isValidEmail(player.email)) issues.push({ level: 'blocker', message: 'Add a valid recipient email address.' })
  if (!type) issues.push({ level: 'blocker', message: 'Choose an offer, waiting-list or rejection decision.' })
  if (!coachName) issues.push({ level: 'blocker', message: 'Add the coach name in this draft or Email settings.' })
  if ((type === 'offer' || type === 'alternative' || type === 'waiting-list') && !deadline) issues.push({ level: 'blocker', message: 'Add a response deadline.' })
  if ((type === 'offer' || type === 'alternative') && !(player.offeredTeam || player.appliedTeam)) issues.push({ level: 'blocker', message: 'Choose the team being offered.' })
  if ((type === 'offer' || type === 'alternative') && !(player.offeredPosition || player.position)) issues.push({ level: 'blocker', message: 'Choose the offered position.' })
  if (type === 'rejection' && !player.rejectionReason) issues.push({ level: 'blocker', message: 'Choose a constructive rejection reason.' })
  if ((type === 'offer' || type === 'alternative')) {
    const team = player.offeredTeam || player.appliedTeam
    const position = player.offeredPosition || player.position
    const target = teamPlans[team]?.[position] || 0
    const offered = players.filter(item => item.id !== player.id && (item.decision === 'Offer planned' || item.decision === 'Offer sent' || item.decision === 'Offer accepted' || item.decision === 'Alternative offer') && (item.offeredTeam || item.appliedTeam) === team && (item.offeredPosition || item.position) === position).length
    if (target > 0 && offered + 1 > target) issues.push({ level: 'warning', message: `${team} would have ${offered + 1} ${position} offers against a target of ${target}.` })
    const details = settings.teamDetails[team]
    if (!details?.trainingDay || !details?.trainingTime || !details?.venue) issues.push({ level: 'warning', message: `${team} training details are incomplete, so they will not all appear in the email.` })
  }
  if (latestCommunication(player)) issues.push({ level: 'warning', message: 'This player already has a recorded communication. Check the history before contacting them again.' })
  return issues
}

export function emailQueueStatus(player: Player, settings: EmailSettings, players: Player[], teamPlans: TeamPlans): EmailQueueStatus {
  if (player.emailReviewStatus === 'sent' || player.decision.endsWith('sent')) return 'sent'
  if (emailValidation(player, settings, players, teamPlans).some(issue => issue.level === 'blocker')) return 'needs-info'
  return player.emailReviewStatus === 'reviewed' ? 'reviewed' : 'ready'
}

export function buildCommunication(player: Player, settings: EmailSettings, sentBy: string): CommunicationHistoryEntry {
  const id = crypto.randomUUID()
  return { id, type: emailTypeFor(player) || 'rejection', subject: emailSubjectFor(player, settings), body: emailFor(player, settings), recipient: player.email, sentAt: Date.now(), sentBy }
}

export function sentDecisionFor(player: Player) {
  const type = emailTypeFor(player)
  if (type === 'rejection') return 'Rejection sent' as const
  if (type === 'waiting-list') return 'Waiting list sent' as const
  return 'Offer sent' as const
}

export function mailtoFor(player: Player, settings: EmailSettings) {
  return `mailto:${encodeURIComponent(player.email)}?subject=${encodeURIComponent(emailSubjectFor(player, settings))}&body=${encodeURIComponent(emailFor(player, settings))}`
}
