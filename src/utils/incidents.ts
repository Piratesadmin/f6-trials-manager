import type { IncidentReport, IncidentSeverity, IncidentStatus, IncidentType } from '../types'

const incidentTypes: IncidentType[] = ['injury','accident','near-miss']
const severities: IncidentSeverity[] = ['minor','moderate','serious']
const statuses: IncidentStatus[] = ['open','monitoring','closed']

const text = (value: unknown) => typeof value === 'string' ? value : ''
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0

export function createIncidentReport(team = ''): IncidentReport {
  const today=new Date().toISOString().slice(0,10)
  return {id:crypto.randomUUID(),team,eventId:'',eventTitle:'',occurredOn:today,occurredAt:'',personType:'player',playerId:'',personName:'',type:'injury',severity:'minor',location:'',description:'',immediateAction:'',firstAidGiven:false,firstAidDetails:'',emergencyServices:false,parentGuardianNotified:false,witnesses:'',followUp:'',status:'open',createdAt:0,createdByUid:'',createdByName:'',createdByEmail:'',updatedAt:0,updatedByUid:'',updatedByName:''}
}

export function normaliseIncidentReport(id: string, value: unknown, fallbackTeam = ''): IncidentReport | null {
  if(!value||typeof value!=='object'||Array.isArray(value))return null
  const item=value as Partial<IncidentReport>
  const type=incidentTypes.includes(item.type as IncidentType)?item.type as IncidentType:'accident'
  const severity=severities.includes(item.severity as IncidentSeverity)?item.severity as IncidentSeverity:'minor'
  const status=statuses.includes(item.status as IncidentStatus)?item.status as IncidentStatus:'open'
  const personType=['player','coach','spectator','other'].includes(item.personType||'')?item.personType as IncidentReport['personType']:'other'
  const report:IncidentReport={
    id,
    team:text(item.team)||fallbackTeam,
    eventId:text(item.eventId),
    eventTitle:text(item.eventTitle),
    occurredOn:text(item.occurredOn),
    occurredAt:text(item.occurredAt),
    personType,
    playerId:text(item.playerId),
    personName:text(item.personName),
    type,
    severity,
    location:text(item.location),
    description:text(item.description),
    immediateAction:text(item.immediateAction),
    firstAidGiven:Boolean(item.firstAidGiven),
    firstAidDetails:text(item.firstAidDetails),
    emergencyServices:Boolean(item.emergencyServices),
    parentGuardianNotified:Boolean(item.parentGuardianNotified),
    witnesses:text(item.witnesses),
    followUp:text(item.followUp),
    status,
    createdAt:number(item.createdAt),
    createdByUid:text(item.createdByUid),
    createdByName:text(item.createdByName),
    createdByEmail:text(item.createdByEmail),
    updatedAt:number(item.updatedAt),
    updatedByUid:text(item.updatedByUid),
    updatedByName:text(item.updatedByName),
  }
  if(number(item.closedAt))report.closedAt=number(item.closedAt)
  if(text(item.closedByUid))report.closedByUid=text(item.closedByUid)
  if(text(item.closedByName))report.closedByName=text(item.closedByName)
  return report.team&&report.occurredOn&&report.personName&&report.description?report:null
}

export function incidentReportsFromFirebase(value: unknown): IncidentReport[] {
  if(!value||typeof value!=='object'||Array.isArray(value))return []
  return Object.entries(value as Record<string,unknown>).flatMap(([team,reports])=>{
    if(!reports||typeof reports!=='object'||Array.isArray(reports))return []
    return Object.entries(reports as Record<string,unknown>).flatMap(([id,item])=>{
      const report=normaliseIncidentReport(id,item,team)
      return report?[report]:[]
    })
  })
}

export const incidentTypeLabels:Record<IncidentType,string>={injury:'Injury',accident:'Accident','near-miss':'Near miss'}
export const incidentSeverityLabels:Record<IncidentSeverity,string>={minor:'Minor',moderate:'Moderate',serious:'Serious'}
export const incidentStatusLabels:Record<IncidentStatus,string>={open:'Open',monitoring:'Monitoring',closed:'Closed'}
