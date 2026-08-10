import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { BarChart3, CalendarClock, Camera, Check, CheckCircle2, ClipboardList, Copy, CreditCard, ExternalLink, LoaderCircle, Mail, Save, Star, Trash2, TrendingUp, UserRound } from 'lucide-react'
import type { Assessment, AssessmentSnapshot, Decision, EmailSettings, Player, PlayerTab, Recommendation, TeamPlans, TrialResponseStatus, TrialSession } from '../types'
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
  saveAssessment: (player: Player) => Promise<void>
  players: Player[]
  emailSettings: EmailSettings
  teamPlans: TeamPlans
  markSent: (player: Player) => void | Promise<void>
  starred: boolean
  toggleStar: () => void | Promise<void>
  photo: string
  uploadPhoto: (player: Player, file: File) => Promise<void>
  removePhoto: (player: Player) => Promise<void>
  trialsMode: boolean
}

const tabs: { key: PlayerTab; label: string; icon: typeof UserRound }[] = [
  { key: 'overview', label: 'Overview', icon: UserRound },
  { key: 'assessment', label: 'Assessment', icon: Star },
  { key: 'decision', label: 'Decision', icon: ClipboardList },
  { key: 'email', label: 'Email', icon: Mail },
]

const recommendationClass = (recommendation: Recommendation) => recommendation ? `recommendation-${recommendation.toLowerCase().replaceAll(' ', '-')}` : 'recommendation-none'

export function PlayerProfile({ player, players, sessions, activeTab, setActiveTab, save, saveAssessment, emailSettings, teamPlans, markSent, starred, toggleStar, photo, uploadPhoto, removePhoto, trialsMode }: Props) {
  const average = averageRating(player)
  const completion = assessmentCompletion(player)
  const initials = player.name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2)
  const visibleTabs=trialsMode?tabs:tabs.filter(tab=>tab.key==='overview'||tab.key==='assessment')

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
      {visibleTabs.map(({ key, label, icon: Icon }) => <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}><Icon/>{label}</button>)}
    </nav>

    <div className="profile-content">
      {activeTab === 'overview' && <Overview player={player} sessions={sessions} save={save} photo={photo} uploadPhoto={uploadPhoto} removePhoto={removePhoto}/>} 
      {activeTab === 'assessment' && <Assessment player={player} saveAssessment={saveAssessment} trialsMode={trialsMode}/>} 
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

type AssessmentDraft={assessment:Assessment;recommendation:Recommendation;strengths:string;developmentAreas:string;suitableTeams:string[]}
const assessmentDraftFor=(player:Player):AssessmentDraft=>({assessment:{...player.assessment},recommendation:player.recommendation,strengths:player.strengths,developmentAreas:player.developmentAreas,suitableTeams:[...player.suitableTeams]})

function Assessment({ player, saveAssessment, trialsMode }: Pick<Props, 'player' | 'saveAssessment' | 'trialsMode'>) {
  const [draft,setDraft]=useState<AssessmentDraft>(()=>assessmentDraftFor(player))
  const [busy,setBusy]=useState(false)
  const [saved,setSaved]=useState(false)
  useEffect(()=>{setDraft(assessmentDraftFor(player));setSaved(false)},[player.id,player.updatedAt])
  const draftPlayer={...player,...draft}
  const average=averageRating(draftPlayer)
  const completion=assessmentCompletion(draftPlayer)
  const history=Object.values(player.assessmentHistory||{}).sort((a,b)=>a.recordedAt-b.recordedAt)
  const toggleTeam=(team:string)=>setDraft(current=>({...current,suitableTeams:current.suitableTeams.includes(team)?current.suitableTeams.filter(item=>item!==team):[...current.suitableTeams,team]}))
  const submit=async()=>{setBusy(true);setSaved(false);try{await saveAssessment(draftPlayer);setSaved(true);window.setTimeout(()=>setSaved(false),2200)}finally{setBusy(false)}}

  return <div className="profile-section">
    <div className="assessment-summary assessment-draft-summary">
      <div><span className="eyebrow">CURRENT ASSESSMENT</span><h3>{average ? `${average.toFixed(1)} average rating` : 'Not assessed yet'}</h3><p>Update the scores, then save a dated assessment to add it to this player’s progression.</p></div>
      <div className="assessment-summary-actions"><div className="completion-ring" style={{ '--completion': `${completion * 3.6}deg` } as CSSProperties}><span>{completion}%</span></div><button className="primary save-assessment" disabled={busy||completion===0} onClick={submit}>{busy?<LoaderCircle className="spin"/>:saved?<CheckCircle2/>:<Save/>}{busy?'Saving…':saved?'Assessment saved':'Save assessment'}</button></div>
    </div>

    <div className="ratings-grid">
      {assessmentFields.map(({ key, label, hint }) => <div className="rating-row" key={key}><div><b>{label}</b><span>{hint}</span></div><StarRating label={label} value={draft.assessment[key]} onChange={value=>setDraft(current=>({...current,assessment:{...current.assessment,[key]:value}}))}/><strong>{draft.assessment[key] || '—'}</strong></div>)}
    </div>

    {trialsMode&&<div className="assessment-card">
      <div className="section-heading"><div><span className="eyebrow">RECOMMENDATION</span><h3>Coach recommendation</h3><p>This is stored with each assessment snapshot so changes can be reviewed over time.</p></div></div>
      <div className="recommendation-options">
        {recommendations.map(recommendation => <button type="button" key={recommendation} className={`${recommendationClass(recommendation)} ${draft.recommendation === recommendation ? 'selected' : ''}`} onClick={()=>setDraft(current=>({...current,recommendation:current.recommendation===recommendation?'':recommendation}))}><span></span>{recommendation}{draft.recommendation === recommendation && <Check/>}</button>)}
      </div>
    </div>}

    {trialsMode&&<div className="assessment-card">
      <div className="section-heading"><div><span className="eyebrow">TEAM FIT</span><h3>Suitable teams</h3><p>Select every team that could be a realistic fit.</p></div></div>
      <div className="team-options">{teams.map(team => <button type="button" key={team} className={draft.suitableTeams.includes(team) ? 'selected' : ''} onClick={() => toggleTeam(team)}>{draft.suitableTeams.includes(team) && <Check/>}{team}</button>)}</div>
    </div>}

    <div className="notes-grid">
      <label><span>Strengths</span><small>What stood out positively?</small><textarea value={draft.strengths} onChange={event=>setDraft(current=>({...current,strengths:event.target.value}))} placeholder="e.g. Reliable serve receive, vocal communicator…"/></label>
      <label><span>Development areas</span><small>What should they work on?</small><textarea value={draft.developmentAreas} onChange={event=>setDraft(current=>({...current,developmentAreas:event.target.value}))} placeholder="e.g. Blocking timing, transition speed…"/></label>
    </div>

    <AssessmentProgression history={history} trialsMode={trialsMode}/>
  </div>
}

