import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { BarChart3, Camera, Check, CheckCircle2, ClipboardList, CreditCard, LoaderCircle, Save, Star, Trash2, TrendingUp, UserRound } from 'lucide-react'
import type { Assessment, AssessmentSnapshot, Player, PlayerDecisionDraft, PlayerDecisionSaveResult, PlayerTab, Recommendation, TrialResponseStatus, TrialSession } from '../types'
import { positions, reasons, recommendations, teams } from '../data/constants'
import { assessmentCompletion, assessmentFields, averageRating } from '../utils/player'
import { StarRating } from './StarRating'
import { formatSessionDate, trialDateLabel } from '../utils/schedule'
import { defaultSquadRole, primaryOffer } from '../utils/offers'
import { decisionDraftFor, sameDecisionDraft } from '../utils/decision'

type Props = {
  player: Player
  sessions: TrialSession[]
  activeTab: PlayerTab
  setActiveTab: (tab: PlayerTab) => void
  save: (player: Player) => void
  saveDecision: (playerId: string, expected: PlayerDecisionDraft, next: PlayerDecisionDraft) => Promise<PlayerDecisionSaveResult>
  saveAssessment: (player: Player) => Promise<void>
  starred: boolean
  toggleStar: () => void | Promise<void>
  photo: string
  uploadPhoto: (player: Player, file: File) => Promise<void>
  removePhoto: (player: Player) => Promise<void>
  deletePlayer: (player: Player) => Promise<void>
  isAdmin: boolean
  trialsMode: boolean
}

const tabs: { key: PlayerTab; label: string; icon: typeof UserRound }[] = [
  { key: 'overview', label: 'Overview', icon: UserRound },
  { key: 'assessment', label: 'Assessment', icon: Star },
  { key: 'decision', label: 'Decision', icon: ClipboardList },
]

const recommendationClass = (recommendation: Recommendation) => recommendation ? `recommendation-${recommendation.toLowerCase().replaceAll(' ', '-')}` : 'recommendation-none'

