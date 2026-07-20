import { useEffect, useState } from 'react'
import { Check, Lock, Mail, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { teams } from '../data/constants'
import type { CoachProfile, EmailSettings } from '../types'

type Props = {
  settings: EmailSettings
  save: (settings: EmailSettings) => void | Promise<void>
  coachProfiles: CoachProfile[]
  isAdmin: boolean
  currentUid: string
  saveCoachProfile: (profile: CoachProfile) => void | Promise<void>
}

export function SettingsPage({ settings, save, coachProfiles, isAdmin, currentUid, saveCoachProfile }: Props) {
  const [draft, setDraft] = useState(settings)
  const [saved, setSaved] = useState(false)
  useEffect(() => setDraft(settings), [settings])
  const updateTeam = (team: string, field: keyof EmailSettings['teamDetails'][string], value: string) => setDraft(current => ({ ...current, teamDetails: { ...current.teamDetails, [team]: { ...current.teamDetails[team], [field]: value } } }))
  const submit = async () => { await save(draft); setSaved(true); window.setTimeout(() => setSaved(false), 1800) }

  return <><PageHeader title="Settings" subtitle="Shared email defaults and team details used by every coach." action={<button className="primary" onClick={submit}>{saved ? <Check/> : null}{saved ? 'Saved' : 'Save email settings'}</button>}/>
    <section className="settings-grid email-settings-grid">
      <div className="panel settings-card"><span className="eyebrow">EMAIL DEFAULTS</span><h2>Club communication</h2><p>These shared values fill new drafts automatically. A coach can override them for an individual player.</p><label>Club name<input value={draft.clubName} onChange={event => setDraft({ ...draft, clubName: event.target.value })}/></label><label>Default coach name<input value={draft.defaultCoachName} onChange={event => setDraft({ ...draft, defaultCoachName: event.target.value })} placeholder="e.g. Elliot"/></label><label>Default response deadline<input type="date" value={draft.defaultResponseDeadline} onInput={event => setDraft({ ...draft, defaultResponseDeadline: event.currentTarget.value })}/></label><div className="settings-note"><Mail/><span>Offer and waiting-list emails require a deadline. Rejections do not.</span></div></div>
      <div className="panel settings-card"><span className="eyebrow">ACCESS</span><h2>Coach accounts</h2><p>Every coach can view and edit all player profiles. Team Planner changes are limited to the teams assigned below.</p><ol className="coach-account-steps"><li><span>1</span>Create the coach in Firebase Authentication.</li><li><span>2</span>Ask them to sign in once.</li><li><span>3</span>Return here and assign their team.</li></ol><div className="settings-note secure"><ShieldCheck/><span>The shared PIN account remains an administrator with access to every team.</span></div><div className="settings-note"><UserPlus/><span>Disable or delete the Firebase user when a coach leaves.</span></div></div>
    </section>
    <section className="panel coach-access-panel"><div className="panel-head"><div><span className="eyebrow">TEAM PERMISSIONS</span><h2>Who can edit each squad?</h2><p>Unassigned teams remain visible but become read-only in the Team Planner.</p></div>{isAdmin?<ShieldCheck/>:<Lock/>}</div>{!isAdmin?<div className="access-readonly"><Lock/><div><b>Administrator access required</b><span>Use the shared PIN account to change coach team assignments.</span></div></div>:coachProfiles.length?<div className="coach-access-list">{coachProfiles.map(profile=><CoachAccessRow key={profile.uid} profile={profile} currentUid={currentUid} save={saveCoachProfile}/>)}</div>:<div className="access-empty"><Users/><b>No coach profiles yet</b><span>Coaches appear here after their first successful sign-in.</span></div>}</section>
    <section className="panel team-email-settings"><div className="panel-head"><div><span className="eyebrow">TEAM DETAILS</span><h2>Training and competition information</h2><p>Complete these once so offer emails contain accurate team information.</p></div><Mail/></div><div className="team-email-table-wrap"><table className="team-email-table"><thead><tr><th>Team</th><th>Training day</th><th>Time</th><th>Venue</th><th>Competition / division</th></tr></thead><tbody>{teams.map(team => <tr key={team}><td><b>{team}</b></td><td><input value={draft.teamDetails[team].trainingDay} onChange={event => updateTeam(team,'trainingDay',event.target.value)} placeholder="e.g. Wednesday"/></td><td><input type="time" value={draft.teamDetails[team].trainingTime} onChange={event => updateTeam(team,'trainingTime',event.target.value)}/></td><td><input value={draft.teamDetails[team].venue} onChange={event => updateTeam(team,'venue',event.target.value)} placeholder="Training venue"/></td><td><input value={draft.teamDetails[team].competition} onChange={event => updateTeam(team,'competition',event.target.value)} placeholder="League and division"/></td></tr>)}</tbody></table></div></section>
  </>
}

function CoachAccessRow({profile,currentUid,save}:{profile:CoachProfile;currentUid:string;save:(profile:CoachProfile)=>void|Promise<void>}){
  const admin=profile.role==='admin'
  const toggleTeam=(team:string)=>save({...profile,teams:{...profile.teams,[team]:!profile.teams[team]}})
  return <div className="coach-access-row"><div className="coach-access-identity"><div>{profile.displayName.slice(0,2).toUpperCase()}</div><span><b>{profile.displayName}{profile.uid===currentUid?' (you)':''}</b><small>{profile.email}</small></span></div><label className="role-select">Access level<select value={profile.role} disabled={profile.uid===currentUid} onChange={event=>save({...profile,role:event.target.value==='admin'?'admin':'coach'})}><option value="coach">Coach</option><option value="admin">Administrator</option></select></label><div className="coach-team-access"><span>{admin?'All teams':'Assigned teams'}</span><div>{teams.map(team=><button key={team} disabled={admin} className={admin||profile.teams[team]?'selected':''} onClick={()=>toggleTeam(team)}>{(admin||profile.teams[team])&&<Check/>}{team}</button>)}</div></div></div>
}
