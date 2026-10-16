import {httpsCallable} from 'firebase/functions'
import {signupManagerFunctions} from '../signup/firebase'
import type {MatchCentreData} from '../types'

export async function getMatchCentre(force = false) {
  if (!signupManagerFunctions) throw new Error('The Match Centre service has not been configured.')
  const result = await httpsCallable<{force:boolean}, MatchCentreData>(signupManagerFunctions, 'getMatchCentre')({force})
  return result.data
}
