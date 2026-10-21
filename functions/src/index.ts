import {createHash, randomBytes, randomInt, scryptSync, timingSafeEqual} from 'node:crypto'
import {initializeApp} from 'firebase-admin/app'
import {getDatabase, type DataSnapshot} from 'firebase-admin/database'
import {getStorage} from 'firebase-admin/storage'
import {HttpsError, onCall, type CallableRequest} from 'firebase-functions/v2/https'
import {onSchedule} from 'firebase-functions/v2/scheduler'
import {loadMatchCentre, type MatchCentreData} from './matchCentre.js'

initializeApp()
const db = getDatabase()
const region = 'europe-west2'
const categories = new Set(['safeguarding', 'discrimination', 'conduct', 'wellbeing', 'club-feedback', 'other'])
const statuses = new Set(['new', 'open', 'closed'])
const day = 24 * 60 * 60 * 1000
const openRetention = 730 * day
const closedRetention = 180 * day
const auditRetention = 365 * day
const maximumOpenCases = 50
const maximumActiveSignups = 500
const signupStatuses = new Set(['new', 'contacted', 'closed'])
const signupStatusOutcomes: Record<string, Set<string>> = {
  contacted: new Set(['trial-session', 'team-offer', 'more-information', 'general-follow-up']),
  closed: new Set(['joined-team', 'no-offer', 'player-declined', 'no-response', 'withdrew']),
}
const signupCategories = new Set(['Mens', 'Women’s'])
const signupDivisions: Record<string, Set<string>> = {
  'Mens': new Set(['NVL Div 1', 'LVA Div 2', 'LVA Div 3']),
  'Women’s': new Set(['NVL Div 2', 'LVA Div 1', 'LVA Div 2']),
}
const signupPositions = new Set(['Setter', 'Outside', 'Middle', 'Opposite', 'Libero', 'All-rounder', 'Not sure'])
const clubTeams = new Set(['Aces', 'Ravens', 'Cobras', 'Coyotes', 'Llamas', 'Meerkats', 'Leopards', 'Pirates'])
const managerRoles = new Set(['coach', 'assistant-coach', 'team-admin', 'admin'])
const clubReaderRoles = new Set([...managerRoles, 'welfare'])
const matchCentreCacheDuration = 15 * 60 * 1000
const matchCentreMinimumRefresh = 60 * 1000
const refereeRoles = ['first-referee', 'second-referee', 'scorer'] as const
const refereeRoleLabels: Record<(typeof refereeRoles)[number], string> = {'first-referee': 'First referee', 'second-referee': 'Second referee', scorer: 'Scorer'}
const refereeInvoiceStatuses = new Set(['Submitted', 'Approved', 'Rejected', 'Paid'])
const maximumRefereeInvoiceFileBytes = 2 * 1024 * 1024

type CaseStatus = 'new' | 'open' | 'closed'
type StoredCase = {
  category: string
  status: CaseStatus
  urgent: boolean
  createdAt: number
  updatedAt: number
  latestPreview: string
  unreadForStaff: boolean
  unreadForReporter: boolean
  deleteAfter: number
  pinSalt: string
  pinHash: string
  messages?: Record<string, {sender: 'reporter' | 'welfare'; text: string; createdAt: number}>
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function text(value: unknown, field: string, minimum: number, maximum: number) {
  if (typeof value !== 'string') throw new HttpsError('invalid-argument', `${field} is required.`)
  const clean = value.replace(/\r\n?/g, '\n').trim()
  if (clean.length < minimum || clean.length > maximum) throw new HttpsError('invalid-argument', `${field} must be between ${minimum} and ${maximum} characters.`)
  return clean
}

function optionalText(value: unknown, field: string, maximum: number) {
  if (value == null || value === '') return ''
  return text(value, field, 0, maximum)
}

function email(value: unknown, field = 'Email address') {
  const clean = text(value, field, 5, 200).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new HttpsError('invalid-argument', `${field} is not valid.`)
  return clean
}

function choice(value: unknown, field: string, choices: Set<string>) {
  if (typeof value !== 'string' || !choices.has(value)) throw new HttpsError('invalid-argument', `Choose a valid ${field.toLowerCase()}.`)
  return value
}

function dateOfBirth(value: unknown) {
  const clean = text(value, 'Date of birth', 10, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) throw new HttpsError('invalid-argument', 'Date of birth is not valid.')
  const date = new Date(`${clean}T00:00:00Z`)
  const now = new Date()
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== clean || date >= now || date.getUTCFullYear() < now.getUTCFullYear() - 100) throw new HttpsError('invalid-argument', 'Date of birth is not valid.')
  return clean
}

