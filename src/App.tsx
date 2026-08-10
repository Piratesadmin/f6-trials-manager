import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { get, limitToLast, onValue, orderByChild, query as firebaseQuery, ref, set, update } from 'firebase/database'
import { auth, database, firebaseConfigured, sharedLoginEmail } from './firebase'
import { defaultEmailSettings, initialPlayers } from './data/constants'
import type { ActivityDraft, ActivityLogEntry, CoachProfile, EmailSettings, FinanceSettings, PageKey, Player, PlayerFinance, PlayerFinanceMap, PlayerPhotos, PlayerStars, PlayerTab, SeasonArchive, SeasonSettings, SyncState, TeamPlans, TrialSession } from './types'
import { normalisePlayer } from './utils/player'
import { createDefaultTeamPlans, minimumTargetForPosition, normaliseTeamPlans, teamPlansNeedMinimumUpgrade } from './utils/teamPlanner'
import { assignedTeamNames, createCoachProfile, normaliseCoachProfile } from './utils/access'
import { buildCommunication, normaliseEmailSettings, sentDecisionFor } from './utils/email'
import { blobToDataUrl, preparePlayerPhoto } from './utils/photo'
import { normaliseTrialSession, trialDateLabel } from './utils/schedule'
import { defaultFinanceSettings, normaliseFinanceSettings, normalisePlayerFinance } from './utils/finance'
import { responseDeadlineDetails } from './utils/deadline'
import { createActivityEntry, describePlayerChange, normaliseActivityEntry } from './utils/activity'
import { createSeasonArchive, defaultSeasonSettings, normaliseSeasonArchive, normaliseSeasonSettings } from './utils/season'
import { Login } from './components/Login'
import { CsvImportModal } from './components/CsvImportModal'
import { Sidebar } from './components/Sidebar'
import { DashboardPage } from './pages/DashboardPage'
import { SchedulePage } from './pages/SchedulePage'
import { PlayersPage } from './pages/PlayersPage'
import { EmailsPage } from './pages/EmailsPage'
import { TeamsPage } from './pages/TeamsPage'
import { FinancePage } from './pages/FinancePage'
import { SettingsPage } from './pages/SettingsPage'
import { ActivityPage } from './pages/ActivityPage'
import { ArchivePage } from './pages/ArchivePage'
import './App.css'

