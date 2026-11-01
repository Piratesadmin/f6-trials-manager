import { useEffect, useState, type FormEvent } from 'react'
import { ChevronRight, Filter, Search, Star, UserPlus, X } from 'lucide-react'
import type { Player, PlayerDecisionDraft, PlayerDecisionSaveResult, PlayerStars, PlayerTab, TrialSession } from '../types'
import { averageRating, averageRatingOutOfTen, confirmedPositionForTeam, confirmedTeamNames, formatPlayerRating, isConfirmedForTeam, trialRegistrationsFor } from '../utils/player'
import { PageHeader } from '../components/PageHeader'
import { PlayerProfile } from '../components/PlayerProfile'
import { activeFilterCount, emptyPlayerFilters, PlayerFilters, type PlayerFilterValues } from '../components/PlayerFilters'
import { decisionReminderDetailText, decisionReminderDetails } from '../utils/deadline'
import { divisionValues, playerMatchesDivision } from '../utils/division'
import { positions } from '../data/constants'

type Props = {
  players: Player[]
  sessions: TrialSession[]
  selectedId: string
  openPlayer: (id: string, tab: PlayerTab) => void
  query: string
  setQuery: (query: string) => void
  assignedTeams: string[]
  teamDivisions: Record<string,string>
  save: (player: Player) => void
  saveDecision: (playerId: string, expected: PlayerDecisionDraft, next: PlayerDecisionDraft) => Promise<PlayerDecisionSaveResult>
  saveAssessment: (player: Player) => Promise<void>
  onImport: () => void
  onCreate: (details:{name:string;email:string;team:string;position:string}) => Promise<void>
  activeTab: PlayerTab
  setActiveTab: (tab: PlayerTab) => void
  playerStars: PlayerStars
  currentCoachId: string
  toggleStar: (playerId: string) => void | Promise<void>
  selectedPhoto: string
  uploadPhoto: (player: Player, file: File) => Promise<void>
  removePhoto: (player: Player) => Promise<void>
  deletePlayer: (player: Player) => Promise<void>
  isAdmin: boolean
  readOnly: boolean
  trialsMode: boolean
}

const recommendationClass = (recommendation: Player['recommendation']) => recommendation ? `recommendation-${recommendation.toLowerCase().replaceAll(' ', '-')}` : 'recommendation-none'

