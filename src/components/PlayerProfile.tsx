import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, CheckCircle2, ClipboardList, Copy, Mail, Star, UserRound } from 'lucide-react'
import type { AssessmentKey, Decision, Player, PlayerTab, Recommendation } from '../types'
import { positions, reasons, recommendations, teams } from '../data/constants'
import { assessmentCompletion, assessmentFields, averageRating } from '../utils/player'
import { emailFor } from '../utils/email'
import { StarRating } from './StarRating'

type Props = {
  player: Player
  activeTab: PlayerTab
  setActiveTab: (tab: PlayerTab) => void
  save: (player: Player) => void
}

const tabs: { key: PlayerTab; label: string; icon: typeof UserRound }[] = [
  { key: 'overview', label: 'Overview', icon: UserRound },
  { key: 'assessment', label: 'Assessment', icon: Star },
  { key: 'decision', label: 'Decision', icon: ClipboardList },
  { key: 'email', label: 'Email', icon: Mail },
]

const recommendationClass = (recommendation: Recommendation) => recommendation ? `recommendation-${recommendation.toLowerCase().replaceAll(' ', '-')}` : 'recommendation-none'

export function PlayerProfile({ player, activeTab, setActiveTab, save }: Props) {
  const average = averageRating(player)
  const completion = assessmentCompletion(player)
  const initials = player.name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2)

  const updateRating = (key: AssessmentKey, score: number) => {
    save({ ...player, assessment: { ...player.assessment, [key]: score } })
  }

  const toggleTeam = (team: string) => {
    const selected = player.suitableTeams.includes(team)
    save({ ...player, suitableTeams: selected ? player.suitableTeams.filter(item => item !== team) : [...player.suitableTeams, team] })
  }

  return <article className="player-profile">
    <header className="profile-hero">
      <div className="profile-identity">
        <div className="avatar profile-avatar">{initials}</div>
        <div>
          <div className="profile-title-row"><h2>{player.name}</h2>{player.bibNumber && <span className="bib-badge">#{player.bibNumber}</span>}</div>
          <p>{player.position} · {player.appliedTeam} applicant</p>
          <span className={`recommendation-badge ${recommendationClass(player.recommendation)}`}>{player.recommendation || 'No recommendation yet'}</span>
        </div>
      </div>
      <div className="profile-score" aria-label={average ? `Average rating ${average.toFixed(1)} out of 5` : 'Not yet rated'}>
        <div><Star/><strong>{average ? average.toFixed(1) : '—'}</strong><span>/ 5</span></div>
        <p>{completion}% assessed</p>
      </div>
    </header>

    <nav className="profile-tabs" aria-label="Player profile sections">
      {tabs.map(({ key, label, icon: Icon }) => <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}><Icon/>{label}</button>)}
    </nav>

    <div className="profile-content">
      {activeTab === 'overview' && <Overview player={player} save={save}/>} 
      {activeTab === 'assessment' && <Assessment player={player} save={save} updateRating={updateRating} toggleTeam={toggleTeam}/>} 
      {activeTab === 'decision' && <DecisionPanel player={player} save={save}/>} 
      {activeTab === 'email' && <EmailPanel player={player} save={save}/>} 
    </div>
  </article>
}

function Overview({ player, save }: Pick<Props, 'player' | 'save'>) {
  return <div className="profile-section">
    <div className="section-heading"><div><span className="eyebrow">PLAYER DETAILS</span><h3>Trial overview</h3><p>Keep identification and attendance details together.</p></div></div>
    <div className="form-card profile-form-grid">
      <label>Full name<input value={player.name} onChange={event => save({ ...player, name: event.target.value })}/></label>
      <label>Email address<input type="email" value={player.email} onChange={event => save({ ...player, email: event.target.value })}/></label>
      <label>Trial / bib number<input inputMode="numeric" value={player.bibNumber} onChange={event => save({ ...player, bibNumber: event.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12) })} placeholder="e.g. 17"/></label>
      <label>Trial date or session<input value={player.trialDate} onChange={event => save({ ...player, trialDate: event.target.value })}/></label>
      <label>Applied team<select value={player.appliedTeam} onChange={event => save({ ...player, appliedTeam: event.target.value })}>{['Unassigned', ...teams].map(team => <option key={team}>{team}</option>)}</select></label>
      <label>Primary position<select value={player.position} onChange={event => save({ ...player, position: event.target.value })}>{['Unassigned', ...positions].map(position => <option key={position}>{position}</option>)}</select></label>
      <label className="attendance-field">Attendance<div className="segmented-control"><button type="button" className={player.attended ? 'active' : ''} onClick={() => save({ ...player, attended: true })}><Check/> Attended</button><button type="button" className={!player.attended ? 'active' : ''} onClick={() => save({ ...player, attended: false })}>Not attended</button></div></label>
      <label className="full-width">Coach notes<textarea value={player.notes} onChange={event => save({ ...player, notes: event.target.value })} placeholder="General notes that do not fit the assessment categories…"/></label>
    </div>
  </div>
}

