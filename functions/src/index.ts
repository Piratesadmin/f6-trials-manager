import {createHash, randomBytes, randomInt, scryptSync, timingSafeEqual} from 'node:crypto'
import {initializeApp} from 'firebase-admin/app'
import {getDatabase, type DataSnapshot} from 'firebase-admin/database'
import {getStorage} from 'firebase-admin/storage'
import Stripe from 'stripe'
import {HttpsError, onCall, onRequest, type CallableRequest} from 'firebase-functions/v2/https'
import {defineSecret} from 'firebase-functions/params'
import {onSchedule} from 'firebase-functions/v2/scheduler'
import {loadMatchCentre, type MatchCentreData} from './matchCentre.js'
import {storeProductMap, type StoreProduct} from './shopCatalog.js'

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
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY')
const stripePublishableKey = defineSecret('STRIPE_PUBLISHABLE_KEY')
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET')

function refereeInvoiceNumber(team: string, opponent: string, fixtureDate: string, role: (typeof refereeRoles)[number]) {
  const abbreviation = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(word => word && !['THE', 'AND', 'CLUB', 'VOLLEYBALL'].includes(word)).map(word => word.slice(0, 3)).join('').slice(0, 6) || 'TEAM'
  const dateCode = `${fixtureDate.slice(8, 10)}${fixtureDate.slice(5, 7)}${fixtureDate.slice(2, 4)}`
  const roleCode = role === 'first-referee' ? '1R' : role === 'second-referee' ? '2R' : 'SC'
  return `${abbreviation(team)}-${abbreviation(opponent)}-${dateCode}-${roleCode}`
}

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

export const createShopCheckoutSession = onCall({region, timeoutSeconds: 60, secrets: [stripeSecretKey, stripePublishableKey]}, async request => {
  if (!stripeSecretKey.value() || !stripePublishableKey.value()) throw new HttpsError('failed-precondition', 'Online shop checkout is not configured yet. Please contact the club.')
  const input = record(request.data)
  const name = text(input.name, 'Name', 2, 120)
  const contactEmail = email(input.email)
  const phone = optionalText(input.phone, 'Phone number', 40)
  const fulfilment = choice(input.fulfilment, 'collection method', new Set(['collection']))
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 30) throw new HttpsError('invalid-argument', 'Your basket is empty or contains too many items.')
  const catalogSnapshot = await db.ref('shopProducts').get()
  const catalog = catalogSnapshot.exists() ? record(catalogSnapshot.val()) as Record<string, StoreProduct> : storeProductMap()
  const orderItems = input.items.map((value: unknown) => {
    const item = record(value)
    const productId = text(item.productId, 'Product', 1, 80)
    const product = catalog[productId]
    if (!product || !product.available) throw new HttpsError('failed-precondition', 'One of the items in your basket is no longer available.')
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new HttpsError('invalid-argument', 'Each product quantity must be between 1 and 10.')
    const size = product.sizes?.length ? choice(item.size, 'size', new Set(product.sizes)) : ''
    return {productId, name: product.name, size, quantity, unitAmount: product.unitAmount, totalAmount: product.unitAmount * quantity}
  })
  const totalAmount = orderItems.reduce((total: number, item: {totalAmount: number}) => total + item.totalAmount, 0)
  if (totalAmount < 100 || totalAmount > 200000) throw new HttpsError('invalid-argument', 'Basket total must be between £1 and £2,000.')
  const suppliedUrl = text(input.returnUrl, 'Return URL', 8, 500)
  let returnUrl: URL
  try { returnUrl = new URL(suppliedUrl) } catch { throw new HttpsError('invalid-argument', 'Checkout return address is invalid.') }
  if (returnUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(returnUrl.hostname)) throw new HttpsError('invalid-argument', 'Checkout must use a secure Club Manager address.')
  if (!['club.flamingsix.com', 'localhost', '127.0.0.1'].includes(returnUrl.hostname)) throw new HttpsError('invalid-argument', 'Checkout return address is not recognised.')
  const orderRef = db.ref('shopOrders').push()
  const now = Date.now()
  const order = {id: orderRef.key, items: orderItems, customer: {name, email: contactEmail, phone}, fulfilment, totalAmount, currency: 'GBP', status: 'Awaiting payment', paymentStatus: 'Pending', createdAt: now, updatedAt: now, stripeSessionId: ''}
  await orderRef.set(order)
  try {
    const stripe = new Stripe(stripeSecretKey.value())
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      mode: 'payment',
      return_url: `${returnUrl.origin}${returnUrl.pathname}${returnUrl.search}#/shop?session_id={CHECKOUT_SESSION_ID}`,
      customer_email: contactEmail,
      client_reference_id: orderRef.key!,
      metadata: {orderId: orderRef.key!},
      submit_type: 'pay',
      line_items: orderItems.map((item: {name: string;size: string;quantity: number;unitAmount: number}) => ({price_data: {currency: 'gbp', product_data: {name: item.name, ...(item.size ? {description: `Size: ${item.size}`} : {})}, unit_amount: item.unitAmount}, quantity: item.quantity})),
    })
    await orderRef.update({stripeSessionId: session.id, updatedAt: Date.now()})
    if (!session.client_secret) throw new Error('Stripe did not return an embedded checkout client secret.')
    return {orderId: orderRef.key, clientSecret: session.client_secret, publishableKey: stripePublishableKey.value(), totalAmount}
  } catch (error) {
    await orderRef.update({status: 'Payment setup failed', paymentStatus: 'Failed', updatedAt: Date.now()})
    console.error('Shop checkout session creation failed', error)
    if (error instanceof HttpsError) throw error
    throw new HttpsError('unavailable', 'Secure checkout could not start. Your basket has not been charged; please try again.')
  }
})

