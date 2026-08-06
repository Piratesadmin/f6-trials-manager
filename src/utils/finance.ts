import type { FinanceSettings, PaymentPlan, Player, PlayerFinance } from '../types'

export const paymentPlans: Exclude<PaymentPlan, ''>[] = ['Fully paid', '2 instalments', 'Direct debit']
export const nvlTeams = ['Aces', 'Ravens']
export const defaultFinanceSettings: FinanceSettings = { nvlFee: 0, lvaFee: 0 }

export function confirmedTeam(player: Player) {
  if (player.decision !== 'Offer accepted') return ''
  return player.offeredTeam || player.appliedTeam
}

export function confirmedPosition(player: Player) {
  return player.offeredPosition || player.position
}

export function emptyPlayerFinance(playerId: string): PlayerFinance {
  return { playerId, amountOwed: 0, usesStandardFee: true, amountPaid: 0, paymentPlan: '', notes: '' }
}

function safeMoney(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100) / 100) : 0
}

export function normalisePlayerFinance(playerId: string, value: unknown): PlayerFinance {
  const incoming = value && typeof value === 'object' ? value as Partial<PlayerFinance> : {}
  const paymentPlan: PaymentPlan = paymentPlans.includes(incoming.paymentPlan as Exclude<PaymentPlan, ''>) ? incoming.paymentPlan as PaymentPlan : ''
  return {
    playerId,
    amountOwed: safeMoney(incoming.amountOwed),
    usesStandardFee: typeof incoming.usesStandardFee === 'boolean' ? incoming.usesStandardFee : !safeMoney(incoming.amountOwed),
    amountPaid: safeMoney(incoming.amountPaid),
    paymentPlan,
    notes: typeof incoming.notes === 'string' ? incoming.notes : '',
    updatedAt: typeof incoming.updatedAt === 'number' ? incoming.updatedAt : undefined,
    updatedBy: typeof incoming.updatedBy === 'string' ? incoming.updatedBy : undefined,
  }
}

export function normaliseFinanceSettings(value: unknown): FinanceSettings {
  const incoming = value && typeof value === 'object' ? value as Partial<FinanceSettings> : {}
  return {
    nvlFee: safeMoney(incoming.nvlFee),
    lvaFee: safeMoney(incoming.lvaFee),
    updatedAt: typeof incoming.updatedAt === 'number' ? incoming.updatedAt : undefined,
    updatedBy: typeof incoming.updatedBy === 'string' ? incoming.updatedBy : undefined,
  }
}

export function feeBandForTeam(team: string) {
  return nvlTeams.includes(team) ? 'NVL' as const : 'LVA' as const
}

export function standardFeeForTeam(team: string, settings: FinanceSettings) {
  return feeBandForTeam(team) === 'NVL' ? settings.nvlFee : settings.lvaFee
}

export function effectiveAmountOwed(player: Player, finance: PlayerFinance, settings: FinanceSettings) {
  return finance.usesStandardFee ? standardFeeForTeam(confirmedTeam(player), settings) : finance.amountOwed
}

export function outstandingAmount(finance: PlayerFinance, amountOwed = finance.amountOwed) {
  return Math.max(0, Math.round((amountOwed - finance.amountPaid) * 100) / 100)
}

export function paymentStatus(finance: PlayerFinance, amountOwed = finance.amountOwed) {
  if (!amountOwed) return 'Fee not set' as const
  if (finance.amountPaid >= amountOwed) return 'Paid' as const
  if (finance.amountPaid > 0) return 'Part paid' as const
  return 'Outstanding' as const
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
}
