import { Check, Layers3, Plus, Trash2 } from 'lucide-react'
import { positions, squadRoles, teams } from '../data/constants'
import type { Player, PlayerOffer } from '../types'
import { defaultSquadRole, primaryOffer } from '../utils/offers'

type Props = {
  player: Player
  save: (player: Player) => void | Promise<void>
  compact?: boolean
}

export function OfferOptionsEditor({ player, save, compact = false }: Props) {
  const offers=player.offers||[]
  const accepted=player.decision==='Offer accepted'
  const saveOffers=(next:PlayerOffer[],preferredTeam=player.offeredTeam)=>{
    const primary=next.find(offer=>offer.team===preferredTeam)||next[0]
    const consideration={...player.teamConsideration}
    next.forEach(offer=>{consideration[offer.team]=offer.position})
    const changedSentOffer=player.decision==='Offer sent'
    const decision=changedSentOffer?(next.some(offer=>offer.team===player.appliedTeam)?'Offer planned':'Alternative offer'):player.decision
    save({...player,offers:next,offeredTeam:primary?.team||'',offeredPosition:primary?.position||'',teamConsideration:consideration,decision,emailReviewStatus:changedSentOffer?'draft':player.emailReviewStatus})
  }
  const toggleTeam=(team:string)=>{
    const current=offers.find(offer=>offer.team===team)
    if(current)saveOffers(offers.filter(offer=>offer.team!==team))
    else saveOffers([...offers,{team,position:player.teamConsideration[team]||player.position||'All-rounder',squadRole:defaultSquadRole}],player.offeredTeam||team)
  }
  const updateOffer=(team:string,field:'position'|'squadRole',value:string)=>{
    const next=offers.map(offer=>offer.team===team?{...offer,[field]:value}:offer) as PlayerOffer[]
    saveOffers(next)
  }
  const chooseAccepted=(team:string)=>{
    const selected=offers.find(offer=>offer.team===team)
    if(selected)save({...player,offeredTeam:selected.team,offeredPosition:selected.position,teamConsideration:{...player.teamConsideration,[selected.team]:selected.position}})
  }

  if(accepted){const selected=primaryOffer(player);return <section className="accepted-offer-choice"><div><Check/><span><b>Accepted team option</b><small>Select the option the player has accepted. This controls their confirmed squad.</small></span></div><select value={selected?.team||''} onChange={event=>chooseAccepted(event.target.value)}>{offers.map(offer=><option value={offer.team} key={offer.team}>{offer.team} · {offer.position} · {offer.squadRole}</option>)}</select>{!offers.length&&<p>No saved team option exists. Change the decision back to an offer and add one first.</p>}</section>}

  return <section className={`offer-options-editor ${compact?'compact':''}`}>
    <header><div><span className="eyebrow">TEAM OFFER OPTIONS</span><h3><Layers3/>Offer one or more teams</h3><p>Tick every team being offered, then set the playing position and expected squad role for each option.</p></div><strong>{offers.length} selected</strong></header>
    <div className="offer-team-selector">{teams.map(team=><button type="button" key={team} className={offers.some(offer=>offer.team===team)?'selected':''} onClick={()=>toggleTeam(team)}>{offers.some(offer=>offer.team===team)?<Check/>:<Plus/>}{team}</button>)}</div>
    {offers.length?<div className="offer-option-list">{offers.map((offer,index)=><article key={offer.team}><div className="offer-option-number">{index+1}</div><div className="offer-option-title"><b>{offer.team}</b><small>{offer.team===player.appliedTeam?'Original applied team':'Alternative team option'}</small></div><label>Position<select value={offer.position} onChange={event=>updateOffer(offer.team,'position',event.target.value)}>{positions.map(position=><option key={position}>{position}</option>)}</select></label><label>Squad role<select value={offer.squadRole} onChange={event=>updateOffer(offer.team,'squadRole',event.target.value)}>{squadRoles.map(role=><option key={role}>{role}</option>)}</select></label><button className="remove-offer-option" type="button" onClick={()=>toggleTeam(offer.team)} aria-label={`Remove ${offer.team} offer`}><Trash2/></button></article>)}</div>:<div className="offer-options-empty"><Layers3/><b>No team selected</b><span>Choose at least one team before reviewing the offer email.</span></div>}
  </section>
}
