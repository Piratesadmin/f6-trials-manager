import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { firebaseConfig, firebaseConfigured } from '../firebase'

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as string | undefined
export const welfareConfigured = firebaseConfigured && Boolean(appCheckSiteKey)

// Named clients keep public reports detached from any staff or Club Manager auth
// session while still using the same underlying Firebase project.
const welfarePublicApp = welfareConfigured ? initializeApp(firebaseConfig, 'f6-welfare-public') : null
const welfareStaffApp = welfareConfigured ? initializeApp(firebaseConfig, 'f6-welfare-staff') : null

if (appCheckSiteKey) {
  for (const app of [welfarePublicApp, welfareStaffApp]) {
    if (app) initializeAppCheck(app, {provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true})
  }
}

export const welfareAuth = welfareStaffApp ? getAuth(welfareStaffApp) : null
export const welfarePublicFunctions = welfarePublicApp
  ? getFunctions(welfarePublicApp, 'europe-west2')
  : null
export const welfareStaffFunctions = welfareStaffApp
  ? getFunctions(welfareStaffApp, 'europe-west2')
  : null

if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR === 'true') {
  if (welfarePublicFunctions) connectFunctionsEmulator(welfarePublicFunctions, '127.0.0.1', 5001)
  if (welfareStaffFunctions) connectFunctionsEmulator(welfareStaffFunctions, '127.0.0.1', 5001)
}
