import { teams } from '../data/constants'
import type { FinanceForecast, FinanceForecastClubCost, FinanceForecastCostLine, FinanceForecastTeam } from '../types'

const emptyTeam = (): FinanceForecastTeam => ({
  fullPlayers: 0,
  halfPlayers: 0,
  paygIncome: 0,
  fullFee: 0,
  halfFee: 0,
  homeGames: 0,
  awayGames: 0,
  gameHours: 0,
  gameVenueHourlyRate: 0,
  officialsPerHomeGame: 0,
  trainingSessions: 0,
  trainingHours: 0,
  trainingVenueHourlyRate: 0,
  coachHourlyRate: 0,
})

const sourceTeams: Record<string, FinanceForecastTeam> = {
  Aces: { fullPlayers:18, halfPlayers:0, paygIncome:0, fullFee:440, halfFee:220, homeGames:9, awayGames:7, gameHours:3, gameVenueHourlyRate:55, officialsPerHomeGame:110, trainingSessions:25, trainingHours:1.75, trainingVenueHourlyRate:55, coachHourlyRate:22.5 },
  Ravens: { fullPlayers:18, halfPlayers:0, paygIncome:0, fullFee:500, halfFee:250, homeGames:7, awayGames:7, gameHours:3, gameVenueHourlyRate:60, officialsPerHomeGame:110, trainingSessions:29, trainingHours:2, trainingVenueHourlyRate:75, coachHourlyRate:20 },
  Cobras: { fullPlayers:16, halfPlayers:0, paygIncome:0, fullFee:440, halfFee:220, homeGames:7, awayGames:7, gameHours:2, gameVenueHourlyRate:55, officialsPerHomeGame:80, trainingSessions:34, trainingHours:1.5, trainingVenueHourlyRate:55, coachHourlyRate:30 },
  Coyotes: { fullPlayers:16, halfPlayers:0, paygIncome:0, fullFee:440, halfFee:220, homeGames:7, awayGames:7, gameHours:2, gameVenueHourlyRate:59.4, officialsPerHomeGame:80, trainingSessions:34, trainingHours:1.5, trainingVenueHourlyRate:55, coachHourlyRate:32.5 },
  Llamas: { fullPlayers:16, halfPlayers:0, paygIncome:0, fullFee:440, halfFee:220, homeGames:7, awayGames:7, gameHours:2, gameVenueHourlyRate:55, officialsPerHomeGame:80, trainingSessions:34, trainingHours:1.5, trainingVenueHourlyRate:55, coachHourlyRate:30 },
  Meerkats: { fullPlayers:16, halfPlayers:0, paygIncome:0, fullFee:440, halfFee:220, homeGames:6, awayGames:6, gameHours:2, gameVenueHourlyRate:59.4, officialsPerHomeGame:80, trainingSessions:27, trainingHours:2, trainingVenueHourlyRate:59.4, coachHourlyRate:30 },
  Leopards: { fullPlayers:13, halfPlayers:0, paygIncome:0, fullFee:440, halfFee:220, homeGames:8, awayGames:8, gameHours:2, gameVenueHourlyRate:59.4, officialsPerHomeGame:80, trainingSessions:34, trainingHours:1.5, trainingVenueHourlyRate:55, coachHourlyRate:0 },
  Pirates: { fullPlayers:16, halfPlayers:0, paygIncome:0, fullFee:440, halfFee:220, homeGames:8, awayGames:8, gameHours:2, gameVenueHourlyRate:55, officialsPerHomeGame:80, trainingSessions:34, trainingHours:1.5, trainingVenueHourlyRate:55, coachHourlyRate:20 },
}

const teamAmounts = (value: number | Record<string, number>, include: (team: string) => boolean = () => true) =>
  Object.fromEntries(teams.map(team => [team, include(team) ? (typeof value === 'number' ? value : value[team] || 0) : 0]))

export const defaultFinanceForecast: FinanceForecast = {
  seasonName: '2026–27 forecast',
  sourceNote: 'Initial assumptions transcribed from F6 costs - season 23-24 - rev A.numbers, latest 26-27 sheet.',
  teams: Object.fromEntries(teams.map(team => [team, { ...(sourceTeams[team] || emptyTeam()) }])),
  extraCosts: [
    { id:'storage', label:'Storage', teamAmounts:teamAmounts(30) },
    { id:'uniforms', label:'Uniforms', teamAmounts:teamAmounts(0) },
    { id:'gifts', label:'Gifts', teamAmounts:teamAmounts(75) },
    { id:'events', label:'Events', teamAmounts:teamAmounts(1000/7) },
    { id:'membership', label:'Membership', teamAmounts:teamAmounts({Aces:469.03,Ravens:395.76}) },
    { id:'balls', label:'Balls', teamAmounts:teamAmounts(0) },
    { id:'ve-affiliation', label:'VE affiliation', teamAmounts:teamAmounts(119/6,team=>!['Aces','Ravens'].includes(team)) },
    { id:'league-registration', label:'League registration', teamAmounts:teamAmounts(70,team=>!['Aces','Ravens'].includes(team)) },
    { id:'other', label:'Other / contingency', teamAmounts:teamAmounts(55) },
  ],
  clubCosts: [],
}

function safeNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 1000000) / 1000000) : 0
}

function safeText(value: unknown, fallback = '', max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback
}

function normaliseTeam(value: unknown, fallback: FinanceForecastTeam): FinanceForecastTeam {
  const incoming = value && typeof value === 'object' ? value as Partial<FinanceForecastTeam> : {}
  return Object.fromEntries(Object.entries(fallback).map(([key, defaultValue]) => [key, Object.hasOwn(incoming, key) ? safeNumber(incoming[key as keyof FinanceForecastTeam]) : defaultValue])) as FinanceForecastTeam
}

function listFromUnknown(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  return value && typeof value === 'object' ? Object.values(value as Record<string, unknown>) : []
}

function normaliseCostLines(value: unknown): FinanceForecastCostLine[] {
  return listFromUnknown(value).slice(0, 30).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const incoming = item as Partial<FinanceForecastCostLine>
    const label = safeText(incoming.label, `Cost ${index + 1}`, 80)
    const amounts = incoming.teamAmounts && typeof incoming.teamAmounts === 'object' ? incoming.teamAmounts : {}
    return [{ id:safeText(incoming.id, `cost-${index + 1}`, 80), label, teamAmounts:Object.fromEntries(teams.map(team => [team, safeNumber(amounts[team])])) }]
  })
}

function normaliseClubCosts(value: unknown): FinanceForecastClubCost[] {
  return listFromUnknown(value).slice(0, 30).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const incoming = item as Partial<FinanceForecastClubCost>
    return [{ id:safeText(incoming.id, `club-cost-${index + 1}`, 80), label:safeText(incoming.label, `Club cost ${index + 1}`, 80), amount:safeNumber(incoming.amount) }]
  })
}

export function normaliseFinanceForecast(value: unknown): FinanceForecast {
  const incoming = value && typeof value === 'object' ? value as Partial<FinanceForecast> : {}
  const incomingTeams = incoming.teams && typeof incoming.teams === 'object' ? incoming.teams : {}
  const extraCosts = normaliseCostLines(incoming.extraCosts)
  const clubCosts = normaliseClubCosts(incoming.clubCosts)
  return {
    seasonName: safeText(incoming.seasonName, defaultFinanceForecast.seasonName, 60),
    sourceNote: safeText(incoming.sourceNote, defaultFinanceForecast.sourceNote, 300),
    teams: Object.fromEntries(teams.map(team => [team, normaliseTeam(incomingTeams[team], sourceTeams[team] || emptyTeam())])),
    extraCosts: extraCosts.length ? extraCosts : defaultFinanceForecast.extraCosts.map(line => ({ ...line, teamAmounts:{...line.teamAmounts} })),
    clubCosts,
    ...(typeof incoming.updatedAt === 'number' ? {updatedAt:incoming.updatedAt} : {}),
    ...(typeof incoming.updatedBy === 'string' ? {updatedBy:incoming.updatedBy} : {}),
  }
}

export function forecastTeamResult(team: string, forecast: FinanceForecast) {
  const input = forecast.teams[team] || emptyTeam()
  const income = input.fullPlayers * input.fullFee + input.halfPlayers * input.halfFee + input.paygIncome
  const trainingCost = (input.trainingVenueHourlyRate + input.coachHourlyRate) * input.trainingHours * input.trainingSessions
  const homeGameCost = (input.gameVenueHourlyRate * input.gameHours + input.coachHourlyRate * input.gameHours + input.officialsPerHomeGame) * input.homeGames
  const awayGameCost = input.coachHourlyRate * input.gameHours * input.awayGames
  const extraCost = forecast.extraCosts.reduce((total, line) => total + safeNumber(line.teamAmounts[team]), 0)
  const operatingCost = trainingCost + homeGameCost + awayGameCost
  const totalCost = operatingCost + extraCost
  return { income, trainingCost, homeGameCost, awayGameCost, operatingCost, extraCost, totalCost, contribution:income-totalCost }
}

export function financeForecastSummary(forecast: FinanceForecast) {
  const teamResults = Object.fromEntries(teams.map(team => [team, forecastTeamResult(team, forecast)]))
  const income = Object.values(teamResults).reduce((total, result) => total + result.income, 0)
  const teamCosts = Object.values(teamResults).reduce((total, result) => total + result.totalCost, 0)
  const clubCosts = forecast.clubCosts.reduce((total, item) => total + safeNumber(item.amount), 0)
  const fullFeeEquivalents = teams.reduce((total, team) => total + forecast.teams[team].fullPlayers + forecast.teams[team].halfPlayers * 0.5, 0)
  const totalCost = teamCosts + clubCosts
  return { teamResults, income, teamCosts, clubCosts, totalCost, net:income-totalCost, fullFeeEquivalents, breakEvenFullFee:fullFeeEquivalents ? totalCost/fullFeeEquivalents : 0 }
}