function AssessmentProgression({history,trialsMode}:{history:AssessmentSnapshot[];trialsMode:boolean}){
  const recent=history.slice(-8)
  const latest=history.at(-1)
  const previous=history.at(-2)
  const change=latest&&previous?latest.average-previous.average:0
  return <section className="assessment-progression"><header><div><span className="eyebrow">PLAYER PROGRESSION</span><h3>Assessment history</h3><p>Every saved assessment is retained as a dated snapshot.</p></div><div className={`progression-change ${change>0?'improved':change<0?'declined':''}`}><TrendingUp/><b>{history.length}</b><span>saved assessment{history.length===1?'':'s'}</span>{latest&&previous&&<small>{change>0?'+':''}{change.toFixed(1)} since previous</small>}</div></header>{history.length?<><div className="progression-chart" aria-label="Saved overall assessment progression">{recent.map((snapshot,index)=><div key={snapshot.id}><span style={{height:`${Math.max(5,snapshot.average/5*100)}%`}}></span><b>{snapshot.average.toFixed(1)}</b><small>{new Date(snapshot.recordedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small>{index===recent.length-1&&<em>Latest</em>}</div>)}</div><div className="assessment-history-list">{[...history].reverse().map((snapshot,index)=><details key={snapshot.id} open={index===0}><summary><span><b>{new Date(snapshot.recordedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</b><small>{snapshot.recordedBy||'Club coach'}{trialsMode?` · ${snapshot.recommendation||'No recommendation'}`:''}</small></span><strong><Star/>{snapshot.average.toFixed(1)}</strong></summary><div className="history-skill-grid">{assessmentFields.map(field=><span key={field.key}><b>{field.label}</b><em>{snapshot.assessment[field.key]||'—'}</em></span>)}</div>{(snapshot.strengths||snapshot.developmentAreas)&&<div className="history-notes"><p><b>Strengths</b>{snapshot.strengths||'Not recorded'}</p><p><b>Development</b>{snapshot.developmentAreas||'Not recorded'}</p></div>}</details>)}</div></>:<div className="progression-empty"><BarChart3/><b>No saved assessments yet</b><span>Complete the current ratings and select Save assessment to begin tracking progress.</span></div>}</section>
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
    {emailTypeFor(player)!=='rejection'&&<div className={`profile-deadline ${deadline.state==='none'?'on-track':deadline.state}`}><CalendarClock/><div><b>{deadline.effectiveDeadline?deadlineStateLabel(deadline.state):'72-hour response window'}</b><span>{deadline.effectiveDeadline?`${formatDeadline(deadline.effectiveDeadline)} · calculated from when the email was recorded sent`:'Begins when the email is recorded as sent'}</span></div></div>}
    {blockers.length > 0 && <div className="profile-email-warning">{blockers.map(issue => <span key={issue.message}>{issue.message}</span>)}</div>}
    <div className="profile-email-card"><pre>{draft}</pre></div>
    <div className="email-actions"><button className="secondary" onClick={copy}>{copied ? <CheckCircle2/> : <Copy/>}{copied ? 'Copied' : 'Copy email'}</button><a className={`secondary ${blockers.length ? 'disabled' : ''}`} href={blockers.length ? undefined : mailtoFor(player,emailSettings,deadline)}><ExternalLink/>Open in email app</a><button className="primary" disabled={Boolean(blockers.length)||status==='sent'} onClick={() => window.confirm('This records the email as sent but does not send it. Continue?') && markSent(player)}><CheckCircle2/>{status==='sent'?'Sent recorded':'Mark email as sent'}</button></div>
  </div>
}
