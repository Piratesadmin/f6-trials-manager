import { useEffect, useState } from 'react'
import { Check, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { teams } from '../data/constants'
import type { EmailSettings } from '../types'

export function SettingsPage({ settings, save }: { settings: EmailSettings; save: (settings: EmailSettings) => void | Promise<void> }) {
  const [draft, setDraft] = useState(settings)
  const [saved, setSaved] = useState(false)
  useEffect(() => setDraft(settings), [settings])
  const updateTeam = (team: string, field: keyof EmailSettings['teamDetails'][string], value: string) => setDraft(current => ({ ...current, teamDetails: { ...current.teamDetails, [team]: { ...current.teamDetails[team], [field]: value } } }))
  const submit = async () => { await save(draft); setSaved(true); window.setTimeout(() => setSaved(false), 1800) }

  return <><PageHeader title="Settings" subtitle="Shared email defaults and team details used by every coach." action={<button className="primary" onClick={submit}>{saved ? <Check/> : null}{saved ? 'Saved' : 'Save email settings'}</button>}/>
    <section className="settings-grid email-settings-grid">
      <div className="panel settings-card"><span className="eyebrow">EMAIL DEFAULTS</span><h2>Club communication</h2><p>These shared values fill new drafts automatically. A coach can override them for an individual player.</p><label>Club name<input value={draft.clubName} onChange={event => setDraft({ ...draft, clubName: event.target.value })}/></label><label>Default coach name<input value={draft.defaultCoachName} onChange={event => setDraft({ ...draft, defaultCoachName: event.target.value })} placeholder="e.g. Elliot"/></label><label>Default response deadline<input type="date" value={draft.defaultResponseDeadline} onInput={event => setDraft({ ...draft, defaultResponseDeadline: event.currentTarget.value })}/></label><div className="settings-note"><Mail/><span>Offer and waiting-list emails require a deadline. Rejections do not.</span></div></div>
      <div className="panel settings-card"><span className="eyebrow">ACCESS</span><h2>Coach accounts</h2><p>The shared PIN still works. You can also create an individual Firebase Email/Password user for each coach, giving every update and communication record a recognisable email address.</p><ol className="coach-account-steps"><li><span>1</span>Open Firebase Authentication.</li><li><span>2</span>Choose Users → Add user.</li><li><span>3</span>Enter the coach's email and a temporary password.</li><li><span>4</span>Send those details privately to the coach.</li></ol><div className="settings-note secure"><UserPlus/><span>Individual accounts identify who made a change. They currently have the same portal access as the shared PIN account.</span></div><div className="settings-note"><ShieldCheck/><span>Disable or delete the Firebase user when a coach leaves.</span></div></div>
    </section>
    <section className="panel team-email-settings"><div className="panel-head"><div><span className="eyebrow">TEAM DETAILS</span><h2>Training and competition information</h2><p>Complete these once so offer emails contain accurate team information.</p></div><Mail/></div><div className="team-email-table-wrap"><table className="team-email-table"><thead><tr><th>Team</th><th>Training day</th><th>Time</th><th>Venue</th><th>Competition / division</th></tr></thead><tbody>{teams.map(team => <tr key={team}><td><b>{team}</b></td><td><input value={draft.teamDetails[team].trainingDay} onChange={event => updateTeam(team,'trainingDay',event.target.value)} placeholder="e.g. Wednesday"/></td><td><input type="time" value={draft.teamDetails[team].trainingTime} onChange={event => updateTeam(team,'trainingTime',event.target.value)}/></td><td><input value={draft.teamDetails[team].venue} onChange={event => updateTeam(team,'venue',event.target.value)} placeholder="Training venue"/></td><td><input value={draft.teamDetails[team].competition} onChange={event => updateTeam(team,'competition',event.target.value)} placeholder="League and division"/></td></tr>)}</tbody></table></div></section>
  </>
}