function profilePhoto(value: unknown) {
  if (value == null || value === '') return ''
  if (typeof value !== 'string' || value.length > 150000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) throw new HttpsError('invalid-argument', 'Profile photo must be a valid JPEG, PNG or WebP image smaller than 150 KB.')
  return value
}

function under18(value: string) {
  const birth = new Date(`${value}T00:00:00Z`)
  const eighteenth = new Date(Date.UTC(birth.getUTCFullYear() + 18, birth.getUTCMonth(), birth.getUTCDate()))
  return Date.now() < eighteenth.getTime()
}

function caseId(value: unknown) {
  const clean = text(value, 'Case ID', 8, 40).toUpperCase()
  if (!/^WEL-[A-Z0-9-]+$/.test(clean)) throw new HttpsError('not-found', 'Those case details could not be verified.')
  return clean
}

function casePin(value: unknown) {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) throw new HttpsError('not-found', 'Those case details could not be verified.')
  return value
}

function hashPin(pin: string, salt: string) {
  return scryptSync(pin, Buffer.from(salt, 'hex'), 32).toString('hex')
}

function validPin(pin: string, value: StoredCase) {
  if (!value.pinSalt || !value.pinHash) return false
  const expected = Buffer.from(value.pinHash, 'hex')
  const actual = Buffer.from(hashPin(pin, value.pinSalt), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function createCaseId() {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '')
  return `WEL-${date}-${randomBytes(6).toString('hex').toUpperCase()}`
}

function createPin() {
  return randomInt(0, 100_000_000).toString().padStart(8, '0')
}

function createSignupId() {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '')
  return `JOIN-${date}-${randomBytes(4).toString('hex').toUpperCase()}`
}

function openCaseCount(cases: Record<string, unknown>) {
  return Object.values(cases).filter(value => {
    const status = record(value).status
    return status === 'new' || status === 'open'
  }).length
}

function capacityError() {
  return new HttpsError('resource-exhausted', 'The welfare inbox is currently at capacity. Please try again later.')
}

function publicCase(id: string, value: StoredCase) {
  return {
    id,
    category: value.category,
    status: value.status,
    urgent: value.urgent === true,
    createdAt: Number(value.createdAt) || 0,
    updatedAt: Number(value.updatedAt) || 0,
    latestPreview: typeof value.latestPreview === 'string' ? value.latestPreview : '',
    unreadForStaff: value.unreadForStaff === true,
    unreadForReporter: value.unreadForReporter === true,
  }
}

function messagesFor(value: StoredCase) {
  return Object.entries(value.messages || {})
    .map(([id, message]) => ({id, sender: message.sender, text: message.text, createdAt: Number(message.createdAt) || 0}))
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(0, 200)
}

async function requireStaff(request: CallableRequest<unknown>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in with a welfare account.')
  const role = (await db.ref(`coachProfiles/${request.auth.uid}/role`).get()).val()
  if (role !== 'welfare') throw new HttpsError('permission-denied', 'Welfare inbox access is required.')
  return {
    uid: request.auth.uid,
    email: typeof request.auth.token.email === 'string' ? request.auth.token.email : '',
    role: 'welfare',
  }
}

async function requireManager(request: CallableRequest<unknown>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to Club Manager.')
  const accountEmail = typeof request.auth.token.email === 'string' ? request.auth.token.email.toLowerCase() : ''
  const role = (await db.ref(`coachProfiles/${request.auth.uid}/role`).get()).val()
  if (accountEmail !== 'trials@flamingsix.co.uk' && (typeof role !== 'string' || !managerRoles.has(role))) throw new HttpsError('permission-denied', 'Club Manager access is required.')
  return {email: accountEmail}
}

async function requireClubReader(request: CallableRequest<unknown>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to Club Manager.')
  const accountEmail = typeof request.auth.token.email === 'string' ? request.auth.token.email.toLowerCase() : ''
  const role = (await db.ref(`coachProfiles/${request.auth.uid}/role`).get()).val()
  if (accountEmail !== 'trials@flamingsix.co.uk' && (typeof role !== 'string' || !clubReaderRoles.has(role))) throw new HttpsError('permission-denied', 'Club Manager access is required.')
}

async function requireFinanceAdmin(request: CallableRequest<unknown>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to Club Manager.')
  const accountEmail = typeof request.auth.token.email === 'string' ? request.auth.token.email.toLowerCase() : ''
  const role = (await db.ref(`coachProfiles/${request.auth.uid}/role`).get()).val()
  if (accountEmail !== 'trials@flamingsix.co.uk' && role !== 'admin') throw new HttpsError('permission-denied', 'Finance administrator access is required.')
  return {uid: request.auth.uid, email: accountEmail, displayName: String((await db.ref(`coachProfiles/${request.auth.uid}/displayName`).get()).val() || accountEmail)}
}

