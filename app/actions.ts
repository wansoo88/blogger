'use server'

import { Category, Country, PostStatus } from '@prisma/client'
import { createKeyword as createKeywordRecord, listKeywords } from '@/lib/services/keyword-service'
import {
  createPostFromKeyword,
  generateDraftForPost,
  publishPost,
  schedulePost,
  touchPaths,
  updatePostStatus,
} from '@/lib/services/post-service'
import { processPendingNotifications, queueWeeklySummary } from '@/lib/services/notification-service'
import { evaluateWeeklyQuota } from '@/lib/services/quota-service'
import { autoScheduleApprovedPosts } from '@/lib/services/scheduler-service'
import { createBloggerPage, REQUIRED_PAGES } from '@/lib/integrations/blogger'
import { syncMetricsForPublishedPosts } from '@/lib/integrations/search-console'
import {
  recordManualRevenue,
  syncAdSenseRevenueForPublishedPosts,
} from '@/lib/integrations/adsense'
import {
  createAffiliateLink,
  deleteAffiliateLink,
  markAffiliateConversion,
  toggleAffiliateLinkActive,
} from '@/lib/services/affiliate-service'
import { recomputeAllKeywordScores } from '@/lib/services/keyword-score-service'
import { computePostRefreshScores } from '@/lib/services/revenue-service'

export async function createKeywordAction(formData: FormData) {
  const keyword = String(formData.get('keyword') ?? '').trim()
  const category = String(formData.get('category') ?? 'AI_PRODUCTIVITY') as Category
  const country = String(formData.get('country') ?? 'US') as Country
  const intent = String(formData.get('intent') ?? 'informational').trim()
  const priority = Number(formData.get('priority') ?? '3')
  const notes = String(formData.get('notes') ?? '').trim()

  const cpcRaw = formData.get('estimatedCpc')
  const competitionRaw = formData.get('competitionScore')
  const volumeRaw = formData.get('estimatedVolume')

  const estimatedCpc =
    cpcRaw && String(cpcRaw).trim() !== '' ? Number(cpcRaw) : null
  const competitionScore =
    competitionRaw && String(competitionRaw).trim() !== ''
      ? Number(competitionRaw)
      : null
  const estimatedVolume =
    volumeRaw && String(volumeRaw).trim() !== '' ? Number(volumeRaw) : null

  if (!keyword) {
    throw new Error('키워드는 필수입니다.')
  }

  await createKeywordRecord({
    keyword,
    category,
    country,
    intent,
    priority,
    notes,
    estimatedCpc,
    competitionScore,
    estimatedVolume,
  })

  await touchPaths()
}

export async function createPostFromKeywordAction(formData: FormData) {
  const keywordId = String(formData.get('keywordId') ?? '')
  await createPostFromKeyword(keywordId)
  await touchPaths()
}

export async function generateDraftAction(formData: FormData) {
  const postId = String(formData.get('postId') ?? '')
  await generateDraftForPost(postId)
  await touchPaths()
}

export async function updatePostStatusAction(formData: FormData) {
  const postId = String(formData.get('postId') ?? '')
  const status = String(formData.get('status') ?? '') as PostStatus
  await updatePostStatus(postId, status)
  await touchPaths()
}

export async function schedulePostAction(formData: FormData) {
  const postId = String(formData.get('postId') ?? '')
  const scheduledFor = String(formData.get('scheduledFor') ?? '')
  await schedulePost(postId, new Date(scheduledFor))
  await touchPaths()
}

export async function publishPostAction(formData: FormData) {
  const postId = String(formData.get('postId') ?? '')
  await publishPost(postId)
  await touchPaths()
}

export async function evaluateQuotaAction() {
  await evaluateWeeklyQuota()
  await touchPaths()
}

export async function processNotificationsAction(formData: FormData) {
  const includeWeeklySummary = String(formData.get('includeWeeklySummary') ?? '') === 'on'

  await evaluateWeeklyQuota()

  if (includeWeeklySummary) {
    await queueWeeklySummary()
  }

  await processPendingNotifications(20)
  await touchPaths()
}

