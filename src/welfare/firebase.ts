import { initializeApp } from 'firebase/app'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { firebaseApp, firebaseConfig, firebaseConfigured } from '../firebase'

export const welfareConfigured = firebaseConfigured

// The named public client has no Auth instance, so an existing Club Manager
// identity is never attached to an anonymous report or case lookup.
const welfarePublicApp = welfareConfigured ? initializeApp(firebaseConfig, 'f6-welfare-public') : null
export const welfarePublicFunctions = welfarePublicApp
  ? getFunctions(welfarePublicApp, 'europe-west2')
  : null
export const welfareStaffFunctions = firebaseApp
  ? getFunctions(firebaseApp, 'europe-west2')
  : null

if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR === 'true') {
  if (welfarePublicFunctions) connectFunctionsEmulator(welfarePublicFunctions, '127.0.0.1', 5001)
  if (welfareStaffFunctions) connectFunctionsEmulator(welfareStaffFunctions, '127.0.0.1', 5001)
}
