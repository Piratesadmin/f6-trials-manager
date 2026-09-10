import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { ArrowLeft, CheckCircle2, Clipboard, HeartHandshake, Inbox, KeyRound, LockKeyhole, LogOut, MessageCircle, RefreshCw, Send, ShieldAlert } from 'lucide-react'
import { ClubLogo } from '../components/ClubLogo'
import { auth } from '../firebase'
import type { CoachRole } from '../types'
import { getStaffWelfareCase, getWelfareConversation, listWelfareCases, replyToWelfareCase, replyToWelfareConversation, submitWelfareCase, updateWelfareCaseStatus } from '../welfare/api'
import { welfareConfigured } from '../welfare/firebase'
import { welfareCategories, welfareCategoryLabel, type WelfareCase, type WelfareCaseSummary, type WelfareCategory, type WelfareStatus } from '../welfare/types'
import '../welfare/Welfare.css'

export type WelfareView = 'submit' | 'case' | 'inbox'

type Props = {
  view: WelfareView
  navigate: (view: WelfareView) => void
  exit: () => void
  user: User | null
  accountRole: CoachRole | null
  accountLoading: boolean
}

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('invalid-credential') || message.includes('wrong-password')) return 'That email address or password is incorrect.'
  if (message.includes('permission-denied')) return 'This account does not have access to the confidential welfare inbox.'
  if (message.includes('not-found')) return 'Those case details could not be verified.'
  if (message.includes('resource-exhausted')) return 'Please wait before trying again.'
  if (message.includes('failed-precondition')) return message.replace(/^FirebaseError:\s*/, '')
  return 'The confidential welfare service could not complete that request. Please try again.'
}

function formatDate(value: number) {
  return value ? new Date(value).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'}) : 'Just now'
}

function WelfareHeader({view, navigate, exit}: Pick<Props, 'view' | 'navigate' | 'exit'>) {
  return <header className="welfare-header">
    <button type="button" className="welfare-brand" onClick={() => navigate('submit')}><ClubLogo/><span><b>Flaming Six Welfare</b><small>Confidential channel</small></span></button>
    <nav aria-label="Welfare navigation">
      {view !== 'submit' && <button type="button" onClick={() => navigate('submit')}><ArrowLeft/>New case</button>}
      <button type="button" className={view === 'case' ? 'active' : ''} onClick={() => navigate('case')}><MessageCircle/>Open a case</button>
      <button type="button" className={view === 'inbox' ? 'active' : ''} onClick={() => navigate('inbox')}><LockKeyhole/>Welfare inbox</button>
      <button type="button" onClick={exit}>Club Manager</button>
    </nav>
  </header>
}

function SafetyNotice() {
  return <div className="welfare-safety"><ShieldAlert/><div><b>Not monitored continuously and not for emergencies</b><span>If someone is in immediate danger, call 999. For urgent safeguarding help, contact the appropriate emergency or safeguarding service directly.</span></div></div>
}

function SubmissionPage({navigate}: Pick<Props, 'navigate'>) {
  const [category, setCategory] = useState<WelfareCategory>('other')
  const [urgent, setUrgent] = useState(false)
  const [message, setMessage] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<{caseId: string; pin: string} | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      setReceipt(await submitWelfareCase({category, urgent, message}))
      setMessage('')
    } catch (submitError) {
      setError(friendlyError(submitError))
    } finally {
      setBusy(false)
    }
  }

  const copyDetails = async () => {
    if (receipt) await navigator.clipboard.writeText(`Case number: ${receipt.caseId}\nPIN: ${receipt.pin}`)
  }

  if (receipt) return <section className="welfare-success welfare-panel">
    <CheckCircle2/>
    <p className="welfare-eyebrow">Message received</p>
    <h1>Save your private access details</h1>
    <p>Your case number is <strong>{receipt.caseId}</strong>.</p>
    <div className="welfare-recovery"><span>8-digit PIN</span><code>{receipt.pin}</code></div>
    <p>This is the only time the PIN will be shown. Keep both details private; they are required to read or reply to the case.</p>
    <button type="button" className="welfare-primary" onClick={copyDetails}><Clipboard/>Copy access details</button>
    <button type="button" onClick={() => navigate('case')}>Open the conversation</button>
    <button type="button" onClick={() => setReceipt(null)}>Submit another case</button>
  </section>

  return <>
    <section className="welfare-intro">
      <p className="welfare-eyebrow">Independent confidential channel</p>
      <h1>Tell the welfare team what is happening</h1>
      <p>You do not need to sign in. The form does not ask for your name, email, player record or club account. You will receive a case number and PIN so you can return securely.</p>
    </section>
    <SafetyNotice/>
    {!welfareConfigured ? <div className="welfare-error">The confidential welfare service has not been configured yet.</div> : <form className="welfare-panel welfare-form" onSubmit={submit}>
      <div className="welfare-form-grid">
        <label>What is this about?<select value={category} onChange={event => setCategory(event.target.value as WelfareCategory)}>{welfareCategories.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
        <label className="welfare-check"><input type="checkbox" checked={urgent} onChange={event => setUrgent(event.target.checked)}/><span><b>Flag as an urgent concern</b><small>This moves the message to the top of the welfare inbox; it does not alert emergency services.</small></span></label>
      </div>
      <label>Message<textarea value={message} onChange={event => setMessage(event.target.value)} minLength={10} maxLength={5000} required rows={9} placeholder="Share only what the welfare team needs to understand and respond…"/><small>Minimum 10 characters · {message.length}/5000 characters</small></label>
      <label className="welfare-check"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} required/><span>I understand this channel is not continuously monitored and is not for emergencies.</span></label>
      <div className="welfare-privacy-note"><LockKeyhole/><span><b>What anonymous means here</b>The application does not attach a Club Manager login, name, email or player record. Message content can still identify you, and the hosting provider may retain technical security logs.</span></div>
      {error && <div className="welfare-error">{error}</div>}
      <button className="welfare-primary" disabled={busy || !acknowledged || message.trim().length < 10}>{busy ? 'Sending securely…' : 'Send to Welfare'}</button>
    </form>}
  </>
}

