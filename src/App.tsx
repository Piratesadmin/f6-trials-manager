import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { get, limitToLast, onValue, orderByChild, query as firebaseQuery, ref, runTransaction, set, update } from 'firebase/database'
import { auth, database, firebaseConfigured, sharedLoginEmail } from './firebase'
import { defaultEmailSettings, initialPlayers, teams } from './data/constants'
import type { ActivityDraft, ActivityLogEntry, ArchivedPlayerRecord, ArchivedPlayersMap, CoachProfile, EmailSettings, FinanceSettings, PageKey, Player, PlayerDecisionDraft, PlayerDecisionSaveResult, PlayerFinance, PlayerFinanceMap, PlayerPhotos, PlayerStars, PlayerTab, SeasonArchive, SeasonSettings, SessionPhotos, SyncState, TeamPlans, TrialSession } from './types'
import { averageRating, normalisePlayer } from './utils/player'
import { createDefaultTeamPlans, minimumTargetForPosition, normaliseTeamPlans, teamPlansNeedMinimumUpgrade } from './utils/teamPlanner'
import { assignedCoachNameForTeam, assignedTeamNames, createCoachProfile, normaliseCoachProfile } from './utils/access'
import { buildCommunication, normaliseEmailSettings, sentDecisionFor } from './utils/email'
import { blobToDataUrl, prepareEventPhoto, preparePlayerPhoto } from './utils/photo'
import { normaliseTrialSession, trialDateLabel } from './utils/schedule'
import { confirmedTeam, defaultFinanceSettings, normaliseFinanceSettings, normalisePlayerFinance } from './utils/finance'
import { responseDeadlineDetails } from './utils/deadline'
import { createActivityEntry, describePlayerChange, normaliseActivityEntry } from './utils/activity'
import { createSeasonArchive, defaultSeasonSettings, normaliseSeasonArchive, normaliseSeasonSettings } from './utils/season'
import { createArchivedPlayerRecord, normaliseArchivedPlayerRecord } from './utils/archivedPlayers'
import { applyDecisionDraft, decisionDraftFor, sameDecisionDraft } from './utils/decision'
import { appHashFor, parseAppHash, type AppRoute } from './utils/navigation'
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

function firebaseSafeValue<T>(value:T):T {
  return JSON.parse(JSON.stringify(value)) as T
}