function refereeTokenHash(token: string) { return createHash('sha256').update(token).digest('hex') }

function validRefereeToken(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{40,80}$/.test(value)) throw new HttpsError('not-found', 'This referee invoice link is invalid or has expired.')
  return value
}

function validFixtureId(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(value)) throw new HttpsError('invalid-argument', 'Fixture ID is invalid.')
  return value
}

async function refereeInvoiceByToken(value: unknown) {
  const token = validRefereeToken(value)
  const tokenHash = refereeTokenHash(token)
  const tokenEntry = record((await db.ref(`refereeInvoiceTokens/${tokenHash}`).get()).val())
  const fixtureId = validFixtureId(tokenEntry.fixtureId)
  const role = choice(tokenEntry.role, 'referee role', new Set<string>(refereeRoles)) as (typeof refereeRoles)[number]
  const [inviteSnapshot, invoiceSnapshot] = await Promise.all([
    db.ref(`refereeInvoiceInvites/${fixtureId}/${role}`).get(),
    db.ref(`refereeInvoices/${fixtureId}/${role}`).get(),
  ])
  const invite = record(inviteSnapshot.val())
  const invoice = record(invoiceSnapshot.val())
  if (invite.tokenHash !== tokenHash || invoice.inviteHash !== tokenHash) throw new HttpsError('not-found', 'This referee invoice link is invalid or has expired.')
  return {token, tokenHash, fixtureId, role, invite, invoice}
}

export const getMatchCentre = onCall({region, timeoutSeconds: 60, memory: '512MiB'}, async request => {
  const force = record(request.data).force === true
  if (force) await requireClubReader(request)
  const cacheReference = db.ref('matchCentreCacheV2')
  const cached = (await cacheReference.get()).val() as MatchCentreData | null
  const cacheAge = cached?.updatedAt ? Date.now() - cached.updatedAt : Number.POSITIVE_INFINITY
  if (cached && cacheAge < (force ? matchCentreMinimumRefresh : matchCentreCacheDuration)) return {...cached, stale: false}
  try {
    const data = await loadMatchCentre()
    await cacheReference.set(data)
    return data
  } catch (error) {
    console.error('Match Centre refresh failed', error)
    if (cached) return {...cached, stale: true}
    throw new HttpsError('unavailable', 'The NVL and LVA feeds could not be reached. Please try again shortly.')
  }
})

export const createRefereeInvoiceLinks = onCall({region}, async request => {
  const actor = await requireFinanceAdmin(request)
  const input = record(request.data)
  const fixtureId = validFixtureId(input.fixtureId)
  const fixtureDate = text(input.fixtureDate, 'Fixture date', 10, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fixtureDate) || Number.isNaN(Date.parse(`${fixtureDate}T00:00:00Z`))) throw new HttpsError('invalid-argument', 'Fixture date is invalid.')
  const team = choice(input.team, 'team', clubTeams)
  const fixtureTitle = text(input.fixtureTitle, 'Fixture', 3, 160)
  const opponent = text(input.opponent, 'Opponent', 1, 160)
  const venue = optionalText(input.venue, 'Venue', 200)
  const competition = optionalText(input.competition, 'Competition', 160)
  const expiresAt = Math.max(Date.now() + 30 * day, Date.parse(`${fixtureDate}T00:00:00Z`) + 120 * day)
  const updates: Record<string, unknown> = {}
  const links: Partial<Record<(typeof refereeRoles)[number], string>> = {}
  const now = Date.now()
  for (const role of refereeRoles) {
    const invoiceReference = db.ref(`refereeInvoices/${fixtureId}/${role}`)
    const current = record((await invoiceReference.get()).val())
    if (['Submitted', 'Approved', 'Paid'].includes(String(current.status))) continue
    const token = randomBytes(32).toString('base64url')
    const tokenHash = refereeTokenHash(token)
    if (typeof current.inviteHash === 'string') updates[`refereeInvoiceTokens/${current.inviteHash}`] = null
    updates[`refereeInvoiceTokens/${tokenHash}`] = {fixtureId, role}
    updates[`refereeInvoiceInvites/${fixtureId}/${role}`] = {tokenHash, expiresAt, active: true, issuedAt: now, issuedBy: actor.email}
    updates[`refereeInvoices/${fixtureId}/${role}`] = {
      id: `${fixtureId}-${role}`, fixtureId, fixtureDate, fixtureTitle, team, opponent, venue, competition, role,
      status: 'Link ready', invoiceNumber: '', refereeName: '', email: '', amount: 0, notes: '', inviteHash: tokenHash,
      updatedAt: now, updatedBy: actor.displayName,
    }
    links[role] = token
  }
  if (Object.keys(updates).length) await db.ref().update(updates)
  return {links, expiresAt}
})

