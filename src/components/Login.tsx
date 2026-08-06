import { useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound, Mail, Users } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, firebaseConfigured, sharedLoginEmail } from '../firebase'
import { ClubLogo } from './ClubLogo'

type LoginMode = 'pin' | 'coach'

function friendlyError(error: unknown, mode: LoginMode) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('invalid-credential') || message.includes('wrong-password') || message.includes('invalid-login-credentials') || message.includes('user-not-found')) return mode === 'pin' ? 'That PIN is incorrect. Please try again.' : 'That email address or password is incorrect.'
  if (message.includes('invalid-email')) return 'Enter a valid email address.'
  if (message.includes('too-many-requests')) return 'Too many attempts. Wait a few minutes and try again.'
  return message.replace('Firebase: ', '') || 'Unable to sign in.'
}

export function Login({ onDemo }: { onDemo: () => void }) {
  const [mode, setMode] = useState<LoginMode>('pin')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const changeMode = (next: LoginMode) => { setMode(next); setError('') }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (!auth || !firebaseConfigured) throw new Error('Firebase has not been configured yet.')
      if (mode === 'pin' && !sharedLoginEmail) throw new Error('The shared club login email has not been configured.')
      await signInWithEmailAndPassword(auth, mode === 'pin' ? sharedLoginEmail : email.trim().toLowerCase(), mode === 'pin' ? pin : password)
      setPin('')
      setPassword('')
    } catch (loginError) {
      setError(friendlyError(loginError, mode))
    } finally {
      setBusy(false)
    }
  }

  return <div className="login-page"><form className="login-card account-login-card" onSubmit={submit}>
    <ClubLogo variant="login"/><span className="login-club-name">FLAMING SIX VOLLEYBALL CLUB</span><h1>F6 Club Manager</h1><p>Use the shared club PIN or your individual club account.</p>
    <div className="login-mode-tabs" role="tablist" aria-label="Sign-in method"><button type="button" role="tab" aria-selected={mode === 'pin'} className={mode === 'pin' ? 'active' : ''} onClick={() => changeMode('pin')}><KeyRound/>Club PIN</button><button type="button" role="tab" aria-selected={mode === 'coach'} className={mode === 'coach' ? 'active' : ''} onClick={() => changeMode('coach')}><Users/>Individual login</button></div>
    {mode === 'pin' ? <label>Club PIN<input className="pin-input" type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} required autoComplete="current-password" maxLength={12} autoFocus placeholder="••••••"/></label> : <div className="coach-login-fields"><label>Email address<div className="login-input-with-icon"><Mail/><input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="username" placeholder="coach@flamingsix.co.uk" autoFocus/></div></label><label>Password<div className="login-input-with-icon"><KeyRound/><input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Your password"/></div></label></div>}
    {error && <div className="login-error">{error}</div>}
    <button className="primary login-button" disabled={busy || (mode === 'pin' ? pin.length < 4 : !email.trim() || password.length < 6)}>{busy ? 'Signing in…' : mode === 'pin' ? 'Open Club Manager' : 'Sign in to Club Manager'}</button>
    <p className="pin-help">{mode === 'pin' ? 'Use the shared PIN provided by the club committee.' : 'Coach and team-administrator accounts are created by a club administrator.'}</p>
    {!firebaseConfigured && <><div className="setup-warning">Firebase is not configured.</div><button type="button" className="demo-button" onClick={onDemo}>Open local demo</button></>}
  </form></div>
}
