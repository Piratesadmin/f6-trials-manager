import { Check, Layers3, Plus, Trash2 } from 'lucide-react'
import { positions, squadRoles, teams } from '../data/constants'
import type { Player, PlayerOffer } from '../types'
import { teamMatchesInterestedDivisions } from '../utils/division'
import { defaultSquadRole } from '../utils/offers'
import { confirmedTeamAssignments } from '../utils/player'

type Props = {
  player: Player
  save: (player: Player) => void | Promise<void>
  compact?: boolean
  disabled?: boolean
  teamDivisions: Record<string,string>
}

export function OfferOptionsEditor({ player, save, compact = false, disabled = false, teamDivisions }: Props) {
  const offers=player.offers||[]
  const accepted=player.decision==='Offer accepted'
  const saveOffers=(next:PlayerOffer[],preferredTeam=player.offeredTeam)=>{
    if(disabled)return
    const primary=next.find(offer=>offer.team===preferredTeam)||next[0]
    const consideration={...player.teamConsideration}
    next.forEach(offer=>{consideration[offer.team]=offer.position})
    const changedSentOffer=player.decision==='Offer sent'
    const recommendationStartsOffer=player.decision==='Awaiting decision'&&next.length>0&&(player.recommendation==='Strong offer'||player.recommendation==='Offer'||player.recommendation==='Refer to another team')
    const startsOrReopensOffer=changedSentOffer||recommendationStartsOffer
    const decision=startsOrReopensOffer?(player.recommendation==='Refer to another team'||!next.some(offer=>teamMatchesInterestedDivisions(player,offer.team,teamDivisions))?'Alternative offer':'Offer planned'):player.decision
    save({...player,offers:next,offeredTeam:primary?.team||'',offeredPosition:primary?.position||'',teamConsideration:consideration,decision,emailReviewStatus:'draft'})
  }
  const toggleTeam=(team:string)=>{
    const current=offers.find(offer=>offer.team===team)
    if(current)saveOffers(offers.filter(offer=>offer.team!==team))
    else saveOffers([...offers,{team,position:player.teamConsideration[team]||player.position||'All-rounder',squadRole:defaultSquadRole,includeSquadRole:true}],player.offeredTeam||team)
  }
  const updateOffer=(team:string,field:'position'|'squadRole',value:string)=>{
    const next=offers.map(offer=>offer.team===team?{...offer,[field]:value}:offer) as PlayerOffer[]
    saveOffers(next)
  }
  const updateSquadRoleVisibility=(team:string,includeSquadRole:boolean)=>{
    saveOffers(offers.map(offer=>offer.team===team?{...offer,includeSquadRole}:offer))
  }
  if(accepted){const assignments=Object.entries(confirmedTeamAssignments(player));return <section className="accepted-offer-choice"><div><Check/><span><b>Confirmed squad{assignments.length===1?'':'s'}</b><small>Team membership is managed from the Team Planner.</small></span></div><div className="accepted-team-list">{assignments.map(([team,position])=>{const offer=offers.find(item=>item.team===team);return <span key={team}><b>{team}</b><small>{position}{offer?.squadRole?` · ${offer.squadRole}`:''}</small></span>})}</div>{!assignments.length&&<p>No confirmed team assignment exists yet. Add the player from the Team Planner.</p>}</section>}

  return <section className={`offer-options-editor ${compact?'compact':''}`}>
    <header><div><span className="eyebrow">TEAM OFFER OPTIONS</span><h3><Layers3/>Offer one or more teams</h3><p>Set each team's playing position and squad role, then choose whether the role should appear in the email.</p></div><strong>{offers.length} selected</strong></header>
    <div className="offer-team-selector">{teams.map(team=><button type="button" disabled={disabled} key={team} className={offers.some(offer=>offer.team===team)?'selected':''} onClick={()=>toggleTeam(team)}>{offers.some(offer=>offer.team===team)?<Check/>:<Plus/>}{team}</button>)}</div>
    {offers.length?<div className="offer-option-list">{offers.map((offer,index)=><article key={offer.team}><div className="offer-option-number">{index+1}</div><div className="offer-option-title"><b>{offer.team}</b><small>{teamMatchesInterestedDivisions(player,offer.team,teamDivisions)?'Matches interested division':'Alternative division option'}{teamDivisions[offer.team]?` · ${teamDivisions[offer.team]}`:''}</small></div><label>Position<select disabled={disabled} value={offer.position} onChange={event=>updateOffer(offer.team,'position',event.target.value)}>{positions.map(position=><option key={position}>{position}</option>)}</select></label><div className="offer-role-field"><label>Squad role<select disabled={disabled} value={offer.squadRole} onChange={event=>updateOffer(offer.team,'squadRole',event.target.value)}>{squadRoles.map(role=><option key={role}>{role}</option>)}</select></label><label className="offer-role-toggle"><input type="checkbox" disabled={disabled} checked={offer.includeSquadRole} onChange={event=>updateSquadRoleVisibility(offer.team,event.target.checked)}/><span>Include squad role in email</span></label></div><button className="remove-offer-option" disabled={disabled} type="button" onClick={()=>toggleTeam(offer.team)} aria-label={`Remove ${offer.team} offer`}><Trash2/></button></article>)}</div>:<div className="offer-options-empty"><Layers3/><b>No team selected</b><span>Choose at least one team before reviewing the offer email.</span></div>}
  </section>
}
