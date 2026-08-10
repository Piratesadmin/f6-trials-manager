import type { ReactNode } from 'react'
export function PageHeader({title,subtitle,action}:{title:string;subtitle:string;action?:ReactNode}){
  return <header className="page-header"><div><span className="page-club-label">FLAMING SIX · CLUB MANAGER</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>
}