function ConversationPage() {
  const [caseId, setCaseId] = useState('')
  const [pin, setPin] = useState('')
  const [conversation, setConversation] = useState<WelfareCase | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async (event?: FormEvent) => {
    event?.preventDefault()
    setBusy(true); setError('')
    try { setConversation(await getWelfareConversation(caseId.trim().toUpperCase(), pin)) }
    catch (loadError) { setConversation(null); setError(friendlyError(loadError)) }
    finally { setBusy(false) }
  }
  const sendReply = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await replyToWelfareConversation(caseId.trim().toUpperCase(), pin, reply); setReply(''); await load() }
    catch (replyError) { setError(friendlyError(replyError)); setBusy(false) }
  }

  return <section className="welfare-panel welfare-conversation">
    <p className="welfare-eyebrow">Anonymous conversation</p><h1>Return to your case</h1>
    {!conversation ? <form className="welfare-access-form" onSubmit={load}>
      <label>Case number<input value={caseId} onChange={event => setCaseId(event.target.value)} required autoComplete="off" placeholder="WEL-…"/></label>
      <label>8-digit PIN<input value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))} required type="password" inputMode="numeric" pattern="[0-9]{8}" autoComplete="off" placeholder="••••••••"/></label>
      {error && <div className="welfare-error">{error}</div>}
      <button className="welfare-primary" disabled={busy || pin.length !== 8}>{busy ? 'Checking…' : 'Open conversation'}</button>
    </form> : <>
      <div className="welfare-case-heading"><span><b>{conversation.id}</b><small>{welfareCategoryLabel(conversation.category)} · {conversation.status}</small></span><button type="button" onClick={() => load()} disabled={busy}><RefreshCw/>Refresh</button></div>
      <MessageThread messages={conversation.messages}/>
      {conversation.status === 'closed' ? <div className="welfare-info">This case has been closed by the welfare team. Start a new case if you need to raise something else.</div> : <form className="welfare-reply" onSubmit={sendReply}><label>Reply<textarea value={reply} onChange={event => setReply(event.target.value)} minLength={2} maxLength={5000} required rows={4}/></label>{error && <div className="welfare-error">{error}</div>}<button className="welfare-primary" disabled={busy || reply.trim().length < 2}><Send/>Send reply</button></form>}
    </>}
  </section>
}

function MessageThread({messages}: Pick<WelfareCase, 'messages'>) {
  return <div className="welfare-thread">{messages.map(message => <article key={message.id} className={message.sender === 'welfare' ? 'staff' : 'reporter'}><header><b>{message.sender === 'welfare' ? 'Welfare team' : 'Anonymous reporter'}</b><time>{formatDate(message.createdAt)}</time></header><p>{message.text}</p></article>)}</div>
}

