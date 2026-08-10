import { useEffect, useState } from 'react'
import { Banknote, Check, Lock, Mail, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { teams } from '../data/constants'
import type { CoachProfile, EmailSettings, FinanceSettings } from '../types'
import { formatCurrency } from '../utils/finance'

type Props = {
  settings: EmailSettings
  save: (settings: EmailSettings) => void | Promise<void>
  coachProfiles: CoachProfile[]
  isAdmin: boolean
  currentUid: string
  saveCoachProfile: (profile: CoachProfile) => void | Promise<void>
  financeSettings: FinanceSettings
  saveFinanceSettings: (settings: FinanceSettings) => void | Promise<void>
}

export function SettingsPage({ settings, save, coachProfiles, isAdmin, currentUid, saveCoachProfile, financeSettings, saveFinanceSettings }: Props) {
  const [draft, setDraft] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [feeDraft,setFeeDraft]=useState(financeSettings)
  const [feesSaved,setFeesSaved]=useState(false)
  useEffect(() => setDraft(settings), [settings])
  useEffect(()=>setFeeDraft(financeSettings),[financeSettings])
  const updateTeam = (team: string, field: keyof EmailSettings['teamDetails'][string], value: string) => setDraft(current => ({ ...current, teamDetails: { ...current.teamDetails, [team]: { ...current.teamDetails[team], [field]: value } } }))
  const submit = async () => { await save(draft); setSaved(true); window.setTimeout(() => setSaved(false), 1800) }
  const submitFees=async()=>{await saveFinanceSettings(feeDraft);setFeesSaved(true);window.setTimeout(()=>setFeesSaved(false),1800)}

  return <><PageHeader title="Settings" subtitle="Shared communication, team and calendar details used by every coach." action={<button className="primary" onClick={submit}>{saved ? <Check/> : null}{saved ? 'Saved' : 'Save club settings'}</button>}/>
    <section className="settings-grid email-settings-grid">
      <div className="panel settings-card"><span className="eyebrow">EMAIL DEFAULTS</span><h2>Club communication</h2><p>Individual coach accounts now sign emails with their saved display name automatically.</p><label>Club name<input value={draft.clubName} onChange={event => setDraft({ ...draft, clubName: event.target.value })}/></label><label>Shared-login coach name<input value={draft.defaultCoachName} onChange={event => setDraft({ ...draft, defaultCoachName: event.target.value })} placeholder="Used only by the shared PIN account"/></label><label>Fallback response deadline<input type="date" value={draft.defaultResponseDeadline} onInput={event => setDraft({ ...draft, defaultResponseDeadline: event.currentTarget.value })}/><small>Used only when a player has no scheduled trial session.</small></label><div className="settings-note"><Mail/><span>Scheduled players receive an automatic deadline exactly 72 hours after their session ends.</span></div></div>
      <div className="panel settings-card"><span className="eyebrow">ACCESS</span><h2>Club accounts</h2><p>Coaches and team administrators can work with player profiles. Team Planner changes remain limited to their assigned teams.</p><ol className="coach-account-steps"><li><span>1</span>Create the person in Firebase Authentication.</li><li><span>2</span>Ask them to sign in once.</li><li><span>3</span>Return here, choose their role and assign their team.</li></ol><div className="settings-note secure"><ShieldCheck/><span>The shared PIN account remains a full administrator with access to every team and Finance.</span></div><div className="settings-note"><UserPlus/><span>Disable or delete the Firebase user when they leave the role.</span></div></div>
    </section>
    {isAdmin&&<section className="panel standard-fees-panel"><div className="panel-head"><div><span className="eyebrow">ADMINISTRATOR ONLY</span><h2>Standard season fees</h2><p>Confirmed players inherit the correct fee automatically unless the treasurer gives them a custom amount.</p></div><Banknote/></div><div className="standard-fee-grid"><label><span>NVL standard fee</span><small>Aces and Ravens</small><div className="settings-money-input"><span>£</span><input type="number" min="0" step="0.01" value={feeDraft.nvlFee||''} onChange={event=>setFeeDraft({...feeDraft,nvlFee:Number(event.target.value)})}/></div><em>{formatCurrency(feeDraft.nvlFee)} per player</em></label><label><span>LVA standard fee</span><small>Cobras, Coyotes, Llamas, Meerkats, Leopards and Pirates</small><div className="settings-money-input"><span>£</span><input type="number" min="0" step="0.01" value={feeDraft.lvaFee||''} onChange={event=>setFeeDraft({...feeDraft,lvaFee:Number(event.target.value)})}/></div><em>{formatCurrency(feeDraft.lvaFee)} per player</em></label><div className="standard-fee-action"><ShieldCheck/><p>These values and all player payment records are protected by administrator-only Firebase rules.</p><button className="primary" onClick={submitFees}>{feesSaved?<Check/>:null}{feesSaved?'Fees saved':'Save standard fees'}</button></div></div></section>}
    <section className="panel coach-access-panel"><div className="panel-head"><div><span className="eyebrow">TEAM PERMISSIONS</span><h2>Who can edit each squad?</h2><p>Unassigned teams remain visible but become read-only in the Team Planner.</p></div>{isAdmin?<ShieldCheck/>:<Lock/>}</div>{!isAdmin?<div className="access-readonly"><Lock/><div><b>Administrator access required</b><span>Use the shared PIN account to change coach team assignments.</span></div></div>:coachProfiles.length?<div className="coach-access-list">{coachProfiles.map(profile=><CoachAccessRow key={profile.uid} profile={profile} currentUid={currentUid} save={saveCoachProfile}/>)}</div>:<div className="access-empty"><Users/><b>No coach profiles yet</b><span>Coaches appear here after their first successful sign-in.</span></div>}</section>
    <section className="panel team-email-settings"><div className="panel-head"><div><span className="eyebrow">TEAM DETAILS</span><h2>Training, competition and calendar colours</h2><p>These shared details support offer emails and make each team's schedule entries easy to recognise.</p></div><Mail/></div><div className="team-email-table-wrap"><table className="team-email-table"><thead><tr><th>Team</th><th>Calendar colour</th><th>Training day</th><th>Time</th><th>Venue</th><th>Competition / division</th></tr></thead><tbody>{teams.map(team => <tr key={team}><td><b>{team}</b></td><td><label className="team-colour-control"><input type="color" value={draft.teamDetails[team].calendarColor} onChange={event=>updateTeam(team,'calendarColor',event.target.value)}/><span>{draft.teamDetails[team].calendarColor}</span></label></td><td><input value={draft.teamDetails[team].trainingDay} onChange={event => updateTeam(team,'trainingDay',event.target.value)} placeholder="e.g. Wednesday"/></td><td><input type="time" value={draft.teamDetails[team].trainingTime} onChange={event => updateTeam(team,'trainingTime',event.target.value)}/></td><td><input value={draft.teamDetails[team].venue} onChange={event => updateTeam(team,'venue',event.target.value)} placeholder="Training venue"/></td><td><input value={draft.teamDetails[team].competition} onChange={event => updateTeam(team,'competition',event.target.value)} placeholder="League and division"/></td></tr>)}</tbody></table></div></section>
  </>
}

function CoachAccessRow({profile,currentUid,save}:{profile:CoachProfile;currentUid:string;save:(profile:CoachProfile)=>void|Promise<void>}){
  const admin=profile.role==='admin'
  const teamAdmin=profile.role==='team-admin'
  const [nameDraft,setNameDraft]=useState(profile.displayName)
  useEffect(()=>setNameDraft(profile.displayName),[profile.displayName])
  const toggleTeam=(team:string)=>teamAdmin?save({...profile,teams:{[team]:true}}):save({...profile,teams:{...profile.teams,[team]:!profile.teams[team]}})
  const changeRole=(role:CoachProfile['role'])=>{const firstAssigned=teams.find(team=>profile.teams[team]);save({...profile,role,teams:role==='team-admin'?(firstAssigned?{[firstAssigned]:true}:{}):profile.teams})}
  const saveName=()=>{const displayName=nameDraft.trim();if(displayName&&displayName!==profile.displayName)save({...profile,displayName});else setNameDraft(profile.displayName)}
  return <div className="coach-access-row"><div className="coach-access-identity"><div>{(nameDraft||profile.email).slice(0,2).toUpperCase()}</div><span><label className="coach-name-field">Coach name{profile.uid===currentUid?' (you)':''}<input value={nameDraft} onChange={event=>setNameDraft(event.target.value)} onBlur={saveName} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur()}}/></label><small>{profile.email}</small></span></div><label className="role-select">Access level<select value={profile.role} disabled={profile.uid===currentUid} onChange={event=>changeRole(event.target.value as CoachProfile['role'])}><option value="coach">Coach</option><option value="team-admin">Team administrator</option><option value="admin">Administrator</option></select></label><div className="coach-team-access"><span>{admin?'All teams':teamAdmin?'Own team':'Assigned teams'}</span><div>{teams.map(team=><button key={team} disabled={admin} className={admin||profile.teams[team]?'selected':''} onClick={()=>toggleTeam(team)}>{(admin||profile.teams[team])&&<Check/>}{team}</button>)}</div>{teamAdmin&&<small className="team-admin-help">Selecting a team replaces the previous team assignment.</small>}</div></div>
}
