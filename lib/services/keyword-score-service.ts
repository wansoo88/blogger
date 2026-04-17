import { Category } from '@prisma/client'
import { db } from '@/lib/db'

export const CATEGORY_CPC_PRESETS: Record<Category, number> = {
  MONEY_SAVING: 2.5,
  AI_PRODUCTIVITY: 1.8,
  DIGITAL_HOWTO: 1.2,
  WORK_TIPS: 0.9,
  TIME_MANAGEMENT: 0.8,
  HOME_ORGANIZATION: 0.7,
  SYSTEM_PAGE: 0.0,
}

export const CATEGORY_COMPETITION_PRESETS: Record<Category, number> = {
  MONEY_SAVING: 0.75,
  AI_PRODUCTIVITY: 0.6,
  DIGITAL_HOWTO: 0.55,
  WORK_TIPS: 0.45,
  TIME_MANAGEMENT: 0.4,
  HOME_ORGANIZATION: 0.35,
  SYSTEM_PAGE: 0.0,
}

export const CATEGORY_LABELS_KO: Record<Category, string> = {
  AI_PRODUCTIVITY: 'AI 생산성',
  MONEY_SAVING: '절약/재테크',
  DIGITAL_HOWTO: '디지털 활용',
  TIME_MANAGEMENT: '시간관리',
  HOME_ORGANIZATION: '홈 정리',
  WORK_TIPS: '업무 팁',
  SYSTEM_PAGE: '시스템 페이지',
}

const INTENT_MULTIPLIER: Record<string, number> = {
  transactional: 1.6,
  commercial: 1.4,
  informational: 1.0,
  navigational: 0.6,
}

export function getIntentMultiplier(intent: string): number {
  const key = intent?.toLowerCase().trim() ?? 'informational'
  return INTENT_MULTIPLIER[key] ?? 1.0
}

export function computeKeywordRevenueScore(input: {
  priority: number
  intent: string
  category: Category
  estimatedCpc?: number | null
  competitionScore?: number | null
  estimatedVolume?: number | null
}) {
  const cpc = input.estimatedCpc ?? CATEGORY_CPC_PRESETS[input.category] ?? 0.5
  const competition =
    input.competitionScore ?? CATEGORY_COMPETITION_PRESETS[input.category] ?? 0.5
  const volume = input.estimatedVolume ?? 500
  const intentMul = getIntentMultiplier(input.intent)
  const competitionFactor = Math.max(0.1, 1 - competition)
  const volumeFactor = Math.log10(volume + 10)

  const score = input.priority * intentMul * cpc * competitionFactor * volumeFactor
  return Math.round(score * 1000) / 1000
}

export function getCategoryDefaults(category: Category) {
  return {
    cpc: CATEGORY_CPC_PRESETS[category] ?? 0.5,
    competition: CATEGORY_COMPETITION_PRESETS[category] ?? 0.5,
  }
}

export async function recomputeAllKeywordScores() {
  const keywords = await db.keyword.findMany({
    select: {
      id: true,
      priority: true,
      intent: true,
      category: true,
      estimatedCpc: true,
      competitionScore: true,
      estimatedVolume: true,
    },
  })

  let updated = 0
  for (const k of keywords) {
    const score = computeKeywordRevenueScore(k)
    await db.keyword.update({
      where: { id: k.id },
      data: { revenueScore: score },
    })
    updated++
  }
  return { updated }
}
