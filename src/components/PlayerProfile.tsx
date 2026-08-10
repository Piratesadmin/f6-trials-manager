import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CalendarClock, Camera, Check, CheckCircle2, ClipboardList, Copy, CreditCard, ExternalLink, LoaderCircle, Mail, Star, Trash2, UserRound } from 'lucide-react'
import type { AssessmentKey, Decision, EmailSettings, Player, PlayerTab, Recommendation, TeamPlans, TrialResponseStatus, TrialSession } from '../types'
import { positions, reasons, recommendations, teams } from '../data/constants'
import { assessmentCompletion, assessmentFields, averageRating } from '../utils/player'
import { emailFor, emailQueueStatus, emailSubjectFor, emailTypeFor, emailValidation, mailtoFor } from '../utils/email'
import { StarRating } from './StarRating'
import { formatSessionDate, trialDateLabel } from '../utils/schedule'
import { deadlineStateLabel, formatDeadline, responseDeadlineDetails } from '../utils/deadline'
import { primaryOffer } from '../utils/offers'
import { OfferOptionsEditor } from './OfferOptionsEditor'

type Props = {
  player: Player
  sessions: TrialSession[]
  activeTab: PlayerTab
  setActiveTab: (tab: PlayerTab) => void
  save: (player: Player) => void
  players: Player[]
  emailSettings: EmailSettings
  teamPlans: TeamPlans
  markSent: (player: Player) => void | Promise<void>
  starred: boolean
  toggleStar: () => void | Promise<void>
  photo: string
  uploadPhoto: (player: Player, file: File) => Promise<void>
  removePhoto: (player: Player) => Promise<void>
}

const tabs: { key: PlayerTab; label: string; icon: typeof UserRound }[] = [
  { key: 'overview', label: 'Overview', icon: UserRound },
  { key: 'assessment', label: 'Assessment', icon: Star },
  { key: 'decision', label: 'Decision', icon: ClipboardList },
  { key: 'email', label: 'Email', icon: Mail },
]

const recommendationClass = (recommendation: Recommendation) => recommendation ? `recommendation-${recommendation.toLowerCase().replaceAll(' ', '-')}` : 'recommendation-none'

export function PlayerProfile({ player, players, sessions, activeTab, setActiveTab, save, emailSettings, teamPlans, markSent, starred, toggleStar, photo, uploadPhoto, removePhoto }: Props) {
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
        <div className={`avatar profile-avatar ${photo?'has-photo':''}`}>{photo?<img src={photo} alt={`${player.name} profile`}/>:initials}</div>
        <div>
          <div className="profile-title-row"><h2>{player.name}</h2>{player.bibNumber && <span className="bib-badge">#{player.bibNumber}</span>}</div>
          <p>{player.position} · {player.appliedTeam} applicant</p>
          <span className={`recommendation-badge ${recommendationClass(player.recommendation)}`}>{player.recommendation || 'No recommendation yet'}</span>
        </div>
      </div>
      <div className="profile-hero-actions"><button className={`profile-star ${starred?'starred':''}`} onClick={toggleStar} aria-label={starred?'Remove from my starred players':'Add to my starred players'} title={starred?'Remove from my starred players':'Add to my starred players'}><Star/></button><div className="profile-score" aria-label={average ? `Average rating ${average.toFixed(1)} out of 5` : 'Not yet rated'}>
        <div><Star/><strong>{average ? average.toFixed(1) : '—'}</strong><span>/ 5</span></div>
        <p>{completion}% assessed</p>
      </div></div>
    </header>

    <nav className="profile-tabs" aria-label="Player profile sections">
      {tabs.map(({ key, label, icon: Icon }) => <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}><Icon/>{label}</button>)}
    </nav>

    <div className="profile-content">
      {activeTab === 'overview' && <Overview player={player} sessions={sessions} save={save} photo={photo} uploadPhoto={uploadPhoto} removePhoto={removePhoto}/>} 
      {activeTab === 'assessment' && <Assessment player={player} save={save} updateRating={updateRating} toggleTeam={toggleTeam}/>} 
      {activeTab === 'decision' && <DecisionPanel player={player} save={save}/>} 
      {activeTab === 'email' && <EmailPanel player={player} players={players} sessions={sessions} emailSettings={emailSettings} teamPlans={teamPlans} markSent={markSent}/>} 
    </div>
  </article>
}

