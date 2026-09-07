export type WelfareMode = 'one-time' | 'conversation'
export type WelfareCategory = 'safeguarding' | 'discrimination' | 'conduct' | 'wellbeing' | 'club-feedback' | 'other'
export type WelfareStatus = 'new' | 'open' | 'closed'
export type WelfareSender = 'reporter' | 'welfare'

export type WelfareMessage = {
  id: string
  sender: WelfareSender
  text: string
  createdAt: number
}

export type WelfareCaseSummary = {
  id: string
  mode: WelfareMode
  category: WelfareCategory
  status: WelfareStatus
  urgent: boolean
  createdAt: number
  updatedAt: number
  latestPreview: string
  unreadForStaff: boolean
  unreadForReporter: boolean
}

export type WelfareCase = WelfareCaseSummary & {
  messages: WelfareMessage[]
}

export const welfareCategories: Array<{value: WelfareCategory; label: string}> = [
  {value: 'safeguarding', label: 'Safeguarding'},
  {value: 'discrimination', label: 'Discrimination or harassment'},
  {value: 'conduct', label: 'Conduct or behaviour'},
  {value: 'wellbeing', label: 'Wellbeing'},
  {value: 'club-feedback', label: 'Club feedback'},
  {value: 'other', label: 'Something else'},
]

export const welfareCategoryLabel = (category: WelfareCategory) => welfareCategories.find(item => item.value === category)?.label || 'Other'
