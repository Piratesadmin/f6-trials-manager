import { PageHeader } from '../components/PageHeader'
import { teams, positions } from '../data/constants'
import type { Player } from '../types'
export function TeamsPage({players}:{players:Player[]}){
  return <><PageHeader title="Teams" subtitle="Monitor how each squad is taking shape across positions."/><section className="team-grid">{teams.map(team=>{const teamPlayers=players.filter(p=>(p.offeredTeam||p.appliedTeam)===team&&p.decision.includes('Offer'));return <article className="team-card" key={team}><div className="team-card-head"><div><span className="eyebrow">TEAM</span><h2>{team}</h2></div><b>{teamPlayers.length}</b></div><div className="position-list">{positions.slice(0,5).map(position=><div key={position}><span>{position}</span><strong>{teamPlayers.filter(p=>(p.offeredPosition||p.position)===position).length}</strong></div>)}</div></article>})}</section></>
}
