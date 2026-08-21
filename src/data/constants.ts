import type { EmailSettings, Player, Recommendation, SquadRole } from '../types'
import { emptyAssessment } from '../utils/player'

export const teams = ['Aces','Ravens','Cobras','Coyotes','Llamas','Meerkats','Leopards','Pirates']
export const defaultTeamColours: Record<string,string> = { Aces:'#dc2626', Ravens:'#7c3aed', Cobras:'#2563eb', Coyotes:'#ea580c', Llamas:'#16a34a', Meerkats:'#ca8a04', Leopards:'#db2777', Pirates:'#0891b2' }
export const positions = ['Setter','Outside','Middle','Opposite','Libero','All-rounder']
export const reasons = ['Very high number of applicants','Limited squad spaces','Position already filled','Team level or profile fit','Training availability does not match','No suitable team currently available']
export const recommendations: Exclude<Recommendation, ''>[] = ['Strong offer','Offer','Waiting list','Refer to another team','Needs discussion','Not suitable']
export const squadRoles: SquadRole[] = ['Starting six','Frequent player','Rotational player','Development / improvement role','Training squad','Role to be discussed']

export const defaultEmailSettings: EmailSettings = {
  clubName: 'Flaming Six Volleyball Club',
  clubEmail: '',
  defaultCoachName: '',
  defaultResponseDeadline: '',
  teamDetails: Object.fromEntries(teams.map(team => [team, { adminEmail: '', trainingDay: '', trainingTime: '', venue: '', competition: '', calendarColor: defaultTeamColours[team] }])),
}

const assessmentDefaults = () => ({
  dateOfBirth: '',
  secondaryPosition: '',
  playingExperience: '',
  highestLevelPlayed: '',
  photoUrl: '',
  trialSessionId: '',
  trialResponseStatus: '' as const,
  paid: false,
  trialRegistrations: {},
  assessment: emptyAssessment(),
  recommendation: '' as const,
  strengths: '',
  developmentAreas: '',
  suitableTeams: [] as string[],
  bibNumber: '',
  teamConsideration: {} as Record<string, string>,
  confirmedTeams: {} as Record<string, string>,
  offers: [],
  emailReviewStatus: 'draft' as const,
  emailDraft: { responseDeadline: '', coachName: '', personalMessage: '' },
  communicationHistory: {},
})

export const initialPlayers: Player[] = [
  {id:'1',name:'Alex Morgan',email:'alex@example.com',interestedDivisions:'LVA Div 2 Mens',position:'Setter',trialDate:'11 Aug 2026',attended:true,decision:'Awaiting decision',notes:'Good hands and communication.',...assessmentDefaults(),bibNumber:'17'},
  {id:'2',name:'Jamie Patel',email:'jamie@example.com',interestedDivisions:'LVA Div 1 Womens',position:'Outside',trialDate:'11 Aug 2026',attended:true,decision:'Offer planned',offeredTeam:'Ravens',offeredPosition:'Outside',notes:'Strong passer.',...assessmentDefaults(),offers:[{team:'Ravens',position:'Outside',squadRole:'Frequent player',includeSquadRole:true}]},
  {id:'3',name:'Sam Taylor',email:'sam@example.com',interestedDivisions:'LVA Div 2 Womens',position:'Libero',trialDate:'18 Aug 2026',attended:true,decision:'Alternative offer',offeredTeam:'Meerkats',offeredPosition:'Libero',notes:'Better fit for Meerkats.',...assessmentDefaults(),offers:[{team:'Meerkats',position:'Libero',squadRole:'Rotational player',includeSquadRole:true}]},
  {id:'4',name:'Jordan Lee',email:'jordan@example.com',interestedDivisions:'LVA Div 2 Mens',position:'Middle',trialDate:'18 Aug 2026',attended:false,decision:'Awaiting decision',notes:'',...assessmentDefaults()},
]
