export type ClubSignupStatus = 'new' | 'contacted' | 'closed'

export type ClubSignup = {
  id:string
  status:ClubSignupStatus
  name:string
  email:string
  phone:string
  profilePhoto:string
  dateOfBirth:string
  playingCategory:string
  interestedDivisions:string[]
  primaryPosition:string
  secondaryPosition:string
  playingExperience:string
  highestLevelPlayed:string
  currentClub:string
  availability:string
  heardAboutUs:string
  notes:string
  guardianName:string
  guardianEmail:string
  guardianPhone:string
  createdAt:number
  updatedAt:number
  handledBy?:string
}

export const clubSignupStatuses:ClubSignupStatus[]=['new','contacted','closed']

export function normaliseClubSignup(id:string,value:unknown):ClubSignup|null{
  if(!value||typeof value!=='object'||Array.isArray(value))return null
  const incoming=value as Partial<ClubSignup>
  if(typeof incoming.name!=='string'||typeof incoming.email!=='string')return null
  const string=(field:keyof ClubSignup)=>typeof incoming[field]==='string'?incoming[field] as string:''
  return{
    id,
    status:clubSignupStatuses.includes(incoming.status as ClubSignupStatus)?incoming.status as ClubSignupStatus:'new',
    name:incoming.name,
    email:incoming.email,
    phone:string('phone'),
    profilePhoto:string('profilePhoto'),
    dateOfBirth:string('dateOfBirth'),
    playingCategory:string('playingCategory'),
    interestedDivisions:Array.isArray(incoming.interestedDivisions)?incoming.interestedDivisions.filter((value):value is string=>typeof value==='string'):typeof (incoming as ClubSignup&{interestedLevel?:unknown}).interestedLevel==='string'?[(incoming as ClubSignup&{interestedLevel:string}).interestedLevel]:[],
    primaryPosition:string('primaryPosition'),
    secondaryPosition:string('secondaryPosition'),
    playingExperience:string('playingExperience'),
    highestLevelPlayed:string('highestLevelPlayed'),
    currentClub:string('currentClub'),
    availability:string('availability'),
    heardAboutUs:string('heardAboutUs'),
    notes:string('notes'),
    guardianName:string('guardianName'),
    guardianEmail:string('guardianEmail'),
    guardianPhone:string('guardianPhone'),
    createdAt:typeof incoming.createdAt==='number'?incoming.createdAt:0,
    updatedAt:typeof incoming.updatedAt==='number'?incoming.updatedAt:0,
    ...(typeof incoming.handledBy==='string'?{handledBy:incoming.handledBy}:{}),
  }
}

export function clubSignupStatusLabel(status:ClubSignupStatus){
  return status==='new'?'New':status==='contacted'?'Contacted':'Closed'
}