export const saveShopProduct = onCall({region}, async request => {
  const actor = await requireFinanceAdmin(request)
  const input = record(request.data)
  const id = text(input.id, 'Product ID', 2, 64).toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new HttpsError('invalid-argument', 'Product ID must use lowercase letters, numbers and hyphens.')
  const name = text(input.name, 'Product name', 2, 100)
  const category = choice(input.category, 'category', new Set(['Apparel', 'Accessories', 'Volleyball gear', 'Gifts'])) as StoreProduct['category']
  const description = text(input.description, 'Description', 2, 500)
  const unitAmount = Number(input.unitAmount)
  if (!Number.isInteger(unitAmount) || unitAmount < 100 || unitAmount > 200000) throw new HttpsError('invalid-argument', 'Price must be between £1 and £2,000.')
  const tone = choice(input.tone, 'colour style', new Set(['orange', 'gold', 'ink', 'cream'])) as StoreProduct['tone']
  const mark = text(input.mark, 'Product label', 1, 32)
  const tag = optionalText(input.tag, 'Product badge', 40)
  const available = input.available === true
  const sizesInput = input.sizes
  if (sizesInput !== undefined && (!Array.isArray(sizesInput) || sizesInput.length > 30 || sizesInput.some(size => typeof size !== 'string' || size.trim().length > 24))) throw new HttpsError('invalid-argument', 'Product sizes must be a list of up to 30 short options.')
  const sizes = Array.isArray(sizesInput) ? [...new Set((sizesInput as string[]).map(size => size.trim()).filter(Boolean))] : []
  const previousAmount = input.previousAmount === undefined || input.previousAmount === null || input.previousAmount === '' ? undefined : Number(input.previousAmount)
  if (previousAmount !== undefined && (!Number.isInteger(previousAmount) || previousAmount <= unitAmount || previousAmount > 200000)) throw new HttpsError('invalid-argument', 'Previous price must be greater than the current price and no more than £2,000.')
  const product: StoreProduct = {id,name,category,description,unitAmount,...(sizes.length ? {sizes} : {}),available,mark,tone,...(tag ? {tag} : {}),...(previousAmount ? {previousAmount} : {}),...(input.priceFrom === true ? {priceFrom:true} : {}),updatedAt:Date.now(),updatedBy:actor.displayName}
  const catalogReference = db.ref('shopProducts')
  const catalog = await catalogReference.get()
  if (!catalog.exists()) await catalogReference.set(storeProductMap())
  const reference = db.ref(`shopProducts/${id}`)
  const existing = await reference.get()
  if (!existing.exists() && (await catalogReference.get()).numChildren() >= 200) throw new HttpsError('resource-exhausted', 'The shop has reached its 200 product limit.')
  const previous = record(existing.val())
  if (typeof previous.imageUrl === 'string') product.imageUrl = previous.imageUrl
  if (typeof previous.imagePath === 'string') product.imagePath = previous.imagePath
  await reference.set(product)
  return {product}
})

