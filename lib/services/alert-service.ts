import { db } from '@/lib/db'
import { AlertSeverity, AlertType, NotificationEvent } from '@prisma/client'
import { queueNotificationForAlert } from '@/lib/services/notification-service'

async function upsertAlert(args: {
  type: AlertType
  severity: AlertSeverity
  message: string
  postId?: string
  weeklyQuotaId?: string
}) {
  const existing = await db.alert.findFirst({
    where: {
      type: args.type,
      postId: args.postId ?? null,
      status: 'OPEN',
    },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    return db.alert.update({
      where: { id: existing.id },
      data: { message: args.message, severity: args.severity },
    })
  }

  return db.alert.create({
    data: {
      type: args.type,
      severity: args.severity,
      message: args.message,
      postId: args.postId,
      weeklyQuotaId: args.weeklyQuotaId,
      status: 'OPEN',
    },
  })
}

async function resolveAlerts(type: AlertType, postId?: string) {
  const where = postId
    ? { type, postId, status: 'OPEN' as const }
    : { type, status: 'OPEN' as const }

  const openAlerts = await db.alert.findMany({ where })
  if (!openAlerts.length) return 0

  await db.alert.updateMany({
    where: { id: { in: openAlerts.map(a => a.id) } },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  })

  return openAlerts.length
}

export async function evaluateCategoryImbalance() {
  const groups = await db.post.groupBy({
    by: ['category'],
    _count: { id: true },
    where: { status: { not: 'ARCHIVED' } },
  })

  const total = groups.reduce((sum, g) => sum + g._count.id, 0)
  if (total === 0) return { created: 0, resolved: 0 }

  let created = 0
  let resolved = 0
  const allCategories = ['AI_PRODUCTIVITY', 'MONEY_SAVING', 'DIGITAL_HOWTO', 'TIME_MANAGEMENT', 'HOME_ORGANIZATION', 'WORK_TIPS']
  const categoryMap = new Map(groups.map(g => [g.category, g._count.id]))

  let hasImbalance = false

  for (const cat of allCategories) {
    const count = categoryMap.get(cat as never) ?? 0
    const ratio = count / total

    if (ratio > 0.4) {
      await upsertAlert({
        type: AlertType.CATEGORY_IMBALANCE,
        severity: AlertSeverity.WARNING,
        message: `Category "${cat}" has ${Math.round(ratio * 100)}% of all posts (${count}/${total}). Aim for balanced distribution.`,
      })
      created++
      hasImbalance = true
    }

    if (count === 0 && total >= 6) {
      await upsertAlert({
        type: AlertType.CATEGORY_IMBALANCE,
        severity: AlertSeverity.WARNING,
        message: `Category "${cat}" has 0 posts. Consider adding content for category diversity.`,
      })
      created++
      hasImbalance = true
    }
  }

  if (!hasImbalance) {
    resolved = await resolveAlerts(AlertType.CATEGORY_IMBALANCE)
  }

  return { created, resolved }
}

export async function evaluateQualityFailures() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const stuckPosts = await db.post.findMany({
    where: {
      status: 'REVIEW',
      aiScore: { lt: 85 },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, title: true, aiScore: true },
  })

  let created = 0
  for (const post of stuckPosts) {
    await upsertAlert({
      type: AlertType.QUALITY_FAILURE,
      severity: AlertSeverity.WARNING,
      message: `"${post.title}" scored ${post.aiScore ?? 0}/100 and has been in REVIEW for 48+ hours. Review or regenerate.`,
      postId: post.id,
    })
    created++
  }

  const resolvedPosts = await db.alert.findMany({
    where: {
      type: AlertType.QUALITY_FAILURE,
      status: 'OPEN',
      postId: { not: null },
    },
    select: { id: true, postId: true },
  })

  let resolved = 0
  for (const alert of resolvedPosts) {
    if (!alert.postId) continue
    const post = await db.post.findUnique({
      where: { id: alert.postId },
      select: { status: true },
    })
    if (post && post.status !== 'REVIEW') {
      await db.alert.update({
        where: { id: alert.id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      })
      resolved++
    }
  }

  return { created, resolved }
}

export async function evaluateIndexingDelays() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const publishedPosts = await db.post.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lt: sevenDaysAgo },
      bloggerUrl: { not: null },
    },
    include: {
      metricSnapshots: {
        orderBy: { capturedAt: 'desc' },
        take: 1,
      },
    },
  })

  let created = 0
  let resolved = 0

  for (const post of publishedPosts) {
    const latest = post.metricSnapshots[0]
    const isIndexed = latest?.indexed ?? false

    if (!isIndexed) {
      const isCritical = post.publishedAt && post.publishedAt < fourteenDaysAgo
      const alert = await upsertAlert({
        type: AlertType.INDEXING_DELAY,
        severity: isCritical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        message: `"${post.title}" published ${post.publishedAt ? Math.round((Date.now() - post.publishedAt.getTime()) / (24 * 60 * 60 * 1000)) : '?'} days ago but not indexed yet.`,
        postId: post.id,
      })
      await queueNotificationForAlert(alert.id, NotificationEvent.INDEXING_DELAY)
      created++
    } else {
      const r = await resolveAlerts(AlertType.INDEXING_DELAY, post.id)
      resolved += r
    }
  }

  return { created, resolved }
}

