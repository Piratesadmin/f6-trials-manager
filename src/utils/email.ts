import type { CommunicationHistoryEntry, EmailSettings, EmailType, Player, TeamPlans } from '../types'
import { isValidEmail } from './csv'
import { defaultEmailSettings, defaultTeamColours, teams } from '../data/constants'
import type { ResponseDeadlineDetails } from './deadline'
import { activeOffers, squadRolePhrase } from './offers'

export type EmailIssue = { level: 'blocker' | 'warning'; message: string }
export type EmailQueueStatus = 'needs-info' | 'ready' | 'reviewed' | 'sent'

export function normaliseEmailSettings(value: unknown): EmailSettings {
  const incoming = value && typeof value === 'object' ? value as Partial<EmailSettings> : {}
  const incomingTeams = incoming.teamDetails && typeof incoming.teamDetails === 'object' ? incoming.teamDetails : {}
  return {
    clubName: incoming.clubName || defaultEmailSettings.clubName,
    clubEmail: typeof incoming.clubEmail === 'string' ? incoming.clubEmail.trim() : '',
    defaultCoachName: incoming.defaultCoachName || '',
    defaultResponseDeadline: incoming.defaultResponseDeadline || '',
    teamDetails: Object.fromEntries(teams.map(team => {
      const details = incomingTeams[team]
      return [team, {
        adminEmail: typeof details?.adminEmail === 'string' ? details.adminEmail.trim() : '',
        trainingDay: details?.trainingDay || '',
        trainingTime: details?.trainingTime || '',
        venue: details?.venue || '',
        competition: details?.competition || '',
        calendarColor: /^#[0-9a-f]{6}$/i.test(details?.calendarColor || '') ? details!.calendarColor : defaultTeamColours[team],
      }]
    })),
  }
}

export function latestCommunication(player: Player) {
  return Object.values(player.communicationHistory || {}).sort((a, b) => b.sentAt - a.sentAt)[0]
}

export function emailTypeFor(player: Player): EmailType | null {
  if (player.decision === 'Offer accepted') return latestCommunication(player)?.type || null
  if (player.decision === 'Offer sent') return latestCommunication(player)?.type || 'offer'
  if (player.decision === 'Rejection sent') return 'rejection'
  if (player.decision === 'Waiting list sent') return 'waiting-list'
  if (player.suitableTeams.length) {
    if (player.recommendation === 'Waiting list') return 'waiting-list'
    if (player.recommendation === 'Not suitable') return 'rejection'
    if (player.recommendation === 'Refer to another team') return 'alternative'
    if (player.recommendation === 'Strong offer' || player.recommendation === 'Offer') return player.decision === 'Alternative offer' ? 'alternative' : 'offer'
  }
  if (player.decision === 'Offer planned') return 'offer'
  if (player.decision === 'Alternative offer') return 'alternative'
  if (player.decision === 'Rejection planned') return 'rejection'
  if (player.decision === 'Waiting list planned') return 'waiting-list'
  return null
}

export function emailTypeLabel(type: EmailType | null) {
  if (type === 'alternative') return 'Alternative offer'
  if (type === 'waiting-list') return 'Waiting list'
  if (type === 'rejection') return 'Rejection'
  if (type === 'offer') return 'Offer'
  return 'No email'
}

export function effectiveEmailFields(player: Player, settings: EmailSettings, deadline?: ResponseDeadlineDetails) {
  const assignedCoachName = emailTeamsFor(player).flatMap(team => {
    const coachName = settings.teamCoachNames?.[team]?.trim()
    return coachName ? [`${coachName} - ${team} Coach`] : []
  }).join('\n')
  return {
    deadline: deadline?.effectiveDeadline || '',
    coachName: player.emailDraft.coachName || assignedCoachName || settings.currentCoachName || settings.defaultCoachName,
    personalMessage: player.emailDraft.personalMessage.trim(),
  }
}

export function emailSubjectFor(player: Player, settings: EmailSettings) {
  const type = emailTypeFor(player)
  const multipleTeams = activeOffers(player).length > 1
  if (type === 'offer') return `${settings.clubName} – ${multipleTeams ? 'Team options' : 'Team offer'}`
  if (type === 'alternative') return `${settings.clubName} – ${multipleTeams ? 'Alternative team options' : 'Alternative team offer'}`
  if (type === 'waiting-list') return `${settings.clubName} – Trials waiting list`
  return `${settings.clubName} trials`
}

