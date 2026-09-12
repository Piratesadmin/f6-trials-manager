import {randomBytes, randomInt, scryptSync, timingSafeEqual} from 'node:crypto'
import {initializeApp} from 'firebase-admin/app'
import {getDatabase, type DataSnapshot} from 'firebase-admin/database'
import {HttpsError, onCall, type CallableRequest} from 'firebase-functions/v2/https'
import {onSchedule} from 'firebase-functions/v2/scheduler'

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
const signupCategories = new Set(['Mens', 'Women’s'])
const signupDivisions: Record<string, Set<string>> = {
  'Mens': new Set(['NVL Div 1', 'LVA Div 2', 'LVA Div 3']),
  'Women’s': new Set(['NVL Div 2', 'LVA Div 1', 'LVA Div 2']),
}
const signupPositions = new Set(['Setter', 'Outside', 'Middle', 'Opposite', 'Libero', 'All-rounder', 'Not sure'])
const managerRoles = new Set(['coach', 'assistant-coach', 'team-admin', 'admin'])

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

export const submitClubSignup = onCall({region}, async request => {
  const input = record(request.data)
  if (input.website) throw new HttpsError('invalid-argument', 'The form could not be submitted.')
  if (input.consent !== true) throw new HttpsError('invalid-argument', 'Consent is required before submitting.')
  const birthDate = dateOfBirth(input.dateOfBirth)
  const guardianRequired = under18(birthDate)
  const guardianName = optionalText(input.guardianName, 'Parent or guardian name', 120)
  const guardianEmail = optionalText(input.guardianEmail, 'Parent or guardian email', 200)
  const guardianPhone = optionalText(input.guardianPhone, 'Parent or guardian phone', 30)
  if (guardianRequired && (!guardianName || !guardianEmail || !guardianPhone)) throw new HttpsError('invalid-argument', 'Parent or guardian contact details are required for players under 18.')
  if (guardianEmail) email(guardianEmail, 'Parent or guardian email')
  const now = Date.now()
  const id = createSignupId()
  const playingCategory = choice(input.playingCategory, 'Playing category', signupCategories)
  const submittedDivisions = Array.isArray(input.interestedDivisions) ? input.interestedDivisions : []
  const interestedDivisions = [...new Set(submittedDivisions)]
  if (!interestedDivisions.length || interestedDivisions.some(value => typeof value !== 'string' || !signupDivisions[playingCategory].has(value))) throw new HttpsError('invalid-argument', 'Choose at least one valid division.')
  const signup = {
    id,
    status: 'new',
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
    guardianName: guardianRequired ? guardianName : '',
    guardianEmail: guardianRequired ? guardianEmail.toLowerCase() : '',
    guardianPhone: guardianRequired ? guardianPhone : '',
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
  const reference = db.ref(`clubSignups/${id}`)
  if (!(await reference.get()).exists()) throw new HttpsError('not-found', 'Sign-up not found.')
  const updatedAt = Date.now()
  await reference.update({status, updatedAt, handledBy: manager.email})
  return {updatedAt}
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