function Overview({ player, sessions, save, photo, uploadPhoto, removePhoto }: Pick<Props, 'player' | 'sessions' | 'save' | 'photo' | 'uploadPhoto' | 'removePhoto'>) {
  const photoInput=useRef<HTMLInputElement>(null)
  const [photoBusy,setPhotoBusy]=useState(false)
  const [photoError,setPhotoError]=useState('')
  const choosePhoto=async(file?:File)=>{
    if(!file)return
    setPhotoBusy(true);setPhotoError('')
    try{await uploadPhoto(player,file)}catch(error){setPhotoError(error instanceof Error?error.message:'The photo could not be uploaded.')}finally{setPhotoBusy(false);if(photoInput.current)photoInput.current.value=''}
  }
  const remove=async()=>{
    if(!window.confirm('Remove this player photo? The uploaded image will be deleted.'))return
    setPhotoBusy(true);setPhotoError('')
    try{await removePhoto(player)}catch(error){setPhotoError(error instanceof Error?error.message:'The photo could not be removed.')}finally{setPhotoBusy(false)}
  }
  const changeSession=(sessionId:string)=>{
    const session=sessions.find(item=>item.id===sessionId)
    const changed=sessionId!==player.trialSessionId
    save({...player,trialSessionId:sessionId,trialDate:session?trialDateLabel(session.date):'Not assigned',trialResponseStatus:session?(player.trialResponseStatus==='Not answered'?'Not answered':'Going'):'',paid:changed?false:player.paid,attended:changed?false:player.attended})
  }
  const changeResponse=(status:TrialResponseStatus)=>{
    if(status==="Can't go")save({...player,trialResponseStatus:status,trialSessionId:'',trialDate:'Not assigned',paid:false,attended:false})
    else save({...player,trialResponseStatus:status})
  }
  return <div className="profile-section">
    <div className="section-heading"><div><span className="eyebrow">PLAYER DETAILS</span><h3>Trial overview</h3><p>Playing information only—phone numbers and home addresses are not stored.</p></div></div>
    <div className="player-photo-card"><div className={`player-photo-preview ${photo?'has-photo':''}`}>{photo?<img src={photo} alt={`${player.name} profile`}/>:<UserRound/>}</div><div><b>Player photo</b><span>Optional. Only a small resized thumbnail is stored; the original file is not retained.</span>{photoError&&<small>{photoError}</small>}</div><input ref={photoInput} hidden type="file" accept="image/*" onChange={event=>choosePhoto(event.target.files?.[0])}/><button className="secondary" disabled={photoBusy} onClick={()=>photoInput.current?.click()}>{photoBusy?<LoaderCircle className="spin"/>:<Camera/>}{photo?'Change photo':'Add photo'}</button>{photo&&<button className="photo-remove" disabled={photoBusy} onClick={remove} aria-label={`Remove ${player.name} photo`}><Trash2/></button>}</div>
    <div className="form-card profile-form-grid">
      <label>Full name<input value={player.name} onChange={event => save({ ...player, name: event.target.value })}/></label>
      <label>Email address<input type="email" value={player.email} onChange={event => save({ ...player, email: event.target.value })}/></label>
      <label>Date of birth<input value={player.dateOfBirth} onChange={event => save({ ...player, dateOfBirth: event.target.value })} placeholder="e.g. 14/03/2002"/></label>
      <label>Interested division(s)<input value={player.interestedDivisions} onChange={event => save({ ...player, interestedDivisions: event.target.value })} placeholder="As entered on the registration form"/></label>
      <label>Trial / bib number<input inputMode="numeric" value={player.bibNumber} onChange={event => save({ ...player, bibNumber: event.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12) })} placeholder="e.g. 17"/></label>
      <label>Trial session<select value={player.trialSessionId} onChange={event=>changeSession(event.target.value)}><option value="">Not assigned</option>{[...sessions].filter(session=>session.eventType==='trial').sort((a,b)=>a.date.localeCompare(b.date)).map(session=><option key={session.id} value={session.id}>{formatSessionDate(session.date)} · {session.title}</option>)}</select>{!player.trialSessionId&&player.trialDate&&player.trialDate!=='Not assigned'&&<small>Previous date: {player.trialDate}</small>}</label>
      <label>Trial response<select value={player.trialResponseStatus} onChange={event=>changeResponse(event.target.value as TrialResponseStatus)}><option value="">No response recorded</option><option value="Going">Going</option><option value="Not answered">Not answered</option><option value="Can't go">Can’t go</option></select></label>
      <label>Applied team<select value={player.appliedTeam} onChange={event => save({ ...player, appliedTeam: event.target.value })}>{['Unassigned', ...teams].map(team => <option key={team}>{team}</option>)}</select></label>
      <label>Primary position<select value={player.position} onChange={event => save({ ...player, position: event.target.value })}>{['Unassigned', ...positions].map(position => <option key={position}>{position}</option>)}</select></label>
      <label>Second position<select value={player.secondaryPosition} onChange={event => save({ ...player, secondaryPosition: event.target.value })}>{['', ...positions].map(position => <option key={position||'none'} value={position}>{position||'None specified'}</option>)}</select></label>
      <label>Highest level played<input value={player.highestLevelPlayed} onChange={event => save({ ...player, highestLevelPlayed: event.target.value })} placeholder="England or international level"/></label>
      <label className="attendance-field">Payment<div className="segmented-control"><button type="button" className={player.paid ? 'active' : ''} onClick={() => save({ ...player, paid: true })}><CreditCard/> Paid</button><button type="button" className={!player.paid ? 'active' : ''} onClick={() => save({ ...player, paid: false })}>Not paid</button></div></label>
      <label className="attendance-field">Attendance<div className="segmented-control"><button type="button" className={player.attended ? 'active' : ''} onClick={() => save({ ...player, attended: true })}><Check/> Attended</button><button type="button" className={!player.attended ? 'active' : ''} onClick={() => save({ ...player, attended: false })}>Not attended</button></div></label>
      <label className="full-width">Past playing experience<textarea value={player.playingExperience} onChange={event => save({ ...player, playingExperience: event.target.value })} placeholder="Previous clubs, leagues, years played and relevant experience…"/></label>
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
      <label className="full-width">Decision<select value={player.decision} onChange={event => save({ ...player, decision: event.target.value as Decision, emailReviewStatus: event.target.value.endsWith('sent') || event.target.value === 'Offer accepted' ? 'sent' : 'draft' })}>{['Awaiting decision','Offer planned','Alternative offer','Waiting list planned','Rejection planned','Offer sent','Offer accepted','Waiting list sent','Rejection sent'].map(decision => <option key={decision}>{decision}</option>)}</select></label>
      {player.decision.includes('Rejection') && <label className="full-width">Rejection reason<select value={player.rejectionReason || reasons[0]} onChange={event => save({ ...player, rejectionReason: event.target.value })}>{reasons.map(reason => <option key={reason}>{reason}</option>)}</select></label>}
    </div>
    {(player.decision.includes('Offer') || player.decision === 'Alternative offer')&&<OfferOptionsEditor player={player} save={save}/>} 
    {player.decision === 'Offer accepted' && <div className="decision-callout accepted"><CheckCircle2/><div><b>Confirmed squad place</b><p>{player.name} now appears in the confirmed squad for {player.offeredTeam || player.appliedTeam}{primaryOffer(player)?` as ${primaryOffer(player)!.position} · ${primaryOffer(player)!.squadRole}`:''}. Administrators can manage season fees in Finance.</p></div></div>}
    <div className="decision-callout"><ClipboardList/><div><b>Recommendation and decision are separate</b><p>The assessment recommendation records the coaches’ view. This decision controls the email wording and confirmed-squad status.</p></div></div>
  </div>
}

