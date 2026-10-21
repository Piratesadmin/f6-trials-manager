import {httpsCallable} from 'firebase/functions'
import {signupManagerFunctions} from '../signup/firebase'
import type {RefereeInvoiceStatus, RefereeRole} from '../types'

function call<Request, Response>(name: string) {
  if (!signupManagerFunctions) throw new Error('The referee invoice service has not been configured.')
  return httpsCallable<Request, Response>(signupManagerFunctions, name)
}

export type RefereeInvoiceInvite = {
  fixtureId: string
  fixtureDate: string
  fixtureTitle: string
  team: string
  venue: string
  competition: string
  role: RefereeRole
  roleLabel: string
  submitted: boolean
}

export type RefereeInvoiceAttachment = {name:string;contentType:string;base64:string}
export type RefereeInvoiceDraft = {refereeName:string;email:string;invoiceNumber:string;amount:number;notes:string;attachment?:RefereeInvoiceAttachment}

export async function createRefereeInvoiceLinks(fixture:{fixtureId:string;fixtureDate:string;fixtureTitle:string;team:string;opponent:string;venue:string;competition:string}) {
  const result=await call<typeof fixture,{links:Partial<Record<RefereeRole,string>>;expiresAt:number}>('createRefereeInvoiceLinks')(fixture)
  return result.data
}

export async function getRefereeInvoiceInvite(token:string) {
  const result=await call<{token:string},RefereeInvoiceInvite>('getRefereeInvoiceInvite')({token})
  return result.data
}

export async function submitRefereeInvoice(token:string,draft:RefereeInvoiceDraft) {
  await call<{token:string}&RefereeInvoiceDraft,{submittedAt:number}>('submitRefereeInvoice')({token,...draft})
}

export async function updateRefereeInvoiceStatus(fixtureId:string,role:RefereeRole,status:RefereeInvoiceStatus) {
  await call<{fixtureId:string;role:RefereeRole;status:RefereeInvoiceStatus},{updatedAt:number}>('updateRefereeInvoiceStatus')({fixtureId,role,status})
}

export async function getRefereeInvoiceAttachmentUrl(fixtureId:string,role:RefereeRole) {
  const result=await call<{fixtureId:string;role:RefereeRole},{url:string}>('getRefereeInvoiceAttachmentUrl')({fixtureId,role})
  return result.data.url
}
