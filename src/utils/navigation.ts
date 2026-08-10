import type { PageKey, PlayerTab } from '../types'

export type AppRoute = {
  page: PageKey
  playerId?: string
  playerTab?: PlayerTab
  sessionId?: string
  team?: string
}

const pages: PageKey[] = ['dashboard','schedule','players','emails','teams','finance','activity','archive','settings']
const playerTabs: PlayerTab[] = ['overview','assessment','decision']

const safeDecode = (value = '') => {
  try { return decodeURIComponent(value) } catch { return '' }
}

export function parseAppHash(hash: string): AppRoute {
  const raw = hash.replace(/^#\/?/, '')
  const [path] = raw.split('?')
  const parts = path.split('/').filter(Boolean).map(safeDecode)
  const page = pages.includes(parts[0] as PageKey) ? parts[0] as PageKey : 'dashboard'

  if (page === 'players') {
    return {
      page,
      playerId: parts[1] || undefined,
      playerTab: playerTabs.includes(parts[2] as PlayerTab) ? parts[2] as PlayerTab : 'decision',
    }
  }
  if (page === 'emails') return { page, playerId: parts[1] || undefined }
  if (page === 'schedule') return { page, sessionId: parts[1] || undefined }
  if (page === 'teams') return { page, team: parts[1] || undefined }
  return { page }
}

export function appHashFor(route: AppRoute): string {
  const parts: string[] = [route.page]
  if (route.page === 'players' && route.playerId) {
    parts.push(route.playerId, route.playerTab || 'decision')
  } else if (route.page === 'emails' && route.playerId) {
    parts.push(route.playerId)
  } else if (route.page === 'schedule' && route.sessionId) {
    parts.push(route.sessionId)
  } else if (route.page === 'teams' && route.team) {
    parts.push(route.team)
  }
  return `#/${parts.map(encodeURIComponent).join('/')}`
}