function EmailPanel({ player, players, sessions, emailSettings, teamPlans, markSent }: Pick<Props, 'player' | 'players' | 'sessions' | 'emailSettings' | 'teamPlans' | 'markSent'>) {
  const [copied, setCopied] = useState(false)
  const emailReady = Boolean(emailTypeFor(player))
  const deadline=responseDeadlineDetails(player,sessions,emailSettings.defaultResponseDeadline)
  const draft = emailFor(player, emailSettings, deadline)
  const subject = emailSubjectFor(player, emailSettings)
  const blockers = emailValidation(player, emailSettings, players, teamPlans, deadline).filter(issue => issue.level === 'blocker')
  const status = emailQueueStatus(player, emailSettings, players, teamPlans, deadline)

  const copy = async () => {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (!emailReady) return <div className="email-empty"><Mail/><h3>{player.decision === 'Offer accepted' ? 'Offer accepted' : 'Choose an email decision first'}</h3><p>{player.decision === 'Offer accepted' ? 'This player is already in the confirmed squad. Their original sent offer remains in communication history.' : 'Set an offer, waiting-list or rejection decision in the Decision tab to prepare the correct email.'}</p></div>

  return <div className="profile-section">
    <div className="section-heading"><div><span className="eyebrow">EMAIL PREVIEW</span><h3>{subject}</h3><p>Use the Email Centre for editing, checks and full communication history.</p></div><span className={`pill ${player.decision.toLowerCase().replaceAll(' ', '-')}`}>{player.decision}</span></div>
    {emailTypeFor(player)!=='rejection'&&deadline.effectiveDeadline&&<div className={`profile-deadline ${deadline.state}`}><CalendarClock/><div><b>{deadlineStateLabel(deadline.state)}</b><span>{formatDeadline(deadline.effectiveDeadline)}{deadline.source==='schedule'?' · calculated from the trial session':''}</span></div></div>}
    {blockers.length > 0 && <div className="profile-email-warning">{blockers.map(issue => <span key={issue.message}>{issue.message}</span>)}</div>}
    <div className="profile-email-card"><pre>{draft}</pre></div>
    <div className="email-actions"><button className="secondary" onClick={copy}>{copied ? <CheckCircle2/> : <Copy/>}{copied ? 'Copied' : 'Copy email'}</button><a className={`secondary ${blockers.length ? 'disabled' : ''}`} href={blockers.length ? undefined : mailtoFor(player,emailSettings,deadline)}><ExternalLink/>Open in email app</a><button className="primary" disabled={Boolean(blockers.length)||status==='sent'} onClick={() => window.confirm('This records the email as sent but does not send it. Continue?') && markSent(player)}><CheckCircle2/>{status==='sent'?'Sent recorded':'Mark email as sent'}</button></div>
  </div>
}