export const getRefereeInvoiceInvite = onCall({region}, async request => {
  const verified = await refereeInvoiceByToken(record(request.data).token)
  const invoice = verified.invoice
  if (invoice.status === 'Link ready' && Number(verified.invite.expiresAt) < Date.now()) throw new HttpsError('not-found', 'This referee invoice link has expired. Please contact the club finance team for a new link.')
  return {
    fixtureId: verified.fixtureId,
    fixtureDate: String(invoice.fixtureDate || ''),
    fixtureTitle: String(invoice.fixtureTitle || ''),
    team: String(invoice.team || ''),
    venue: String(invoice.venue || ''),
    competition: String(invoice.competition || ''),
    role: verified.role,
    roleLabel: refereeRoleLabels[verified.role],
    submitted: invoice.status !== 'Link ready',
  }
})

export const submitRefereeInvoice = onCall({region, timeoutSeconds: 60, memory: '512MiB'}, async request => {
  const input = record(request.data)
  const verified = await refereeInvoiceByToken(input.token)
  if (verified.invoice.status !== 'Link ready' || Number(verified.invite.expiresAt) < Date.now()) throw new HttpsError('failed-precondition', 'This invoice link has already been used or has expired.')
  const refereeName = text(input.refereeName, 'Your name', 2, 120)
  const contactEmail = email(input.email, 'Email address')
  const invoiceNumber = text(input.invoiceNumber, 'Invoice number', 1, 80)
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000 || Math.round(amount * 100) !== amount * 100) throw new HttpsError('invalid-argument', 'Enter an invoice amount greater than £0 and no more than £10,000, to two decimal places.')
  const notes = optionalText(input.notes, 'Invoice details', 1200)
  let attachmentPath = ''
  let attachmentName = ''
  const attachment = record(input.attachment)
  if (Object.keys(attachment).length) {
    const contentType = choice(attachment.contentType, 'attachment type', new Set(['application/pdf', 'image/jpeg', 'image/png']))
    const base64 = attachment.base64
    if (typeof base64 !== 'string' || base64.length > Math.ceil(maximumRefereeInvoiceFileBytes * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new HttpsError('invalid-argument', 'The invoice file must be a PDF, JPEG or PNG no larger than 2 MB.')
    const contents = Buffer.from(base64, 'base64')
    if (!contents.length || contents.length > maximumRefereeInvoiceFileBytes) throw new HttpsError('invalid-argument', 'The invoice file must be a PDF, JPEG or PNG no larger than 2 MB.')
    const signatures: Record<string, boolean> = {'application/pdf': contents.subarray(0, 5).toString('ascii') === '%PDF-', 'image/jpeg': contents[0] === 0xff && contents[1] === 0xd8, 'image/png': contents.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))}
    if (!signatures[contentType]) throw new HttpsError('invalid-argument', 'The uploaded file does not match its file type.')
    attachmentName = optionalText(attachment.name, 'File name', 160).replace(/[\\/]/g, '_') || 'invoice'
    const extension = contentType === 'application/pdf' ? 'pdf' : contentType === 'image/jpeg' ? 'jpg' : 'png'
    attachmentPath = `referee-invoices/${verified.fixtureId}/${verified.role}/${randomBytes(12).toString('hex')}.${extension}`
    await getStorage().bucket().file(attachmentPath).save(contents, {metadata: {contentType, cacheControl: 'private, max-age=0, no-transform'}, resumable: false})
  }
  const now = Date.now()
  const result = await db.ref(`refereeInvoices/${verified.fixtureId}/${verified.role}`).transaction(currentValue => {
    const current = record(currentValue)
    if (current.status !== 'Link ready' || current.inviteHash !== verified.tokenHash) return
    return {...current, status: 'Submitted', invoiceNumber, refereeName, email: contactEmail, amount, notes, submittedAt: now, updatedAt: now, updatedBy: refereeName, ...(attachmentPath ? {attachmentPath, attachmentName} : {})}
  })
  if (!result.committed) {
    if (attachmentPath) await getStorage().bucket().file(attachmentPath).delete({ignoreNotFound: true})
    throw new HttpsError('failed-precondition', 'This invoice link has already been used. Please contact the club finance team if you need to make a change.')
  }
  await db.ref(`refereeInvoiceInvites/${verified.fixtureId}/${verified.role}/active`).set(false)
  return {submittedAt: now}
})

