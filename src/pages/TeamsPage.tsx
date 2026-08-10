import { useMemo } from 'react'
import { AlertTriangle, ArrowRight, CalendarDays, Check, CheckCircle2, ClipboardList, Lock, MailPlus, Minus, Plus, Star, TrendingUp, UserPlus, Users, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { positions, teams } from '../data/constants'
import type { FinanceSettings, Player, PlayerFinanceMap, TeamPlans, TrialSession } from '../types'
import { averageRating } from '../utils/player'
import { assignmentForTeam, isPlannedForTeam, minimumSquadSize, minimumTargetForPosition, recommendationMatchesTeam } from '../utils/teamPlanner'
import { confirmedPosition, confirmedTeam, effectiveAmountOwed, emptyPlayerFinance, formatCurrency, outstandingAmount, paymentDeadlineDetails, paymentStatus } from '../utils/finance'
import { defaultSquadRole, offerForTeam, primaryOffer } from '../utils/offers'
import { teamMatchesInterestedDivisions } from '../utils/division'

type Props = {
  players: Player[]
  sessions: TrialSession[]
  teamPlans: TeamPlans
  savePlayer: (player: Player) => void
  saveTarget: (team: string, position: string, target: number) => void
  selectedTeam: string
  setSelectedTeam: (team: string) => void
  onOpenPlayer: (id: string) => void
  onOpenSchedule: (id: string) => void
  canEditTeam: (team: string) => boolean
  editableTeams: string[]
  isAdmin: boolean
  finances: PlayerFinanceMap
  financeSettings: FinanceSettings
  trialsMode: boolean
  teamDivisions: Record<string,string>
}

type CandidateGroup = {
  title: string
  description: string
  players: Player[]
  tone: string
}

export function TeamsPage({ players, sessions, teamPlans, savePlayer, saveTarget, selectedTeam, setSelectedTeam, onOpenPlayer, onOpenSchedule, canEditTeam, editableTeams, isAdmin, finances, financeSettings, trialsMode, teamDivisions }: Props) {
  const targets = teamPlans[selectedTeam]
  const planned = useMemo(() => players.filter(player => isPlannedForTeam(player, selectedTeam)), [players, selectedTeam])
  const confirmed = useMemo(() => players.filter(player => confirmedTeam(player) === selectedTeam), [players, selectedTeam])
  const activePlan = planned.filter(player => player.decision !== 'Offer accepted')
  const targetTotal = positions.reduce((total, position) => total + (targets?.[position] || 0), 0)
  const offered = planned.filter(player => player.decision !== 'Offer accepted' && Boolean(offerForTeam(player, selectedTeam)))
  const editable = canEditTeam(selectedTeam)

  const positionRows = positions.map(position => {
    const target = targets?.[position] || 0
    const positionFor = (player: Player) => assignmentForTeam(player, selectedTeam) || player.position
    const plannedCount = planned.filter(player => positionFor(player) === position).length
    const offeredCount = offered.filter(player => (offerForTeam(player, selectedTeam)?.position || positionFor(player)) === position).length
    const recommendedCount = players.filter(player => ['Strong offer','Offer'].includes(player.recommendation) && recommendationMatchesTeam(player, selectedTeam) && positionFor(player) === position).length
    const remaining = target - plannedCount
    return { position, target, plannedCount, offeredCount, recommendedCount, remaining }
  })

  const unplanned = players.filter(player => !isPlannedForTeam(player, selectedTeam) && player.recommendation !== 'Not suitable')
  const assigned = new Set<string>()
  const take = (predicate: (player: Player) => boolean) => unplanned.filter(player => !assigned.has(player.id) && predicate(player)).map(player => { assigned.add(player.id); return player })
  const groups: CandidateGroup[] = [
    { title: 'Recommended', description: 'Strong offer and offer recommendations relevant to this team.', players: take(player => ['Strong offer','Offer'].includes(player.recommendation) && recommendationMatchesTeam(player, selectedTeam)), tone: 'recommended' },
    { title: 'Referred players', description: 'Players assessed as suitable for this team.', players: take(player => player.suitableTeams.includes(selectedTeam)), tone: 'referred' },
    { title: 'Waiting list', description: 'Players held as a possible next choice.', players: take(player => player.recommendation === 'Waiting list' && recommendationMatchesTeam(player, selectedTeam)), tone: 'waiting' },
    { title: 'Needs discussion', description: 'Players needing a committee or coaching conversation.', players: take(player => player.recommendation === 'Needs discussion' && recommendationMatchesTeam(player, selectedTeam)), tone: 'discussion' },
    { title: 'Division applicants', description: `Unplanned applicants interested in ${teamDivisions[selectedTeam] || 'this team’s division'}.`, players: take(player => teamMatchesInterestedDivisions(player,selectedTeam,teamDivisions)), tone: 'applicants' },
  ].filter(group => group.players.length)

  const removeFromPlan = (player: Player) => {
    if(!editable)return
    const teamConsideration = { ...player.teamConsideration }
    delete teamConsideration[selectedTeam]
    savePlayer({ ...player, teamConsideration })
  }
  const changePosition = (player: Player, position: string) => {
    if(!editable)return
    const offers = player.offers.map(offer => offer.team === selectedTeam ? { ...offer, position } : offer)
    const update: Player = { ...player, offers, teamConsideration: { ...player.teamConsideration, [selectedTeam]: position } }
    if (primaryOffer(player)?.team === selectedTeam) update.offeredPosition = position
    savePlayer(update)
  }
  const movePlayer = (player: Player, destination: string) => {
    if (!editable || player.decision === 'Offer accepted' || !editableTeams.includes(destination) || destination === selectedTeam) return
    const currentPosition = assignmentForTeam(player, selectedTeam) || player.position
    const teamConsideration = { ...player.teamConsideration }
    delete teamConsideration[selectedTeam]
    teamConsideration[destination] = currentPosition
    const currentOffer = offerForTeam(player, selectedTeam)
    const destinationOffer = offerForTeam(player, destination)
    const offers = currentOffer
      ? player.offers.flatMap(offer => offer.team === selectedTeam ? (destinationOffer ? [] : [{ ...offer, team: destination }]) : [offer])
      : player.offers
    const update: Player = { ...player, offers, teamConsideration }
    if (currentOffer) {
      const primary = player.offeredTeam === selectedTeam ? offers.find(offer => offer.team === destination) || offers[0] : primaryOffer(update)
      update.offeredTeam = primary?.team || ''
      update.offeredPosition = primary?.position || ''
      update.decision = offers.some(offer => teamMatchesInterestedDivisions(player,offer.team,teamDivisions)) ? 'Offer planned' : 'Alternative offer'
      update.emailReviewStatus = 'draft'
    }
    savePlayer(update)
  }
  const prepareOffer = (player: Player) => {
    if(!editable)return
    const position = assignmentForTeam(player, selectedTeam) || player.position
    const existing = offerForTeam(player, selectedTeam)
    const offers = existing ? player.offers : [...player.offers, { team: selectedTeam, position, squadRole: defaultSquadRole }]
    const primary = primaryOffer(player) || offers[0]
    savePlayer({
      ...player,
      decision: offers.some(offer => teamMatchesInterestedDivisions(player,offer.team,teamDivisions)) ? 'Offer planned' : 'Alternative offer',
      offers,
      offeredTeam: primary?.team || selectedTeam,
      offeredPosition: primary?.position || position,
      emailReviewStatus: 'draft',
      teamConsideration: { ...player.teamConsideration, [selectedTeam]: position },
    })
  }
  const addOfferedPlayerToTeam = (player: Player) => {
    if(!editable||player.decision!=='Offer sent')return
    const acceptedOffer=offerForTeam(player,selectedTeam)
    if(!acceptedOffer)return
    if(!window.confirm(`Confirm that ${player.name} accepted the offer for ${selectedTeam} and add them to the confirmed squad?`))return
    savePlayer({
      ...player,
      decision:'Offer accepted',
      offeredTeam:selectedTeam,
      offeredPosition:acceptedOffer.position,
      teamConsideration:{...player.teamConsideration,[selectedTeam]:acceptedOffer.position},
    })
  }

  if(!trialsMode)return <>
    <PageHeader title="Teams" subtitle="Confirmed squads and attendance during the playing season."/>
    <section className="planner-team-strip" aria-label="Choose a team">{teams.map(team=>{const teamConfirmed=players.filter(player=>confirmedTeam(player)===team).length;return <button key={team} className={`${selectedTeam===team?'active':''} ${canEditTeam(team)?'':'view-only'}`} onClick={()=>setSelectedTeam(team)}><span>{team}{!canEditTeam(team)&&<Lock/>}</span><b>{teamConfirmed}</b><small>{canEditTeam(team)?'Confirmed squad':'View only'}</small></button>})}</section>
    {!editable&&<div className="team-access-banner"><Lock/><div><b>{selectedTeam} is view only</b><span>You can see the confirmed squad and attendance, but only its assigned coach, Team administrator or a full administrator can change team records.</span></div></div>}
    <section className="confirmed-squad-panel"><div className="planner-panel-head"><div><span className="eyebrow">CONFIRMED SQUAD</span><h3>{confirmed.length} accepted player{confirmed.length===1?'':'s'}</h3><p>The active playing squad for {selectedTeam}.</p></div>{isAdmin&&<span className="admin-finance-label">Administrator finance view</span>}</div>{confirmed.length?<div className="confirmed-squad-grid">{confirmed.sort((a,b)=>confirmedPosition(a).localeCompare(confirmedPosition(b))||a.name.localeCompare(b.name)).map(player=><ConfirmedPlayerCard key={player.id} player={player} isAdmin={isAdmin} finance={finances[player.id]} financeSettings={financeSettings} onOpen={()=>onOpenPlayer(player.id)}/>)}</div>:<div className="planner-empty compact"><CheckCircle2/><h4>No confirmed players yet</h4><p>No active players are currently assigned to {selectedTeam}.</p></div>}</section>
    <TeamAttendancePanel team={selectedTeam} players={confirmed} sessions={sessions} onOpenPlayer={onOpenPlayer} onOpenSchedule={onOpenSchedule}/>
  </>

  return <>
    <PageHeader title="Team planner" subtitle="Build balanced squads from coach assessments, referrals and planned offers."/>

    <section className="planner-team-strip" aria-label="Choose a team">
      {teams.map(team => {
        const teamTargets = teamPlans[team]
        const teamTarget = positions.reduce((total, position) => total + (teamTargets?.[position] || 0), 0)
        const teamPlanned = players.filter(player => isPlannedForTeam(player, team)).length
        return <button key={team} className={`${selectedTeam === team ? 'active' : ''} ${canEditTeam(team) ? '' : 'view-only'}`} onClick={() => setSelectedTeam(team)}>
          <span>{team}{!canEditTeam(team)&&<Lock/>}</span><b>{teamPlanned}/{teamTarget}</b><small>{canEditTeam(team)?(teamPlanned > teamTarget ? `${teamPlanned - teamTarget} over target` : `${Math.max(0, teamTarget - teamPlanned)} spaces`):'View only'}</small>
        </button>
      })}
    </section>

    {!editable&&<div className="team-access-banner"><Lock/><div><b>{selectedTeam} is view only</b><span>You can see this squad and open every player, but only its assigned coach, team administrator or a full administrator can change the plan.</span></div></div>}

    <section className="planner-heading-card">
      <div><span className="eyebrow">SELECTED TEAM</span><h2>{selectedTeam}</h2><p>{confirmed.length} confirmed · {activePlan.length} still planned · {offered.length} offers prepared · {Math.max(0, targetTotal - planned.length)} spaces remaining</p></div>
      <div className={`squad-health ${planned.length > targetTotal ? 'over' : planned.length === targetTotal ? 'complete' : ''}`}>
        {planned.length > targetTotal ? <AlertTriangle/> : <CheckCircle2/>}<b>{targetTotal ? Math.round((planned.length / targetTotal) * 100) : 0}%</b><span>{planned.length > targetTotal ? 'Over capacity' : planned.length === targetTotal ? 'Target reached' : 'Squad progress'}</span>
      </div>
    </section>

    <section className="confirmed-squad-panel">
      <div className="planner-panel-head"><div><span className="eyebrow">CONFIRMED SQUAD</span><h3>{confirmed.length} accepted player{confirmed.length===1?'':'s'}</h3><p>Players appear here as soon as their decision is changed to Offer accepted.</p></div>{isAdmin&&<span className="admin-finance-label">Administrator finance view</span>}</div>
      {confirmed.length?<div className="confirmed-squad-grid">{confirmed.sort((a,b)=>confirmedPosition(a).localeCompare(confirmedPosition(b))||a.name.localeCompare(b.name)).map(player=><ConfirmedPlayerCard key={player.id} player={player} isAdmin={isAdmin} finance={finances[player.id]} financeSettings={financeSettings} onOpen={()=>onOpenPlayer(player.id)}/>)}</div>:<div className="planner-empty compact"><CheckCircle2/><h4>No confirmed players yet</h4><p>Accepted offers for {selectedTeam} will be collected here automatically.</p></div>}
    </section>

    <TeamAttendancePanel team={selectedTeam} players={confirmed} sessions={sessions} onOpenPlayer={onOpenPlayer} onOpenSchedule={onOpenSchedule}/>

    <section className="planner-grid">
      <div className="planner-main">
        <article className="planner-panel position-planner">
          <div className="planner-panel-head"><div><span className="eyebrow">POSITION BALANCE</span><h3>Squad targets</h3><p>{editable?'Adjust targets and see shortages before making offers.':'Targets are controlled by this team’s assigned coach.'} Club minimum: {minimumSquadSize} players.</p></div><span className="planner-total">{planned.length}/{targetTotal}</span></div>
          <div className="position-table-wrap"><table className="position-table"><thead><tr><th>Position</th><th>Target</th><th>Recommended</th><th>Planned</th><th>Offered</th><th>Status</th></tr></thead><tbody>{positionRows.map(row => {const minimum=minimumTargetForPosition(targets,row.position);return <tr key={row.position}><td><b>{row.position}</b></td><td><div className="target-stepper"><button disabled={!editable||row.target<=minimum} aria-label={`Decrease ${row.position} target`} onClick={() => saveTarget(selectedTeam,row.position,row.target-1)}><Minus/></button><input disabled={!editable} aria-label={`${row.position} target`} type="number" min={minimum} max="99" value={row.target} onChange={event => saveTarget(selectedTeam,row.position,Number(event.target.value)||0)}/><button disabled={!editable} aria-label={`Increase ${row.position} target`} onClick={() => saveTarget(selectedTeam,row.position,row.target+1)}><Plus/></button></div></td><td>{row.recommendedCount}</td><td><strong>{row.plannedCount}</strong></td><td>{row.offeredCount}</td><td><span className={`capacity-status ${row.remaining < 0 ? 'over' : row.remaining === 0 ? 'full' : 'short'}`}>{row.remaining < 0 ? `${Math.abs(row.remaining)} over` : row.remaining === 0 ? 'On target' : `Need ${row.remaining}`}</span></td></tr>})}</tbody></table></div>
        </article>

        <article className="planner-panel">
          <div className="planner-panel-head"><div><span className="eyebrow">PLANNED SQUAD</span><h3>{activePlan.length} player{activePlan.length === 1 ? '' : 's'} still in planning</h3><p>Confirmed players are shown above and still count towards positional targets.</p></div></div>
          {activePlan.length ? <div className="planned-player-list">{activePlan.sort((a,b)=>(assignmentForTeam(a,selectedTeam)||a.position).localeCompare(assignmentForTeam(b,selectedTeam)||b.position)).map(player => <PlannedPlayerCard key={player.id} player={player} team={selectedTeam} editable={editable} moveTeams={editableTeams} onOpen={onOpenPlayer} onPosition={changePosition} onMove={movePlayer} onPrepareOffer={prepareOffer} onAddToTeam={addOfferedPlayerToTeam} onRemove={removeFromPlan}/>)}</div> : <div className="planner-empty"><Users/><h4>No players awaiting squad confirmation</h4><p>{editable?'Add candidates below or prepare offers from the plan.':'This team has no players still in planning.'}</p></div>}
        </article>
      </div>

      <aside className="planner-sidebar">
        <article className="planner-panel planner-guide"><span className="eyebrow">HOW IT WORKS</span><h3>Build before you offer</h3><ol><li><span>1</span>Select Offer or Strong offer.</li><li><span>2</span>Choose every suitable team.</li><li><span>3</span>Prepare and send the offer.</li></ol><p>Offer recommendations enter each suitable team’s planned squad automatically.</p></article>
        <article className="planner-panel warnings-panel"><span className="eyebrow">SQUAD CHECK</span><h3>Position alerts</h3><div>{positionRows.filter(row => row.remaining !== 0).map(row => <div className={row.remaining < 0 ? 'warning-over' : 'warning-short'} key={row.position}>{row.remaining < 0 ? <AlertTriangle/> : <ClipboardList/>}<span><b>{row.position}</b><small>{row.remaining < 0 ? `${Math.abs(row.remaining)} above target` : `${row.remaining} still needed`}</small></span></div>)}</div>{positionRows.every(row=>row.remaining===0)&&<div className="all-balanced"><CheckCircle2/>All positions are on target.</div>}</article>
      </aside>
    </section>

    <section className="candidate-sections">
      {groups.length ? groups.map(group => <article className={`candidate-group ${group.tone}`} key={group.title}><div className="candidate-group-head"><div><span className="eyebrow">{group.title.toUpperCase()}</span><h3>{group.players.length} player{group.players.length === 1 ? '' : 's'}</h3><p>{group.description}</p></div></div><div className="candidate-grid">{group.players.map(player => <CandidateCard key={player.id} player={player} onOpen={() => onOpenPlayer(player.id)}/>)}</div></article>) : <article className="planner-panel planner-empty"><CheckCircle2/><h4>Everyone relevant is already planned</h4><p>No additional candidates currently match {selectedTeam}.</p></article>}
    </section>
  </>
}

function TeamAttendancePanel({team,players,sessions,onOpenPlayer,onOpenSchedule}:{team:string;players:Player[];sessions:TrialSession[];onOpenPlayer:(id:string)=>void;onOpenSchedule:(id:string)=>void}){
  const today=new Date().toISOString().slice(0,10)
  const events=sessions.filter(session=>session.eventType!=='trial'&&session.teams.includes(team)&&session.date<=today).sort((a,b)=>`${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
  const marks=events.flatMap(session=>players.map(player=>session.attendance[player.id]||''))
  const present=marks.filter(status=>status==='present').length
  const absent=marks.filter(status=>status==='absent').length
  const excused=marks.filter(status=>status==='excused').length
  const recorded=present+absent+excused
  const rate=present+absent?Math.round((present/(present+absent))*100):0
  const playerRows=players.map(player=>{
    const statuses=events.map(event=>event.attendance[player.id]||'')
    const playerPresent=statuses.filter(status=>status==='present').length
    const playerAbsent=statuses.filter(status=>status==='absent').length
    const playerExcused=statuses.filter(status=>status==='excused').length
    const playerRate=playerPresent+playerAbsent?Math.round(playerPresent/(playerPresent+playerAbsent)*100):0
    return {player,present:playerPresent,absent:playerAbsent,excused:playerExcused,recorded:playerPresent+playerAbsent+playerExcused,rate:playerRate}
  }).sort((a,b)=>b.rate-a.rate||a.player.name.localeCompare(b.player.name))
  return <section className="team-attendance-panel"><header><div><span className="eyebrow">TEAM ATTENDANCE</span><h3>Training and game attendance</h3><p>Live statistics from completed calendar sessions for {team}. Excused absences are not counted against attendance rate.</p></div><TrendingUp/></header>{events.length?<><div className="team-attendance-stats"><span><CalendarDays/><b>{events.length}</b><small>Sessions</small></span><span><CheckCircle2/><b>{present}</b><small>Present marks</small></span><span><TrendingUp/><b>{rate}%</b><small>Attendance</small></span><span><ClipboardList/><b>{Math.max(0,events.length*players.length-recorded)}</b><small>Unmarked</small></span></div><div className="team-attendance-layout"><div className="attendance-history"><h4>Recent sessions</h4>{events.slice(0,8).map(event=>{const teamPlayers=players.filter(player=>event.attendance[player.id]);const eventPresent=teamPlayers.filter(player=>event.attendance[player.id]==='present').length;return <button key={event.id} onClick={()=>onOpenSchedule(event.id)}><span className={`event-kind ${event.eventType}`}>{event.eventType==='game'?'Game':'Training'}</span><span><b>{event.title}</b><small>{new Date(`${event.date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small></span><strong>{eventPresent}/{players.length}</strong><ArrowRight/></button>})}</div><div className="attendance-player-table"><h4>Player overview</h4><div className="attendance-table-wrap"><table><thead><tr><th>Player</th><th>Present</th><th>Absent</th><th>Excused</th><th>Rate</th></tr></thead><tbody>{playerRows.map(row=><tr key={row.player.id}><td><button onClick={()=>onOpenPlayer(row.player.id)}>{row.player.name}<small>{row.recorded}/{events.length} marked</small></button></td><td>{row.present}</td><td>{row.absent}</td><td>{row.excused}</td><td><strong className={row.rate>=80?'good':row.rate<60&&row.recorded?'low':''}>{row.recorded?`${row.rate}%`:'—'}</strong></td></tr>)}</tbody></table></div></div></div></>:<div className="planner-empty compact"><CalendarDays/><h4>No completed sessions yet</h4><p>Add training or games to the calendar, then record attendance inside the full-screen event.</p></div>}</section>
}

