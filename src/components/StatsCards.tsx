import { ClipboardCheck, ListChecks, Star, ThumbsUp } from 'lucide-react'
import type { Player } from '../types'
import { averageRating, isAssessed } from '../utils/player'

export function StatsCards({ players }: { players: Player[] }) {
  const assessed = players.filter(isAssessed)
  const clubAverage = assessed.length ? assessed.reduce((total, player) => total + averageRating(player), 0) / assessed.length : 0
  const offersReady = players.filter(player => player.decision === 'Offer planned' || player.decision === 'Alternative offer').length
  const waitingList = players.filter(player => player.recommendation === 'Waiting list').length
  const stats = [
    { label: 'Assessed players', value: `${assessed.length}/${players.length}`, detail: 'With at least one rating', icon: ClipboardCheck },
    { label: 'Average rating', value: clubAverage ? clubAverage.toFixed(1) : '—', detail: 'Across assessed players', icon: Star },
    { label: 'Offers ready', value: offersReady, detail: 'Planned or alternative', icon: ThumbsUp },
    { label: 'Waiting list', value: waitingList, detail: 'Coach recommendations', icon: ListChecks },
  ]

  return <section className="stats dashboard-stats">{stats.map(({ label, value, detail, icon: Icon }) => <div key={label}><Icon/><span>{label}</span><b>{value}</b><small>{detail}</small></div>)}</section>
}