export const updateRefereeInvoiceStatus = onCall({region}, async request => {
  const actor = await requireFinanceAdmin(request)
  const input = record(request.data)
  const fixtureId = validFixtureId(input.fixtureId)
  const role = choice(input.role, 'referee role', new Set<string>(refereeRoles)) as (typeof refereeRoles)[number]
  const status = choice(input.status, 'invoice status', refereeInvoiceStatuses)
  const reference = db.ref(`refereeInvoices/${fixtureId}/${role}`)
  const now = Date.now()
  const result = await reference.transaction(currentValue => {
    const current = record(currentValue)
    if (current.status === 'Submitted' && (status === 'Approved' || status === 'Rejected')) return {...current, status, updatedAt: now, updatedBy: actor.displayName, reviewedAt: now}
    if (current.status === 'Approved' && status === 'Paid') return {...current, status, updatedAt: now, updatedBy: actor.displayName, paidAt: now}
    return
  })
  if (!result.committed) throw new HttpsError('failed-precondition', 'That invoice cannot move to the selected status.')
  return {updatedAt: now}
})

export const getRefereeInvoiceAttachmentUrl = onCall({region}, async request => {
  await requireFinanceAdmin(request)
  const input = record(request.data)
  const fixtureId = validFixtureId(input.fixtureId)
  const role = choice(input.role, 'referee role', new Set<string>(refereeRoles)) as (typeof refereeRoles)[number]
  const invoice = record((await db.ref(`refereeInvoices/${fixtureId}/${role}`).get()).val())
  if (typeof invoice.attachmentPath !== 'string' || !invoice.attachmentPath.startsWith(`referee-invoices/${fixtureId}/${role}/`)) throw new HttpsError('not-found', 'No invoice attachment is available.')
  const [url] = await getStorage().bucket().file(invoice.attachmentPath).getSignedUrl({action: 'read', expires: Date.now() + 15 * 60 * 1000})
  return {url}
})

export const submitClubSignup = onCall({region}, async request => {
  const input = record(request.data)
  if (input.website) throw new HttpsError('invalid-argument', 'The form could not be submitted.')
  if (input.consent !== true) throw new HttpsError('invalid-argument', 'Consent is required before submitting.')
  const birthDate = dateOfBirth(input.dateOfBirth)
  if (under18(birthDate)) throw new HttpsError('invalid-argument', 'You must be 18 or over to register your interest.')
  const now = Date.now()
  const id = createSignupId()
  const playingCategory = choice(input.playingCategory, 'Playing category', signupCategories)
  const submittedDivisions = Array.isArray(input.interestedDivisions) ? input.interestedDivisions : []
  const interestedDivisions = [...new Set(submittedDivisions)]
  if (!interestedDivisions.length || interestedDivisions.some(value => typeof value !== 'string' || !signupDivisions[playingCategory].has(value))) throw new HttpsError('invalid-argument', 'Choose at least one valid division.')
  const signup = {
    id,
    status: 'new',
    statusOutcome: '',
    name: text(input.name, 'Full name', 2, 120),
    email: email(input.email),
    phone: text(input.phone, 'Mobile number', 7, 30),
    profilePhoto: profilePhoto(input.profilePhoto),
    dateOfBirth: birthDate,
    playingCategory,
    interestedDivisions,
    primaryPosition: choice(input.primaryPosition, 'Primary position', signupPositions),
    secondaryPosition: input.secondaryPosition === '' ? '' : choice(input.secondaryPosition, 'Secondary position', signupPositions),
    playingExperience: text(input.playingExperience, 'Playing experience', 10, 2000),
    highestLevelPlayed: text(input.highestLevelPlayed, 'Highest level played', 2, 200),
    currentClub: optionalText(input.currentClub, 'Current or recent club', 120),
    availability: text(input.availability, 'Availability', 5, 1000),
    heardAboutUs: optionalText(input.heardAboutUs, 'How you heard about us', 200),
    notes: optionalText(input.notes, 'Additional information', 2000),
    createdAt: now,
    updatedAt: now,
  }
  let abortReason: 'capacity' | 'duplicate' | null = null
  const reference = db.ref('clubSignups')
  const result = await reference.transaction(current => {
    abortReason = null
    const signups = record(current)
    const active = Object.values(signups).map(record).filter(value => value.status === 'new' || value.status === 'contacted')
    if (active.length >= maximumActiveSignups) { abortReason = 'capacity'; return }
    if (active.some(value => typeof value.email === 'string' && value.email.toLowerCase() === signup.email)) { abortReason = 'duplicate'; return }
    return {...signups, [id]: signup}
  })
  if (!result.committed) {
    if (abortReason === 'duplicate') throw new HttpsError('already-exists', 'We already have an active sign-up for that email address.')
    throw new HttpsError('resource-exhausted', 'The sign-up inbox is currently at capacity.')
  }
  return {signupId: id}
})

