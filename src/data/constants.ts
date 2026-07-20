import type { Player } from '../types'

export const teams = ['Aces','Ravens','Cobras','Coyotes','Llamas','Meerkats','Leopards','Pirates']
export const positions = ['Setter','Outside','Middle','Opposite','Libero','All-rounder']
export const reasons = ['Very high number of applicants','Limited squad spaces','Position already filled','Team level or profile fit','Training availability does not match','No suitable team currently available']

export const initialPlayers: Player[] = [
  {id:'1',name:'Alex Morgan',email:'alex@example.com',appliedTeam:'Cobras',position:'Setter',trialDate:'11 Aug 2026',attended:true,decision:'Awaiting decision',notes:'Good hands and communication.'},
  {id:'2',name:'Jamie Patel',email:'jamie@example.com',appliedTeam:'Ravens',position:'Outside',trialDate:'11 Aug 2026',attended:true,decision:'Offer planned',offeredTeam:'Ravens',offeredPosition:'Outside',notes:'Strong passer.'},
  {id:'3',name:'Sam Taylor',email:'sam@example.com',appliedTeam:'Cobras',position:'Libero',trialDate:'18 Aug 2026',attended:true,decision:'Alternative offer',offeredTeam:'Meerkats',offeredPosition:'Libero',notes:'Better fit for Meerkats.'},
  {id:'4',name:'Jordan Lee',email:'jordan@example.com',appliedTeam:'Pirates',position:'Middle',trialDate:'18 Aug 2026',attended:false,decision:'Awaiting decision',notes:''},
]
