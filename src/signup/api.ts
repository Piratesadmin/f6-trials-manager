import { httpsCallable } from 'firebase/functions'
import { signupManagerFunctions, signupPublicFunctions } from './firebase'
import type { ClubSignupStatus } from './types'

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
  guardianName:string
  guardianEmail:string
  guardianPhone:string
  consent:boolean
  website:string
}

export async function submitClubSignup(input:ClubSignupInput){
  if(!signupPublicFunctions)throw new Error('The club sign-up service has not been configured.')
  const result=await httpsCallable<ClubSignupInput,{signupId:string}>(signupPublicFunctions,'submitClubSignup')(input)
  return result.data
}

export async function updateClubSignupStatus(signupId:string,status:ClubSignupStatus){
  if(!signupManagerFunctions)throw new Error('The club sign-up service has not been configured.')
  await httpsCallable<{signupId:string;status:ClubSignupStatus},{updatedAt:number}>(signupManagerFunctions,'updateClubSignupStatus')({signupId,status})
}