export const updateClubSignupStatus = onCall({region}, async request => {
  const manager = await requireManager(request)
  const input = record(request.data)
  const id = text(input.signupId, 'Sign-up ID', 8, 40).toUpperCase()
  if (!/^JOIN-[A-Z0-9-]+$/.test(id)) throw new HttpsError('not-found', 'Sign-up not found.')
  const status = typeof input.status === 'string' && signupStatuses.has(input.status) ? input.status : null
  if (!status) throw new HttpsError('invalid-argument', 'Choose a valid status.')
  const statusOutcome = status === 'new' ? '' : typeof input.statusOutcome === 'string' && signupStatusOutcomes[status]?.has(input.statusOutcome) ? input.statusOutcome : null
  if (status !== 'new' && !statusOutcome) throw new HttpsError('invalid-argument', 'Choose an outcome for this status.')
  const reference = db.ref(`clubSignups/${id}`)
  const signupSnapshot = await reference.get()
  if (!signupSnapshot.exists()) throw new HttpsError('not-found', 'Sign-up not found.')
  const signup = record(signupSnapshot.val())
  const updatedAt = Date.now()
  if (statusOutcome !== 'joined-team') {
    await reference.update({status, statusOutcome, updatedAt, handledBy: manager.email})
    return {updatedAt}
  }
  if (status !== 'closed') throw new HttpsError('invalid-argument', 'A joined player must be closed.')
  const joinedTeam = choice(input.joinedTeam, 'Team', clubTeams)
  const transferredPlayerId = typeof signup.transferredPlayerId === 'string' && signup.transferredPlayerId ? signup.transferredPlayerId : `signup-${id}`
  const previousTeam = typeof signup.joinedTeam === 'string' ? signup.joinedTeam : ''
  if (signup.transferredPlayerId && previousTeam && previousTeam !== joinedTeam) throw new HttpsError('failed-precondition', `This sign-up has already been transferred to ${previousTeam}.`)
  const existingPlayerSnapshot = await db.ref(`players/${transferredPlayerId}`).get()
  if (existingPlayerSnapshot.exists()) {
    await reference.update({status, statusOutcome, joinedTeam: previousTeam || joinedTeam, transferredPlayerId, updatedAt, handledBy: manager.email})
    return {updatedAt, playerId: transferredPlayerId}
  }
  const signupEmail = typeof signup.email === 'string' ? signup.email.toLowerCase() : ''
  const players = record((await db.ref('players').get()).val())
  const duplicate = Object.entries(players).find(([playerId, value]) => playerId !== transferredPlayerId && typeof record(value).email === 'string' && String(record(value).email).toLowerCase() === signupEmail)
  if (duplicate) throw new HttpsError('already-exists', 'A player with this email address is already in the main player list.')
  const primaryPosition = typeof signup.primaryPosition === 'string' && signup.primaryPosition !== 'Not sure' ? signup.primaryPosition : 'All-rounder'
  const secondaryPosition = typeof signup.secondaryPosition === 'string' && signup.secondaryPosition !== 'Not sure' ? signup.secondaryPosition : ''
  const interestedDivisions = Array.isArray(signup.interestedDivisions) ? signup.interestedDivisions.filter(value => typeof value === 'string').join(', ') : ''
  const playingNotes = [
    typeof signup.currentClub === 'string' && signup.currentClub ? `Current / recent club: ${signup.currentClub}` : '',
    typeof signup.availability === 'string' && signup.availability ? `Availability: ${signup.availability}` : '',
    typeof signup.notes === 'string' ? signup.notes : '',
  ].filter(Boolean).join('\n\n')
  const assessment = {serving:0, passing:0, setting:0, attacking:0, blocking:0, defence:0, movement:0, communication:0, attitude:0, overallLevel:0}
  const player = {
    sourceSignupId: id,
    name: typeof signup.name === 'string' ? signup.name : '',
    email: signupEmail,
    dateOfBirth: typeof signup.dateOfBirth === 'string' ? signup.dateOfBirth : '',
    interestedDivisions,
    position: primaryPosition,
    secondaryPosition,
    playingExperience: typeof signup.playingExperience === 'string' ? signup.playingExperience : '',
    highestLevelPlayed: typeof signup.highestLevelPlayed === 'string' ? signup.highestLevelPlayed : '',
    photoUrl: '',
    trialDate: 'Not assigned',
    trialSessionId: '',
    trialResponseStatus: '',
    paid: false,
    attended: false,
    trialRegistrations: {},
    decision: 'Offer accepted',
    offeredTeam: joinedTeam,
    offeredPosition: primaryPosition,
    confirmedTeams: {[joinedTeam]: primaryPosition},
    offers: [{team: joinedTeam, position: primaryPosition, squadRole: 'Role to be discussed', includeSquadRole: true}],
    notes: playingNotes,
    assessment,
    assessmentNotes: {},
    assessmentScale: 10,
    assessmentHistory: {},
    recommendation: 'Offer',
    strengths: '',
    developmentAreas: '',
    suitableTeams: [joinedTeam],
    bibNumber: '',
    teamConsideration: {[joinedTeam]: primaryPosition},
    emailReviewStatus: 'draft',
    emailDraft: {responseDeadline: '', coachName: '', personalMessage: ''},
    communicationHistory: {},
    returningPlayer: false,
    updatedAt,
    updatedBy: manager.email,
  }
  const updates: Record<string, unknown> = {
    [`clubSignups/${id}/status`]: status,
    [`clubSignups/${id}/statusOutcome`]: statusOutcome,
    [`clubSignups/${id}/joinedTeam`]: joinedTeam,
    [`clubSignups/${id}/transferredPlayerId`]: transferredPlayerId,
    [`clubSignups/${id}/updatedAt`]: updatedAt,
    [`clubSignups/${id}/handledBy`]: manager.email,
    [`players/${transferredPlayerId}`]: player,
  }
  if (typeof signup.profilePhoto === 'string' && signup.profilePhoto) updates[`playerPhotos/${transferredPlayerId}`] = signup.profilePhoto
  await db.ref().update(updates)
  return {updatedAt, playerId: transferredPlayerId}
})