export function PlayerProfile({ player, sessions, activeTab, setActiveTab, save, saveDecision, saveAssessment, starred, toggleStar, photo, uploadPhoto, removePhoto, deletePlayer, isAdmin, trialsMode }: Props) {
  const average = averageRating(player)
  const completion = assessmentCompletion(player)
  const initials = player.name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2)
  const visibleTabs=trialsMode?tabs:tabs.filter(tab=>tab.key==='overview'||tab.key==='assessment')
  const [deleteBusy,setDeleteBusy]=useState(false)
  const removePlayer=async()=>{
    const confirmation=window.prompt(`Permanently delete ${player.name} and all operational records? This cannot be undone.\n\nType the player’s full name to confirm:`)
    if(confirmation!==player.name)return
    setDeleteBusy(true)
    try{await deletePlayer(player)}catch(error){window.alert(error instanceof Error?error.message:'The player could not be deleted.')}finally{setDeleteBusy(false)}
  }

  return <article className="player-profile">
    <header className="profile-hero">
      <div className="profile-identity">
        <div className={`avatar profile-avatar ${photo?'has-photo':''}`}>{photo?<img src={photo} alt={`${player.name} profile`}/>:initials}</div>
        <div>
          <div className="profile-title-row"><h2>{player.name}</h2>{player.bibNumber && <span className="bib-badge">#{player.bibNumber}</span>}</div>
          <p>{player.position} · {player.interestedDivisions} applicant</p>
          <span className={`recommendation-badge ${recommendationClass(player.recommendation)}`}>{player.recommendation || 'No recommendation yet'}</span>
        </div>
      </div>
      <div className="profile-hero-actions">{isAdmin&&<button className="profile-delete-player" disabled={deleteBusy} onClick={removePlayer} aria-label={`Permanently delete ${player.name}`} title="Organization administrators only">{deleteBusy?<LoaderCircle className="spin"/>:<Trash2/>}<span>{deleteBusy?'Deleting…':'Delete player'}</span></button>}<button className={`profile-star ${starred?'starred':''}`} onClick={toggleStar} aria-label={starred?'Remove from my starred players':'Add to my starred players'} title={starred?'Remove from my starred players':'Add to my starred players'}><Star/></button><div className="profile-score" aria-label={average ? `Average rating ${average.toFixed(1)} out of 5` : 'Not yet rated'}>
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
      {activeTab === 'decision' && <DecisionPanel key={player.id} player={player} saveDecision={saveDecision}/>}
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
  const changePrimaryPosition=(position:string)=>{
    if(player.decision!=='Offer accepted'){
      save({...player,position})
      return
    }
    const acceptedTeam=player.offeredTeam||primaryOffer(player)?.team||''
    const hasAcceptedOffer=Boolean(acceptedTeam&&player.offers.some(offer=>offer.team===acceptedTeam))
    const offers=acceptedTeam
      ? hasAcceptedOffer
        ? player.offers.map(offer=>offer.team===acceptedTeam?{...offer,position}:offer)
        : [...player.offers,{team:acceptedTeam,position,squadRole:defaultSquadRole,includeSquadRole:true}]
      : player.offers
    save({...player,position,offeredPosition:position,offers,teamConsideration:acceptedTeam?{...player.teamConsideration,[acceptedTeam]:position}:player.teamConsideration})
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
      <label>Primary position<select value={player.position} onChange={event => changePrimaryPosition(event.target.value)}>{['Unassigned', ...positions].map(position => <option key={position}>{position}</option>)}</select></label>
      <label>Second position<select value={player.secondaryPosition} onChange={event => save({ ...player, secondaryPosition: event.target.value })}>{['', ...positions].map(position => <option key={position||'none'} value={position}>{position||'None specified'}</option>)}</select></label>
      <label>Highest level played<input value={player.highestLevelPlayed} onChange={event => save({ ...player, highestLevelPlayed: event.target.value })} placeholder="England or international level"/></label>
      <label className="attendance-field">Payment<div className="segmented-control"><button type="button" className={player.paid ? 'active' : ''} onClick={() => save({ ...player, paid: true })}><CreditCard/> Paid</button><button type="button" className={!player.paid ? 'active' : ''} onClick={() => save({ ...player, paid: false })}>Not paid</button></div></label>
      <label className="attendance-field">Attendance<div className="segmented-control"><button type="button" className={player.attended ? 'active' : ''} onClick={() => save({ ...player, attended: true })}><Check/> Attended</button><button type="button" className={!player.attended ? 'active' : ''} onClick={() => save({ ...player, attended: false })}>Not attended</button></div></label>
      <label className="full-width">Past playing experience<textarea value={player.playingExperience} onChange={event => save({ ...player, playingExperience: event.target.value })} placeholder="Previous clubs, leagues, years played and relevant experience…"/></label>
      <label className="full-width">Coach notes<textarea value={player.notes} onChange={event => save({ ...player, notes: event.target.value })} placeholder="General notes that do not fit the assessment categories…"/></label>
    </div>
  </div>
}

type AssessmentDraft={assessment:Assessment;strengths:string;developmentAreas:string}
const assessmentDraftFor=(player:Player):AssessmentDraft=>({assessment:{...player.assessment},strengths:player.strengths,developmentAreas:player.developmentAreas})

function Assessment({ player, saveAssessment, trialsMode }: Pick<Props, 'player' | 'saveAssessment' | 'trialsMode'>) {
  const [draft,setDraft]=useState<AssessmentDraft>(()=>assessmentDraftFor(player))
  const [busy,setBusy]=useState(false)
  const [saved,setSaved]=useState(false)
  useEffect(()=>{setDraft(assessmentDraftFor(player));setSaved(false)},[player.id,player.updatedAt])
  const draftPlayer={...player,...draft}
  const average=averageRating(draftPlayer)
  const completion=assessmentCompletion(draftPlayer)
  const history=Object.values(player.assessmentHistory||{}).sort((a,b)=>a.recordedAt-b.recordedAt)
  const submit=async()=>{setBusy(true);setSaved(false);try{await saveAssessment(draftPlayer);setSaved(true);window.setTimeout(()=>setSaved(false),2200)}finally{setBusy(false)}}

  return <div className="profile-section">
    <div className="assessment-summary assessment-draft-summary">
      <div><span className="eyebrow">CURRENT ASSESSMENT</span><h3>{average ? `${average.toFixed(1)} average rating` : 'Not assessed yet'}</h3><p>Update the scores, then save a dated assessment to add it to this player’s progression.</p></div>
      <div className="assessment-summary-actions"><div className="completion-ring" style={{ '--completion': `${completion * 3.6}deg` } as CSSProperties}><span>{completion}%</span></div><button className="primary save-assessment" disabled={busy||completion===0} onClick={submit}>{busy?<LoaderCircle className="spin"/>:saved?<CheckCircle2/>:<Save/>}{busy?'Saving…':saved?'Assessment saved':'Save assessment'}</button></div>
    </div>

    <div className="ratings-grid">
      {assessmentFields.map(({ key, label, hint }) => <div className="rating-row" key={key}><div><b>{label}</b><span>{hint}</span></div><StarRating label={label} value={draft.assessment[key]} onChange={value=>setDraft(current=>({...current,assessment:{...current.assessment,[key]:value}}))}/><strong>{draft.assessment[key] || '—'}</strong></div>)}
    </div>

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

function DecisionPanel({ player, saveDecision }: Pick<Props, 'player' | 'saveDecision'>) {
  const [base,setBase]=useState<PlayerDecisionDraft>(()=>decisionDraftFor(player))
  const [draft,setDraft]=useState<PlayerDecisionDraft>(()=>decisionDraftFor(player))
  const [busy,setBusy]=useState(false)
  const [saved,setSaved]=useState(false)
  const [conflict,setConflict]=useState(false)
  const [error,setError]=useState('')
  const latest=decisionDraftFor(player)
  const dirty=!sameDecisionDraft(base,draft)
  const remoteChanged=dirty&&!sameDecisionDraft(base,latest)
  const draftPlayer={...player,...draft}

  useEffect(()=>{
    if(dirty)return
    setBase(latest)
    setDraft(latest)
    setConflict(false)
  },[player.updatedAt,dirty])

  const beginEdit=()=>{setSaved(false);setError('')}
  const chooseRecommendation=(recommendation:Recommendation)=>{beginEdit();setDraft(current=>({...current,recommendation:current.recommendation===recommendation?'':recommendation}))}
  const toggleTeam=(team:string)=>{beginEdit();setDraft(current=>({...current,suitableTeams:current.suitableTeams.includes(team)?current.suitableTeams.filter(item=>item!==team):[...current.suitableTeams,team]}))}
  const updateDecisionDraft=(updated:Player)=>{beginEdit();setDraft(decisionDraftFor(updated))}
  const loadLatest=()=>{setBase(latest);setDraft(latest);setConflict(false);setError('');setSaved(false)}
  const submit=async()=>{
    if(!dirty||remoteChanged)return
    setBusy(true);setSaved(false);setConflict(false);setError('')
    try{
      const result=await saveDecision(player.id,base,draft)
      if(result==='conflict'){setConflict(true);return}
      setBase(decisionDraftFor(draftPlayer))
      setSaved(true)
      window.setTimeout(()=>setSaved(false),2200)
    }catch(saveError){console.error('Decision transaction failed',saveError);setError('The decision changes could not be saved. Your selections are still here—please try again.')}
    finally{setBusy(false)}
  }

  return <div className="profile-section">
    <div className="assessment-card">
      <div className="section-heading"><div><span className="eyebrow">RECOMMENDATION</span><h3>Coach recommendation</h3><p>Record the coaches’ current view of the player.</p></div></div>
      <div className="recommendation-options">
        {recommendations.map(recommendation => <button type="button" key={recommendation} disabled={busy||remoteChanged||conflict} className={`${recommendationClass(recommendation)} ${draft.recommendation === recommendation ? 'selected' : ''}`} onClick={()=>chooseRecommendation(recommendation)}><span></span>{recommendation}{draft.recommendation === recommendation && <Check/>}</button>)}
      </div>
    </div>

    <div className="assessment-card">
      <div className="section-heading"><div><span className="eyebrow">TEAM FIT</span><h3>Suitable teams</h3><p>Select every team that could be a realistic fit.</p></div></div>
      <div className="team-options">{teams.map(team => <button type="button" key={team} disabled={busy||remoteChanged||conflict} className={draft.suitableTeams.includes(team) ? 'selected' : ''} onClick={() => toggleTeam(team)}>{draft.suitableTeams.includes(team) && <Check/>}{team}</button>)}</div>
    </div>
    {draftPlayer.decision.includes('Rejection') && <div className="form-card profile-form-grid"><label className="full-width">Rejection reason<select disabled={busy||remoteChanged||conflict} value={draftPlayer.rejectionReason || reasons[0]} onChange={event => updateDecisionDraft({ ...draftPlayer, rejectionReason: event.target.value })}>{reasons.map(reason => <option key={reason}>{reason}</option>)}</select></label></div>}
    {draftPlayer.decision === 'Offer accepted' && <div className="decision-callout accepted"><CheckCircle2/><div><b>Confirmed squad place</b><p>{draftPlayer.name} now appears in the confirmed squad for {draftPlayer.offeredTeam || 'the accepted team'}{primaryOffer(draftPlayer)?` as ${primaryOffer(draftPlayer)!.position} · ${primaryOffer(draftPlayer)!.squadRole}`:''}. Administrators can manage season fees in Finance.</p></div></div>}
    <div className={`decision-save-bar ${remoteChanged||conflict?'conflict':dirty?'dirty':saved?'saved':''}`}>
      <div><b>{remoteChanged||conflict?'Another coach updated this decision':dirty?'Unsaved decision changes':saved?'Decision changes saved':'Decision details are up to date'}</b><span>{remoteChanged||conflict?'Load the latest Decision-tab values before making your changes again.':dirty?'Your changes have not been sent to Firebase yet.':'The Decision tab matches Firebase.'}</span>{error&&<p className="decision-save-error" role="alert">{error}</p>}</div>
      {(remoteChanged||conflict)&&<button className="secondary" type="button" onClick={loadLatest}>Load latest</button>}
      <button className="primary" type="button" disabled={!dirty||busy||remoteChanged||conflict} onClick={submit}>{busy?<LoaderCircle className="spin"/>:saved?<CheckCircle2/>:<Save/>}{busy?'Saving…':saved?'Saved':'Save changes'}</button>
    </div>
  </div>
}
