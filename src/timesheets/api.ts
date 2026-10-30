import {httpsCallable} from 'firebase/functions'
import {signupManagerFunctions} from '../signup/firebase'
import type {CoachInvoice} from '../types'

type InvoiceEdit={invoiceNumber:string;season:string;totalHours:number;totalAmount:number;note:string}
export async function updateCoachInvoice(invoice:CoachInvoice,edit:InvoiceEdit){
  if(!signupManagerFunctions)throw new Error('The finance service is not configured.')
  const call=httpsCallable<{coachUid:string;invoiceId:string}&InvoiceEdit,{updatedAt:number}>(signupManagerFunctions,'updateCoachInvoice')
  const response=await call({coachUid:invoice.coachUid,invoiceId:invoice.id,...edit})
  return response.data
}