export function PlayersPage({ players, sessions, selectedId, openPlayer, query, setQuery, assignedTeams, teamDivisions, save, saveDecision, saveAssessment, onImport, onCreate, activeTab, setActiveTab, playerStars, currentCoachId, toggleStar, selectedPhoto, uploadPhoto, removePhoto, deletePlayer, isAdmin, readOnly, trialsMode }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<PlayerFilterValues>(emptyPlayerFilters)
  const [divisionFilter,setDivisionFilter]=useState('assigned')
  const [teamFilter,setTeamFilter]=useState('all')
  const [positionFilter,setPositionFilter]=useState('all')
  const [minimumRating,setMinimumRating]=useState(0)
  const [sortOrder,setSortOrder]=useState<'name'|'rating-high'|'rating-low'|'team'>('name')
  const [createOpen,setCreateOpen]=useState(false)
  useEffect(()=>{if(!trialsMode&&!['overview','assessment'].includes(activeTab))setActiveTab('overview')},[trialsMode,activeTab,setActiveTab])
  const assignedDivisions=Array.from(new Set(assignedTeams.flatMap(team=>{const division=teamDivisions[team]?.trim();return division?[division]:[]})))
  const divisionOptions=Array.from(new Set([...Object.values(teamDivisions),...players.flatMap(player=>divisionValues(player.interestedDivisions))].map(value=>value.trim()).filter(Boolean))).sort((left,right)=>left.localeCompare(right))
  const search = query.trim().toLowerCase()
  const filtered = players.filter(player => {
    const selectedDivision=divisionFilter.startsWith('division:')?divisionFilter.slice('division:'.length):''
    const matchesDivision=trialsMode?(divisionFilter==='all'||(divisionFilter==='assigned'?(assignedDivisions.length===0||assignedDivisions.some(division=>playerMatchesDivision(player,division,teamDivisions))):playerMatchesDivision(player,selectedDivision,teamDivisions))):(teamFilter==='all'||isConfirmedForTeam(player,teamFilter))
    const registrations=Object.values(trialRegistrationsFor(player))
    const matchesStarred = !filters.starredOnly || Boolean(playerStars[player.id])
    const matchesPosition = trialsMode?(!filters.positions.length || filters.positions.includes(player.position)):(positionFilter==='all'||(teamFilter==='all'?player.position===positionFilter:confirmedPositionForTeam(player,teamFilter)===positionFilter))
    const matchesAttendance = filters.attendance === 'all' || (filters.attendance === 'attended' ? registrations.some(registration=>registration.attended) : !registrations.some(registration=>registration.attended))
    const matchesPayment = filters.payment === 'all' || (filters.payment === 'paid' ? registrations.some(registration=>registration.paid) : !registrations.some(registration=>registration.paid))
    const matchesSession = filters.sessionId === 'all' || (filters.sessionId === 'unassigned' ? registrations.length===0 : Boolean(trialRegistrationsFor(player)[filters.sessionId]))
    const matchesResponse = filters.responseStatus === 'all' || registrations.some(registration=>registration.responseStatus===filters.responseStatus)
    const rating = averageRating(player)
    const matchesAssessment = filters.assessment === 'all' || (filters.assessment === 'assessed' ? rating > 0 : rating === 0)
    const matchesRecommendation = filters.recommendation === 'all' || player.recommendation === filters.recommendation
    const matchesDecision = filters.decision === 'all' || player.decision === filters.decision
    const matchesRating = trialsMode?!filters.minimumRating || averageRatingOutOfTen(player) >= filters.minimumRating:averageRatingOutOfTen(player)>=minimumRating
    const searchable = `${player.name} ${player.email} ${player.position} ${player.secondaryPosition} ${player.bibNumber} ${player.recommendation} ${player.interestedDivisions} ${player.playingExperience} ${player.highestLevelPlayed} ${player.trialDate}`.toLowerCase()
    return matchesDivision && (trialsMode?matchesStarred && matchesAttendance && matchesPayment && matchesSession && matchesResponse && matchesAssessment && matchesRecommendation && matchesDecision:true) && matchesPosition && matchesRating && searchable.includes(search)
  })
  const orderedPlayers=[...filtered].sort((a,b)=>sortOrder==='rating-high'?averageRatingOutOfTen(b)-averageRatingOutOfTen(a)||a.name.localeCompare(b.name):sortOrder==='rating-low'?averageRatingOutOfTen(a)-averageRatingOutOfTen(b)||a.name.localeCompare(b.name):sortOrder==='team'?(confirmedTeamNames(a).join(', ').localeCompare(confirmedTeamNames(b).join(', '))||a.name.localeCompare(b.name)):a.name.localeCompare(b.name))
  const selected = filtered.find(player => player.id === selectedId) || filtered[0]
  const extraFilterCount = activeFilterCount(filters)
  useEffect(()=>{
    if(selected&&selected.id!==selectedId)openPlayer(selected.id,activeTab)
  },[selected,selectedId,activeTab,openPlayer])

  const selectPlayer = (id: string) => {
    openPlayer(id,trialsMode ? 'decision' : 'overview')
  }

  return <>
    <PageHeader title="Players" subtitle={readOnly?'View player profiles and assessments.':trialsMode?'Review profiles, record shared assessments and prepare decisions.':'View and maintain the club’s active player records.'} action={!readOnly?<div className="player-page-actions">{trialsMode&&<button className="secondary" onClick={onImport}>Import players / schedule</button>}<button className="primary" onClick={()=>setCreateOpen(true)}><UserPlus/>Add player manually</button></div>:undefined}/>
    <section className="workspace player-workspace">
      <div className="list-panel">
        <div className="toolbar">
          <label><Search/><input placeholder="Search name, bib or position" value={query} onChange={event => setQuery(event.target.value)}/></label>
          {trialsMode?<><select className="division-filter" value={divisionFilter} onChange={event=>setDivisionFilter(event.target.value)} aria-label="Filter players by division"><option value="assigned">My Teams</option><option value="all">All divisions</option>{divisionOptions.map(division=><option value={`division:${division}`} key={division}>{division}</option>)}</select><button className={`icon filter-trigger ${filtersOpen || extraFilterCount ? 'active' : ''}`} aria-label="Player filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><Filter/>{extraFilterCount > 0 && <span>{extraFilterCount}</span>}</button></>:<><select className="division-filter" value={teamFilter} onChange={event=>setTeamFilter(event.target.value)} aria-label="Filter players by team"><option value="all">All teams</option>{assignedTeams.map(team=><option key={team} value={team}>{team}</option>)}</select><select className="division-filter" value={positionFilter} onChange={event=>setPositionFilter(event.target.value)} aria-label="Filter players by position"><option value="all">All positions</option>{positions.map(position=><option key={position} value={position}>{position}</option>)}</select><select className="division-filter" value={minimumRating} onChange={event=>setMinimumRating(Number(event.target.value))} aria-label="Filter players by minimum rating"><option value={0}>Any rating</option>{Array.from({length:10},(_,index)=><option key={index+1} value={index+1}>{index+1}+ rating</option>)}</select><select className="division-filter" value={sortOrder} onChange={event=>setSortOrder(event.target.value as typeof sortOrder)} aria-label="Sort players"><option value="name">Name A–Z</option><option value="rating-high">Rating high–low</option><option value="rating-low">Rating low–high</option><option value="team">Team A–Z</option></select></>}
        </div>
        {trialsMode && filtersOpen ? <PlayerFilters filters={filters} setFilters={setFilters} sessions={sessions} onClose={() => setFiltersOpen(false)}/> : null}
        <div className="list-summary"><span>{filtered.length} of {players.length} player{players.length === 1 ? '' : 's'}</span>{trialsMode?((divisionFilter!=='all'&&(divisionFilter!=='assigned'||assignedDivisions.length>0)) || extraFilterCount > 0)&&<button onClick={() => { setDivisionFilter('all'); setFilters(emptyPlayerFilters) }}>Clear all filters</button>:((teamFilter!=='all'||positionFilter!=='all'||minimumRating>0)&&<button onClick={()=>{setTeamFilter('all');setPositionFilter('all');setMinimumRating(0)}}>Clear filters</button>)}</div>
        <div className="rows player-cards">
          {orderedPlayers.map(player => {
            const starred=Boolean(playerStars[player.id])
            const decisionReminder=decisionReminderDetails(player,sessions)
            const trialEventCount=Object.keys(trialRegistrationsFor(player)).length
            return <div key={player.id} className={`player-row player-card ${selected?.id === player.id ? 'selected' : ''}`}>
              {!readOnly&&<button className={`player-star-toggle ${starred?'starred':''}`} aria-label={`${starred?'Remove':'Add'} ${player.name} ${currentCoachId==='local-demo'?'from the demo shortlist':'from my starred players'}`} title={starred?'Remove from my starred players':'Add to my starred players'} onClick={()=>toggleStar(player.id)}><Star/></button>}
              <button className="player-card-open" onClick={() => selectPlayer(player.id)}>
                <div className="player-rating"><Star/><b>{formatPlayerRating(player)}</b></div>
                <div className="player-main"><div><b>{player.name}</b>{player.returningPlayer&&<span className="returning-player-badge compact">Returning</span>}{player.bibNumber && <span className="list-bib">#{player.bibNumber}</span>}</div><span>{player.interestedDivisions} · {player.position}{player.secondaryPosition?` / ${player.secondaryPosition}`:''}{trialEventCount?` · ${trialEventCount} trial event${trialEventCount===1?'':'s'}`:''}</span>{decisionReminder.state!=='none'?<small className={`decision-reminder-badge ${decisionReminder.state}`} title={decisionReminderDetailText(decisionReminder)}>{decisionReminder.label}</small>:<small className={`recommendation-badge ${player.decision==='Offer accepted'?'recommendation-offer-accepted':recommendationClass(player.recommendation)}`}>{player.decision==='Offer accepted'?'Offer accepted':player.recommendation || player.decision}</small>}</div>
                <ChevronRight/>
              </button>
            </div>
          })}
          {!filtered.length && <div className="empty-state compact">No players match these filters.</div>}
        </div>
      </div>
      {selected?<PlayerProfile player={selected} sessions={sessions} activeTab={activeTab} setActiveTab={setActiveTab} save={save} saveDecision={saveDecision} saveAssessment={saveAssessment} starred={Boolean(playerStars[selected.id])} toggleStar={()=>toggleStar(selected.id)} photo={selectedPhoto||selected.photoUrl} uploadPhoto={uploadPhoto} removePhoto={removePhoto} deletePlayer={deletePlayer} isAdmin={isAdmin} readOnly={readOnly} trialsMode={trialsMode}/>:<div className="empty-state">No players match these filters.</div>}
    </section>
    {createOpen&&<ManualPlayerModal availableTeams={assignedTeams} onClose={()=>setCreateOpen(false)} onCreate={onCreate}/>}
  </>
}

function ManualPlayerModal({availableTeams,onClose,onCreate}:{availableTeams:string[];onClose:()=>void;onCreate:(details:{name:string;email:string;team:string;position:string})=>Promise<void>}){
  const[name,setName]=useState('')
  const[email,setEmail]=useState('')
  const[team,setTeam]=useState(availableTeams[0]||'')
  const[position,setPosition]=useState(positions[0])
  const[busy,setBusy]=useState(false)
  const[error,setError]=useState('')
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    setBusy(true);setError('')
    try{await onCreate({name:name.trim(),email:email.trim(),team,position});onClose()}
    catch(caught){setError(caught instanceof Error?caught.message:'Unable to add this player.')}
    finally{setBusy(false)}
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&!busy&&onClose()}><section className="signup-status-modal manual-player-modal" role="dialog" aria-modal="true" aria-labelledby="manual-player-title"><header><div><span className="eyebrow">CLUB PLAYER</span><h2 id="manual-player-title">Add player manually</h2><p>This adds them as a confirmed player on the selected team.</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close"><X/></button></header><form onSubmit={submit}><label>Player name<input autoFocus required value={name} onChange={event=>setName(event.target.value)} placeholder="Full name"/></label><label>Email address<input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="Optional"/></label><label>Team<select required value={team} onChange={event=>setTeam(event.target.value)}><option value="" disabled>Select a team</option>{availableTeams.map(item=><option key={item} value={item}>{item}</option>)}</select></label><label>Position<select value={position} onChange={event=>setPosition(event.target.value)}>{positions.map(item=><option key={item} value={item}>{item}</option>)}</select></label>{error&&<div className="signup-error">{error}</div>}<footer><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="primary" disabled={busy||!availableTeams.length}>{busy?'Adding…':'Add player'}</button></footer></form></section></div>
}
