import { httpsCallable } from 'firebase/functions'
import { welfarePublicFunctions, welfareStaffFunctions } from './firebase'
import type { WelfareCase, WelfareCaseSummary, WelfareCategory, WelfareMode, WelfareStatus } from './types'

function publicCallable<Request, Response>(name: string) {
  if (!welfarePublicFunctions) throw new Error('The confidential welfare service has not been configured.')
  return httpsCallable<Request, Response>(welfarePublicFunctions, name)
}

function staffCallable<Request, Response>(name: string) {
  if (!welfareStaffFunctions) throw new Error('The confidential welfare service has not been configured.')
  return httpsCallable<Request, Response>(welfareStaffFunctions, name)
}

export async function submitWelfareCase(input: {mode: WelfareMode; category: WelfareCategory; urgent: boolean; message: string}) {
  const result = await publicCallable<typeof input, {caseId: string; mode: WelfareMode; recoveryCode?: string}>('submitWelfareCase')(input)
  return result.data
}

export async function getWelfareConversation(caseId: string, recoveryCode: string) {
  const result = await publicCallable<{caseId: string; recoveryCode: string}, WelfareCase>('getWelfareConversation')({caseId, recoveryCode})
  return result.data
}

export async function replyToWelfareConversation(caseId: string, recoveryCode: string, message: string) {
  await publicCallable<{caseId: string; recoveryCode: string; message: string}, {updatedAt: number}>('replyToWelfareConversation')({caseId, recoveryCode, message})
}

export async function listWelfareCases() {
  const result = await staffCallable<Record<string, never>, {cases: WelfareCaseSummary[]}>('listWelfareCases')({})
  return result.data.cases
}

export async function getStaffWelfareCase(caseId: string) {
  const result = await staffCallable<{caseId: string}, WelfareCase>('getStaffWelfareCase')({caseId})
  return result.data
}

export async function replyToWelfareCase(caseId: string, message: string) {
  await staffCallable<{caseId: string; message: string}, {updatedAt: number}>('replyToWelfareCase')({caseId, message})
}

export async function updateWelfareCaseStatus(caseId: string, status: WelfareStatus) {
  await staffCallable<{caseId: string; status: WelfareStatus}, {updatedAt: number}>('updateWelfareCaseStatus')({caseId, status})
}
