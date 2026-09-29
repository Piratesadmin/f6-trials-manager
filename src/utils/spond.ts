import type { ClubEventType, SessionAttendanceStatus, TrialSession } from '../types'

type Cell = string | number | boolean | Date | null | undefined
export type SpondRow = Cell[]

export type SpondAttendanceRow = {
  name: string
  email: string
  status: SessionAttendanceStatus | ''
  sourceStatus: string
}

export type ParsedSpondEvent = {
  session: Omit<TrialSession,'id'>
  attendance: SpondAttendanceRow[]
  warnings: string[]
  sourceSheet: string
}

const clean=(value:string)=>value.toLowerCase().replace(/[’‘]/g,"'").replace(/[_–—-]+/g,' ').replace(/\s+/g,' ').trim()
const text=(value:Cell)=>value instanceof Date?value.toISOString():value==null?'':String(value).trim()
const pad=(value:number)=>String(value).padStart(2,'0')

const aliases={
  name:['name','full name','member','member name','participant','participant name','player','player name'],
  firstName:['first name','firstname','given name'],
  lastName:['last name','lastname','surname','family name'],
  email:['email','email address','e mail'],
  status:['status','attendance','attendance status','actual attendance','registered attendance','registration status','response','response status'],
  attended:['attended','present','was present','registered as attended','participated'],
  validAbsence:['valid absence','excused absence','excused','approved absence'],
  late:['late','late arrival'],
} as const

type HeaderKey=keyof typeof aliases
type Headers=Partial<Record<HeaderKey,number>>

function findHeaders(rows:SpondRow[]){
  for(let rowIndex=0;rowIndex<Math.min(rows.length,30);rowIndex++){
    const values=rows[rowIndex].map(value=>clean(text(value)))
    const headers:Headers={}
    for(const[key,names]of Object.entries(aliases) as [HeaderKey,readonly string[]][]){
      const index=values.findIndex(value=>names.includes(value))
      if(index>=0)headers[key]=index
    }
    if((headers.name!=null||(headers.firstName!=null&&headers.lastName!=null))&&(headers.status!=null||headers.attended!=null||headers.validAbsence!=null))return{rowIndex,headers}
  }
  return null
}

function valueAt(row:SpondRow,headers:Headers,key:HeaderKey){const index=headers[key];return index==null?'':text(row[index])}

function truthy(value:string){return ['yes','true','1','x','✓','checked'].includes(clean(value))}

export function spondAttendanceStatus(value:string):SessionAttendanceStatus|''{
  const status=clean(value)
  if(!status)return''
  if(status.includes('valid absence')||status.includes('excused')||status.includes('approved absence'))return'excused'
  if(status.includes('not attended')||status.includes('did not attend')||status.includes('absent')||status.includes('no show')||status.includes("can't go")||status.includes('cannot go')||status.includes('declined'))return'absent'
  if(status.includes('attended')||status.includes('present')||status.includes('late'))return'present'
  return''
}

function parseAttendance(rows:SpondRow[],found:NonNullable<ReturnType<typeof findHeaders>>){
  const result:SpondAttendanceRow[]=[]
  for(const row of rows.slice(found.rowIndex+1)){
    const name=valueAt(row,found.headers,'name')||[valueAt(row,found.headers,'firstName'),valueAt(row,found.headers,'lastName')].filter(Boolean).join(' ')
    const email=valueAt(row,found.headers,'email').trim().toLowerCase()
    if(!name&&!email)continue
    const statusText=valueAt(row,found.headers,'status')
    const attended=valueAt(row,found.headers,'attended')
    const validAbsence=valueAt(row,found.headers,'validAbsence')
    const late=valueAt(row,found.headers,'late')
    let status=spondAttendanceStatus(statusText)
    if(!status&&(truthy(validAbsence)||spondAttendanceStatus(validAbsence)==='excused'))status='excused'
    if(!status&&(truthy(attended)||truthy(late)||spondAttendanceStatus(attended)==='present'||spondAttendanceStatus(late)==='present'))status='present'
    if(!status&&found.headers.attended!=null&&['no','false','0'].includes(clean(attended)))status='absent'
    const sourceStatus=statusText||(truthy(validAbsence)||spondAttendanceStatus(validAbsence)==='excused'?'Valid absence':'')||(truthy(late)||spondAttendanceStatus(late)==='present'?'Late':'')||attended
    result.push({name,email,status,sourceStatus})
  }
  return result
}

