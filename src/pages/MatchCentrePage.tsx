import {useCallback, useEffect, useMemo, useState} from 'react'
import {AlertTriangle, CalendarDays, ExternalLink, LoaderCircle, MapPin, RefreshCw, Table2, Trophy} from 'lucide-react'
import {PageHeader} from '../components/PageHeader'
import {getMatchCentre} from '../matchCentre/api'
import type {MatchCentreData, MatchCentreMatch, MatchCentreTable} from '../types'
import '../matchCentre.css'

type View = 'fixtures' | 'results' | 'tables'
type Props = {availableTeams:string[]; canRefresh:boolean}
const localCacheKey='f6-match-centre-cache-v1'

function readLocalCache():MatchCentreData|null{
  try{
    const value=localStorage.getItem(localCacheKey)
    if(!value)return null
    const parsed=JSON.parse(value) as MatchCentreData
    return parsed&&Array.isArray(parsed.fixtures)&&Array.isArray(parsed.results)&&Array.isArray(parsed.tables)?parsed:null
  }catch{return null}
}

const sourceLabel = (source:'nvl'|'lva') => source.toUpperCase()
const friendlyError = (reason:unknown) => {
  const message=reason instanceof Error?reason.message:''
  return !message||message.toLowerCase()==='internal'
    ? 'The live feed service is not available in this environment yet. Please try again after the latest server functions are deployed.'
    : message
}

function formatDate(value:string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short', year:'numeric'})
}

