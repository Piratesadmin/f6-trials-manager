import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ClipboardList, MailPlus, Minus, Plus, Star, UserPlus, Users, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { positions, teams } from '../data/constants'
import type { Player, TeamPlans } from '../types'
import { averageRating } from '../utils/player'
import { assignmentForTeam, isPlannedForTeam, offeredTeam, recommendationMatchesTeam } from '../utils/teamPlanner'

type Props = {
  players: Player[]
  teamPlans: TeamPlans
  savePlayer: (player: Player) => void
  saveTarget: (team: string, position: string, target: number) => void
  onOpenPlayer: (id: string) => void
}

type CandidateGroup = {
  title: string
  description: string
  players: Player[]
  tone: string
}

export function TeamsPage({ players, teamPlans, savePlayer, saveTarget, onOpenPlayer }: Props) {
  const [selectedTeam, setSelectedTeam] = useState(teams[0])
  const targets = teamPlans[selectedTeam]
  const planned = useMemo(() => players.filter(player => isPlannedForTeam(player, selectedTeam)), [players, selectedTeam])
  const targetTotal = positions.reduce((total, position) => total + (targets?.[position] || 0), 0)
  const offered = planned.filter(player => offeredTeam(player) === selectedTeam)

  const positionRows = positions.map(position => {
    const target = targets?.[position] || 0
    const positionFor = (player: Player) => assignmentForTeam(player, selectedTeam) || player.position
    const plannedCount = planned.filter(player => positionFor(player) === position).length
    const offeredCount = offered.filter(player => (player.offeredPosition || positionFor(player)) === position).length
    const recommendedCount = players.filter(player => ['Strong offer','Offer'].includes(player.recommendation) && recommendationMatchesTeam(player, selectedTeam) && positionFor(player) === position).length
    const remaining = target - plannedCount
    return { position, target, plannedCount, offeredCount, recommendedCount, remaining }
  })

  const unplanned = players.filter(player => !isPlannedForTeam(player, selectedTeam) && player.recommendation !== 'Not suitable')
  const assigned = new Set<string>()
  const take = (predicate: (player: Player) => boolean) => unplanned.filter(player => !assigned.has(player.id) && predicate(player)).map(player => { assigned.add(player.id); return player })
  const groups: CandidateGroup[] = [
    { title: 'Recommended', description: 'Strong offer and offer recommendations relevant to this team.', players: take(player => ['Strong offer','Offer'].includes(player.recommendation) && recommendationMatchesTeam(player, selectedTeam)), tone: 'recommended' },
    { title: 'Referred players', description: 'Players assessed as suitable for this team after applying elsewhere.', players: take(player => player.suitableTeams.includes(selectedTeam) && player.appliedTeam !== selectedTeam), tone: 'referred' },
    { title: 'Waiting list', description: 'Players held as a possible next choice.', players: take(player => player.recommendation === 'Waiting list' && recommendationMatchesTeam(player, selectedTeam)), tone: 'waiting' },
    { title: 'Needs discussion', description: 'Players needing a committee or coaching conversation.', players: take(player => player.recommendation === 'Needs discussion' && recommendationMatchesTeam(player, selectedTeam)), tone: 'discussion' },
    { title: 'Other applicants', description: 'Unplanned applicants who selected this team.', players: take(player => player.appliedTeam === selectedTeam), tone: 'applicants' },
  ].filter(group => group.players.length)

  const addToPlan = (player: Player) => savePlayer({ ...player, teamConsideration: { ...player.teamConsideration, [selectedTeam]: player.position } })
  const removeFromPlan = (player: Player) => {
    const teamConsideration = { ...player.teamConsideration }
    delete teamConsideration[selectedTeam]
    savePlayer({ ...player, teamConsideration })
  }
  const changePosition = (player: Player, position: string) => {
    const update: Player = { ...player, teamConsideration: { ...player.teamConsideration, [selectedTeam]: position } }
    if (offeredTeam(player) === selectedTeam) update.offeredPosition = position
    savePlayer(update)
  }
  const movePlayer = (player: Player, destination: string) => {
    if (destination === selectedTeam) return
    const currentPosition = assignmentForTeam(player, selectedTeam) || player.position
    const teamConsideration = { ...player.teamConsideration }
    delete teamConsideration[selectedTeam]
    teamConsideration[destination] = currentPosition
    const update: Player = { ...player, teamConsideration }
    if (offeredTeam(player) === selectedTeam) {
      update.offeredTeam = destination
      update.decision = player.appliedTeam === destination ? 'Offer planned' : 'Alternative offer'
      update.emailReviewStatus = 'draft'
    }
    savePlayer(update)
  }
  const prepareOffer = (player: Player) => {
    const position = assignmentForTeam(player, selectedTeam) || player.position
    savePlayer({
      ...player,
      decision: player.appliedTeam === selectedTeam ? 'Offer planned' : 'Alternative offer',
      offeredTeam: selectedTeam,
      offeredPosition: position,
      emailReviewStatus: 'draft',
      teamConsideration: { ...player.teamConsideration, [selectedTeam]: position },
    })
  }

  return <>
    <PageHeader title="Team planner" subtitle="Build balanced squads from coach assessments, referrals and planned offers."/>

    <section className="planner-team-strip" aria-label="Choose a team">
      {teams.map(team => {
        const teamTargets = teamPlans[team]
        const teamTarget = positions.reduce((total, position) => total + (teamTargets?.[position] || 0), 0)
        const teamPlanned = players.filter(player => isPlannedForTeam(player, team)).length
        return <button key={team} className={selectedTeam === team ? 'active' : ''} onClick={() => setSelectedTeam(team)}>
          <span>{team}</span><b>{teamPlanned}/{teamTarget}</b><small>{teamPlanned > teamTarget ? `${teamPlanned - teamTarget} over target` : `${Math.max(0, teamTarget - teamPlanned)} spaces`}</small>
        </button>
      })}
    </section>

    <section className="planner-heading-card">
      <div><span className="eyebrow">SELECTED TEAM</span><h2>{selectedTeam}</h2><p>{planned.length} planned · {offered.length} offers prepared · {Math.max(0, targetTotal - planned.length)} spaces remaining</p></div>
      <div className={`squad-health ${planned.length > targetTotal ? 'over' : planned.length === targetTotal ? 'complete' : ''}`}>
        {planned.length > targetTotal ? <AlertTriangle/> : <CheckCircle2/>}<b>{targetTotal ? Math.round((planned.length / targetTotal) * 100) : 0}%</b><span>{planned.length > targetTotal ? 'Over capacity' : planned.length === targetTotal ? 'Target reached' : 'Squad progress'}</span>
      </div>
    </section>

    <section className="planner-grid">
      <div className="planner-main">
        <article className="planner-panel position-planner">
          <div className="planner-panel-head"><div><span className="eyebrow">POSITION BALANCE</span><h3>Squad targets</h3><p>Adjust targets and see shortages before making offers.</p></div><span className="planner-total">{planned.length}/{targetTotal}</span></div>
          <div className="position-table-wrap"><table className="position-table"><thead><tr><th>Position</th><th>Target</th><th>Recommended</th><th>Planned</th><th>Offered</th><th>Status</th></tr></thead><tbody>{positionRows.map(row => <tr key={row.position}><td><b>{row.position}</b></td><td><div className="target-stepper"><button aria-label={`Decrease ${row.position} target`} onClick={() => saveTarget(selectedTeam,row.position,Math.max(0,row.target-1))}><Minus/></button><input aria-label={`${row.position} target`} type="number" min="0" max="99" value={row.target} onChange={event => saveTarget(selectedTeam,row.position,Math.max(0,Math.min(99,Number(event.target.value)||0)))}/><button aria-label={`Increase ${row.position} target`} onClick={() => saveTarget(selectedTeam,row.position,Math.min(99,row.target+1))}><Plus/></button></div></td><td>{row.recommendedCount}</td><td><strong>{row.plannedCount}</strong></td><td>{row.offeredCount}</td><td><span className={`capacity-status ${row.remaining < 0 ? 'over' : row.remaining === 0 ? 'full' : 'short'}`}>{row.remaining < 0 ? `${Math.abs(row.remaining)} over` : row.remaining === 0 ? 'On target' : `Need ${row.remaining}`}</span></td></tr>)}</tbody></table></div>
        </article>

        <article className="planner-panel">
          <div className="planner-panel-head"><div><span className="eyebrow">PLANNED SQUAD</span><h3>{planned.length} player{planned.length === 1 ? '' : 's'} in the plan</h3><p>Positions and team moves update the balance above immediately.</p></div></div>
          {planned.length ? <div className="planned-player-list">{planned.sort((a,b)=>(assignmentForTeam(a,selectedTeam)||a.position).localeCompare(assignmentForTeam(b,selectedTeam)||b.position)).map(player => <PlannedPlayerCard key={player.id} player={player} team={selectedTeam} onOpen={onOpenPlayer} onPosition={changePosition} onMove={movePlayer} onPrepareOffer={prepareOffer} onRemove={removeFromPlan}/>)}</div> : <div className="planner-empty"><Users/><h4>No players planned yet</h4><p>Add recommended players or applicants from the sections below.</p></div>}
        </article>
      </div>

      <aside className="planner-sidebar">
        <article className="planner-panel planner-guide"><span className="eyebrow">HOW IT WORKS</span><h3>Build before you offer</h3><ol><li><span>1</span>Add players to the plan.</li><li><span>2</span>Balance each position.</li><li><span>3</span>Prepare offers when ready.</li></ol><p>Adding someone to the plan does not send or mark an email.</p></article>
        <article className="planner-panel warnings-panel"><span className="eyebrow">SQUAD CHECK</span><h3>Position alerts</h3><div>{positionRows.filter(row => row.remaining !== 0).map(row => <div className={row.remaining < 0 ? 'warning-over' : 'warning-short'} key={row.position}>{row.remaining < 0 ? <AlertTriangle/> : <ClipboardList/>}<span><b>{row.position}</b><small>{row.remaining < 0 ? `${Math.abs(row.remaining)} above target` : `${row.remaining} still needed`}</small></span></div>)}</div>{positionRows.every(row=>row.remaining===0)&&<div className="all-balanced"><CheckCircle2/>All positions are on target.</div>}</article>
      </aside>
    </section>

    <section className="candidate-sections">
      {groups.length ? groups.map(group => <article className={`candidate-group ${group.tone}`} key={group.title}><div className="candidate-group-head"><div><span className="eyebrow">{group.title.toUpperCase()}</span><h3>{group.players.length} player{group.players.length === 1 ? '' : 's'}</h3><p>{group.description}</p></div></div><div className="candidate-grid">{group.players.map(player => <CandidateCard key={player.id} player={player} onAdd={() => addToPlan(player)} onOpen={() => onOpenPlayer(player.id)}/>)}</div></article>) : <article className="planner-panel planner-empty"><CheckCircle2/><h4>Everyone relevant is already planned</h4><p>No additional candidates currently match {selectedTeam}.</p></article>}
    </section>
  </>
}

