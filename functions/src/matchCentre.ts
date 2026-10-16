import {load, type CheerioAPI} from 'cheerio'

export type MatchSource = 'nvl' | 'lva'

export type MatchCentreMatch = {
  id: string
  source: MatchSource
  sourceUrl: string
  clubTeam: string
  date: string
  displayDate: string
  startTime: string
  matchStartTime: string
  homeTeam: string
  awayTeam: string
  competition: string
  venue: string
  referees: string[]
  homeScore?: number
  awayScore?: number
  sets?: Array<{home: number; away: number}>
}

export type MatchCentreStanding = {
  position: number
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  setsFor: number
  setsAgainst: number
  setDifference: number
  pointsFor: number
  pointsAgainst: number
  pointsRatio: string
  points: number
}

export type MatchCentreTable = {
  id: string
  source: MatchSource
  sourceUrl: string
  competition: string
  clubTeams: string[]
  standings: MatchCentreStanding[]
}

export type MatchCentreSourceStatus = {
  source: MatchSource
  label: string
  url: string
  available: boolean
  message: string
}

export type MatchCentreData = {
  updatedAt: number
  stale: boolean
  fixtures: MatchCentreMatch[]
  results: MatchCentreMatch[]
  tables: MatchCentreTable[]
  sources: MatchCentreSourceStatus[]
}

type SourceConfig = {
  source: MatchSource
  label: string
  url: string
  slug: string
  teams: Record<string, string>
}

const sourceConfigs: SourceConfig[] = [
  {
    source: 'nvl',
    label: 'National Volleyball League',
    url: 'https://competitions.volleyzone.co.uk/fixture-and-results/nvl/',
    slug: 'nvl',
    teams: {Aces: 'London Aces', Ravens: 'London Ravens'},
  },
  {
    source: 'lva',
    label: 'London Volleyball League',
    url: 'https://competitions.volleyzone.co.uk/fixture-and-results/lva/',
    slug: 'lva',
    teams: {
      Cobras: 'Flaming Six Cobras',
      Coyotes: 'Flaming Six Coyotes',
      Llamas: 'Flaming Six Llamas',
      Meerkats: 'Flaming Six Meerkats',
      Leopards: 'Flaming Six Leopards',
      Pirates: 'Flaming Six Pirates',
    },
  },
]

const monthNumbers: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
}
const fixtureEndDate = '2027-05-31'