function MatchCard({match,result}:{match:MatchCentreMatch;result?:boolean}) {
  const isHome = match.homeTeam.includes(match.clubTeam) || (match.clubTeam === 'Aces' && match.homeTeam === 'London Aces') || (match.clubTeam === 'Ravens' && match.homeTeam === 'London Ravens')
  const clubScore = isHome ? match.homeScore : match.awayScore
  const opponentScore = isHome ? match.awayScore : match.homeScore
  const outcome = result && clubScore != null && opponentScore != null ? clubScore > opponentScore ? 'Won' : clubScore < opponentScore ? 'Lost' : 'Draw' : ''
  return <article className="match-centre-card">
    <header><div><span className={`competition-badge ${match.source}`}>{sourceLabel(match.source)}</span><b>{match.competition}</b></div><a href={match.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open official match record"><ExternalLink/></a></header>
    <div className="match-date"><CalendarDays/><span><b>{formatDate(match.date)}</b><small>{match.matchStartTime || match.startTime || 'Time TBC'}</small></span><em>{match.clubTeam}</em></div>
    <div className="match-teams">
      <span className={isHome?'f6-team':''}>{match.homeTeam}</span>
      {result ? <strong className={outcome.toLowerCase()}>{match.homeScore ?? '–'} <small>{outcome}</small> {match.awayScore ?? '–'}</strong> : <strong>vs</strong>}
      <span className={!isHome?'f6-team':''}>{match.awayTeam}</span>
    </div>
    {result && Boolean(match.sets?.length) && <div className="match-sets">{match.sets!.map((set,index)=><span key={index}>{set.home}–{set.away}</span>)}</div>}
    <footer>{match.venue&&<span><MapPin/>{match.venue}</span>}<small>{match.startTime&&match.startTime!==match.matchStartTime?`Warm-up ${match.startTime}`:''}</small></footer>
  </article>
}

function LeagueTable({table}:{table:MatchCentreTable}) {
  return <section className="match-table-card">
    <header><div><span className={`competition-badge ${table.source}`}>{sourceLabel(table.source)}</span><h2>{table.competition}</h2><p>{table.clubTeams.join(', ')}</p></div><a className="secondary" href={table.sourceUrl} target="_blank" rel="noreferrer">Official table <ExternalLink/></a></header>
    <div className="match-table-scroll"><table><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>SF</th><th>SA</th><th>SD</th><th>Pts</th></tr></thead><tbody>{table.standings.map(row=>{
      const f6=table.clubTeams.some(team=>row.team===`Flaming Six ${team}`||(team==='Aces'&&row.team==='London Aces')||(team==='Ravens'&&row.team==='London Ravens'))
      return <tr key={row.team} className={f6?'f6-standing':''}><td>{row.position}</td><td>{row.team}{f6&&<span>F6</span>}</td><td>{row.played}</td><td>{row.won}</td><td>{row.lost}</td><td>{row.setsFor}</td><td>{row.setsAgainst}</td><td>{row.setDifference>0?'+':''}{row.setDifference}</td><td><b>{row.points}</b></td></tr>
    })}</tbody></table></div>
  </section>
}

export function MatchCentrePage({availableTeams,canRefresh}:Props) {
  const [data,setData]=useState<MatchCentreData|null>(()=>readLocalCache())
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [view,setView]=useState<View>('fixtures')
  const [team,setTeam]=useState(availableTeams.length===1?availableTeams[0]:'all')
  const load=useCallback(async(force=false)=>{
    setLoading(true);setError('')
    try{const latest=await getMatchCentre(force);setData(latest);try{localStorage.setItem(localCacheKey,JSON.stringify(latest))}catch{/* The live response should still be usable when browser storage is unavailable. */}}catch(reason){setError(friendlyError(reason));setData(current=>current?{...current,stale:true}:null)}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{void load()},[load])
  const fixtures=useMemo(()=>data?.fixtures.filter(match=>team==='all'||match.clubTeam===team)||[],[data,team])
  const results=useMemo(()=>data?.results.filter(match=>team==='all'||match.clubTeam===team)||[],[data,team])
  const tables=useMemo(()=>data?.tables.filter(table=>team==='all'||table.clubTeams.includes(team))||[],[data,team])
  const sourceLinks=data?.sources||[
    {source:'nvl' as const,label:'National Volleyball League',url:'https://competitions.volleyzone.co.uk/fixture-and-results/nvl/',available:true,message:''},
    {source:'lva' as const,label:'London Volleyball League',url:'https://competitions.volleyzone.co.uk/fixture-and-results/lva/',available:true,message:''},
  ]
  return <>
    <PageHeader title="F6 Match Centre" subtitle="Fixtures through May 2027, results and league tables for every Flaming Six team." action={canRefresh?<button className="primary" onClick={()=>void load(true)} disabled={loading}>{loading?<LoaderCircle className="spin"/>:<RefreshCw/>} Refresh</button>:undefined}/>
    <section className="match-centre-status">
      <div><Trophy/><span><b>Official competition data</b><small>{data?`Last checked ${new Date(data.updatedAt).toLocaleString('en-GB')}`:'NVL and LVA via VolleyZone'}</small></span></div>
      <div className="match-source-links">{sourceLinks.map(source=><a key={source.source} className={source.available?'':'unavailable'} href={source.url} target="_blank" rel="noreferrer"><span>{sourceLabel(source.source)}</span>{source.available?'Live':'Unavailable'}<ExternalLink/></a>)}</div>
    </section>
    {data?.stale&&<div className="match-centre-warning"><AlertTriangle/><span><b>Showing the latest saved data</b>The official feeds could not be refreshed just now.</span></div>}
    {error&&<div className="match-centre-error"><AlertTriangle/><span><b>Live data is unavailable</b>{error}</span></div>}
    <section className="match-centre-controls">
      <div className="match-centre-tabs"><button className={view==='fixtures'?'active':''} onClick={()=>setView('fixtures')}><CalendarDays/>Fixtures <span>{fixtures.length}</span></button><button className={view==='results'?'active':''} onClick={()=>setView('results')}><Trophy/>Results <span>{results.length}</span></button><button className={view==='tables'?'active':''} onClick={()=>setView('tables')}><Table2/>Tables <span>{tables.length}</span></button></div>
      <label>Team<select value={team} onChange={event=>setTeam(event.target.value)}>{availableTeams.length>1&&<option value="all">All my teams</option>}{availableTeams.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
    </section>
    {loading&&!data?<div className="match-centre-loading"><LoaderCircle className="spin"/><b>Loading official match data…</b><span>This can take a few seconds on the first refresh.</span></div>:
      view==='tables'?<div className="match-tables">{tables.map(table=><LeagueTable key={table.id} table={table}/>)}</div>:
      <div className="match-card-grid">{(view==='fixtures'?fixtures:results).map(match=><MatchCard key={match.id} match={match} result={view==='results'}/>)}</div>}
    {!loading&&data&&((view==='fixtures'&&!fixtures.length)||(view==='results'&&!results.length)||(view==='tables'&&!tables.length))&&<div className="match-centre-empty"><Trophy/><b>No {view} found</b><span>The official feed has no {view} for this team yet.</span></div>}
  </>
}
