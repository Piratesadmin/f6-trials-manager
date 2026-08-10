import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Check, CheckCircle2, ClipboardCheck, Copy, Download, ExternalLink, FileWarning, History, Mail, Search, Send, UserRoundCheck } from 'lucide-react'
import type { EmailSettings, Player, TeamPlans, TrialSession } from '../types'
import { PageHeader } from '../components/PageHeader'
import { effectiveEmailFields, emailCcFor, emailFor, emailQueueStatus, emailSubjectFor, emailTeamsFor, emailTypeFor, emailTypeLabel, emailValidation, latestCommunication, mailtoFor, type EmailQueueStatus } from '../utils/email'
import { deadlineStateLabel, formatDeadline, responseDeadlineDetails } from '../utils/deadline'
import { offerTeamsLabel } from '../utils/offers'
import { OfferOptionsEditor } from '../components/OfferOptionsEditor'
import { teams } from '../data/constants'

type Props = {
  players: Player[]
  playersReady: boolean
  teamAccessReady: boolean
  assignedTeams: string[]
  sessions: TrialSession[]
  settings: EmailSettings
  teamPlans: TeamPlans
  save: (player: Player) => void | Promise<void>
  markSent: (player: Player) => void | Promise<void>
  selectedId: string
  setSelectedId: (id: string) => void
  onOpen: (id: string) => void
  teamDivisions: Record<string,string>
}

const statuses: { value: 'all' | EmailQueueStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'needs-info', label: 'Needs info' },
  { value: 'ready', label: 'Ready' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'sent', label: 'Sent' },
]

const statusLabel: Record<EmailQueueStatus, string> = { 'needs-info': 'Needs info', ready: 'Ready to review', reviewed: 'Reviewed', sent: 'Sent' }