export async function seedPipelineAction() {
  const keywords = await listKeywords()

  for (const keyword of keywords) {
    if (!keyword.posts.length) {
      await createPostFromKeyword(keyword.id)
    }
  }

  await touchPaths()
}

export async function autoScheduleAction() {
  await autoScheduleApprovedPosts()
  await touchPaths()
}

export async function createRequiredPagesAction(formData: FormData) {
  const pageKey = String(formData.get('pageKey') ?? '')
  const page = REQUIRED_PAGES[pageKey as keyof typeof REQUIRED_PAGES]

  if (!page) {
    throw new Error(`Unknown page: ${pageKey}`)
  }

  await createBloggerPage({
    title: page.title,
    contentHtml: page.html,
  })

  await touchPaths()
}

export async function syncMetricsAction() {
  await syncMetricsForPublishedPosts()
  await touchPaths()
}

export async function syncAdSenseRevenueAction() {
  await syncAdSenseRevenueForPublishedPosts()
  await touchPaths()
}

export async function recordManualRevenueAction(formData: FormData) {
  const postId = String(formData.get('postId') ?? '')
  const revenue = Number(formData.get('revenue') ?? '0')
  const adImpressions = Number(formData.get('adImpressions') ?? '0')
  const adClicks = Number(formData.get('adClicks') ?? '0')
  const note = String(formData.get('note') ?? '').trim()

  if (!postId) throw new Error('글 ID가 필요합니다.')
  if (!Number.isFinite(revenue) || revenue < 0) {
    throw new Error('유효한 수익 금액을 입력하세요.')
  }

  await recordManualRevenue({
    postId,
    revenue,
    adImpressions: Number.isFinite(adImpressions) ? adImpressions : 0,
    adClicks: Number.isFinite(adClicks) ? adClicks : 0,
    note: note || undefined,
  })
  await touchPaths()
}

export async function createAffiliateLinkAction(formData: FormData) {
  const label = String(formData.get('label') ?? '').trim()
  const merchant = String(formData.get('merchant') ?? '').trim()
  const targetUrl = String(formData.get('targetUrl') ?? '').trim()
  const category = String(formData.get('category') ?? 'AI_PRODUCTIVITY') as Category
  const postId = String(formData.get('postId') ?? '').trim() || null
  const trackingSlug = String(formData.get('trackingSlug') ?? '').trim() || null
  const commissionRateRaw = formData.get('commissionRate')
  const expectedPayoutRaw = formData.get('expectedPayout')
  const notes = String(formData.get('notes') ?? '').trim() || null

  const commissionRate =
    commissionRateRaw && String(commissionRateRaw).trim() !== ''
      ? Number(commissionRateRaw)
      : null
  const expectedPayout =
    expectedPayoutRaw && String(expectedPayoutRaw).trim() !== ''
      ? Number(expectedPayoutRaw)
      : null

  await createAffiliateLink({
    label,
    merchant,
    targetUrl,
    category,
    postId,
    trackingSlug,
    commissionRate,
    expectedPayout,
    notes,
  })
  await touchPaths()
}

export async function toggleAffiliateLinkAction(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('링크 ID가 필요합니다.')
  await toggleAffiliateLinkActive(id)
  await touchPaths()
}

export async function deleteAffiliateLinkAction(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('링크 ID가 필요합니다.')
  await deleteAffiliateLink(id)
  await touchPaths()
}

export async function markAffiliateConversionAction(formData: FormData) {
  const clickId = String(formData.get('clickId') ?? '')
  const payout = Number(formData.get('payout') ?? '0')
  if (!clickId) throw new Error('클릭 ID가 필요합니다.')
  if (!Number.isFinite(payout) || payout <= 0) {
    throw new Error('유효한 전환 금액을 입력하세요.')
  }
  await markAffiliateConversion({ clickId, payout })
  await touchPaths()
}

export async function recomputeKeywordScoresAction() {
  await recomputeAllKeywordScores()
  await touchPaths()
}

export async function recomputeRefreshScoresAction() {
  await computePostRefreshScores()
  await touchPaths()
}