export default function App(){
  const initialRoute=parseAppHash(window.location.hash)
  const [user,setUser]=useState<User|null>(null)
  const [authLoading,setAuthLoading]=useState(firebaseConfigured)
  const [demo,setDemo]=useState(!firebaseConfigured)
  const [page,setPageState]=useState<PageKey>(initialRoute.page)
  const [requestedSessionId,setRequestedSessionId]=useState(initialRoute.sessionId||'')
  const [activeScheduleSessionId,setActiveScheduleSessionId]=useState('')
  const [players,setPlayers]=useState<Player[]>(()=>{
    const stored = JSON.parse(localStorage.getItem('f6players') || 'null') as Player[] | null
    return (stored || initialPlayers).map(normalisePlayer)
  })
  const [playersReady,setPlayersReady]=useState(!firebaseConfigured)
  const [selectedId,setSelectedId]=useState(initialRoute.playerId||players[0]?.id||'')
  const [query,setQuery]=useState('')
  const [teamFilter,setTeamFilterState]=useState(initialRoute.teamFilter&&teams.includes(initialRoute.teamFilter)?initialRoute.teamFilter:'All teams')
  const [syncState,setSyncState]=useState<SyncState>(firebaseConfigured?'saving':'offline')
  const [importOpen,setImportOpen]=useState(false)
  const [playerTab,setPlayerTabState]=useState<PlayerTab>(initialRoute.playerTab||'decision')
  const [selectedTeam,setSelectedTeamState]=useState(initialRoute.team&&teams.includes(initialRoute.team)?initialRoute.team:teams[0])
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
  const [sessionPhotos,setSessionPhotos]=useState<SessionPhotos>(()=>JSON.parse(localStorage.getItem('f6sessionphotos')||'{}') as SessionPhotos)
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
  const [seasonSettingsReady,setSeasonSettingsReady]=useState(!firebaseConfigured)
  const [seasonArchives,setSeasonArchives]=useState<SeasonArchive[]>(()=>{
    const stored=JSON.parse(localStorage.getItem('f6seasonarchives')||'[]') as SeasonArchive[]
    return stored
  })
  const [archivedPlayers,setArchivedPlayers]=useState<ArchivedPlayersMap>(()=>{
    const stored=JSON.parse(localStorage.getItem('f6archivedplayers')||'{}') as Record<string,unknown>
    return Object.fromEntries(Object.entries(stored).flatMap(([id,value])=>{const record=normaliseArchivedPlayerRecord(id,value);return record?[[id,record]]:[]}))
  })
  const [activityLog,setActivityLog]=useState<ActivityLogEntry[]>(()=>{
    const stored=JSON.parse(localStorage.getItem('f6activitylog')||'[]') as ActivityLogEntry[]
    return stored
  })
  const isAdmin=demo||Boolean(user?.email&&user.email===sharedLoginEmail)||coachProfile?.role==='admin'
  const editableTeams=isAdmin?Object.keys(teamPlans):assignedTeamNames(coachProfile)
  const currentCoachId=user?.uid||'local-demo'
  const signedInCoachName=user?.email&&user.email!==sharedLoginEmail?coachProfile?.displayName.trim()||'':''
  const teamCoachNames=Object.fromEntries(Object.keys(teamPlans).map(team=>[team,assignedCoachNameForTeam(coachProfiles,team,emailSettings.teamDetails[team]?.adminEmail)]))
  const teamDivisions=Object.fromEntries(teams.map(team=>[team,emailSettings.teamDetails[team]?.competition||'']))
  const activeEmailSettings={...emailSettings,currentCoachName:signedInCoachName,teamCoachNames}

  const applyRoute=useCallback((route:AppRoute)=>{
    setPageState(route.page)
    if(route.page==='emails')setSelectedId(route.playerId||'')
    else if(route.playerId)setSelectedId(route.playerId)
    if(route.page==='players'){
      setPlayerTabState(route.playerTab||'decision')
      setTeamFilterState(route.teamFilter&&teams.includes(route.teamFilter)?route.teamFilter:'All teams')
    }
    if(route.page==='schedule')setRequestedSessionId(route.sessionId||'')
    if(route.page==='teams')setSelectedTeamState(route.team&&teams.includes(route.team)?route.team:teams[0])
  },[])

  const navigate=useCallback((route:AppRoute,replace=false)=>{
    applyRoute(route)
    const nextHash=appHashFor(route)
    if(window.location.hash===nextHash)return
    if(replace)window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}${nextHash}`)
    else window.location.hash=nextHash
  },[applyRoute])

  const navigatePage=useCallback((nextPage:PageKey)=>{
    if(nextPage==='players')navigate({page:nextPage,playerId:selectedId||undefined,playerTab,teamFilter})
    else if(nextPage==='emails')navigate({page:nextPage,playerId:selectedId||undefined})
    else if(nextPage==='schedule')navigate({page:nextPage,sessionId:activeScheduleSessionId||requestedSessionId||undefined})
    else if(nextPage==='teams')navigate({page:nextPage,team:selectedTeam})
    else navigate({page:nextPage})
  },[activeScheduleSessionId,navigate,playerTab,requestedSessionId,selectedId,selectedTeam,teamFilter])

  useEffect(()=>{
    const handleHashChange=()=>applyRoute(parseAppHash(window.location.hash))
    window.addEventListener('hashchange',handleHashChange)
    const route=parseAppHash(window.location.hash)
    applyRoute(route)
    const canonicalHash=appHashFor(route)
    if(window.location.hash!==canonicalHash)window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}${canonicalHash}`)
    return ()=>window.removeEventListener('hashchange',handleHashChange)
  },[applyRoute])

  useEffect(()=>{if(seasonSettingsReady&&!seasonSettings.trialsMode&&page==='emails')navigate({page:'dashboard'},true)},[seasonSettingsReady,seasonSettings.trialsMode,page,navigate])

  useEffect(()=>{if(!auth)return;return onAuthStateChanged(auth,u=>{setCoachProfile(null);setCoachProfiles([]);setPlayerStars({});setPlayerFinance({});setFinanceSettings(defaultFinanceSettings);setUser(u);setAuthLoading(false)})},[])
  useEffect(()=>{
    if(demo){setPlayersReady(true);return}
    if(!database||!user){setPlayersReady(false);return}
    setPlayersReady(false)
    const playersRef=ref(database,'players')
    return onValue(playersRef,snapshot=>{
      const value=snapshot.val() as Record<string,Omit<Player,'id'>>|null
      if(!value){setPlayers([]);setSelectedId('');setPlayersReady(true);setSyncState('live');return}
      const next=Object.entries(value).map(([id,p])=>normalisePlayer({id,...p} as Player))
      setPlayers(next);setSelectedId(current=>next.some(p=>p.id===current)?current:(next[0]?.id||''));setPlayersReady(true);setSyncState('live')
    },()=>{setPlayersReady(true);setSyncState('offline')})
  },[user,demo])
  useEffect(()=>{if(!database||!user||demo)return;const plansRef=ref(database,'teamPlans');return onValue(plansRef,snapshot=>{const value=snapshot.val() as TeamPlans|null;if(!value){if(isAdmin)set(plansRef,createDefaultTeamPlans());return}const normalised=normaliseTeamPlans(value);setTeamPlans(normalised);if(isAdmin&&teamPlansNeedMinimumUpgrade(value))set(plansRef,normalised);setSyncState('live')},()=>setSyncState('offline'))},[user,demo,isAdmin])
  useEffect(()=>{if(!database||!user||demo)return;const settingsRef=ref(database,'emailSettings');return onValue(settingsRef,snapshot=>{const value=snapshot.val() as EmailSettings|null;if(!value){set(settingsRef,defaultEmailSettings);return}setEmailSettings(normaliseEmailSettings(value));setSyncState('live')},()=>setSyncState('offline'))},[user,demo])
  useEffect(()=>{if(!database||!user||demo)return;return onValue(ref(database,'trialSessions'),snapshot=>{const value=snapshot.val() as Record<string,Partial<TrialSession>>|null;setTrialSessions(value?Object.entries(value).map(([id,session])=>normaliseTrialSession(id,session)):[]);setSyncState('live')},()=>setSyncState('offline'))},[user,demo])
  useEffect(()=>{
    if(demo){setSeasonSettingsReady(true);return}
    if(!database||!user){setSeasonSettingsReady(false);return}
    setSeasonSettingsReady(false)
    const settingsRef=ref(database,'seasonSettings')
    return onValue(settingsRef,snapshot=>{
      if(!snapshot.exists()){if(isAdmin)set(settingsRef,defaultSeasonSettings);setSeasonSettings(defaultSeasonSettings);setSeasonSettingsReady(true);return}
      setSeasonSettings(normaliseSeasonSettings(snapshot.val()));setSeasonSettingsReady(true);setSyncState('live')
    },()=>{setSeasonSettingsReady(true);setSyncState('offline')})
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
    if(!activeScheduleSessionId||!database||!user||demo)return
    return onValue(ref(database,`sessionPhotos/${activeScheduleSessionId}`),snapshot=>setSessionPhotos(current=>{
      const next={...current}
      const value=snapshot.val()
      if(value&&typeof value==='object')next[activeScheduleSessionId]=value as Record<string,string>
      else delete next[activeScheduleSessionId]
      return next
    }))
  },[activeScheduleSessionId,user,demo])

  useEffect(()=>{
    if(!database||!user||demo||!isAdmin)return
    return onValue(ref(database,'coachProfiles'),snapshot=>{
      const value=snapshot.val() as Record<string,unknown>|null
      setCoachProfiles(value?Object.entries(value).map(([uid,profile])=>normaliseCoachProfile(uid,profile)):[])
    })
  },[user,demo,isAdmin])

  useEffect(()=>{
    if(demo)return
    if(!database||!user||!isAdmin){setSeasonArchives([]);setArchivedPlayers({});setActivityLog([]);return}
    const stopArchives=onValue(ref(database,'seasonArchives'),snapshot=>{
      const value=snapshot.val() as Record<string,unknown>|null
      setSeasonArchives(value?Object.entries(value).map(([id,archive])=>normaliseSeasonArchive(id,archive)).filter((archive):archive is SeasonArchive=>Boolean(archive)).sort((a,b)=>b.archivedAt-a.archivedAt):[])
    })
    const recentActivity=firebaseQuery(ref(database,'auditLog'),orderByChild('timestamp'),limitToLast(500))
    const stopActivity=onValue(recentActivity,snapshot=>{
      const value=snapshot.val() as Record<string,unknown>|null
      setActivityLog(value?Object.entries(value).map(([id,entry])=>normaliseActivityEntry(id,entry)).filter((entry):entry is ActivityLogEntry=>Boolean(entry)).sort((a,b)=>b.timestamp-a.timestamp):[])
    })
    const stopArchivedPlayers=onValue(ref(database,'archivedPlayers'),snapshot=>{
      const value=snapshot.val() as Record<string,unknown>|null
      setArchivedPlayers(value?Object.fromEntries(Object.entries(value).flatMap(([id,record])=>{const normalised=normaliseArchivedPlayerRecord(id,record);return normalised?[[id,normalised]]:[]})): {})
    })
    return ()=>{stopArchives();stopActivity();stopArchivedPlayers()}
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
  const savePlayerDecision=async(playerId:string,expected:PlayerDecisionDraft,next:PlayerDecisionDraft):Promise<PlayerDecisionSaveResult>=>{
    const previous=players.find(player=>player.id===playerId)
    const updatedAt=Date.now()
    const updatedBy=user?.email||'Local demo'
    let saved:Player|undefined
    if(database&&user&&!demo){
      setSyncState('saving')
      let result
      try{
        result=await runTransaction(ref(database,`players/${playerId}`),current=>{
          if(!current)return
          const latest=normalisePlayer({id:playerId,...current} as Player)
          if(!sameDecisionDraft(decisionDraftFor(latest),expected))return
          const{id:_,...data}=normalisePlayer({...applyDecisionDraft(latest,next),updatedAt,updatedBy})
          return firebaseSafeValue(data)
        },{applyLocally:false})
      }catch(error){
        setSyncState('live')
        throw error
      }
      if(!result.committed){
        if(result.snapshot.exists()){
          const latest=normalisePlayer({id:playerId,...result.snapshot.val()} as Player)
          setPlayers(current=>current.map(player=>player.id===playerId?latest:player))
        }
        setSyncState('live')
        return 'conflict'
      }
      saved=normalisePlayer({id:playerId,...result.snapshot.val()} as Player)
      setPlayers(current=>current.map(player=>player.id===playerId?saved!:player))
    }else{
      if(!previous||!sameDecisionDraft(decisionDraftFor(previous),expected))return 'conflict'
      saved=normalisePlayer({...applyDecisionDraft(previous,next),updatedAt,updatedBy})
      const updatedPlayers=players.map(player=>player.id===playerId?saved!:player)
      setPlayers(updatedPlayers)
      localStorage.setItem('f6players',JSON.stringify(updatedPlayers))
    }
    const activity=describePlayerChange(previous,saved)
    if(activity)await recordActivity(activity)
    return 'saved'
  }
  const saveAssessment=async(updated:Player)=>{
    const snapshotId=crypto.randomUUID()
    const recordedBy=activityActor.name
    const snapshot={id:snapshotId,assessment:{...updated.assessment},average:averageRating(updated),recommendation:updated.recommendation,strengths:updated.strengths,developmentAreas:updated.developmentAreas,suitableTeams:[...updated.suitableTeams],recordedAt:Date.now(),recordedBy}
    await save({...updated,assessmentHistory:{...updated.assessmentHistory,[snapshotId]:snapshot}},{category:'player',action:'assessment_saved',summary:`Saved a new assessment for ${updated.name}`,detail:`Overall average ${snapshot.average?snapshot.average.toFixed(1):'not rated'} · ${updated.recommendation||'No recommendation'}`,team:updated.offeredTeam||updated.appliedTeam,entityType:'player',entityId:updated.id})
  }
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
    navigate({page:'players',playerId:stamped[0]?.id,playerTab:'overview',teamFilter:'All teams'})
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
    navigate({page:'schedule',sessionId})
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
      const updates:Record<string,unknown>={[`trialSessions/${sessionId}`]:null,[`sessionPhotos/${sessionId}`]:null}
      affected.forEach(player=>{const updated={...normalisePlayer(player),trialSessionId:'',trialDate:'Not assigned',trialResponseStatus:'',paid:false,attended:false,updatedAt:Date.now(),updatedBy:user.email||'Coach'};const{id,...data}=updated;updates[`players/${id}`]=data})
      await update(ref(database),updates)
    }else{
      const nextSessions=trialSessions.filter(session=>session.id!==sessionId)
      const nextPlayers=players.map(player=>player.trialSessionId===sessionId?{...player,trialSessionId:'',trialDate:'Not assigned',trialResponseStatus:'' as const,paid:false,attended:false}:player)
      const nextPhotos={...sessionPhotos};delete nextPhotos[sessionId]
      setTrialSessions(nextSessions);setPlayers(nextPlayers);setSessionPhotos(nextPhotos)
      localStorage.setItem('f6trialsessions',JSON.stringify(nextSessions));localStorage.setItem('f6players',JSON.stringify(nextPlayers));localStorage.setItem('f6sessionphotos',JSON.stringify(nextPhotos))
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
  const uploadSessionPhoto=async(session:TrialSession,file:File)=>{
    const current=sessionPhotos[session.id]||{}
    if(Object.keys(current).length>=6)throw new Error('Each calendar event can contain up to 6 photos.')
    const prepared=await prepareEventPhoto(file)
    const photo=await blobToDataUrl(prepared)
    if(photo.length>300000)throw new Error('This photo is still too detailed after resizing. Try a more tightly cropped image.')
    const photoId=crypto.randomUUID()
    const next={...sessionPhotos,[session.id]:{...current,[photoId]:photo}}
    setSessionPhotos(next)
    if(database&&user&&!demo){setSyncState('saving');await set(ref(database,`sessionPhotos/${session.id}/${photoId}`),photo)}
    else localStorage.setItem('f6sessionphotos',JSON.stringify(next))
    await recordActivity({category:'schedule',action:'session_photo_uploaded',summary:`Added a photo to ${session.title}`,detail:trialDateLabel(session.date),team:session.teams.join(', '),entityType:'session',entityId:session.id})
  }
  const removeSessionPhoto=async(session:TrialSession,photoId:string)=>{
    const current={...sessionPhotos[session.id]};delete current[photoId]
    const next={...sessionPhotos}
    if(Object.keys(current).length)next[session.id]=current
    else delete next[session.id]
    setSessionPhotos(next)
    if(database&&user&&!demo)await set(ref(database,`sessionPhotos/${session.id}/${photoId}`),null)
    else localStorage.setItem('f6sessionphotos',JSON.stringify(next))
    await recordActivity({category:'schedule',action:'session_photo_removed',summary:`Removed a photo from ${session.title}`,detail:'',team:session.teams.join(', '),entityType:'session',entityId:session.id})
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
  const saveSeasonSettings=async(settings:SeasonSettings)=>{
    if(!isAdmin)return
    const stamped={...normaliseSeasonSettings(settings),updatedAt:Date.now(),updatedBy:user?.email||'Local demo'}
    setSeasonSettings(stamped)
    if(database&&user&&!demo){setSyncState('saving');await set(ref(database,'seasonSettings'),stamped)}
    else localStorage.setItem('f6seasonsettings',JSON.stringify(stamped))
    await recordActivity({category:'settings',action:'trials_mode_changed',summary:`Trials Mode turned ${stamped.trialsMode?'on':'off'}`,detail:stamped.trialsMode?'Trial assessment, decisions and communications enabled.':'Portal simplified for in-season club management.',team:'',entityType:'settings',entityId:'seasonSettings'})
  }
  const rolloverSeason=async(nextSeasonName:string)=>{
    if(!isAdmin)throw new Error('Administrator access is required.')
    const archive=createSeasonArchive({seasonName:seasonSettings.currentSeason,nextSeasonName,archivedBy:activityActor.name,players,sessions:trialSessions,teamPlans,playerFinance,financeSettings,emailSettings,archivedPlayers})
    const nextSettings:SeasonSettings={currentSeason:nextSeasonName,trialsMode:true,updatedAt:Date.now(),updatedBy:activityActor.email||activityActor.name}
    const entry=createActivityEntry({category:'season',action:'season_rollover',summary:`Archived ${seasonSettings.currentSeason} and started ${nextSeasonName}`,detail:`${players.length} players and ${trialSessions.length} events archived.`,team:'',entityType:'season',entityId:archive.id},activityActor,nextSeasonName)
    if(database&&user&&!demo){setSyncState('saving');await update(ref(database),{[`seasonArchives/${archive.id}`]:archive,players:null,archivedPlayers:null,trialSessions:null,sessionPhotos:null,playerFinance:null,playerStars:null,playerPhotos:null,seasonSettings:nextSettings,[`auditLog/${entry.id}`]:entry})}else{
      const nextArchives=[archive,...seasonArchives];setSeasonArchives(nextArchives);setPlayers([]);setArchivedPlayers({});setTrialSessions([]);setSessionPhotos({});setPlayerFinance({});setPlayerStars({});setPlayerPhotos({});setSeasonSettings(nextSettings);setActivityLog(current=>[entry,...current].slice(0,500));setSelectedId('')
      localStorage.setItem('f6seasonarchives',JSON.stringify(nextArchives));localStorage.setItem('f6players','[]');localStorage.setItem('f6archivedplayers','{}');localStorage.setItem('f6trialsessions','[]');localStorage.setItem('f6sessionphotos','{}');localStorage.setItem('f6playerfinance','{}');localStorage.setItem('f6playerstars','{}');localStorage.setItem('f6playerphotos','{}');localStorage.setItem('f6seasonsettings',JSON.stringify(nextSettings));localStorage.setItem('f6activitylog',JSON.stringify([entry,...activityLog].slice(0,500)))
    }
  }
  const cleanupTrialists=async(scope:'rejected'|'not-confirmed')=>{
    if(!isAdmin)throw new Error('Administrator access is required.')
    const targets=players.filter(player=>scope==='rejected'?player.decision==='Rejection sent':player.decision!=='Offer accepted')
    if(!targets.length)return 0
    const targetIds=new Set(targets.map(player=>player.id))
    const retained=players.filter(player=>!targetIds.has(player.id))
    const reason=scope==='rejected'?'Final rejection cleanup':'Outside confirmed squad cleanup'
    const archivedAt=Date.now()
    if(database&&user&&!demo){
      setSyncState('saving')
      const [starSnapshot,photoSnapshot]=await Promise.all([get(ref(database,'playerStars')),get(ref(database,'playerPhotos'))])
      const allStars=(starSnapshot.val()||{}) as Record<string,Record<string,boolean>>
      const allPhotos=(photoSnapshot.val()||{}) as Record<string,string>
      const updates:Record<string,unknown>={}
      targets.forEach(player=>{updates[`archivedPlayers/${player.id}`]=createArchivedPlayerRecord({player,photo:allPhotos[player.id],seasonName:seasonSettings.currentSeason,archivedBy:activityActor.name,reason,archivedAt});updates[`players/${player.id}`]=null;updates[`playerPhotos/${player.id}`]=null;updates[`playerFinance/${player.id}`]=null})
      Object.entries(allStars).forEach(([uid,stars])=>targets.forEach(player=>{if(stars?.[player.id])updates[`playerStars/${uid}/${player.id}`]=null}))
      await update(ref(database),updates)
    }else{
      const nextFinance={...playerFinance};const nextPhotos={...playerPhotos};const nextStars={...playerStars};const nextArchived={...archivedPlayers}
      targets.forEach(player=>{nextArchived[player.id]=createArchivedPlayerRecord({player,photo:nextPhotos[player.id],seasonName:seasonSettings.currentSeason,archivedBy:activityActor.name,reason,archivedAt});delete nextFinance[player.id];delete nextPhotos[player.id];delete nextStars[player.id]})
      setPlayers(retained);setArchivedPlayers(nextArchived);setPlayerFinance(nextFinance);setPlayerPhotos(nextPhotos);setPlayerStars(nextStars);setSelectedId(retained[0]?.id||'')
      localStorage.setItem('f6players',JSON.stringify(retained));localStorage.setItem('f6archivedplayers',JSON.stringify(nextArchived));localStorage.setItem('f6playerfinance',JSON.stringify(nextFinance));localStorage.setItem('f6playerphotos',JSON.stringify(nextPhotos));localStorage.setItem('f6playerstars',JSON.stringify(nextStars))
    }
    await recordActivity({category:'season',action:'trialist_cleanup',summary:`Archived ${targets.length} trialist${targets.length===1?'':'s'} from live records`,detail:scope==='rejected'?'Final rejection records moved to Archived players.':'All players outside confirmed squads moved to Archived players.',team:'',entityType:'season',entityId:seasonSettings.currentSeason})
    return targets.length
  }
  const restoreArchivedPlayer=async(record:ArchivedPlayerRecord)=>{
    if(!isAdmin)throw new Error('Administrator access is required.')
    if(players.some(player=>player.id===record.id))throw new Error('This player already exists in the live records.')
    const restored=normalisePlayer({...record.player,id:record.id,updatedAt:Date.now(),updatedBy:activityActor.email||activityActor.name})
    if(database&&user&&!demo){
      setSyncState('saving')
      const {id,...data}=restored
      await update(ref(database),{[`players/${id}`]:data,[`playerPhotos/${id}`]:record.photo||null,[`archivedPlayers/${id}`]:null})
    }else{
      const nextPlayers=[...players,restored]
      const nextArchived={...archivedPlayers};delete nextArchived[record.id]
      const nextPhotos={...playerPhotos};if(record.photo)nextPhotos[record.id]=record.photo
      setPlayers(nextPlayers);setArchivedPlayers(nextArchived);setPlayerPhotos(nextPhotos)
      localStorage.setItem('f6players',JSON.stringify(nextPlayers));localStorage.setItem('f6archivedplayers',JSON.stringify(nextArchived));localStorage.setItem('f6playerphotos',JSON.stringify(nextPhotos))
    }
    navigate({page:'players',playerId:record.id,playerTab:'overview',teamFilter:'All teams'})
    await recordActivity({category:'season',action:'archived_player_restored',summary:`Restored ${record.player.name} to live player records`,detail:`Restored from ${record.archiveReason.toLowerCase()} in ${record.seasonName}.`,team:record.player.appliedTeam,entityType:'player',entityId:record.id})
  }
  const openPlayer=(id:string,tab:PlayerTab)=>navigate({page:'players',playerId:id,playerTab:tab,teamFilter})
  const openEmail=(id:string)=>navigate({page:'emails',playerId:id})
  const openSchedule=(id:string)=>navigate({page:'schedule',sessionId:id})
  const selectPlayerTab=(tab:PlayerTab)=>navigate({page:'players',playerId:selectedId||undefined,playerTab:tab,teamFilter})
  const playerForTeamFilter=(team:string)=>players.find(player=>player.id===selectedId&&(team==='All teams'||(seasonSettings.trialsMode?player.appliedTeam:confirmedTeam(player))===team))||players.find(player=>team==='All teams'||(seasonSettings.trialsMode?player.appliedTeam:confirmedTeam(player))===team)
  const changeTeamFilter=(team:string)=>navigate({page:'players',playerId:playerForTeamFilter(team)?.id,playerTab,teamFilter:team})
  const openTeamPlayers=(team:string)=>navigate({page:'players',playerId:playerForTeamFilter(team)?.id,playerTab,teamFilter:team})
  const selectEmailPlayer=(id:string)=>navigate({page:'emails',playerId:id},true)
  const selectTeam=(team:string)=>navigate({page:'teams',team},true)
  const selectScheduleSession=useCallback((id:string)=>{
    setActiveScheduleSessionId(id)
    if(!id||requestedSessionId)return
    const nextHash=appHashFor({page:'schedule',sessionId:id})
    if(window.location.hash!==nextHash)window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}${nextHash}`)
  },[requestedSessionId])

  if(authLoading)return <div className="loading-page">Loading F6 Club Manager…</div>
  if(!user&&!demo)return <Login onDemo={()=>setDemo(true)}/>

  return <div className="app">
    <Sidebar page={page} setPage={navigatePage} players={players} teamFilter={teamFilter} openTeam={openTeamPlayers} syncState={syncState} signedIn={Boolean(user)} accountEmail={user?.email || undefined} accountName={coachProfile?.displayName||undefined} sharedAccount={Boolean(user?.email && user.email === sharedLoginEmail)} assignedTeams={editableTeams} isAdmin={isAdmin} accountRole={coachProfile?.role||null} currentSeason={seasonSettings.currentSeason} trialsMode={seasonSettings.trialsMode} onSignOut={()=>auth&&signOut(auth)}/>
    <main>
      {page==='dashboard'&&<DashboardPage players={players} sessions={trialSessions} settings={activeEmailSettings} teamPlans={teamPlans} setPage={navigatePage} openPlayer={(id,tab='decision')=>openPlayer(id,tab)} openEmail={openEmail} openSchedule={openSchedule} assignedTeams={editableTeams} isAdmin={isAdmin} finances={playerFinance} financeSettings={financeSettings} playerStars={playerStars} trialsMode={seasonSettings.trialsMode}/>}
      {page==='schedule'&&<SchedulePage sessions={trialSessions} players={players} saveSession={saveTrialSession} saveSessions={saveTrialSessionSeries} deleteSession={deleteTrialSession} savePlayer={save} openPlayer={id=>openPlayer(id,'overview')} onImport={()=>setImportOpen(true)} teamColours={Object.fromEntries(Object.entries(activeEmailSettings.teamDetails).map(([team,details])=>[team,details.calendarColor]))} requestedSessionId={requestedSessionId} onRequestedSessionHandled={()=>setRequestedSessionId('')} eventPhotos={sessionPhotos[activeScheduleSessionId]||{}} uploadEventPhoto={uploadSessionPhoto} removeEventPhoto={removeSessionPhoto} onSelectedSessionChange={selectScheduleSession} editableTeams={editableTeams} isAdmin={isAdmin} trialsMode={seasonSettings.trialsMode}/>}
      {page==='players'&&<PlayersPage players={players} sessions={trialSessions} selectedId={selectedId} openPlayer={openPlayer} query={query} setQuery={setQuery} teamFilter={teamFilter} setTeamFilter={changeTeamFilter} assignedTeams={editableTeams} teamDivisions={teamDivisions} save={save} saveDecision={savePlayerDecision} saveAssessment={saveAssessment} onImport={()=>setImportOpen(true)} activeTab={playerTab} setActiveTab={selectPlayerTab} playerStars={playerStars} currentCoachId={currentCoachId} toggleStar={togglePlayerStar} selectedPhoto={playerPhotos[selectedId]||''} uploadPhoto={uploadPlayerPhoto} removePhoto={removePlayerPhoto} trialsMode={seasonSettings.trialsMode}/>}
      {page==='emails'&&<EmailsPage players={players} playersReady={playersReady} teamAccessReady={demo||isAdmin||Boolean(coachProfile)} assignedTeams={editableTeams} sessions={trialSessions} settings={activeEmailSettings} teamPlans={teamPlans} save={save} markSent={markEmailSent} selectedId={selectedId} setSelectedId={selectEmailPlayer} onOpen={id=>openPlayer(id,'decision')}/>}
      {page==='teams'&&<TeamsPage players={players} sessions={trialSessions} teamPlans={teamPlans} savePlayer={save} saveTarget={saveTeamTarget} selectedTeam={selectedTeam} setSelectedTeam={selectTeam} onOpenPlayer={id=>openPlayer(id,'assessment')} onOpenSchedule={openSchedule} canEditTeam={team=>editableTeams.includes(team)} editableTeams={editableTeams} isAdmin={isAdmin} finances={playerFinance} financeSettings={financeSettings} trialsMode={seasonSettings.trialsMode}/>}
      {page==='finance'&&isAdmin&&<FinancePage players={players} finances={playerFinance} financeSettings={financeSettings} saveFinance={savePlayerFinance} onOpenPlayer={id=>openPlayer(id,'overview')}/>} 
      {page==='activity'&&isAdmin&&<ActivityPage entries={activityLog} players={players} sessions={trialSessions} openPlayer={id=>openPlayer(id,'overview')} openSession={openSchedule}/>} 
      {page==='archive'&&isAdmin&&<ArchivePage seasonSettings={seasonSettings} players={players} sessions={trialSessions} archives={seasonArchives} archivedPlayers={Object.values(archivedPlayers).sort((a,b)=>b.archivedAt-a.archivedAt)} rollover={rolloverSeason} cleanupTrialists={cleanupTrialists} restoreArchivedPlayer={restoreArchivedPlayer}/>} 
      {page==='settings'&&<SettingsPage settings={emailSettings} save={saveEmailSettings} financeSettings={financeSettings} saveFinanceSettings={saveFinanceSettings} seasonSettings={seasonSettings} saveSeasonSettings={saveSeasonSettings} coachProfiles={coachProfiles} isAdmin={isAdmin} currentUid={user?.uid||'demo'} saveCoachProfile={saveCoachProfile}/>} 
    </main>
    {importOpen&&<CsvImportModal existingPlayers={players} onClose={()=>setImportOpen(false)} onImport={importPlayers} onWorkbookImport={importTrialWorkbook}/>} 
  </div>
}