export async function evaluateZeroImpressions() {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const publishedPosts = await db.post.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lt: fourteenDaysAgo },
      bloggerUrl: { not: null },
    },
    include: {
      metricSnapshots: {
        orderBy: { capturedAt: 'desc' },
        take: 1,
      },
    },
  })

  let created = 0
  let resolved = 0

  for (const post of publishedPosts) {
    const latest = post.metricSnapshots[0]
    const impressions = latest?.impressions ?? 0

    if (impressions === 0) {
      const isOld = post.publishedAt && post.publishedAt < thirtyDaysAgo
      await upsertAlert({
        type: AlertType.ZERO_IMPRESSIONS,
        severity: isOld ? AlertSeverity.WARNING : AlertSeverity.INFO,
        message: `"${post.title}" has 0 impressions in 28 days. Consider refreshing title or content.`,
        postId: post.id,
      })
      created++
    } else {
      const r = await resolveAlerts(AlertType.ZERO_IMPRESSIONS, post.id)
      resolved += r
    }
  }

  return { created, resolved }
}

export async function evaluateZeroClicks() {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const publishedPosts = await db.post.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lt: fourteenDaysAgo },
      bloggerUrl: { not: null },
    },
    include: {
      metricSnapshots: {
        orderBy: { capturedAt: 'desc' },
        take: 1,
      },
    },
  })

  let created = 0
  let resolved = 0

  for (const post of publishedPosts) {
    const latest = post.metricSnapshots[0]
    const impressions = latest?.impressions ?? 0
    const clicks = latest?.clicks ?? 0

    if (impressions > 0 && clicks === 0) {
      await upsertAlert({
        type: AlertType.ZERO_CLICKS,
        severity: AlertSeverity.INFO,
        message: `"${post.title}" has ${impressions} impressions but 0 clicks. Consider improving meta description or title.`,
        postId: post.id,
      })
      created++
    } else if (clicks > 0) {
      const r = await resolveAlerts(AlertType.ZERO_CLICKS, post.id)
      resolved += r
    }
  }

  return { created, resolved }
}

export async function evaluatePublishFailures() {
  const failedJobs = await db.publishJob.findMany({
    where: { status: 'FAILED' },
    include: {
      post: { select: { id: true, title: true } },
    },
  })

  let created = 0
  for (const job of failedJobs) {
    const alert = await upsertAlert({
      type: AlertType.PUBLISH_FAILURE,
      severity: AlertSeverity.CRITICAL,
      message: `Publishing "${job.post.title}" failed: ${job.lastError ?? 'Unknown error'}. Attempts: ${job.attemptCount}.`,
      postId: job.post.id,
    })
    await queueNotificationForAlert(alert.id, NotificationEvent.PUBLISH_FAILURE)
    created++
  }

  const successJobs = await db.publishJob.findMany({
    where: { status: 'SUCCESS' },
    select: { postId: true },
  })

  let resolved = 0
  for (const job of successJobs) {
    const r = await resolveAlerts(AlertType.PUBLISH_FAILURE, job.postId)
    resolved += r
  }

  return { created, resolved }
}

export async function evaluateAllAlerts() {
  const results = await Promise.all([
    evaluateCategoryImbalance(),
    evaluateQualityFailures(),
    evaluateIndexingDelays(),
    evaluateZeroImpressions(),
    evaluateZeroClicks(),
    evaluatePublishFailures(),
  ])

  const summary = {
    created: results.reduce((sum, r) => sum + r.created, 0),
    resolved: results.reduce((sum, r) => sum + r.resolved, 0),
    details: {
      categoryImbalance: results[0],
      qualityFailures: results[1],
      indexingDelays: results[2],
      zeroImpressions: results[3],
      zeroClicks: results[4],
      publishFailures: results[5],
    },
  }

  const total = await db.alert.count({ where: { status: 'OPEN' } })

  return { ...summary, total }
}
