import type { Player } from '../types'
import type { ReactNode } from 'react'

type Props = {
  player: Player
  photo?: string
  className?: string
  fallback?: ReactNode
}

export function PlayerAvatar({ player, photo, className = '', fallback }: Props) {
  const image = photo || player.photoUrl
  const initials = player.name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2)

  return <span className={`avatar player-avatar ${image ? 'has-photo' : ''} ${className}`.trim()}>{image ? <img src={image} alt=""/> : fallback ?? initials}</span>
}
