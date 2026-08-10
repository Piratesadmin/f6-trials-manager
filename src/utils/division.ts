import type { Player } from '../types'

export function divisionValues(value: string) {
  return Array.from(new Set(value.split(/[,;|/\n]+/).map(item=>item.trim()).filter(Boolean)))
}

const normaliseDivision = (value: string) => value.toLowerCase().replace(/\bdiv\b/g,'division').replace(/[^a-z0-9]+/g,' ').trim()

type DivisionGender = 'women' | 'men' | ''
type DivisionLeague = 'nvl' | 'lva' | ''
type DivisionDescriptor = { league: DivisionLeague; code: string; gender: DivisionGender }

const divisionGender = (value: string): DivisionGender => {
  const normalised=normaliseDivision(value)
  if(/\b(w|woman|women|womens|female|ladies|girls)\b/.test(normalised))return 'women'
  if(/\b(m|man|men|mens|male|boys)\b/.test(normalised))return 'men'
  return ''
}

function divisionDescriptors(value: string): DivisionDescriptor[] {
  const normalised=normaliseDivision(value)
  const gender=divisionGender(value)
  const codes=Array.from(normalised.matchAll(/\b([0-9]+)\b/g),match=>match[1])
  if(!codes.length)return[]
  const hasNvl=/\bnvl\b/.test(normalised)
  const hasLva=/\blva\b/.test(normalised)
  if(hasNvl&&!hasLva){
    return codes.map((code,index)=>({league:index===0?'nvl':'lva',code,gender}))
  }
  if(hasLva&&!hasNvl)return codes.map(code=>({league:'lva',code,gender}))
  if(hasNvl&&hasLva){
    const nvlCode=normalised.match(/\bnvl\s+division\s+([0-9]+)/)?.[1]
    const lvaCode=normalised.match(/\blva\s+division\s+([0-9]+)/)?.[1]
    return codes.map(code=>({league:code===nvlCode?'nvl':code===lvaCode?'lva':'',code,gender}))
  }
  return codes.map(code=>({league:'lva',code,gender}))
}

export function divisionMatches(left: string, right: string) {
  const normalisedLeft=normaliseDivision(left)
  const normalisedRight=normaliseDivision(right)
  if(!normalisedLeft||!normalisedRight)return false
  const leftGender=divisionGender(left)
  const rightGender=divisionGender(right)
  if(leftGender!==rightGender&&(leftGender||rightGender))return false
  if(normalisedLeft===normalisedRight)return true
  const leftDivisions=divisionDescriptors(left)
  const rightDivisions=divisionDescriptors(right)
  return leftDivisions.some(leftDivision=>rightDivisions.some(rightDivision=>
    leftDivision.code===rightDivision.code&&
    (!leftDivision.league||!rightDivision.league||leftDivision.league===rightDivision.league)&&
    (!leftDivision.gender||!rightDivision.gender||leftDivision.gender===rightDivision.gender)
  ))
}

export function playerMatchesDivision(player: Player, division: string, teamDivisions: Record<string,string>) {
  const values=[
    ...divisionValues(player.interestedDivisions),
    ...player.suitableTeams.map(team=>teamDivisions[team]||''),
  ].filter(Boolean)
  return values.some(value=>divisionMatches(value,division))
}

export function teamMatchesInterestedDivisions(player: Player, team: string, teamDivisions: Record<string,string>) {
  const teamDivision=teamDivisions[team]
  return Boolean(teamDivision&&divisionValues(player.interestedDivisions).some(division=>divisionMatches(division,teamDivision)))
}