function dateKey(value:Cell){
  if(value instanceof Date)return value.getFullYear()>=2000?`${value.getFullYear()}-${pad(value.getMonth()+1)}-${pad(value.getDate())}`:''
  const source=text(value).trim()
  const iso=source.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
  if(iso)return`${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`
  const british=source.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/)
  if(british)return`${british[3]}-${pad(Number(british[2]))}-${pad(Number(british[1]))}`
  const named=source.match(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(20\d{2})\b/i)
  if(named){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];return`${named[3]}-${pad(months.indexOf(named[2].slice(0,3).toLowerCase())+1)}-${pad(Number(named[1]))}`}
  return''
}

function times(value:Cell){
  if(value instanceof Date)return value.getHours()||value.getMinutes()?{startTime:`${pad(value.getHours())}:${pad(value.getMinutes())}`,endTime:''}:{startTime:'',endTime:''}
  const matches=[...text(value).matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)].map(match=>`${pad(Number(match[1]))}:${match[2]}`)
  return{startTime:matches[0]||'',endTime:matches[1]||''}
}

function labelledValue(rows:SpondRow[],labels:string[]){
  for(const row of rows.slice(0,20))for(let index=0;index<row.length;index++){
    const current=clean(text(row[index])).replace(/:$/,'')
    if(labels.includes(current))return text(row[index+1])||text(row[index]).split(':').slice(1).join(':').trim()
    const label=labels.find(item=>current.startsWith(`${item}:`))
    if(label)return text(row[index]).slice(text(row[index]).toLowerCase().indexOf(':')+1).trim()
  }
  return''
}

function metadata(rows:SpondRow[],headerRow:number,fileName:string){
  const cells=rows.slice(0,headerRow).flat().filter(value=>text(value))
  const date=cells.map(dateKey).find(Boolean)||''
  const time=cells.map(times).find(value=>value.startTime)||{startTime:'',endTime:''}
  const labelledTitle=labelledValue(rows,['event','event name','title','activity'])
  const ignored=/^(event|event name|title|activity|date|time|location|venue|attendance|participant list|attendance history)$/i
  const firstText=cells.map(text).find(value=>value&&!ignored.test(value)&&!dateKey(value)&&!times(value).startTime)||''
  const fallback=fileName.replace(/\.xlsx$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim()
  return{title:labelledTitle||firstText||fallback||'Spond event',date,startTime:time.startTime,endTime:time.endTime,venue:labelledValue(rows,['location','venue','place'])}
}

function eventType(title:string):ClubEventType{return /\b(match|game|fixture|cup|league)\b/i.test(title)?'game':'training'}

export async function parseSpondEventWorkbook(file:File):Promise<ParsedSpondEvent>{
  const{default:readXlsxFile}=await import('read-excel-file/browser')
  const workbook=await readXlsxFile(file)
  const candidates=workbook.map(sheet=>({name:sheet.sheet,rows:sheet.data as unknown as SpondRow[],headers:findHeaders(sheet.data as unknown as SpondRow[])}))
  const selected=candidates.find(candidate=>candidate.headers)
  if(!selected?.headers)throw new Error('No Spond participant table was found. Export the participant list for one event and try again.')
  const details=metadata(selected.rows,selected.headers.rowIndex,file.name)
  const attendance=parseAttendance(selected.rows,selected.headers)
  if(!attendance.length)throw new Error('The participant table does not contain any names.')
  const warnings:string[]=[]
  if(!details.date)warnings.push('The event date was not detected. Add it before continuing.')
  if(!details.startTime)warnings.push('The start time was not detected. Add it before continuing so duplicate events can be matched accurately.')
  if(!attendance.some(row=>row.status))warnings.push('No recorded attendance values were detected. RSVP-only values such as Going or Unanswered are not treated as actual attendance.')
  return{
    session:{eventType:eventType(details.title),title:details.title,date:details.date,startTime:details.startTime,endTime:details.endTime,venue:details.venue,teams:[],opponent:'',competition:'',gameLocation:'',recurrenceRule:'',recurrenceGroupId:'',notes:`Imported from Spond file ${file.name}`,attendance:{}},
    attendance,warnings,sourceSheet:selected.name,
  }
}