export function emailTeamsFor(player: Player) {
  const offeredTeams = activeOffers(player).map(offer => offer.team)
  const selectedTeams = offeredTeams.length ? offeredTeams : player.suitableTeams
  return Array.from(new Set(selectedTeams)).filter(team => teams.includes(team))
}

export function emailCcFor(player: Player, settings: EmailSettings) {
  const contacts = [settings.clubEmail, ...emailTeamsFor(player).map(team => settings.teamDetails[team]?.adminEmail || '')]
  const seen = new Set([player.email.trim().toLowerCase()])
  return contacts.flatMap(contact => {
    const email = contact.trim()
    const key = email.toLowerCase()
    if (!isValidEmail(email) || seen.has(key)) return []
    seen.add(key)
    return [email]
  })
}

function teamDetailsParagraph(team: string, settings: EmailSettings) {
  const details = settings.teamDetails[team]
  if (!details) return ''
  const training = [details.trainingDay, details.trainingTime].filter(Boolean).join(' at ')
  const parts = [training ? `${team} trains ${training}` : '', details.venue ? `at ${details.venue}` : '', details.competition ? `and competes in ${details.competition}` : ''].filter(Boolean)
  return parts.length ? `${parts.join(' ')}.` : ''
}

function responseParagraph(multipleTeams: boolean) {
  const choice = multipleTeams ? 'which option you would prefer' : 'whether you would like to accept your place'
  return `Please let us know ${choice} within 72 hours of receiving this email. We understand that may not be possible, so please let us know as soon as you can if you need a little more time.`
}

function offerSection(player: Player, settings: EmailSettings) {
  const offers = activeOffers(player)
  if (!offers.length) return { multiple: false, wording: '[No team option selected]' }
  if (offers.length === 1) {
    const offer = offers[0]
    const details = teamDetailsParagraph(offer.team, settings)
    const role = squadRolePhrase(offer.squadRole)
    return {
      multiple: false,
      wording: `a place with ${offer.team} for the upcoming season, primarily playing as a ${offer.position}, with ${role}.${details ? `\n\n${details}` : ''}`,
    }
  }
  const options = offers.map(offer => `• ${offer.team} — ${offer.position} — ${offer.squadRole}`).join('\n')
  const details = offers.map(offer => teamDetailsParagraph(offer.team, settings)).filter(Boolean).join('\n')
  return {
    multiple: true,
    wording: `the following team options for the upcoming season:\n\n${options}${details ? `\n\n${details}` : ''}`,
  }
}

