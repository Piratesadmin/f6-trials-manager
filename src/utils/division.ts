import type { Player } from '../types'

export function divisionValues(value: string) {
  return Array.from(new Set(value.split(/[,;|\/\n]+/).map(item=>item.trim()).filter(Boolean)))
}

const normaliseDivision = (value: string) => value.toLowerCase().replace(/\bdiv\b/g,'division').replace(/[^a-z0-9]+/g,' ').trim()

type DivisionGender = 'women' | 'men' | ''

const divisionGender = (value: string): DivisionGender => {
  const normalised=normaliseDivision(value)
  if(/\b(w|woman|women|womens|female|ladies|girls)\b/.test(normalised))return 'women'
  if(/\b(m|man|men|mens|male|boys)\b/.test(normalised))return 'men'
  return ''
}

const divisionCodes = (value: string) => Array.from(normaliseDivision(value).matchAll(/\bdivision\s*([a-z0-9]+)/g),match=>match[1])

export function divisionMatches(left: string, right: string) {
  const normalisedLeft=normaliseDivision(left)
  const normalisedRight=normaliseDivision(right)
  if(!normalisedLeft||!normalisedRight)return false
  const leftGender=divisionGender(left)
  const rightGender=divisionGender(right)
  if(leftGender!==rightGender&&(leftGender||rightGender))return false
  if(normalisedLeft===normalisedRight||normalisedLeft.includes(normalisedRight)||normalisedRight.includes(normalisedLeft))return true
  const rightCodes=new Set(divisionCodes(right))
  return divisionCodes(left).some(code=>rightCodes.has(code))
}

export function playerMatchesDivision(player: Player, division: string, teamDivisions: Record<string,string>) {
  const values=[...divisionValues(player.interestedDivisions),teamDivisions[player.appliedTeam]||''].filter(Boolean)
  return values.some(value=>divisionMatches(value,division))
}