function Assessment({ player, save, updateRating, toggleTeam }: Pick<Props, 'player' | 'save'> & { updateRating: (key: AssessmentKey, value: number) => void; toggleTeam: (team: string) => void }) {
  const average = averageRating(player)
  const completion = assessmentCompletion(player)

  return <div className="profile-section">
    <div className="assessment-summary">
      <div><span className="eyebrow">SHARED ASSESSMENT</span><h3>{average ? `${average.toFixed(1)} average rating` : 'Not assessed yet'}</h3><p>One shared assessment, updated live for every coach.</p></div>
      <div className="completion-ring" style={{ '--completion': `${completion * 3.6}deg` } as CSSProperties}><span>{completion}%</span></div>
    </div>

    <div className="ratings-grid">
      {assessmentFields.map(({ key, label, hint }) => <div className="rating-row" key={key}><div><b>{label}</b><span>{hint}</span></div><StarRating label={label} value={player.assessment[key]} onChange={value => updateRating(key, value)}/><strong>{player.assessment[key] || '—'}</strong></div>)}
    </div>

    <div className="assessment-card">
      <div className="section-heading"><div><span className="eyebrow">RECOMMENDATION</span><h3>Coach recommendation</h3><p>This guides discussion without changing the final decision.</p></div></div>
      <div className="recommendation-options">
        {recommendations.map(recommendation => <button type="button" key={recommendation} className={`${recommendationClass(recommendation)} ${player.recommendation === recommendation ? 'selected' : ''}`} onClick={() => save({ ...player, recommendation: player.recommendation === recommendation ? '' : recommendation })}><span></span>{recommendation}{player.recommendation === recommendation && <Check/>}</button>)}
      </div>
    </div>

    <div className="assessment-card">
      <div className="section-heading"><div><span className="eyebrow">TEAM FIT</span><h3>Suitable teams</h3><p>Select every team that could be a realistic fit.</p></div></div>
      <div className="team-options">{teams.map(team => <button type="button" key={team} className={player.suitableTeams.includes(team) ? 'selected' : ''} onClick={() => toggleTeam(team)}>{player.suitableTeams.includes(team) && <Check/>}{team}</button>)}</div>
    </div>

    <div className="notes-grid">
      <label><span>Strengths</span><small>What stood out positively?</small><textarea value={player.strengths} onChange={event => save({ ...player, strengths: event.target.value })} placeholder="e.g. Reliable serve receive, vocal communicator…"/></label>
      <label><span>Development areas</span><small>What should they work on?</small><textarea value={player.developmentAreas} onChange={event => save({ ...player, developmentAreas: event.target.value })} placeholder="e.g. Blocking timing, transition speed…"/></label>
    </div>
  </div>
}

function DecisionPanel({ player, save }: Pick<Props, 'player' | 'save'>) {
  return <div className="profile-section">
    <div className="section-heading"><div><span className="eyebrow">FINAL OUTCOME</span><h3>Decision workflow</h3><p>Set the confirmed outcome before preparing an email.</p></div></div>
    <div className="form-card profile-form-grid">
      <label className="full-width">Decision<select value={player.decision} onChange={event => save({ ...player, decision: event.target.value as Decision })}>{['Awaiting decision','Offer planned','Alternative offer','Rejection planned','Offer sent','Rejection sent'].map(decision => <option key={decision}>{decision}</option>)}</select></label>
      {(player.decision.includes('Offer') || player.decision === 'Alternative offer') && <>
        <label>Offered team<select value={player.offeredTeam || player.appliedTeam} onChange={event => save({ ...player, offeredTeam: event.target.value })}>{teams.map(team => <option key={team}>{team}</option>)}</select></label>
        <label>Offered position<select value={player.offeredPosition || player.position} onChange={event => save({ ...player, offeredPosition: event.target.value })}>{positions.map(position => <option key={position}>{position}</option>)}</select></label>
      </>}
      {player.decision.includes('Rejection') && <label className="full-width">Rejection reason<select value={player.rejectionReason || reasons[0]} onChange={event => save({ ...player, rejectionReason: event.target.value })}>{reasons.map(reason => <option key={reason}>{reason}</option>)}</select></label>}
    </div>
    <div className="decision-callout"><ClipboardList/><div><b>Recommendation and decision are separate</b><p>The assessment recommendation records the coaches’ view. This decision controls the email wording and sent status.</p></div></div>
  </div>
}

function EmailPanel({ player, save }: Pick<Props, 'player' | 'save'>) {
  const [copied, setCopied] = useState(false)
  const emailReady = player.decision !== 'Awaiting decision'
  const draft = emailFor(player)
  const isRejection = player.decision.includes('Rejection')
  const subject = isRejection ? 'Flaming Six Volleyball Club Trials' : 'Flaming Six Volleyball Club – Team Offer'

  const copy = async () => {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (!emailReady) return <div className="email-empty"><Mail/><h3>Choose a decision first</h3><p>Set an offer, alternative offer, or rejection in the Decision tab to prepare the correct email.</p></div>

  return <div className="profile-section">
    <div className="section-heading"><div><span className="eyebrow">EMAIL PREVIEW</span><h3>{subject}</h3><p>Review the wording before copying or marking it as sent.</p></div><span className={`pill ${player.decision.toLowerCase().replaceAll(' ', '-')}`}>{player.decision}</span></div>
    <div className="profile-email-card"><pre>{draft}</pre></div>
    <div className="email-actions"><button className="secondary" onClick={copy}>{copied ? <CheckCircle2/> : <Copy/>}{copied ? 'Copied' : 'Copy email'}</button><button className="primary" onClick={() => save({ ...player, decision: isRejection ? 'Rejection sent' : 'Offer sent' })}><CheckCircle2/>Mark email as sent</button></div>
  </div>
}
