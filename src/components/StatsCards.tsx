import { Clock3, UserCheck, UserX, Users } from 'lucide-react'
import type { Player } from '../types'
export function StatsCards({players}:{players:Player[]}){
  const stats=[
    {label:'Total sign-ups',value:players.length,icon:Users},
    {label:'Awaiting decision',value:players.filter(p=>p.decision==='Awaiting decision').length,icon:Clock3},
    {label:'Offers',value:players.filter(p=>p.decision.includes('Offer')).length,icon:UserCheck},
    {label:'Rejections',value:players.filter(p=>p.decision.includes('Rejection')).length,icon:UserX},
  ]
  return <section className="stats">{stats.map(({label,value,icon:Icon})=><div key={label}><Icon/><span>{label}</span><b>{value}</b></div>)}</section>
}