function PlannedPlayerCard({ player, team, onOpen, onPosition, onMove, onPrepareOffer, onRemove }: { player: Player; team: string; onOpen: (id:string)=>void; onPosition:(player:Player,position:string)=>void; onMove:(player:Player,team:string)=>void; onPrepareOffer:(player:Player)=>void; onRemove:(player:Player)=>void }) {
  const rating = averageRating(player)
  const isOffered = offeredTeam(player) === team
  return <div className="planned-player-card">
    <button className="planner-player-identity" onClick={() => onOpen(player.id)}><div className="planner-avatar">{player.bibNumber ? `#${player.bibNumber}` : player.name.split(' ').map(part=>part[0]).join('').slice(0,2)}</div><div><b>{player.name}</b><span>{rating ? <><Star/>{rating.toFixed(1)}</> : 'Not assessed'} · {player.recommendation || 'No recommendation'}</span></div><ArrowRight/></button>
    <label>Position<select aria-label={`${player.name} planned position`} value={assignmentForTeam(player,team)||player.position} onChange={event => onPosition(player,event.target.value)}>{positions.map(position=><option key={position}>{position}</option>)}</select></label>
    <label>Team<select aria-label={`Move ${player.name} to team`} value={team} onChange={event => onMove(player,event.target.value)}>{teams.map(item=><option key={item}>{item}</option>)}</select></label>
    <div className="planned-actions">{isOffered ? <span className="offer-ready-chip"><Check/> {player.decision}</span> : <button className="prepare-offer" onClick={() => onPrepareOffer(player)}><MailPlus/>Prepare offer</button>}{!isOffered && <button className="remove-plan" aria-label={`Remove ${player.name} from plan`} title="Remove from plan" onClick={() => onRemove(player)}><X/></button>}</div>
  </div>
}

function CandidateCard({ player, onAdd, onOpen }: { player: Player; onAdd:()=>void; onOpen:()=>void }) {
  const rating = averageRating(player)
  return <div className="candidate-card"><button className="candidate-profile" onClick={onOpen}><div className="planner-avatar">{player.bibNumber ? `#${player.bibNumber}` : player.name.split(' ').map(part=>part[0]).join('').slice(0,2)}</div><div><b>{player.name}</b><span>{player.position} · {player.appliedTeam} applicant</span><small>{rating ? <><Star/>{rating.toFixed(1)}</> : 'Not assessed'} · {player.recommendation || 'No recommendation'}</small></div></button><button className="add-plan" onClick={onAdd}><UserPlus/>Add to plan</button></div>
}