export const uploadShopProductImage = onCall({region,timeoutSeconds:60,memory:'512MiB'}, async request => {
  await requireFinanceAdmin(request)
  const input = record(request.data)
  const id = text(input.id, 'Product ID', 2, 64)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new HttpsError('invalid-argument', 'Product ID is invalid.')
  const reference = db.ref(`shopProducts/${id}`)
  const snapshot = await reference.get()
  if (!snapshot.exists()) throw new HttpsError('not-found', 'Save the product before uploading its picture.')
  const dataUrl = text(input.dataUrl, 'Product picture', 64, 3_000_000)
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl)
  if (!match) throw new HttpsError('invalid-argument', 'Choose a JPEG, PNG or WebP image.')
  const contentType = match[1]
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length < 1 || bytes.length > 2 * 1024 * 1024) throw new HttpsError('invalid-argument', 'Product pictures must be no larger than 2 MB after compression.')
  const validSignature = contentType === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9 : contentType === 'image/png' ? bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) : bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP'
  if (!validSignature) throw new HttpsError('invalid-argument', 'The selected file is not a valid image.')
  const token = randomBytes(24).toString('hex')
  const suffix = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const path = `shop-products/${id}/${randomBytes(16).toString('hex')}.${suffix}`
  const bucket = getStorage().bucket()
  const file = bucket.file(path)
  await file.save(bytes,{resumable:false,metadata:{contentType,cacheControl:'public,max-age=31536000,immutable',metadata:{firebaseStorageDownloadTokens:token}}})
  const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
  const oldPath = record(snapshot.val()).imagePath
  await reference.update({imageUrl,imagePath:path,updatedAt:Date.now()})
  if (typeof oldPath === 'string' && oldPath !== path) await bucket.file(oldPath).delete({ignoreNotFound:true}).catch(error=>console.warn('Could not remove previous shop product picture',error))
  return {imageUrl,imagePath:path}
})

export const removeShopProductImage = onCall({region}, async request => {
  await requireFinanceAdmin(request)
  const id = text(record(request.data).id, 'Product ID', 2, 64)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new HttpsError('invalid-argument', 'Product ID is invalid.')
  const reference = db.ref(`shopProducts/${id}`)
  const snapshot = await reference.get()
  if (!snapshot.exists()) throw new HttpsError('not-found', 'That product no longer exists.')
  const imagePath = record(snapshot.val()).imagePath
  await reference.update({imageUrl:null,imagePath:null,updatedAt:Date.now()})
  if (typeof imagePath === 'string' && imagePath.startsWith(`shop-products/${id}/`)) await getStorage().bucket().file(imagePath).delete({ignoreNotFound:true}).catch(error=>console.warn('Could not delete shop product picture',error))
  return {ok:true}
})

export const archiveShopProduct = onCall({region}, async request => {
  const actor = await requireFinanceAdmin(request)
  const id = text(record(request.data).id, 'Product ID', 2, 64)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new HttpsError('invalid-argument', 'Product ID is invalid.')
  const reference = db.ref(`shopProducts/${id}`)
  if (!(await reference.get()).exists()) throw new HttpsError('not-found', 'That product no longer exists.')
  await reference.update({available:false,updatedAt:Date.now(),updatedBy:actor.displayName})
  return {ok:true}
})

