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
import { evaluateAllAlerts } from '@/lib/services/alert-service'
import { getTrafficSummary, getTrafficBySource, getTopPages } from '@/lib/integrations/ga4'

export async function createKeywordAction(formData: FormData) {
  const keyword = String(formData.get('keyword') ?? '').trim()
  const category = String(formData.get('category') ?? 'AI_PRODUCTIVITY') as Category
  const country = String(formData.get('country') ?? 'US') as Country
  const intent = String(formData.get('intent') ?? 'informational').trim()
  const priority = Number(formData.get('priority') ?? '3')
  const notes = String(formData.get('notes') ?? '').trim()

  if (!keyword) {
    throw new Error('Keyword is required.')
  }

  await createKeywordRecord({
    keyword,
    category,
    country,
    intent,
    priority,
    notes,
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

export async function evaluateAlertsAction() {
  await evaluateAllAlerts()
  await touchPaths()
}

export async function syncGA4Action() {
  const [summary, sources, pages] = await Promise.all([
    getTrafficSummary(),
    getTrafficBySource(),
    getTopPages(),
  ])
  return { summary, sources, pages }
}