export function emailFor(player: Player, settings: EmailSettings, deadline?: ResponseDeadlineDetails) {
  const first = player.name.trim().split(/\s+/)[0] || 'there'
  const type = emailTypeFor(player)
  const { coachName, personalMessage } = effectiveEmailFields(player, settings, deadline)
  const signoff = `Kind regards,\n${coachName || '[Coach name]'}\n${settings.clubName}`
  const personal = personalMessage ? `\n\n${personalMessage}` : ''

  if (type === 'offer') {
    const section = offerSection(player, settings)
    return `Hi ${first},\n\nThank you for attending the ${settings.clubName} trials.\n\nWe were really impressed with your performance and would like to offer you ${section.wording}${personal}\n\n${responseParagraph(section.multiple)}\n\n${signoff}`
  }
  if (type === 'alternative') {
    const section = offerSection(player, settings)
    return `Hi ${first},\n\nThank you for attending the ${settings.clubName} trials and for expressing an interest in playing in ${player.interestedDivisions || 'one of our divisions'}.\n\nAlthough we are unable to offer you a place in your selected division option, we were impressed with your performance and would like to offer you ${section.wording}${personal}\n\n${responseParagraph(section.multiple)}\n\n${signoff}`
  }
  if (type === 'waiting-list') {
    return `Hi ${first},\n\nThank you for attending the ${settings.clubName} trials.\n\nWe are not yet able to confirm a place, but we would like to offer you a position on our waiting list while we finalise the squads.${personal}\n\nPlease let us know within 72 hours of receiving this email if you would like to remain under consideration. We understand that may not be possible, so please let us know as soon as you can if you need a little more time. We will contact you again as soon as a suitable place becomes available.\n\n${signoff}`
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

export function emailValidation(player: Player, settings: EmailSettings, players: Player[], teamPlans: TeamPlans, deadline?: ResponseDeadlineDetails): EmailIssue[] {
  const issues: EmailIssue[] = []
  const type = emailTypeFor(player)
  const { coachName } = effectiveEmailFields(player, settings, deadline)
  if (!isValidEmail(player.email)) issues.push({ level: 'blocker', message: 'Add a valid recipient email address.' })
  if (!type) issues.push({ level: 'blocker', message: 'Choose an offer, waiting-list or rejection decision.' })
  if (type && !sentDecisionFor(player)) issues.push({ level: 'blocker', message: 'Only Offer/Strong offer recommendations and rejection emails can be marked as sent.' })
  if (!coachName) issues.push({ level: 'blocker', message: 'Add the coach name in this draft or Email settings.' })
  const offers = activeOffers(player)
  const contactEmails = [
    { label: 'Club contact', email: settings.clubEmail },
    ...emailTeamsFor(player).map(team => ({ label: `${team} team admin`, email: settings.teamDetails[team]?.adminEmail || '' })),
  ]
  contactEmails.forEach(contact => {
    if (contact.email && !isValidEmail(contact.email)) issues.push({ level: 'warning', message: `${contact.label} email is invalid and will not be added to CC.` })
  })
  if ((type === 'offer' || type === 'alternative') && !offers.length) issues.push({ level: 'blocker', message: 'Choose at least one team option.' })
  if ((type === 'offer' || type === 'alternative') && offers.some(offer => !offer.position)) issues.push({ level: 'blocker', message: 'Choose a playing position for every team option.' })
  if ((type === 'offer' || type === 'alternative') && offers.some(offer => !offer.squadRole)) issues.push({ level: 'blocker', message: 'Choose a squad role for every team option.' })
  if ((type === 'offer' || type === 'alternative')) {
    offers.forEach(offer => {
      const target = teamPlans[offer.team]?.[offer.position] || 0
      const offered = players.filter(item => item.id !== player.id && activeOffers(item).some(itemOffer => itemOffer.team === offer.team && itemOffer.position === offer.position)).length
      if (target > 0 && offered + 1 > target) issues.push({ level: 'warning', message: `${offer.team} would have ${offered + 1} ${offer.position} offers against a target of ${target}.` })
      const details = settings.teamDetails[offer.team]
      if (!details?.trainingDay || !details?.trainingTime || !details?.venue) issues.push({ level: 'warning', message: `${offer.team} training details are incomplete, so they will not all appear in the email.` })
    })
  }
  if (latestCommunication(player)) issues.push({ level: 'warning', message: 'This player already has a recorded communication. Check the history before contacting them again.' })
  return issues
}

export function emailQueueStatus(player: Player, settings: EmailSettings, players: Player[], teamPlans: TeamPlans, deadline?: ResponseDeadlineDetails): EmailQueueStatus {
  if (player.emailReviewStatus === 'sent' || player.decision.endsWith('sent')) return 'sent'
  if (emailValidation(player, settings, players, teamPlans, deadline).some(issue => issue.level === 'blocker')) return 'needs-info'
  return player.emailReviewStatus === 'reviewed' ? 'reviewed' : 'ready'
}

export function buildCommunication(player: Player, settings: EmailSettings, sentBy: string, deadline?: ResponseDeadlineDetails): CommunicationHistoryEntry {
  const id = crypto.randomUUID()
  return { id, type: emailTypeFor(player) || 'rejection', subject: emailSubjectFor(player, settings), body: emailFor(player, settings, deadline), recipient: player.email, cc: emailCcFor(player, settings), sentAt: Date.now(), sentBy }
}

export function sentDecisionFor(player: Player) {
  const type = emailTypeFor(player)
  if (type === 'rejection') return 'Rejection sent' as const
  if ((type === 'offer' || type === 'alternative') && (player.recommendation === 'Offer' || player.recommendation === 'Strong offer')) return 'Offer sent' as const
  return null
}

export function mailtoFor(player: Player, settings: EmailSettings, deadline?: ResponseDeadlineDetails) {
  const cc = emailCcFor(player, settings)
  const ccParameter = cc.length ? `cc=${encodeURIComponent(cc.join(','))}&` : ''
  return `mailto:${encodeURIComponent(player.email)}?${ccParameter}subject=${encodeURIComponent(emailSubjectFor(player, settings))}&body=${encodeURIComponent(emailFor(player, settings, deadline))}`
}