export default function App(){
  const [user,setUser]=useState<User|null>(null)
  const [authLoading,setAuthLoading]=useState(firebaseConfigured)
  const [demo,setDemo]=useState(!firebaseConfigured)
  const [page,setPage]=useState<PageKey>('dashboard')
  const [requestedSessionId,setRequestedSessionId]=useState('')
  const [players,setPlayers]=useState<Player[]>(()=>{
    const stored = JSON.parse(localStorage.getItem('f6players') || 'null') as Player[] | null
    return (stored || initialPlayers).map(normalisePlayer)
  })
  const [selectedId,setSelectedId]=useState(players[0]?.id||'')
  const [query,setQuery]=useState('')
  const [teamFilter,setTeamFilter]=useState('All teams')
  const [syncState,setSyncState]=useState<SyncState>(firebaseConfigured?'saving':'offline')
  const [importOpen,setImportOpen]=useState(false)
  const [playerTab,setPlayerTab]=useState<PlayerTab>('overview')
  const [teamPlans,setTeamPlans]=useState<TeamPlans>(()=>{
    const stored = JSON.parse(localStorage.getItem('f6teamplans') || 'null') as TeamPlans | null
    return normaliseTeamPlans(stored || createDefaultTeamPlans())
  })
  const [emailSettings,setEmailSettings]=useState<EmailSettings>(()=>{
    const stored = JSON.parse(localStorage.getItem('f6emailsettings') || 'null') as EmailSettings | null
    return normaliseEmailSettings(stored || defaultEmailSettings)
  })
  const [coachProfile,setCoachProfile]=useState<CoachProfile|null>(null)
  const [coachProfiles,setCoachProfiles]=useState<CoachProfile[]>([])
  const [playerStars,setPlayerStars]=useState<PlayerStars>(()=>JSON.parse(localStorage.getItem('f6playerstars')||'{}') as PlayerStars)
  const [playerPhotos,setPlayerPhotos]=useState<PlayerPhotos>(()=>JSON.parse(localStorage.getItem('f6playerphotos')||'{}') as PlayerPhotos)
  const [playerFinance,setPlayerFinance]=useState<PlayerFinanceMap>(()=>{
    const stored=JSON.parse(localStorage.getItem('f6playerfinance')||'{}') as Record<string,unknown>
    return Object.fromEntries(Object.entries(stored).map(([playerId,value])=>[playerId,normalisePlayerFinance(playerId,value)]))
  })
  const [financeSettings,setFinanceSettings]=useState<FinanceSettings>(()=>normaliseFinanceSettings(JSON.parse(localStorage.getItem('f6financesettings')||'null')||defaultFinanceSettings))
  const [trialSessions,setTrialSessions]=useState<TrialSession[]>(()=>{
    const stored=JSON.parse(localStorage.getItem('f6trialsessions')||'[]') as TrialSession[]
    return stored.map(session=>normaliseTrialSession(session.id,session))
  })
  const [seasonSettings,setSeasonSettings]=useState<SeasonSettings>(()=>normaliseSeasonSettings(JSON.parse(localStorage.getItem('f6seasonsettings')||'null')||defaultSeasonSettings))
  const [seasonArchives,setSeasonArchives]=useState<SeasonArchive[]>(()=>{
    const stored=JSON.parse(localStorage.getItem('f6seasonarchives')||'[]') as SeasonArchive[]
    return stored
  })
  const [activityLog,setActivityLog]=useState<ActivityLogEntry[]>(()=>{
    const stored=JSON.parse(localStorage.getItem('f6activitylog')||'[]') as ActivityLogEntry[]
    return stored
  })
  const isAdmin=demo||Boolean(user?.email&&user.email===sharedLoginEmail)||coachProfile?.role==='admin'
  const editableTeams=isAdmin?Object.keys(teamPlans):assignedTeamNames(coachProfile)
  const currentCoachId=user?.uid||'local-demo'
  const signedInCoachName=user?.email&&user.email!==sharedLoginEmail?coachProfile?.displayName.trim()||'':''
  const activeEmailSettings=signedInCoachName?{...emailSettings,defaultCoachName:signedInCoachName}:emailSettings

  useEffect(()=>{if(!auth)return;return onAuthStateChanged(auth,u=>{setCoachProfile(null);setCoachProfiles([]);setPlayerStars({});setPlayerFinance({});setFinanceSettings(defaultFinanceSettings);setUser(u);setAuthLoading(false)})},[])
  useEffect(()=>{if(!database||!user||demo)return;const playersRef=ref(database,'players');return onValue(playersRef,snapshot=>{const value=snapshot.val() as Record<string,Omit<Player,'id'>>|null;if(!value){setPlayers([]);setSelectedId('');setSyncState('live');return}const next=Object.entries(value).map(([id,p])=>normalisePlayer({id,...p} as Player));setPlayers(next);setSelectedId(current=>next.some(p=>p.id===current)?current:(next[0]?.id||''));setSyncState('live')},()=>setSyncState('offline'))},[user,demo])
  useEffect(()=>{if(!database||!user||demo)return;const plansRef=ref(database,'teamPlans');return onValue(plansRef,snapshot=>{const value=snapshot.val() as TeamPlans|null;if(!value){if(isAdmin)set(plansRef,createDefaultTeamPlans());return}const normalised=normaliseTeamPlans(value);setTeamPlans(normalised);if(isAdmin&&teamPlansNeedMinimumUpgrade(value))set(plansRef,normalised);setSyncState('live')},()=>setSyncState('offline'))},[user,demo,isAdmin])
  useEffect(()=>{if(!database||!user||demo)return;const settingsRef=ref(database,'emailSettings');return onValue(settingsRef,snapshot=>{const value=snapshot.val() as EmailSettings|null;if(!value){set(settingsRef,defaultEmailSettings);return}setEmailSettings(normaliseEmailSettings(value));setSyncState('live')},()=>setSyncState('offline'))},[user,demo])
  useEffect(()=>{if(!database||!user||demo)return;return onValue(ref(database,'trialSessions'),snapshot=>{const value=snapshot.val() as Record<string,Partial<TrialSession>>|null;setTrialSessions(value?Object.entries(value).map(([id,session])=>normaliseTrialSession(id,session)):[]);setSyncState('live')},()=>setSyncState('offline'))},[user,demo])
  useEffect(()=>{
    if(!database||!user||demo)return
    const settingsRef=ref(database,'seasonSettings')
    return onValue(settingsRef,snapshot=>{
      if(!snapshot.exists()){if(isAdmin)set(settingsRef,defaultSeasonSettings);setSeasonSettings(defaultSeasonSettings);return}
      setSeasonSettings(normaliseSeasonSettings(snapshot.val()));setSyncState('live')
    },()=>setSyncState('offline'))
  },[user,demo,isAdmin])
  useEffect(()=>{
    if(!database||!user||demo)return
    const profileRef=ref(database,`coachProfiles/${user.uid}`)
    return onValue(profileRef,snapshot=>{
      if(!snapshot.exists()){
        const profile=createCoachProfile(user.uid,user.email||'',user.email===sharedLoginEmail)
        set(profileRef,profile)
        setCoachProfile(profile)
        return
      }
      setCoachProfile(normaliseCoachProfile(user.uid,snapshot.val(),user.email||''))
    })
  },[user,demo])

  useEffect(()=>{
    if(!selectedId)return
    if(!database||!user||demo)return
    return onValue(ref(database,`playerPhotos/${selectedId}`),snapshot=>setPlayerPhotos(current=>{
      const next={...current}
      const value=snapshot.val()
      if(typeof value==='string'&&value)next[selectedId]=value
      else delete next[selectedId]
      return next
    }))
  },[selectedId,user,demo])

  useEffect(()=>{
    if(!database||!user||demo||!isAdmin)return
    return onValue(ref(database,'coachProfiles'),snapshot=>{
      const value=snapshot.val() as Record<string,unknown>|null
      setCoachProfiles(value?Object.entries(value).map(([uid,profile])=>normaliseCoachProfile(uid,profile)):[])
    })
  },[user,demo,isAdmin])

  useEffect(()=>{
    if(demo)return
    if(!database||!user||!isAdmin){setSeasonArchives([]);setActivityLog([]);return}
    const stopArchives=onValue(ref(database,'seasonArchives'),snapshot=>{
      const value=snapshot.val() as Record<string,unknown>|null
      setSeasonArchives(value?Object.entries(value).map(([id,archive])=>normaliseSeasonArchive(id,archive)).filter((archive):archive is SeasonArchive=>Boolean(archive)).sort((a,b)=>b.archivedAt-a.archivedAt):[])
    })
    const recentActivity=firebaseQuery(ref(database,'auditLog'),orderByChild('timestamp'),limitToLast(500))
    const stopActivity=onValue(recentActivity,snapshot=>{
      const value=snapshot.val() as Record<string,unknown>|null
      setActivityLog(value?Object.entries(value).map(([id,entry])=>normaliseActivityEntry(id,entry)).filter((entry):entry is ActivityLogEntry=>Boolean(entry)).sort((a,b)=>b.timestamp-a.timestamp):[])
    })
    return ()=>{stopArchives();stopActivity()}
  },[user,demo,isAdmin])

  useEffect(()=>{
    if(demo)return
    if(!database||!user||!isAdmin){setPlayerFinance({});return}
    return onValue(ref(database,'playerFinance'),snapshot=>{
      const value=snapshot.val() as Record<string,unknown>|null
      setPlayerFinance(value?Object.fromEntries(Object.entries(value).map(([playerId,finance])=>[playerId,normalisePlayerFinance(playerId,finance)])): {})
      setSyncState('live')
    },()=>{setPlayerFinance({});setSyncState('offline')})
  },[user,demo,isAdmin])

  useEffect(()=>{
    if(demo)return
    if(!database||!user||!isAdmin){setFinanceSettings(defaultFinanceSettings);return}
    const settingsRef=ref(database,'financeSettings')
    return onValue(settingsRef,snapshot=>{
      if(!snapshot.exists()){set(settingsRef,defaultFinanceSettings);setFinanceSettings(defaultFinanceSettings);return}
      setFinanceSettings(normaliseFinanceSettings(snapshot.val()))
      setSyncState('live')
    },()=>{setFinanceSettings(defaultFinanceSettings);setSyncState('offline')})
  },[user,demo,isAdmin])

  useEffect(()=>{
    if(!database||!user||demo)return
    return onValue(ref(database,`playerStars/${user.uid}`),snapshot=>setPlayerStars((snapshot.val() as PlayerStars|null)||{}))
  },[user,demo])

  const activityActor={uid:user?.uid||'local-demo',name:signedInCoachName||coachProfile?.displayName||user?.email||'Local demo',email:user?.email||''}
  const recordActivity=async(draft:ActivityDraft)=>{
    const entry=createActivityEntry(draft,activityActor,seasonSettings.currentSeason)
    if(database&&user&&!demo){try{await set(ref(database,`auditLog/${entry.id}`),entry)}catch(error){console.warn('Activity record could not be saved. Publish the v0.20 Firebase rules.',error)}}else{setActivityLog(current=>{const next=[entry,...current].slice(0,500);localStorage.setItem('f6activitylog',JSON.stringify(next));return next})}
  }
  const save=async(updated:Player,activityOverride?:ActivityDraft|null)=>{const previous=players.find(player=>player.id===updated.id);const stamped={...normalisePlayer(updated),updatedAt:Date.now(),updatedBy:user?.email||'Local demo'};if(database&&user&&!demo){setSyncState('saving');const{id,...data}=stamped;await update(ref(database,`players/${id}`),data)}else{const next=players.map(p=>p.id===stamped.id?stamped:p);setPlayers(next);localStorage.setItem('f6players',JSON.stringify(next))}const activity=activityOverride===undefined?describePlayerChange(previous,stamped):activityOverride;if(activity)await recordActivity(activity)}
  const importPlayers=async(newPlayers:Omit<Player,'id'>[])=>{
    const stamped=newPlayers.map(player=>({...player,id:crypto.randomUUID(),updatedAt:Date.now(),updatedBy:user?.email||'Local demo'}))
    if(database&&user&&!demo){
      setSyncState('saving')
      const updates=Object.fromEntries(stamped.map(({id,...data})=>[`players/${id}`,data]))
      await update(ref(database),updates)
    }else{
      const next=[...players,...stamped]
      setPlayers(next)
      localStorage.setItem('f6players',JSON.stringify(next))
    }
    if(stamped[0])setSelectedId(stamped[0].id)
    setPlayerTab('overview')
    setPage('players')
    await recordActivity({category:'import',action:'players_imported',summary:`Imported ${stamped.length} player${stamped.length===1?'':'s'}`,detail:'CSV or Excel player import completed.',team:'',entityType:'settings',entityId:''})
  }
  const importTrialWorkbook=async(session:Omit<TrialSession,'id'>,importedPlayers:Omit<Player,'id'>[])=>{
    const sessionId=crypto.randomUUID()
    const now=Date.now()
    const actor=user?.email||'Local demo'
    const sessionRecord:TrialSession={...normaliseTrialSession(sessionId,session),createdAt:now,updatedAt:now,updatedBy:actor}
    const existingByEmail=new Map(players.filter(player=>player.email).map(player=>[player.email.toLowerCase(),player]))
    const importedIds=new Set<string>()
    const prepared=importedPlayers.map(incoming=>{
      const existing=existingByEmail.get(incoming.email.toLowerCase())
      const assigned=incoming.trialResponseStatus!=="Can't go"
      const base=existing||{...incoming,id:crypto.randomUUID()}
      importedIds.add(base.id)
      return normalisePlayer({
        ...base,
        name:incoming.name||base.name,
        email:incoming.email||base.email,
        dateOfBirth:incoming.dateOfBirth,
        interestedDivisions:incoming.interestedDivisions,
        position:incoming.position,
        secondaryPosition:incoming.secondaryPosition,
        playingExperience:incoming.playingExperience,
        highestLevelPlayed:incoming.highestLevelPlayed,
        trialSessionId:assigned?sessionId:base.trialSessionId,
        trialDate:assigned?trialDateLabel(sessionRecord.date):base.trialDate,
        trialResponseStatus:incoming.trialResponseStatus,
        paid:assigned&&base.trialSessionId!==sessionId?false:base.paid,
        attended:assigned&&base.trialSessionId!==sessionId?false:base.attended,
        updatedAt:now,
        updatedBy:actor,
      })
    })
    if(database&&user&&!demo){
      setSyncState('saving')
      const{id,...sessionData}=sessionRecord
      const updates:Record<string,unknown>={[`trialSessions/${id}`]:sessionData}
      prepared.forEach(player=>{const{id:playerId,...data}=player;updates[`players/${playerId}`]=data})
      await update(ref(database),updates)
    }else{
      const merged=[...players.filter(player=>!importedIds.has(player.id)),...prepared]
      const nextSessions=[...trialSessions,sessionRecord]
      setPlayers(merged);setTrialSessions(nextSessions)
      localStorage.setItem('f6players',JSON.stringify(merged));localStorage.setItem('f6trialsessions',JSON.stringify(nextSessions))
    }
    setPage('schedule')
    await recordActivity({category:'import',action:'trial_workbook_imported',summary:`Imported ${prepared.length} players into ${sessionRecord.title}`,detail:`${trialDateLabel(sessionRecord.date)} · Trial workbook`,team:'',entityType:'session',entityId:sessionRecord.id})
  }
  const saveTeamTarget=async(team:string,position:string,target:number)=>{
    if(!editableTeams.includes(team))return
    const safeTarget=Math.max(minimumTargetForPosition(teamPlans[team],position),Math.min(99,target))
    const next={...teamPlans,[team]:{...teamPlans[team],[position]:safeTarget}}
    setTeamPlans(next)
    if(database&&user&&!demo){setSyncState('saving');await set(ref(database,`teamPlans/${team}`),next[team])}else{localStorage.setItem('f6teamplans',JSON.stringify(next))}
    await recordActivity({category:'team',action:'squad_target_changed',summary:`${team} ${position} target set to ${safeTarget}`,detail:'Team Planner target updated.',team,entityType:'team',entityId:team})
  }
  const saveEmailSettings=async(settings:EmailSettings)=>{
    const next=normaliseEmailSettings(settings)
    setEmailSettings(next)
    if(database&&user&&!demo){setSyncState('saving');await set(ref(database,'emailSettings'),next)}else{localStorage.setItem('f6emailsettings',JSON.stringify(next))}
    await recordActivity({category:'settings',action:'club_settings_changed',summary:'Club communication and team settings updated',detail:'Email defaults, team details or calendar colours were saved.',team:'',entityType:'settings',entityId:'emailSettings'})
  }
  const saveTrialSession=async(session:TrialSession)=>{
    const previous=trialSessions.find(item=>item.id===session.id)
    const stamped={...normaliseTrialSession(session.id,session),createdAt:previous?.createdAt||session.createdAt||Date.now(),updatedAt:Date.now(),updatedBy:user?.email||'Local demo'}
    const affected=players.filter(player=>player.trialSessionId===session.id&&player.trialDate!==trialDateLabel(stamped.date))
    if(database&&user&&!demo){
      setSyncState('saving')
      const{id,...sessionData}=stamped
      const updates:Record<string,unknown>={[`trialSessions/${id}`]:sessionData}
      affected.forEach(player=>{const updated={...normalisePlayer(player),trialDate:trialDateLabel(stamped.date),updatedAt:Date.now(),updatedBy:user.email||'Coach'};const{ id:playerId,...data}=updated;updates[`players/${playerId}`]=data})
      await update(ref(database),updates)
    }else{
      const nextSessions=previous?trialSessions.map(item=>item.id===stamped.id?stamped:item):[...trialSessions,stamped]
      const nextPlayers=players.map(player=>player.trialSessionId===stamped.id?{...player,trialDate:trialDateLabel(stamped.date)}:player)
      setTrialSessions(nextSessions);setPlayers(nextPlayers)
      localStorage.setItem('f6trialsessions',JSON.stringify(nextSessions));localStorage.setItem('f6players',JSON.stringify(nextPlayers))
    }
    await recordActivity({category:'schedule',action:previous?'session_updated':'session_created',summary:`${previous?'Updated':'Created'} ${stamped.title}`,detail:`${trialDateLabel(stamped.date)} · ${stamped.startTime||'Time not set'}`,team:stamped.teams.join(', '),entityType:'session',entityId:stamped.id})
  }
  const saveTrialSessionSeries=async(sessions:TrialSession[])=>{
    if(!sessions.length)return
    const now=Date.now()
    const actor=user?.email||'Local demo'
    const stamped=sessions.map(session=>({...normaliseTrialSession(session.id,session),createdAt:session.createdAt||now,updatedAt:now,updatedBy:actor}))
    if(database&&user&&!demo){
      setSyncState('saving')
      const updates:Record<string,unknown>={}
      stamped.forEach(session=>{const{id,...data}=session;updates[`trialSessions/${id}`]=data})
      await update(ref(database),updates)
    }else{
      const ids=new Set(stamped.map(session=>session.id))
      const next=[...trialSessions.filter(session=>!ids.has(session.id)),...stamped]
      setTrialSessions(next)
      localStorage.setItem('f6trialsessions',JSON.stringify(next))
    }
    await recordActivity({category:'schedule',action:'recurring_series_created',summary:`Created ${stamped.length} recurring sessions`,detail:stamped[0]?`${stamped[0].title} from ${trialDateLabel(stamped[0].date)}`:'Recurring training series',team:stamped[0]?.teams.join(', ')||'',entityType:'session',entityId:stamped[0]?.id||''})
  }
  const deleteTrialSession=async(sessionId:string)=>{
    const affected=players.filter(player=>player.trialSessionId===sessionId)
    if(database&&user&&!demo){
      setSyncState('saving')
      const updates:Record<string,unknown>={[`trialSessions/${sessionId}`]:null}
      affected.forEach(player=>{const updated={...normalisePlayer(player),trialSessionId:'',trialDate:'Not assigned',trialResponseStatus:'',paid:false,attended:false,updatedAt:Date.now(),updatedBy:user.email||'Coach'};const{id,...data}=updated;updates[`players/${id}`]=data})
      await update(ref(database),updates)
    }else{
      const nextSessions=trialSessions.filter(session=>session.id!==sessionId)
      const nextPlayers=players.map(player=>player.trialSessionId===sessionId?{...player,trialSessionId:'',trialDate:'Not assigned',trialResponseStatus:'' as const,paid:false,attended:false}:player)
      setTrialSessions(nextSessions);setPlayers(nextPlayers)
      localStorage.setItem('f6trialsessions',JSON.stringify(nextSessions));localStorage.setItem('f6players',JSON.stringify(nextPlayers))
    }
    await recordActivity({category:'schedule',action:'session_deleted',summary:`Deleted ${trialSessions.find(session=>session.id===sessionId)?.title||'club event'}`,detail:`${affected.length} player assignment${affected.length===1?'':'s'} cleared.`,team:'',entityType:'session',entityId:sessionId})
  }
  const markEmailSent=async(player:Player)=>{
    const deadline=responseDeadlineDetails(player,trialSessions,activeEmailSettings.defaultResponseDeadline)
    const entry=buildCommunication(player,activeEmailSettings,signedInCoachName||user?.email||'Local demo',deadline)
    await save({ ...player, decision: sentDecisionFor(player), emailReviewStatus: 'sent', communicationHistory: { ...player.communicationHistory, [entry.id]: entry } },{category:'email',action:'email_sent',summary:`${entry.type.replace('-',' ')} email marked sent to ${player.name}`,detail:entry.subject,team:player.offeredTeam||player.appliedTeam,entityType:'player',entityId:player.id})
  }
  const togglePlayerStar=async(playerId:string)=>{
    const next={...playerStars}
    if(next[playerId])delete next[playerId]
    else next[playerId]=true
    setPlayerStars(next)
    if(database&&user&&!demo)await set(ref(database,`playerStars/${user.uid}/${playerId}`),next[playerId]||null)
    else localStorage.setItem('f6playerstars',JSON.stringify(next))
  }
  const uploadPlayerPhoto=async(player:Player,file:File)=>{
    const prepared=await preparePlayerPhoto(file)
    const photo=await blobToDataUrl(prepared)
    if(photo.length>150000)throw new Error('This photo is still too detailed after resizing. Try a simpler or more tightly cropped image.')
    const next={...playerPhotos,[player.id]:photo}
    setPlayerPhotos(next)
    if(database&&user&&!demo){setSyncState('saving');await set(ref(database,`playerPhotos/${player.id}`),photo)}
    else localStorage.setItem('f6playerphotos',JSON.stringify(next))
    if(player.photoUrl)await save({...player,photoUrl:''})
    await recordActivity({category:'player',action:'photo_uploaded',summary:`Player photo updated for ${player.name}`,detail:'Photo stored in the protected player record.',team:player.appliedTeam,entityType:'player',entityId:player.id})
  }
  const removePlayerPhoto=async(player:Player)=>{
    const next={...playerPhotos};delete next[player.id];setPlayerPhotos(next)
    if(database&&user&&!demo)await set(ref(database,`playerPhotos/${player.id}`),null)
    else localStorage.setItem('f6playerphotos',JSON.stringify(next))
    if(player.photoUrl)await save({...player,photoUrl:''})
    await recordActivity({category:'player',action:'photo_removed',summary:`Player photo removed for ${player.name}`,detail:'',team:player.appliedTeam,entityType:'player',entityId:player.id})
  }
  const saveCoachProfile=async(profile:CoachProfile)=>{
    if(!isAdmin)return
    const next=normaliseCoachProfile(profile.uid,profile,profile.email)
    if(database&&user&&!demo){await set(ref(database,`coachProfiles/${next.uid}`),next)}else setCoachProfiles(current=>current.map(item=>item.uid===next.uid?next:item))
    await recordActivity({category:'access',action:'account_permissions_changed',summary:`Updated access for ${next.displayName}`,detail:`${next.role} · ${assignedTeamNames(next).join(', ')||'No assigned team'}`,team:assignedTeamNames(next).join(', '),entityType:'settings',entityId:next.uid})
  }
  const savePlayerFinance=async(finance:PlayerFinance)=>{
    if(!isAdmin)return
    const stamped={...normalisePlayerFinance(finance.playerId,finance),updatedAt:Date.now(),updatedBy:user?.email||'Local demo'}
    const next={...playerFinance,[stamped.playerId]:stamped}
    setPlayerFinance(next)
    if(database&&user&&!demo){setSyncState('saving');await set(ref(database,`playerFinance/${stamped.playerId}`),stamped)}
    else localStorage.setItem('f6playerfinance',JSON.stringify(next))
    const player=players.find(item=>item.id===stamped.playerId)
    await recordActivity({category:'finance',action:'player_finance_changed',summary:`Payment record updated for ${player?.name||'confirmed player'}`,detail:`Payment plan: ${stamped.paymentPlan||'Not selected'}.`,team:player?.offeredTeam||player?.appliedTeam||'',entityType:'player',entityId:stamped.playerId})
  }
  const saveFinanceSettings=async(settings:FinanceSettings)=>{
    if(!isAdmin)return
    const stamped={...normaliseFinanceSettings(settings),updatedAt:Date.now(),updatedBy:user?.email||'Local demo'}
    setFinanceSettings(stamped)
    if(database&&user&&!demo){setSyncState('saving');await set(ref(database,'financeSettings'),stamped)}
    else localStorage.setItem('f6financesettings',JSON.stringify(stamped))
    await recordActivity({category:'finance',action:'standard_fees_changed',summary:'Standard season fees updated',detail:'NVL and LVA fee settings were saved.',team:'',entityType:'settings',entityId:'financeSettings'})
  }
  const rolloverSeason=async(nextSeasonName:string)=>{
    if(!isAdmin)throw new Error('Administrator access is required.')
    const archive=createSeasonArchive({seasonName:seasonSettings.currentSeason,nextSeasonName,archivedBy:activityActor.name,players,sessions:trialSessions,teamPlans,playerFinance,financeSettings,emailSettings})
    const nextSettings:SeasonSettings={currentSeason:nextSeasonName,updatedAt:Date.now(),updatedBy:activityActor.email||activityActor.name}
    const entry=createActivityEntry({category:'season',action:'season_rollover',summary:`Archived ${seasonSettings.currentSeason} and started ${nextSeasonName}`,detail:`${players.length} players and ${trialSessions.length} events archived.`,team:'',entityType:'season',entityId:archive.id},activityActor,nextSeasonName)
    if(database&&user&&!demo){setSyncState('saving');await update(ref(database),{[`seasonArchives/${archive.id}`]:archive,players:null,trialSessions:null,playerFinance:null,playerStars:null,playerPhotos:null,seasonSettings:nextSettings,[`auditLog/${entry.id}`]:entry})}else{
      const nextArchives=[archive,...seasonArchives];setSeasonArchives(nextArchives);setPlayers([]);setTrialSessions([]);setPlayerFinance({});setPlayerStars({});setPlayerPhotos({});setSeasonSettings(nextSettings);setActivityLog(current=>[entry,...current].slice(0,500));setSelectedId('')
      localStorage.setItem('f6seasonarchives',JSON.stringify(nextArchives));localStorage.setItem('f6players','[]');localStorage.setItem('f6trialsessions','[]');localStorage.setItem('f6playerfinance','{}');localStorage.setItem('f6playerstars','{}');localStorage.setItem('f6playerphotos','{}');localStorage.setItem('f6seasonsettings',JSON.stringify(nextSettings));localStorage.setItem('f6activitylog',JSON.stringify([entry,...activityLog].slice(0,500)))
    }
  }
  const cleanupTrialists=async(scope:'rejected'|'not-confirmed')=>{
    if(!isAdmin)throw new Error('Administrator access is required.')
    const targets=players.filter(player=>scope==='rejected'?player.decision==='Rejection sent':player.decision!=='Offer accepted')
    if(!targets.length)return 0
    const targetIds=new Set(targets.map(player=>player.id))
    const retained=players.filter(player=>!targetIds.has(player.id))
    if(database&&user&&!demo){
      setSyncState('saving')
      const starSnapshot=await get(ref(database,'playerStars'))
      const allStars=(starSnapshot.val()||{}) as Record<string,Record<string,boolean>>
      const updates:Record<string,unknown>={}
      targets.forEach(player=>{updates[`players/${player.id}`]=null;updates[`playerPhotos/${player.id}`]=null;updates[`playerFinance/${player.id}`]=null})
      Object.entries(allStars).forEach(([uid,stars])=>targets.forEach(player=>{if(stars?.[player.id])updates[`playerStars/${uid}/${player.id}`]=null}))
      await update(ref(database),updates)
    }else{
      const nextFinance={...playerFinance};const nextPhotos={...playerPhotos};const nextStars={...playerStars}
      targets.forEach(player=>{delete nextFinance[player.id];delete nextPhotos[player.id];delete nextStars[player.id]})
      setPlayers(retained);setPlayerFinance(nextFinance);setPlayerPhotos(nextPhotos);setPlayerStars(nextStars);setSelectedId(retained[0]?.id||'')
      localStorage.setItem('f6players',JSON.stringify(retained));localStorage.setItem('f6playerfinance',JSON.stringify(nextFinance));localStorage.setItem('f6playerphotos',JSON.stringify(nextPhotos));localStorage.setItem('f6playerstars',JSON.stringify(nextStars))
    }
    await recordActivity({category:'season',action:'trialist_cleanup',summary:`Removed ${targets.length} trialist${targets.length===1?'':'s'} from live records`,detail:scope==='rejected'?'Final rejection records removed.':'All players outside confirmed squads removed.',team:'',entityType:'season',entityId:seasonSettings.currentSeason})
    return targets.length
  }
  const openPlayer=(id:string,tab:PlayerTab)=>{setSelectedId(id);setPlayerTab(tab);setPage('players')}
  const openSchedule=(id:string)=>{setRequestedSessionId(id);setPage('schedule')}

  if(authLoading)return <div className="loading-page">Loading F6 Club Manager…</div>
  if(!user&&!demo)return <Login onDemo={()=>setDemo(true)}/>

  return <div className="app">
    <Sidebar page={page} setPage={setPage} players={players} teamFilter={teamFilter} setTeamFilter={setTeamFilter} syncState={syncState} signedIn={Boolean(user)} accountEmail={user?.email || undefined} accountName={coachProfile?.displayName||undefined} sharedAccount={Boolean(user?.email && user.email === sharedLoginEmail)} assignedTeams={editableTeams} isAdmin={isAdmin} accountRole={coachProfile?.role||null} currentSeason={seasonSettings.currentSeason} onSignOut={()=>auth&&signOut(auth)}/>
    <main>
      {page==='dashboard'&&<DashboardPage players={players} sessions={trialSessions} settings={activeEmailSettings} teamPlans={teamPlans} setPage={setPage} openPlayer={id=>openPlayer(id,'decision')} openSchedule={openSchedule} assignedTeams={editableTeams} isAdmin={isAdmin} finances={playerFinance} financeSettings={financeSettings}/>} 
      {page==='schedule'&&<SchedulePage sessions={trialSessions} players={players} saveSession={saveTrialSession} saveSessions={saveTrialSessionSeries} deleteSession={deleteTrialSession} savePlayer={save} openPlayer={id=>openPlayer(id,'overview')} onImport={()=>setImportOpen(true)} teamColours={Object.fromEntries(Object.entries(activeEmailSettings.teamDetails).map(([team,details])=>[team,details.calendarColor]))} requestedSessionId={requestedSessionId} onRequestedSessionHandled={()=>setRequestedSessionId('')}/>} 
      {page==='players'&&<PlayersPage players={players} sessions={trialSessions} selectedId={selectedId} setSelectedId={setSelectedId} query={query} setQuery={setQuery} teamFilter={teamFilter} setTeamFilter={setTeamFilter} save={save} onImport={()=>setImportOpen(true)} activeTab={playerTab} setActiveTab={setPlayerTab} emailSettings={activeEmailSettings} teamPlans={teamPlans} markSent={markEmailSent} playerStars={playerStars} currentCoachId={currentCoachId} toggleStar={togglePlayerStar} selectedPhoto={playerPhotos[selectedId]||''} uploadPhoto={uploadPlayerPhoto} removePhoto={removePlayerPhoto}/>} 
      {page==='emails'&&<EmailsPage players={players} sessions={trialSessions} settings={activeEmailSettings} teamPlans={teamPlans} save={save} markSent={markEmailSent} onOpen={id=>openPlayer(id,'email')}/>} 
      {page==='teams'&&<TeamsPage players={players} teamPlans={teamPlans} savePlayer={save} saveTarget={saveTeamTarget} onOpenPlayer={id=>openPlayer(id,'assessment')} canEditTeam={team=>editableTeams.includes(team)} editableTeams={editableTeams} isAdmin={isAdmin} finances={playerFinance} financeSettings={financeSettings}/>} 
      {page==='finance'&&isAdmin&&<FinancePage players={players} finances={playerFinance} financeSettings={financeSettings} saveFinance={savePlayerFinance} onOpenPlayer={id=>openPlayer(id,'overview')}/>} 
      {page==='activity'&&isAdmin&&<ActivityPage entries={activityLog} players={players} sessions={trialSessions} openPlayer={id=>openPlayer(id,'overview')} openSession={openSchedule}/>} 
      {page==='archive'&&isAdmin&&<ArchivePage seasonSettings={seasonSettings} players={players} sessions={trialSessions} archives={seasonArchives} rollover={rolloverSeason} cleanupTrialists={cleanupTrialists}/>} 
      {page==='settings'&&<SettingsPage settings={emailSettings} save={saveEmailSettings} financeSettings={financeSettings} saveFinanceSettings={saveFinanceSettings} coachProfiles={coachProfiles} isAdmin={isAdmin} currentUid={user?.uid||'demo'} saveCoachProfile={saveCoachProfile}/>} 
    </main>
    {importOpen&&<CsvImportModal existingPlayers={players} onClose={()=>setImportOpen(false)} onImport={importPlayers} onWorkbookImport={importTrialWorkbook}/>} 
  </div>
}