function ConfirmedPlayerCard({player,isAdmin,finance,financeSettings,onOpen}:{player:Player;isAdmin:boolean;finance:PlayerFinanceMap[string]|undefined;financeSettings:FinanceSettings;onOpen:()=>void}){
  const record=finance||emptyPlayerFinance(player.id)
  const amountOwed=effectiveAmountOwed(player,record,financeSettings)
  const status=paymentStatus(record,amountOwed)
  const deadline=paymentDeadlineDetails(record,amountOwed,financeSettings)
  return <button className="confirmed-player-card" onClick={onOpen}><div className="confirmed-player-icon"><Check/></div><div><b>{player.name}</b><span>{confirmedPosition(player)}{player.bibNumber?` · #${player.bibNumber}`:''}</span></div>{isAdmin?<div className="confirmed-finance"><span className={`finance-status ${deadline.state==='overdue'?'overdue':status.toLowerCase().replaceAll(' ','-')}`}>{deadline.state==='overdue'?'Payment overdue':status}</span><small>{deadline.state==='overdue'?deadline.label:`${formatCurrency(outstandingAmount(record,amountOwed))} outstanding`}</small></div>:<span className="confirmed-private">Confirmed</span>}<ArrowRight/></button>
}

function PlannedPlayerCard({ player, team, editable, moveTeams, onOpen, onPosition, onMove, onPrepareOffer, onAddToTeam, onRemove }: { player: Player; team: string; editable:boolean; moveTeams:string[]; onOpen: (id:string)=>void; onPosition:(player:Player,position:string)=>void; onMove:(player:Player,team:string)=>void; onPrepareOffer:(player:Player)=>void; onAddToTeam:(player:Player)=>void; onRemove:(player:Player)=>void }) {
  const rating = averageRating(player)
  const isOffered = Boolean(offerForTeam(player, team))
  const automaticallyPlanned=(player.recommendation==='Offer'||player.recommendation==='Strong offer')&&player.suitableTeams.includes(team)
  return <div className="planned-player-card">
    <button className="planner-player-identity" onClick={() => onOpen(player.id)}><div className="planner-avatar">{player.bibNumber ? `#${player.bibNumber}` : player.name.split(' ').map(part=>part[0]).join('').slice(0,2)}</div><div><b>{player.name}</b><span>{rating ? <><Star/>{rating.toFixed(1)}</> : 'Not assessed'} · {player.recommendation || 'No recommendation'}</span></div><ArrowRight/></button>
    <label>Position<select disabled={!editable} aria-label={`${player.name} planned position`} value={assignmentForTeam(player,team)||player.position} onChange={event => onPosition(player,event.target.value)}>{positions.map(position=><option key={position}>{position}</option>)}</select></label>
    <label>Team<select disabled={!editable} aria-label={`Move ${player.name} to team`} value={team} onChange={event => onMove(player,event.target.value)}><option>{team}</option>{moveTeams.filter(item=>item!==team).map(item=><option key={item}>{item}</option>)}</select></label>
    <div className="planned-actions">{isOffered ? <><span className="offer-ready-chip"><Check/> {player.decision}</span>{editable&&player.decision==='Offer sent'&&<button className="accept-offer" onClick={()=>onAddToTeam(player)}><UserPlus/>Add to team</button>}</> : editable?<button className="prepare-offer" onClick={() => onPrepareOffer(player)}><MailPlus/>Prepare offer</button>:<span className="view-only-chip"><Lock/>View only</span>}{!isOffered && editable && !automaticallyPlanned && <button className="remove-plan" aria-label={`Remove ${player.name} from plan`} title="Remove from plan" onClick={() => onRemove(player)}><X/></button>}</div>
  </div>
}

function CandidateCard({ player, onOpen }: { player: Player; onOpen:()=>void }) {
  const rating = averageRating(player)
  return <div className="candidate-card"><button className="candidate-profile" onClick={onOpen}><div className="planner-avatar">{player.bibNumber ? `#${player.bibNumber}` : player.name.split(' ').map(part=>part[0]).join('').slice(0,2)}</div><div><b>{player.name}</b><span>{player.position} · {player.interestedDivisions} applicant</span><small>{rating ? <><Star/>{rating.toFixed(1)}</> : 'Not assessed'} · {player.recommendation || 'No recommendation'}</small></div></button><button className="add-plan" onClick={onOpen}><ArrowRight/>Open player</button></div>
}