export const deleteClubSignup = onCall({region}, async request => {
  await requireManager(request)
  const input = record(request.data)
  const id = text(input.signupId, 'Sign-up ID', 8, 40).toUpperCase()
  if (!/^JOIN-[A-Z0-9-]+$/.test(id)) throw new HttpsError('not-found', 'Sign-up not found.')
  const reference = db.ref(`clubSignups/${id}`)
  if (!(await reference.get()).exists()) throw new HttpsError('not-found', 'Sign-up not found.')
  await reference.remove()
  return {deleted: true}
})

async function audit(actor: Awaited<ReturnType<typeof requireStaff>>, action: string, targetCaseId = '') {
  const reference = db.ref('welfareAccessLog').push()
  await reference.set({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    caseId: targetCaseId,
    createdAt: Date.now(),
    deleteAfter: Date.now() + auditRetention,
  })
}

function storedCase(snapshot: DataSnapshot) {
  const value = snapshot.val() as StoredCase | null
  if (!snapshot.exists() || !value) throw new HttpsError('not-found', 'Case not found.')
  return value
}

export const submitWelfareCase = onCall({region}, async request => {
  const input = record(request.data)
  const category = typeof input.category === 'string' && categories.has(input.category) ? input.category : null
  if (!category) throw new HttpsError('invalid-argument', 'Choose a valid category.')
  const message = text(input.message, 'Message', 10, 5000)
  const id = createCaseId()
  const pin = createPin()
  const pinSalt = randomBytes(16).toString('hex')
  const now = Date.now()
  const messageId = db.ref(`welfareCases/${id}/messages`).push().key
  if (!messageId) throw new HttpsError('internal', 'The case could not be created.')
  const newCase: StoredCase = {
    category,
    urgent: input.urgent === true,
    status: 'new',
    createdAt: now,
    updatedAt: now,
    latestPreview: message.slice(0, 180),
    unreadForStaff: true,
    unreadForReporter: false,
    deleteAfter: now + openRetention,
    pinSalt,
    pinHash: hashPin(pin, pinSalt),
    messages: {[messageId]: {sender: 'reporter', text: message, createdAt: now}},
  }
  const casesReference = db.ref('welfareCases')
  const result = await casesReference.transaction(current => {
    const cases = record(current)
    if (openCaseCount(cases) >= maximumOpenCases) return
    return {...cases, [id]: newCase}
  })
  if (!result.committed) throw capacityError()
  return {caseId: id, pin}
})

async function verifiedConversation(input: Record<string, unknown>) {
  const id = caseId(input.caseId)
  const pin = casePin(input.pin)
  const reference = db.ref(`welfareCases/${id}`)
  const value = storedCase(await reference.get())
  if (!validPin(pin, value)) throw new HttpsError('not-found', 'Those case details could not be verified.')
  return {id, pin, reference, value}
}

export const getWelfareConversation = onCall({region}, async request => {
  const verified = await verifiedConversation(record(request.data))
  await verified.reference.child('unreadForReporter').set(false)
  return {...publicCase(verified.id, verified.value), unreadForReporter: false, messages: messagesFor(verified.value)}
})