function StaffInbox({user, accountRole, accountLoading}: Pick<Props, 'user' | 'accountRole' | 'accountLoading'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cases, setCases] = useState<WelfareCaseSummary[]>([])
  const [selected, setSelected] = useState<WelfareCase | null>(null)
  const [status, setStatus] = useState<WelfareStatus | 'all'>('all')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const authorised = accountRole === 'welfare'

  const refresh = useCallback(async () => {
    setBusy(true); setError('')
    try { setCases(await listWelfareCases()) }
    catch (loadError) { setError(friendlyError(loadError)) }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { if (authorised) void refresh() }, [authorised, refresh])

  const login = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (!auth) throw new Error('not configured')
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
      setPassword('')
    } catch (loginError) { setError(friendlyError(loginError)) }
    finally { setBusy(false) }
  }
  const openCase = async (id: string) => {
    setBusy(true); setError('')
    try { setSelected(await getStaffWelfareCase(id)) }
    catch (openError) { setError(friendlyError(openError)) }
    finally { setBusy(false) }
  }
  const sendReply = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return
    setBusy(true); setError('')
    try { await replyToWelfareCase(selected.id, reply); setReply(''); await openCase(selected.id); await refresh() }
    catch (replyError) { setError(friendlyError(replyError)); setBusy(false) }
  }
  const changeStatus = async (next: WelfareStatus) => {
    if (!selected) return
    setBusy(true); setError('')
    try { await updateWelfareCaseStatus(selected.id, next); await openCase(selected.id); await refresh() }
    catch (statusError) { setError(friendlyError(statusError)); setBusy(false) }
  }
  const visibleCases = useMemo(() => cases.filter(item => status === 'all' || item.status === status), [cases, status])

  if (!welfareConfigured) return <div className="welfare-error">The Welfare functions have not been configured.</div>
  if (accountLoading) return <div className="welfare-panel">Verifying welfare access…</div>
  if (!user) return <section className="welfare-panel welfare-staff-login"><Inbox/><p className="welfare-eyebrow">Restricted access</p><h1>Welfare inbox</h1><p>Sign in with an existing account that has the Welfare role.</p><form onSubmit={login}><label>Email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="username"/></label><label>Password<input type="password" required value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password"/></label>{error && <div className="welfare-error">{error}</div>}<button className="welfare-primary" disabled={busy}><KeyRound/>Sign in</button></form></section>
  if (!authorised) return <section className="welfare-panel welfare-denied"><ShieldAlert/><h1>Access denied</h1><p>This signed-in account does not have the Welfare role.</p><button type="button" onClick={() => auth && signOut(auth)}><LogOut/>Sign out</button></section>

  return <section className="welfare-inbox">
    <div className="welfare-inbox-toolbar"><div><p className="welfare-eyebrow">Restricted access</p><h1>Welfare inbox</h1></div><div><button type="button" onClick={refresh} disabled={busy}><RefreshCw/>Refresh</button><button type="button" onClick={() => auth && signOut(auth)}><LogOut/>Sign out</button></div></div>
    {error && <div className="welfare-error">{error}</div>}
    <div className="welfare-inbox-layout">
      <aside className="welfare-case-list"><select aria-label="Filter cases by status" value={status} onChange={event => setStatus(event.target.value as WelfareStatus | 'all')}><option value="all">All cases</option><option value="new">New</option><option value="open">Open</option><option value="closed">Closed</option></select>{visibleCases.length ? visibleCases.map(item => <button type="button" key={item.id} className={selected?.id === item.id ? 'active' : ''} onClick={() => openCase(item.id)}><span><b>{item.urgent && 'Urgent · '}{welfareCategoryLabel(item.category)}</b><small>{item.id} · {formatDate(item.updatedAt)}</small></span>{item.unreadForStaff && <i>New</i>}<p>{item.latestPreview}</p></button>) : <p className="welfare-empty">No cases match this filter.</p>}</aside>
      <div className="welfare-case-detail">{selected ? <><div className="welfare-case-heading"><span><b>{selected.urgent && 'Urgent · '}{welfareCategoryLabel(selected.category)}</b><small>{selected.id} · Anonymous conversation</small></span><select value={selected.status} onChange={event => changeStatus(event.target.value as WelfareStatus)} disabled={busy}><option value="new">New</option><option value="open">Open</option><option value="closed">Closed</option></select></div><MessageThread messages={selected.messages}/>{selected.status !== 'closed' && <form className="welfare-reply" onSubmit={sendReply}><label>Reply as Welfare<textarea value={reply} onChange={event => setReply(event.target.value)} minLength={2} maxLength={5000} required rows={4}/></label><button className="welfare-primary" disabled={busy || reply.trim().length < 2}><Send/>Send reply</button></form>}</> : <div className="welfare-empty-detail"><HeartHandshake/><h2>Select a case</h2><p>Case contents are only fetched after you select one.</p></div>}</div>
    </div>
  </section>
}

export function WelfarePage(props: Props) {
  return <div className="welfare-app"><WelfareHeader {...props}/><main>{props.view === 'submit' && <SubmissionPage navigate={props.navigate}/>} {props.view === 'case' && <ConversationPage/>} {props.view === 'inbox' && <StaffInbox user={props.user} accountRole={props.accountRole} accountLoading={props.accountLoading}/>}</main><footer>Flaming Six confidential welfare channel · Anonymous reports are kept separate from Club Manager records.</footer></div>
}
