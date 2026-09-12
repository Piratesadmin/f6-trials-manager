import { initializeApp } from 'firebase/app'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { firebaseApp, firebaseConfig, firebaseConfigured } from '../firebase'

const signupPublicApp=firebaseConfigured?initializeApp(firebaseConfig,'f6-signup-public'):null

export const signupPublicFunctions=signupPublicApp?getFunctions(signupPublicApp,'europe-west2'):null
export const signupManagerFunctions=firebaseApp?getFunctions(firebaseApp,'europe-west2'):null

if(import.meta.env.DEV&&import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR==='true'){
  if(signupPublicFunctions)connectFunctionsEmulator(signupPublicFunctions,'127.0.0.1',5001)
  if(signupManagerFunctions)connectFunctionsEmulator(signupManagerFunctions,'127.0.0.1',5001)
}
