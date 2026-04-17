import { Category } from '@prisma/client'
import { db } from '@/lib/db'

function toSlug(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return base || 'link'
}

export type CreateAffiliateLinkInput = {
  label: string
  merchant: string
  targetUrl: string
  category: Category
  postId?: string | null
  commissionRate?: number | null
  expectedPayout?: number | null
  notes?: string | null
  trackingSlug?: string | null
}

export async function createAffiliateLink(input: CreateAffiliateLinkInput) {
  if (!input.label.trim()) throw new Error('라벨은 필수입니다.')
  if (!input.merchant.trim()) throw new Error('머천트는 필수입니다.')
  try {
    new URL(input.targetUrl)
  } catch {
    throw new Error('유효한 대상 URL이 아닙니다.')
  }

  const baseSlug = input.trackingSlug?.trim()
    ? toSlug(input.trackingSlug)
    : `${toSlug(input.merchant)}-${toSlug(input.label).slice(0, 24)}`

  let slug = baseSlug
  let counter = 1
  while (await db.affiliateLink.findUnique({ where: { trackingSlug: slug } })) {
    slug = `${baseSlug}-${counter++}`
    if (counter > 50) {
      slug = `${baseSlug}-${Date.now().toString(36)}`
      break
    }
  }

  return db.affiliateLink.create({
    data: {
      label: input.label.trim(),
      merchant: input.merchant.trim(),
      targetUrl: input.targetUrl,
      trackingSlug: slug,
      category: input.category,
      postId: input.postId ?? null,
      commissionRate: input.commissionRate ?? null,
      expectedPayout: input.expectedPayout ?? null,
      notes: input.notes?.trim() || null,
    },
  })
}

export async function listAffiliateLinks() {
  return db.affiliateLink.findMany({
    orderBy: [{ isActive: 'desc' }, { totalRevenue: 'desc' }, { updatedAt: 'desc' }],
    include: {
      post: {
        select: { id: true, title: true, bloggerUrl: true },
      },
      _count: { select: { clicks: true } },
    },
  })
}

export async function toggleAffiliateLinkActive(id: string) {
  const existing = await db.affiliateLink.findUnique({ where: { id } })
  if (!existing) throw new Error('링크를 찾을 수 없습니다.')
  return db.affiliateLink.update({
    where: { id },
    data: { isActive: !existing.isActive },
  })
}

export async function deleteAffiliateLink(id: string) {
  return db.affiliateLink.delete({ where: { id } })
}

export async function recordAffiliateClick(args: {
  slug: string
  referer?: string | null
  userAgent?: string | null
  country?: string | null
}) {
  const link = await db.affiliateLink.findUnique({
    where: { trackingSlug: args.slug },
  })
  if (!link || !link.isActive) return null

  await db.affiliateClick.create({
    data: {
      affiliateLinkId: link.id,
      postId: link.postId,
      referer: args.referer ?? null,
      userAgent: args.userAgent ?? null,
      country: args.country ?? null,
    },
  })

  await db.affiliateLink.update({
    where: { id: link.id },
    data: { clickCount: { increment: 1 } },
  })

  return link
}

export async function markAffiliateConversion(args: {
  clickId: string
  payout: number
}) {
  const click = await db.affiliateClick.findUnique({
    where: { id: args.clickId },
  })
  if (!click) throw new Error('클릭 로그를 찾을 수 없습니다.')
  if (click.converted) return click

  const updated = await db.affiliateClick.update({
    where: { id: click.id },
    data: { converted: true, payout: args.payout },
  })

  await db.affiliateLink.update({
    where: { id: click.affiliateLinkId },
    data: {
      conversionCount: { increment: 1 },
      totalRevenue: { increment: args.payout },
    },
  })

  if (click.postId) {
    await db.post.update({
      where: { id: click.postId },
      data: {
        totalRevenue: { increment: args.payout },
        lastRevenueAt: new Date(),
      },
    })
  }

  return updated
}

export async function getAffiliateSummary() {
  const [links, clicks, conversions, revenue] = await Promise.all([
    db.affiliateLink.count(),
    db.affiliateClick.count(),
    db.affiliateClick.count({ where: { converted: true } }),
    db.affiliateClick.aggregate({ _sum: { payout: true } }),
  ])

  const activeLinks = await db.affiliateLink.count({ where: { isActive: true } })
  const topLinks = await db.affiliateLink.findMany({
    orderBy: { totalRevenue: 'desc' },
    take: 5,
    select: {
      id: true,
      label: true,
      merchant: true,
      clickCount: true,
      conversionCount: true,
      totalRevenue: true,
    },
  })

  return {
    totalLinks: links,
    activeLinks,
    totalClicks: clicks,
    totalConversions: conversions,
    totalRevenue: revenue._sum.payout ?? 0,
    conversionRate: clicks > 0 ? conversions / clicks : 0,
    topLinks,
  }
}