export const replyToWelfareConversation = onCall({region}, async request => {
  const input = record(request.data)
  const verified = await verifiedConversation(input)
  const message = text(input.message, 'Reply', 2, 5000)
  if (verified.value.status === 'closed') throw new HttpsError('failed-precondition', 'This case has been closed.')
  const latest = storedCase(await verified.reference.get())
  if (latest.status === 'closed' || !validPin(verified.pin, latest)) throw new HttpsError('failed-precondition', 'This case is no longer open for replies.')
  const now = Date.now()
  const messageReference = verified.reference.child('messages').push()
  await verified.reference.update({
    status: 'open',
    updatedAt: now,
    latestPreview: message.slice(0, 180),
    unreadForStaff: true,
    deleteAfter: now + openRetention,
    [`messages/${messageReference.key}`]: {sender: 'reporter', text: message, createdAt: now},
  })
  return {updatedAt: now}
})

export const listWelfareCases = onCall({region}, async request => {
  const actor = await requireStaff(request)
  const snapshot = await db.ref('welfareCases').orderByChild('updatedAt').limitToLast(200).get()
  const cases = Object.entries((snapshot.val() || {}) as Record<string, StoredCase>)
    .map(([id, value]) => publicCase(id, value))
    .sort((left, right) => right.updatedAt - left.updatedAt)
  await audit(actor, 'list-cases')
  return {cases}
})

export const getStaffWelfareCase = onCall({region}, async request => {
  const actor = await requireStaff(request)
  const id = caseId(record(request.data).caseId)
  const reference = db.ref(`welfareCases/${id}`)
  const value = storedCase(await reference.get())
  await Promise.all([reference.child('unreadForStaff').set(false), audit(actor, 'read-case', id)])
  return {...publicCase(id, value), unreadForStaff: false, messages: messagesFor(value)}
})

export const replyToWelfareCase = onCall({region}, async request => {
  const actor = await requireStaff(request)
  const input = record(request.data)
  const id = caseId(input.caseId)
  const message = text(input.message, 'Reply', 2, 5000)
  const reference = db.ref(`welfareCases/${id}`)
  const value = storedCase(await reference.get())
  if (value.status === 'closed') throw new HttpsError('failed-precondition', 'Reopen the case before replying.')
  const now = Date.now()
  const messageReference = reference.child('messages').push()
  await reference.update({
    status: 'open',
    updatedAt: now,
    latestPreview: message.slice(0, 180),
    unreadForReporter: true,
    deleteAfter: now + openRetention,
    [`messages/${messageReference.key}`]: {sender: 'welfare', text: message, createdAt: now},
  })
  await audit(actor, 'reply-to-case', id)
  return {updatedAt: now}
})

export const updateWelfareCaseStatus = onCall({region}, async request => {
  const actor = await requireStaff(request)
  const input = record(request.data)
  const id = caseId(input.caseId)
  const status = typeof input.status === 'string' && statuses.has(input.status) ? input.status as CaseStatus : null
  if (!status) throw new HttpsError('invalid-argument', 'Choose a valid status.')
  const now = Date.now()
  let abortReason: 'capacity' | 'not-found' | null = null
  const casesReference = db.ref('welfareCases')
  const result = await casesReference.transaction(current => {
    abortReason = null
    const cases = record(current)
    const existing = cases[id]
    if (!existing) {
      abortReason = 'not-found'
      return
    }
    const value = record(existing)
    if (value.status === 'closed' && status !== 'closed' && openCaseCount(cases) >= maximumOpenCases) {
      abortReason = 'capacity'
      return
    }
    return {
      ...cases,
      [id]: {...value, status, updatedAt: now, deleteAfter: now + (status === 'closed' ? closedRetention : openRetention)},
    }
  })
  if (!result.committed) {
    if (abortReason === 'capacity') throw capacityError()
    throw new HttpsError('not-found', 'Case not found.')
  }
  await audit(actor, `set-status-${status}`, id)
  return {updatedAt: now}
})

async function expiredUpdates(path: string, limit: number) {
  const snapshot = await db.ref(path).orderByChild('deleteAfter').endAt(Date.now()).limitToFirst(limit).get()
  return Object.fromEntries(Object.keys(snapshot.val() || {}).map(key => [`${path}/${key}`, null]))
}

export const purgeClosedWelfareCases = onSchedule({region, schedule: 'every day 03:15', timeZone: 'Europe/London'}, async () => {
  const updates = {
    ...await expiredUpdates('welfareCases', 100),
    ...await expiredUpdates('welfareAccessLog', 400),
  }
  if (Object.keys(updates).length) await db.ref().update(updates)
})