function clean(value: string | undefined | null) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function number(value: string | undefined | null) {
  const parsed = Number.parseInt(clean(value), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function isoDate(value: string) {
  const match = clean(value).match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i)
  if (!match) return ''
  const month = monthNumbers[match[2].toLowerCase()]
  return month ? `${match[3]}-${month}-${match[1].padStart(2, '0')}` : ''
}

function clubTeamFor(config: SourceConfig, homeTeam: string, awayTeam: string) {
  return Object.entries(config.teams).find(([, published]) => published === homeTeam || published === awayTeam)?.[0] || ''
}

function detailsFor($: CheerioAPI, element: Parameters<CheerioAPI>[0]) {
  const values = $(element).find('.sub-text > span').toArray().map(span => clean($(span).text())).filter(Boolean)
  return {
    competition: values.find(value => !value.startsWith('Venue:') && !value.startsWith('Referee') && value !== 'Team Sheet') || '',
    venue: (values.find(value => value.startsWith('Venue:')) || '').replace(/^Venue:\s*/, ''),
    referees: values.filter(value => value.startsWith('Referee')).map(value => value.replace(/^Referee\s*\d*:\s*/, '')),
  }
}

function parseMatch($: CheerioAPI, element: Parameters<CheerioAPI>[0], config: SourceConfig, result: boolean): MatchCentreMatch | null {
  const node = $(element)
  const homeTeam = clean(node.attr('data-home-team'))
  const awayTeam = clean(node.attr('data-away-team'))
  const clubTeam = clubTeamFor(config, homeTeam, awayTeam)
  if (!clubTeam) return null

  const displayDate = clean(node.attr('data-date'))
  const date = isoDate(displayDate)
  const centre = node.find('.flag-box > ul.list-unstyled > li').eq(1)
  const centreText = clean(centre.text())
  const times = [...centreText.matchAll(/(?:^|[^\d])([01]?\d|2[0-3]):([0-5]\d)/g)].map(match => `${match[1].padStart(2, '0')}:${match[2]}`)
  const link = node.find('a[href*="fixture_id="]').first().attr('href') || config.url
  const fixtureId = link.match(/[?&]fixture_id=(\d+)/)?.[1] || `${date}-${homeTeam}-${awayTeam}`
  const details = detailsFor($, element)
  const item: MatchCentreMatch = {
    id: `${config.source}-${fixtureId}`,
    source: config.source,
    sourceUrl: link === '#' ? config.url : link,
    clubTeam,
    date,
    displayDate,
    startTime: times[0] || '',
    matchStartTime: times[1] || times[0] || '',
    homeTeam,
    awayTeam,
    ...details,
  }

  if (result) {
    const scoreValues = centre.children('span').toArray().map(span => number($(span).text()))
    const setValues = node.find('.list-centered_bottom > li').toArray().map(set => {
      const values = $(set).find('span').toArray().map(span => number($(span).text()))
      return values.length >= 2 ? {home: values[0], away: values[1]} : null
    }).filter((set): set is {home: number; away: number} => Boolean(set))
    item.homeScore = scoreValues[0] ?? 0
    item.awayScore = scoreValues[1] ?? 0
    item.sets = setValues
  }
  return item
}

function competitionIds($: CheerioAPI) {
  const divisions = new Map<string, string>()
  $('select#select_comp option[value], select#select_comp_live option[value]').each((_, option) => {
    const id = clean($(option).attr('value'))
    const name = clean($(option).text())
    if (id && name && !/^all divisions?$/i.test(name)) divisions.set(name.toLowerCase(), id)
  })
  return divisions
}

function parsePage(html: string, config: SourceConfig) {
  const $ = load(html)
  const fixtures = $('.FixContents').toArray().map(element => parseMatch($, element, config, false)).filter((item): item is MatchCentreMatch => Boolean(item && item.date))
  const results = $('.resultContentsParent').toArray().map(element => parseMatch($, element, config, true)).filter((item): item is MatchCentreMatch => Boolean(item && item.date))
  return {
    fixtures,
    results,
    divisions: competitionIds($),
    seasonId: clean($('select#select_season_fixture').val() as string || $('select#select_season_live').val() as string || ''),
    userId: html.match(/userId:\s*['"]?(\d+)['"]?/)?.[1] || '298568',
  }
}

function parseFixtureMarkup(markup: string, config: SourceConfig) {
  const $ = load(markup)
  return $('.FixContents').toArray().map(element => parseMatch($, element, config, false)).filter((item): item is MatchCentreMatch => Boolean(item && item.date && item.date <= fixtureEndDate))
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Accept': init?.headers && 'Accept' in init.headers ? String(init.headers.Accept) : 'text/html,application/json',
      'User-Agent': 'F6 Club Manager/1.0 (+https://flamingsix.co.uk)',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`VolleyZone returned HTTP ${response.status}.`)
  return response.text()
}

function parseTable(html: string, config: SourceConfig, competition: string, competitionId: string): MatchCentreTable | null {
  const $ = load(html)
  const standings = $('tr.tableContents').toArray().map(row => ({
    position: number($(row).find('.srno').text()),
    team: clean($(row).find('.team').text()),
    played: number($(row).find('.played').text()),
    won: number($(row).find('.gamesWon').text()),
    drawn: number($(row).find('.gamesDraw').text()),
    lost: number($(row).find('.gameLost').text()),
    setsFor: number($(row).find('.pointsFor').text()),
    setsAgainst: number($(row).find('.pointsAgainst').text()),
    setDifference: number($(row).find('.pointsDifference').text()),
    pointsFor: number($(row).find('.scoresFor').text()),
    pointsAgainst: number($(row).find('.scoresAgainst').text()),
    pointsRatio: clean($(row).find('.scoreRatio').text()),
    points: number($(row).find('.points').text()),
  })).filter(row => row.team)
  const clubTeams = Object.entries(config.teams).filter(([, published]) => standings.some(row => row.team === published)).map(([team]) => team)
  if (!standings.length || !clubTeams.length) return null
  return {
    id: `${config.source}-${competitionId}`,
    source: config.source,
    sourceUrl: `https://competitions.volleyzone.co.uk/league/${competitionId}/`,
    competition,
    clubTeams,
    standings,
  }
}

async function fetchSource(config: SourceConfig) {
  const html = await fetchText(config.url)
  const page = parsePage(html, config)
  const relevantCompetitions = [...new Set([...page.fixtures, ...page.results].filter(match => match.clubTeam).map(match => match.competition).filter(Boolean))]
    .map(name => ({name, id: page.divisions.get(name.toLowerCase()) || ''}))
    .filter(item => item.id)
  const [fixtureGroups, tables] = await Promise.all([
    Promise.all(relevantCompetitions.map(async competition => {
      const body = new URLSearchParams({
        seasonidgrp: page.seasonId,
        fix_compID: competition.id,
        pageTitle: 'Fixture and Results',
        userId: page.userId,
        lastSegment: config.slug,
      })
      const response = await fetchText('https://competitions.volleyzone.co.uk/wp-admin/admin-ajax.php?action=fetch_fixture_by_competition', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
        body,
      })
      const payload = JSON.parse(response) as {fixtures?: string}
      return parseFixtureMarkup(payload.fixtures || '', config)
    })),
    Promise.all(relevantCompetitions.map(async competition => {
    const body = new URLSearchParams({competition_id: competition.id, pageTitle: 'Fixture and Results', lastSegment: config.slug})
    const response = await fetchText('https://competitions.volleyzone.co.uk/wp-admin/admin-ajax.php?action=fetch_table_by_competition', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
      body,
    })
    const payload = JSON.parse(response) as {CompTables?: string}
    return parseTable(payload.CompTables || '', config, competition.name, competition.id)
    })),
  ])
  const fixtureById = new Map<string, MatchCentreMatch>()
  for (const fixture of [...page.fixtures, ...fixtureGroups.flat()]) {
    if (fixture.date <= fixtureEndDate) fixtureById.set(fixture.id, fixture)
  }
  return {
    fixtures: [...fixtureById.values()],
    results: page.results,
    tables: tables.filter((table): table is MatchCentreTable => Boolean(table)),
  }
}