export function EmailsPage({ players, playersReady, teamAccessReady, assignedTeams, sessions, settings, teamPlans, save, markSent, selectedId, setSelectedId, onOpen, teamDivisions }: Props) {
  const queue = useMemo(() => players.filter(player => emailTypeFor(player) || latestCommunication(player)), [players])
  const deadlineFor = (player: Player) => responseDeadlineDetails(player, sessions, settings.defaultResponseDeadline)
  const [statusFilter, setStatusFilter] = useState<'all' | EmailQueueStatus>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('assigned')
  const [query, setQuery] = useState('')
  const [checked, setChecked] = useState<string[]>([])
  const configuredTeams = teams.filter(team => assignedTeams.includes(team))
  const teamScopedQueue = queue.filter(player => {
    const playerTeams = Array.from(new Set([...player.suitableTeams,...emailTeamsFor(player)]))
    if (teamFilter === 'all') return true
    if (teamFilter === 'assigned') return configuredTeams.some(team => playerTeams.includes(team))
    return playerTeams.includes(teamFilter)
  })

  const filtered = teamScopedQueue.filter(player => {
    const status = emailQueueStatus(player, settings, players, teamPlans, deadlineFor(player))
    const type = emailTypeFor(player)
    const search = `${player.name} ${player.email} ${player.interestedDivisions} ${offerTeamsLabel(player)} ${type || ''}`.toLowerCase()
    return (statusFilter === 'all' || status === statusFilter) && (typeFilter === 'all' || type === typeFilter) && search.includes(query.trim().toLowerCase())
  })

  useEffect(() => {
    if (!playersReady || !teamAccessReady) return
    if (!teamScopedQueue.some(player => player.id === selectedId)) {
      const nextId=teamScopedQueue[0]?.id||''
      if(nextId!==selectedId)setSelectedId(nextId)
    }
  }, [playersReady, teamAccessReady, teamScopedQueue, selectedId, setSelectedId])

  const selected = teamScopedQueue.find(player => player.id === selectedId) || filtered[0]
  const counts = Object.fromEntries(['needs-info','ready','reviewed','sent'].map(status => [status, teamScopedQueue.filter(player => emailQueueStatus(player, settings, players, teamPlans, deadlineFor(player)) === status).length])) as Record<EmailQueueStatus, number>
  const deadlineWarnings=teamScopedQueue.filter(player=>emailTypeFor(player)!=='rejection'&&['overdue','due-soon','approaching'].includes(deadlineFor(player).state)).length

  const toggleChecked = (id: string) => setChecked(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const changeTeamFilter = (team: string) => { setTeamFilter(team); setChecked([]) }
  const markSelectedReviewed = () => {
    queue.filter(player => checked.includes(player.id) && emailQueueStatus(player, settings, players, teamPlans, deadlineFor(player)) !== 'sent').forEach(player => save({ ...player, emailReviewStatus: 'reviewed' }))
    setChecked([])
  }
  const exportList = () => {
    const exportPlayers = checked.length ? queue.filter(player => checked.includes(player.id)) : filtered
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`
    const rows = [['Name','Email','Email type','Status','Team option(s)','Decision','Response deadline'], ...exportPlayers.map(player => [player.name,player.email,emailTypeLabel(emailTypeFor(player)),statusLabel[emailQueueStatus(player,settings,players,teamPlans,deadlineFor(player))],offerTeamsLabel(player),player.decision,deadlineFor(player).effectiveDeadline])]
    const csv = rows.map(row => row.map(escape).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'f6-email-centre.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <>
    <PageHeader title="Email centre" subtitle="Review every message, resolve missing details and keep an accurate contact history." action={<button className="secondary email-export" onClick={exportList}><Download/>Export {checked.length ? `${checked.length} selected` : 'current list'}</button>}/>

    <section className="communication-stats">
      <div className="needs-info"><FileWarning/><span>Needs information</span><b>{counts['needs-info']}</b></div>
      <div className="ready"><Mail/><span>Ready to review</span><b>{counts.ready}</b></div>
      <div className="reviewed"><ClipboardCheck/><span>Reviewed</span><b>{counts.reviewed}</b></div>
      <div className="sent"><CheckCircle2/><span>Recorded sent</span><b>{counts.sent}</b></div>
    </section>
    {deadlineWarnings>0&&<div className="email-deadline-banner"><CalendarClock/><div><b>{deadlineWarnings} response deadline{deadlineWarnings===1?' needs':'s need'} attention</b><span>Warnings begin 48 hours before the deadline calculated from when each email was recorded sent.</span></div></div>}

    {checked.length > 0 && <div className="bulk-email-bar"><b>{checked.length} selected</b><span>Mark drafts as reviewed or export a handover list.</span><button onClick={markSelectedReviewed}><UserRoundCheck/>Mark reviewed</button><button onClick={() => setChecked([])}>Clear</button></div>}

    <section className="email-centre-layout">
      <aside className="email-queue-panel">
        <div className="email-queue-tools">
          <label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search emails"/></label>
          <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} aria-label="Filter by email type"><option value="all">All types</option><option value="offer">Offers</option><option value="alternative">Alternative offers</option><option value="waiting-list">Waiting list</option><option value="rejection">Rejections</option></select>
          <select className="email-team-filter" value={teamFilter} onChange={event => changeTeamFilter(event.target.value)} aria-label="Filter emails by team"><option value="assigned">My Teams</option><option value="all">All club teams</option>{teams.map(team => <option value={team} key={team}>{team}</option>)}</select>
        </div>
        <nav className="email-status-tabs" aria-label="Email status filters">{statuses.map(status => <button key={status.value} className={statusFilter === status.value ? 'active' : ''} onClick={() => setStatusFilter(status.value)}>{status.label}{status.value !== 'all' && <span>{counts[status.value]}</span>}</button>)}</nav>
        <div className="email-queue-summary"><span>{filtered.length} message{filtered.length === 1 ? '' : 's'}</span><button onClick={() => setChecked(checked.length === filtered.length ? [] : filtered.map(player => player.id))}>{checked.length === filtered.length && filtered.length ? 'Clear all' : 'Select all'}</button></div>
        <div className="email-queue-list">
          {filtered.map(player => {
            const deadline=deadlineFor(player)
            const status = emailQueueStatus(player, settings, players, teamPlans, deadline)
            return <div className={`email-queue-item ${selected?.id === player.id ? 'selected' : ''}`} key={player.id}>
              <input type="checkbox" checked={checked.includes(player.id)} onChange={() => toggleChecked(player.id)} aria-label={`Select ${player.name}`}/>
              <button onClick={() => setSelectedId(player.id)}><div className="email-avatar">{player.name.split(' ').map(part => part[0]).join('').slice(0,2)}</div><div><b>{player.name}</b><span>{emailTypeLabel(emailTypeFor(player))} · {offerTeamsLabel(player)}</span><small className={`email-status ${status}`}>{statusLabel[status]}</small>{emailTypeFor(player)!=='rejection'&&deadline.state!=='none'&&<small className={`deadline-badge ${deadline.state}`}>{deadlineStateLabel(deadline.state)}</small>}</div></button>
            </div>
          })}
          {!filtered.length && <div className="email-centre-empty"><Mail/><b>No messages match</b><span>Try another status, type or search.</span></div>}
        </div>
      </aside>
      {selected ? <EmailReview player={selected} sessions={sessions} settings={settings} players={players} teamPlans={teamPlans} save={save} markSent={markSent} onOpen={onOpen} teamDivisions={teamDivisions}/> : <div className="email-review-empty"><Mail/><h2>No email selected</h2><p>Prepare an offer, waiting-list or rejection decision from a player profile first.</p></div>}
    </section>
  </>
}

function EmailReview({ player, sessions, settings, players, teamPlans, save, markSent, onOpen, teamDivisions }: Omit<Props,'selectedId'|'setSelectedId'|'playersReady'|'teamAccessReady'|'assignedTeams'> & { player: Player }) {
  const [copied, setCopied] = useState<'subject' | 'body' | ''>('')
  const deadline=responseDeadlineDetails(player,sessions,settings.defaultResponseDeadline)
  const status = emailQueueStatus(player, settings, players, teamPlans, deadline)
  const issues = emailValidation(player, settings, players, teamPlans, deadline)
  const blockers = issues.filter(issue => issue.level === 'blocker')
  const subject = emailSubjectFor(player, settings)
  const body = emailFor(player, settings, deadline)
  const cc = emailCcFor(player, settings)
  const fields = effectiveEmailFields(player, settings, deadline)
  const history = Object.values(player.communicationHistory || {}).sort((a,b) => b.sentAt - a.sentAt)

  const copy = async (kind: 'subject' | 'body') => {
    await navigator.clipboard.writeText(kind === 'subject' ? subject : body)
    setCopied(kind)
    window.setTimeout(() => setCopied(''), 1600)
  }
  const updateDraft = (field: keyof Player['emailDraft'], value: string) => save({ ...player, emailReviewStatus: player.emailReviewStatus === 'sent' ? 'sent' : 'draft', emailDraft: { ...player.emailDraft, [field]: value } })
  const confirmSent = () => {
    if (blockers.length || !window.confirm('This records the email as sent but does not send it. Continue only after sending from your email app.')) return
    markSent(player)
  }

  return <article className="email-review-panel">
    <header className="email-review-header"><div><span className="eyebrow">{emailTypeLabel(emailTypeFor(player)).toUpperCase()}</span><h2>{player.name}</h2><p>{player.email}</p></div><div><span className={`email-status large ${status}`}>{statusLabel[status]}</span><button className="text-button" onClick={() => onOpen(player.id)}>Open player profile</button></div></header>

    <div className="email-review-body">
      {emailTypeFor(player)!=='rejection'&&<section className={`deadline-summary ${deadline.state==='none'?'on-track':deadline.state}`}><CalendarClock/><div><b>{deadline.effectiveDeadline?deadlineStateLabel(deadline.state):'72-hour response window'}</b><span>{deadline.effectiveDeadline?`${formatDeadline(deadline.effectiveDeadline)} · calculated from when the email was recorded sent`:'The clock begins when this email is recorded as sent.'}</span></div></section>}
      {(emailTypeFor(player)==='offer'||emailTypeFor(player)==='alternative')&&<OfferOptionsEditor player={player} save={save} compact teamDivisions={teamDivisions}/>}
      <section className="email-draft-settings">
        <div className="receipt-deadline-setting"><CalendarClock/><span><b>Response timing</b><small>Players are asked to reply within 72 hours of receiving the email.</small></span></div>
        <label>Coach name<input value={player.emailDraft.coachName} placeholder={fields.coachName || 'Set a coach name'} onChange={event => updateDraft('coachName', event.target.value)}/><small>{!player.emailDraft.coachName && fields.coachName ? 'Using the signed-in or assigned team coach' : 'Signs this email'}</small></label>
        <label className="full">Optional personal message<textarea value={player.emailDraft.personalMessage} onChange={event => updateDraft('personalMessage', event.target.value)} placeholder="Add a short, player-specific paragraph if needed…"/></label>
      </section>

      {issues.length > 0 && <section className="email-checks"><div className="email-checks-title"><AlertTriangle/><div><b>Pre-send checks</b><span>{blockers.length ? `${blockers.length} item${blockers.length === 1 ? '' : 's'} must be fixed` : 'Warnings to review'}</span></div></div>{issues.map(issue => <div className={issue.level} key={issue.message}>{issue.level === 'blocker' ? <FileWarning/> : <AlertTriangle/>}<span>{issue.message}</span></div>)}</section>}

      <section className="email-message-card">
        <div className="email-field"><span>To</span><b>{player.email || 'No recipient email'}</b></div>
        <div className="email-field"><span>CC</span><b>{cc.length ? cc.join(', ') : 'No CC contacts configured'}</b></div>
        <div className="email-field subject"><span>Subject</span><b>{subject}</b><button onClick={() => copy('subject')}><Copy/>{copied === 'subject' ? 'Copied' : 'Copy'}</button></div>
        <pre>{body}</pre>
      </section>

      <div className="email-review-actions">
        <button className="secondary" onClick={() => copy('body')}><Copy/>{copied === 'body' ? 'Copied' : 'Copy body'}</button>
        <a className={`secondary ${blockers.length ? 'disabled' : ''}`} href={blockers.length ? undefined : mailtoFor(player, settings, deadline)}><ExternalLink/>Open in email app</a>
        {status !== 'sent' && <button className="review-button" disabled={Boolean(blockers.length)} onClick={() => save({ ...player, emailReviewStatus: 'reviewed' })}><Check/>Mark reviewed</button>}
        <button className="primary" disabled={Boolean(blockers.length) || status === 'sent'} onClick={confirmSent}><Send/>{status === 'sent' ? 'Sent recorded' : 'Mark as sent'}</button>
      </div>
      <p className="manual-send-note"><AlertTriangle/>“Open in email app” creates a draft. “Mark as sent” only records your completed action; this portal does not send email automatically.</p>

      <section className="communication-history"><div className="history-title"><History/><div><span className="eyebrow">COMMUNICATION HISTORY</span><h3>{history.length ? `${history.length} recorded message${history.length === 1 ? '' : 's'}` : 'No sent messages yet'}</h3></div></div>{history.map(entry => <details key={entry.id}><summary><span><b>{emailTypeLabel(entry.type)}</b><small>{new Date(entry.sentAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})} · {entry.recipient}</small></span><CheckCircle2/></summary><div><strong>{entry.subject}</strong>{entry.cc?.length?<small>CC: {entry.cc.join(', ')}</small>:null}<pre>{entry.body}</pre><small>Recorded by {entry.sentBy}</small></div></details>)}</section>
    </div>
  </article>
}
