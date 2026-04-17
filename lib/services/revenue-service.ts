import { Category } from '@prisma/client'
import { db } from '@/lib/db'
import { CATEGORY_LABELS_KO } from '@/lib/services/keyword-score-service'

const DAY_MS = 24 * 60 * 60 * 1000

function startOf(daysAgo: number) {
  return new Date(Date.now() - daysAgo * DAY_MS)
}

export async function getRevenueSummary() {
  const sevenDaysAgo = startOf(7)
  const thirtyDaysAgo = startOf(30)

  const [lifetimeAgg, last7, last30] = await Promise.all([
    db.metricsSnapshot.aggregate({
      _sum: { revenue: true, adImpressions: true, adClicks: true },
    }),
    db.metricsSnapshot.aggregate({
      _sum: { revenue: true, adImpressions: true },
      where: { capturedAt: { gte: sevenDaysAgo } },
    }),
    db.metricsSnapshot.aggregate({
      _sum: { revenue: true, adImpressions: true },
      where: { capturedAt: { gte: thirtyDaysAgo } },
    }),
  ])

  const affiliate = await db.affiliateClick.aggregate({
    _sum: { payout: true },
    where: { converted: true },
  })

  const affiliate30 = await db.affiliateClick.aggregate({
    _sum: { payout: true },
    where: { converted: true, clickedAt: { gte: thirtyDaysAgo } },
  })

  const lifetimeAdRevenue = lifetimeAgg._sum.revenue ?? 0
  const lifetimeAffiliate = affiliate._sum.payout ?? 0
  const rpm30 = last30._sum.adImpressions
    ? ((last30._sum.revenue ?? 0) / last30._sum.adImpressions) * 1000
    : 0

  return {
    lifetime: {
      adsenseRevenue: lifetimeAdRevenue,
      affiliateRevenue: lifetimeAffiliate,
      totalRevenue: lifetimeAdRevenue + lifetimeAffiliate,
      adImpressions: lifetimeAgg._sum.adImpressions ?? 0,
      adClicks: lifetimeAgg._sum.adClicks ?? 0,
    },
    last7: {
      adsenseRevenue: last7._sum.revenue ?? 0,
      adImpressions: last7._sum.adImpressions ?? 0,
    },
    last30: {
      adsenseRevenue: last30._sum.revenue ?? 0,
      affiliateRevenue: affiliate30._sum.payout ?? 0,
      rpm: rpm30,
    },
  }
}

export async function getTopEarningPosts(limit = 10) {
  return db.post.findMany({
    where: {
      status: 'PUBLISHED',
      totalRevenue: { gt: 0 },
    },
    orderBy: { totalRevenue: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      totalRevenue: true,
      bloggerUrl: true,
      publishedAt: true,
      lastRevenueAt: true,
    },
  })
}

export async function getRevenueByCategory() {
  const posts = await db.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { category: true, totalRevenue: true },
  })

  const byCategory = new Map<Category, { revenue: number; count: number }>()
  for (const p of posts) {
    const entry = byCategory.get(p.category) ?? { revenue: 0, count: 0 }
    entry.revenue += p.totalRevenue
    entry.count += 1
    byCategory.set(p.category, entry)
  }

  return Array.from(byCategory.entries())
    .map(([category, value]) => ({
      category,
      label: CATEGORY_LABELS_KO[category] ?? category,
      revenue: value.revenue,
      postCount: value.count,
      avgRevenuePerPost: value.count > 0 ? value.revenue / value.count : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

export async function computePostRefreshScores() {
  const now = new Date()
  const posts = await db.post.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { not: null, lte: new Date(now.getTime() - 30 * DAY_MS) },
    },
    include: {
      metricSnapshots: {
        orderBy: { capturedAt: 'desc' },
        take: 1,
      },
    },
  })

  const scored: Array<{
    id: string
    title: string
    ageDays: number
    impressions: number
    revenue: number
    ctr: number
    score: number
    reason: string
  }> = []

  let flagged = 0
  for (const post of posts) {
    if (!post.publishedAt) continue
    const latest = post.metricSnapshots[0]
    const ageDays = Math.floor((now.getTime() - post.publishedAt.getTime()) / DAY_MS)
    const impressions = latest?.impressions ?? 0
    const revenue = post.totalRevenue
    const ctr = latest?.ctr ?? 0

    const score =
      (ageDays / 30) * 2 +
      Math.min(impressions / 100, 5) -
      Math.min(revenue * 10, 10) -
      ctr * 100

    const isCandidate = ageDays >= 30 && impressions >= 100 && revenue < 1

    let reason = ''
    if (isCandidate) {
      if (revenue < 0.1) reason = '수익 거의 없음'
      else reason = '저수익 장기 노출'
    } else if (ageDays >= 90 && ctr < 0.01) {
      reason = '장기간 저 CTR'
    }

    const roundedScore = Math.round(score * 100) / 100

    await db.post.update({
      where: { id: post.id },
      data: {
        refreshScore: roundedScore,
        needsRefresh: isCandidate,
      },
    })

    if (isCandidate) flagged++

    scored.push({
      id: post.id,
      title: post.title,
      ageDays,
      impressions,
      revenue,
      ctr,
      score: roundedScore,
      reason,
    })
  }

  scored.sort((a, b) => b.score - a.score)
  return { candidates: scored.slice(0, 20), flagged, evaluated: posts.length }
}

export async function listRefreshCandidates(limit = 20) {
  return db.post.findMany({
    where: { needsRefresh: true, status: 'PUBLISHED' },
    orderBy: { refreshScore: 'desc' },
    take: limit,
    include: {
      metricSnapshots: {
        orderBy: { capturedAt: 'desc' },
        take: 1,
      },
    },
  })
}

export function formatUSD(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatKRW(valueUsd: number, rate = 1350) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(Math.round(valueUsd * rate))
}