export async function loadMatchCentre(): Promise<MatchCentreData> {
  const settled = await Promise.allSettled(sourceConfigs.map(fetchSource))
  const fixtures: MatchCentreMatch[] = []
  const results: MatchCentreMatch[] = []
  const tables: MatchCentreTable[] = []
  const sources = settled.map((result, index): MatchCentreSourceStatus => {
    const config = sourceConfigs[index]
    if (result.status === 'fulfilled') {
      fixtures.push(...result.value.fixtures)
      results.push(...result.value.results)
      tables.push(...result.value.tables)
      return {source: config.source, label: config.label, url: config.url, available: true, message: ''}
    }
    console.error(`Match Centre ${config.source} fetch failed`, result.reason)
    return {source: config.source, label: config.label, url: config.url, available: false, message: 'This source could not be refreshed.'}
  })
  if (!sources.some(source => source.available)) throw new Error('Neither competition source could be reached.')
  fixtures.sort((left, right) => left.date.localeCompare(right.date) || left.startTime.localeCompare(right.startTime))
  results.sort((left, right) => right.date.localeCompare(left.date) || right.startTime.localeCompare(left.startTime))
  tables.sort((left, right) => left.source.localeCompare(right.source) || left.competition.localeCompare(right.competition))
  return {updatedAt: Date.now(), stale: false, fixtures, results, tables, sources}
}
