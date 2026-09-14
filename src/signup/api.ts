import { httpsCallable } from 'firebase/functions'
import { signupManagerFunctions, signupPublicFunctions } from './firebase'
import type { ClubSignupOutcome, ClubSignupStatus } from './types'

export type ClubSignupInput={
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
  consent:boolean
  website:string
}

export async function submitClubSignup(input:ClubSignupInput){
  if(!signupPublicFunctions)throw new Error('The club sign-up service has not been configured.')
  const result=await httpsCallable<ClubSignupInput,{signupId:string}>(signupPublicFunctions,'submitClubSignup')(input)
  return result.data
}

export async function updateClubSignupStatus(signupId:string,status:ClubSignupStatus,statusOutcome:ClubSignupOutcome|''){
  if(!signupManagerFunctions)throw new Error('The club sign-up service has not been configured.')
  await httpsCallable<{signupId:string;status:ClubSignupStatus;statusOutcome:ClubSignupOutcome|''},{updatedAt:number}>(signupManagerFunctions,'updateClubSignupStatus')({signupId,status,statusOutcome})
}

export async function deleteClubSignup(signupId:string){
  if(!signupManagerFunctions)throw new Error('The club sign-up service has not been configured.')
  await httpsCallable<{signupId:string},{deleted:boolean}>(signupManagerFunctions,'deleteClubSignup')({signupId})
}