export const getShopCheckoutStatus = onCall({region, secrets: [stripeSecretKey]}, async request => {
  if (!stripeSecretKey.value()) throw new HttpsError('failed-precondition', 'Shop payment status is not configured.')
  const sessionId = text(record(request.data).sessionId, 'Checkout session', 12, 200)
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new HttpsError('not-found', 'That checkout could not be found.')
  const session = await new Stripe(stripeSecretKey.value()).checkout.sessions.retrieve(sessionId)
  const orderId = String(session.metadata?.orderId || '')
  if (!orderId || session.client_reference_id !== orderId) throw new HttpsError('not-found', 'That checkout could not be found.')
  const orderRef = db.ref(`shopOrders/${orderId}`)
  const order = record((await orderRef.get()).val())
  if (order.stripeSessionId !== sessionId) throw new HttpsError('not-found', 'That checkout could not be found.')
  if (session.payment_status === 'paid') await orderRef.update({status: order.status === 'Awaiting payment' ? 'Paid' : order.status, paymentStatus: 'Paid', paidAt: Number(order.paidAt || Date.now()), updatedAt: Date.now()})
  return {status: session.status, paymentStatus: session.payment_status, orderId}
})

export const stripeShopWebhook = onRequest({region, secrets: [stripeSecretKey, stripeWebhookSecret]}, async (request, response) => {
  if (request.method !== 'POST') { response.status(405).send('Method not allowed'); return }
  const signature = request.header('stripe-signature')
  if (!signature || !stripeWebhookSecret.value()) { response.status(400).send('Webhook signature is missing'); return }
  let event: Stripe.Event
  try { event = new Stripe(stripeSecretKey.value()).webhooks.constructEvent(request.rawBody, signature, stripeWebhookSecret.value()) }
  catch (error) { console.error('Stripe shop webhook signature verification failed', error); response.status(400).send('Invalid signature'); return }
  const checkoutEvents = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'])
  if (checkoutEvents.has(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = String(session.metadata?.orderId || '')
    if (orderId && /^[-A-Za-z0-9_]{8,40}$/.test(orderId)) {
      const reference = db.ref(`shopOrders/${orderId}`)
      const order = record((await reference.get()).val())
      if (order.stripeSessionId === session.id) {
        if (session.payment_status === 'paid') await reference.update({paymentStatus: 'Paid', status: order.status === 'Awaiting payment' ? 'Paid' : order.status, paidAt: Number(order.paidAt || Date.now()), updatedAt: Date.now()})
        else if (event.type === 'checkout.session.async_payment_failed') await reference.update({paymentStatus: 'Failed', updatedAt: Date.now()})
        else if (event.type === 'checkout.session.expired') await reference.update({paymentStatus: 'Expired', status: 'Payment expired', updatedAt: Date.now()})
      }
    }
  }
  response.status(200).json({received: true})
})

export const updateShopOrderStatus = onCall({region}, async request => {
  const actor = await requireFinanceAdmin(request)
  const input = record(request.data)
  const orderId = text(input.orderId, 'Order ID', 8, 40)
  if (!/^[-A-Za-z0-9_]{8,40}$/.test(orderId)) throw new HttpsError('invalid-argument', 'Order ID is invalid.')
  const status = choice(input.status, 'order status', new Set(['Preparing', 'Ready for collection', 'Dispatched', 'Cancelled']))
  const reference = db.ref(`shopOrders/${orderId}`)
  const snapshot = await reference.get()
  const current = record(snapshot.val())
  if (!snapshot.exists() || current.paymentStatus !== 'Paid') throw new HttpsError('failed-precondition', 'Only paid shop orders can be updated for fulfilment.')
  await reference.update({status, updatedAt: Date.now(), updatedBy: actor.displayName})
  return {updatedAt: Date.now()}
})

export const updateCoachInvoice = onCall({region}, async request => {
  const actor = await requireFinanceAdmin(request)
  const input = record(request.data)
  const coachUid = text(input.coachUid, 'Coach account', 1, 128)
  const invoiceId = text(input.invoiceId, 'Invoice ID', 1, 100)
  const invoiceNumber = text(input.invoiceNumber, 'Invoice number', 2, 80)
  const season = text(input.season, 'Season', 1, 60)
  const note = text(input.note, 'Edit reason', 3, 500)
  const totalHours = Number(input.totalHours)
  const totalAmount = Number(input.totalAmount)
  if (!Number.isFinite(totalHours) || totalHours <= 0 || totalHours > 10000) throw new HttpsError('invalid-argument', 'Invoice hours must be greater than 0 and no more than 10,000.')
  if (!Number.isFinite(totalAmount) || totalAmount < 0 || totalAmount > 1000000) throw new HttpsError('invalid-argument', 'Invoice amount must be between £0 and £1,000,000.')
  const reference = db.ref(`coachInvoices/${coachUid}/${invoiceId}`)
  const snapshot = await reference.get()
  if (!snapshot.exists()) throw new HttpsError('not-found', 'That coach invoice no longer exists.')
  const current = record(snapshot.val())
  if (current.coachUid !== coachUid || current.id !== invoiceId) throw new HttpsError('failed-precondition', 'The invoice record is inconsistent and cannot be edited.')
  const before = {invoiceNumber:current.invoiceNumber,totalHours:current.totalHours,totalAmount:current.totalAmount,season:current.season}
  const after = {invoiceNumber,totalHours:Math.round(totalHours*100)/100,totalAmount:Math.round(totalAmount*100)/100,season}
  const editedAt = Date.now()
  const auditId = randomBytes(16).toString('hex')
  const audit = {id:auditId,timestamp:editedAt,actorUid:actor.uid,actorName:actor.displayName,actorEmail:actor.email,category:'finance',action:'coach_invoice_edited',summary:`Edited coach invoice ${invoiceNumber}`,detail:`${String(current.coachName||current.coachEmail||coachUid)} · ${JSON.stringify(before)} → ${JSON.stringify(after)} · Reason: ${note}`,team:'',entityType:'settings',entityId:invoiceId,season:String(current.season||season)}
  const updates:Record<string,unknown>={}
  Object.entries({...after,lastEditedAt:editedAt,lastEditedBy:actor.displayName,lastEditNote:note}).forEach(([key,value])=>{updates[`coachInvoices/${coachUid}/${invoiceId}/${key}`]=value})
  updates[`auditLog/${auditId}`]=audit
  await db.ref().update(updates)
  return {updatedAt:editedAt}
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
      status: 'Link ready', invoiceNumber: refereeInvoiceNumber(team, opponent, fixtureDate, role), refereeName: '', email: '', feeAmount: 0, travelAmount: 0, amount: 0,
      bankAccountName: '', bankSortCode: '', bankAccountNumber: '', notes: '', inviteHash: tokenHash,
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
    invoiceNumber: String(invoice.invoiceNumber || refereeInvoiceNumber(String(invoice.team || ''), String(invoice.opponent || ''), String(invoice.fixtureDate || ''), verified.role)),
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
  const invoiceNumber = String(verified.invoice.invoiceNumber || refereeInvoiceNumber(String(verified.invoice.team || ''), String(verified.invoice.opponent || ''), String(verified.invoice.fixtureDate || ''), verified.role))
  const feeAmount = Number(input.feeAmount)
  if (!Number.isFinite(feeAmount) || feeAmount <= 0 || feeAmount > 10000 || Math.round(feeAmount * 100) !== feeAmount * 100) throw new HttpsError('invalid-argument', 'Enter a match fee greater than £0 and no more than £10,000, to two decimal places.')
  const travelAmount = input.travelAmount == null || input.travelAmount === '' ? 0 : Number(input.travelAmount)
  if (!Number.isFinite(travelAmount) || travelAmount < 0 || travelAmount > 10000 || Math.round(travelAmount * 100) !== travelAmount * 100) throw new HttpsError('invalid-argument', 'Enter a valid travel amount to two decimal places.')
  if (feeAmount + travelAmount > 10000) throw new HttpsError('invalid-argument', 'The total invoice must not exceed £10,000.')
  const bankAccountName = text(input.bankAccountName, 'Account name', 2, 120)
  const bankSortCode = String(input.bankSortCode || '').replace(/\D/g, '')
  const bankAccountNumber = String(input.bankAccountNumber || '').replace(/\D/g, '')
  if (!/^\d{6}$/.test(bankSortCode)) throw new HttpsError('invalid-argument', 'Enter a valid 6-digit UK sort code.')
  if (!/^\d{8}$/.test(bankAccountNumber)) throw new HttpsError('invalid-argument', 'Enter a valid 8-digit UK account number.')
  const notes = optionalText(input.notes, 'Invoice details', 1200)
  async function saveTravelReceipt(value: unknown) {
    const attachment = record(value)
    if (!Object.keys(attachment).length) return {path: '', name: ''}
    const contentType = choice(attachment.contentType, 'attachment type', new Set(['application/pdf', 'image/jpeg', 'image/png']))
    const base64 = attachment.base64
    if (typeof base64 !== 'string' || base64.length > Math.ceil(maximumRefereeInvoiceFileBytes * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new HttpsError('invalid-argument', 'The travel receipt must be a PDF, JPEG or PNG no larger than 2 MB.')
    const contents = Buffer.from(base64, 'base64')
    if (!contents.length || contents.length > maximumRefereeInvoiceFileBytes) throw new HttpsError('invalid-argument', 'The travel receipt must be a PDF, JPEG or PNG no larger than 2 MB.')
    const signatures: Record<string, boolean> = {'application/pdf': contents.subarray(0, 5).toString('ascii') === '%PDF-', 'image/jpeg': contents[0] === 0xff && contents[1] === 0xd8, 'image/png': contents.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))}
    if (!signatures[contentType]) throw new HttpsError('invalid-argument', 'The uploaded travel receipt does not match its file type.')
    const name = optionalText(attachment.name, 'File name', 160).replace(/[\\/]/g, '_') || 'travel receipt'
    const extension = contentType === 'application/pdf' ? 'pdf' : contentType === 'image/jpeg' ? 'jpg' : 'png'
    const path = `referee-invoices/${verified.fixtureId}/${verified.role}/travel-receipt-${randomBytes(12).toString('hex')}.${extension}`
    await getStorage().bucket().file(path).save(contents, {metadata: {contentType, cacheControl: 'private, max-age=0, no-transform'}, resumable: false})
    return {path, name}
  }
  if (travelAmount > 0 && !Object.keys(record(input.travelReceipt)).length) throw new HttpsError('invalid-argument', 'Upload a receipt or other proof when claiming travel expenses.')
  const travelReceipt = await saveTravelReceipt(input.travelReceipt)
  const now = Date.now()
  const result = await db.ref(`refereeInvoices/${verified.fixtureId}/${verified.role}`).transaction(currentValue => {
    const current = record(currentValue)
    if (current.status !== 'Link ready' || current.inviteHash !== verified.tokenHash) return
    return {...current, status: 'Submitted', invoiceNumber, refereeName, email: contactEmail, feeAmount, travelAmount, amount: feeAmount + travelAmount, bankAccountName, bankSortCode, bankAccountNumber, notes, submittedAt: now, updatedAt: now, updatedBy: refereeName, ...(travelReceipt.path ? {travelReceiptPath: travelReceipt.path, travelReceiptName: travelReceipt.name} : {})}
  })
  if (!result.committed) {
    if (travelReceipt.path) await getStorage().bucket().file(travelReceipt.path).delete({ignoreNotFound: true})
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
  const kind = choice(input.kind || 'invoice', 'attachment kind', new Set(['invoice', 'travel-receipt']))
  const path = kind === 'travel-receipt' ? invoice.travelReceiptPath : invoice.attachmentPath
  if (typeof path !== 'string' || !path.startsWith(`referee-invoices/${fixtureId}/${role}/`)) throw new HttpsError('not-found', 'No matching invoice document is available.')
  const [url] = await getStorage().bucket().file(path).getSignedUrl({action: 'read', expires: Date.now() + 15 * 60 * 1000})
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
