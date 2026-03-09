import { PostStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { publishPostToBlogger } from '@/lib/integrations/blogger'
import { generateDraftWithGemini } from '@/lib/integrations/gemini'
import { runQualityCheck } from '@/lib/services/quality-service'
import { addInternalLinksToPost } from '@/lib/services/internal-link-service'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function createPostFromKeyword(keywordId: string) {
  const keyword = await db.keyword.findUnique({
    where: { id: keywordId },
  })

  if (!keyword) {
    throw new Error('Keyword not found.')
  }

  const existing = await db.post.findFirst({
    where: { keywordId },
  })

  if (existing) {
    return existing
  }

  const title = keyword.keyword
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const post = await db.post.create({
    data: {
      keywordId: keyword.id,
      title,
      slug: `${slugify(title)}-${keyword.id.slice(0, 6)}`,
      category: keyword.category,
      targetCountry: keyword.country,
      status: PostStatus.QUEUED,
    },
  })

  await db.keyword.update({
    where: { id: keyword.id },
    data: { status: 'ASSIGNED' },
  })

  return post
}

export async function listPostsByStatus() {
  return db.post.findMany({
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      keyword: true,
      publishJobs: {
        orderBy: { scheduledFor: 'desc' },
        take: 1,
      },
    },
  })
}

export async function getReviewPosts() {
  return db.post.findMany({
    where: {
      status: { in: ['DRAFTED', 'REVIEW'] },
    },
    orderBy: { updatedAt: 'desc' },
    include: { keyword: true },
  })
}

export async function getPublishPosts() {
  return db.post.findMany({
    where: {
      status: { in: ['APPROVED', 'SCHEDULED', 'PUBLISHED'] },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      publishJobs: {
        orderBy: { scheduledFor: 'desc' },
        take: 1,
      },
      keyword: true,
    },
  })
}

export async function generateDraftForPost(postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { keyword: true },
  })

  if (!post || !post.keyword) {
    throw new Error('Post or linked keyword not found.')
  }

  const result = await generateDraftWithGemini({
    title: post.title,
    keyword: post.keyword.keyword,
    category: post.category,
    country: post.targetCountry,
  })

  const qualityResult = runQualityCheck(post.title, result.draft)

  const faqCount = (result.draft.match(/\?\s*$/gm) || []).length

  const updated = await db.post.update({
    where: { id: post.id },
    data: {
      draftMarkdown: result.draft,
      metaDescription: result.metaDescription,
      status: qualityResult.passed ? PostStatus.APPROVED : PostStatus.REVIEW,
      aiScore: qualityResult.score,
      wordCount: result.draft.split(/\s+/).filter(Boolean).length,
      faqCount,
      reviewNotes: qualityResult.checks
        .map(c => `[${c.passed ? 'PASS' : 'FAIL'}] ${c.name}: ${c.detail}`)
        .join('\n'),
    },
  })

  await addInternalLinksToPost(postId)

  if (qualityResult.passed) {
    await db.keyword.update({
      where: { id: post.keyword.id },
      data: { status: 'DRAFTED' },
    })
  }

  return updated
}

export async function updatePostStatus(postId: string, status: PostStatus) {
  const data: {
    status: PostStatus
    approvedAt?: Date
    publishedAt?: Date
  } = { status }

  if (status === PostStatus.APPROVED) {
    data.approvedAt = new Date()
  }

  if (status === PostStatus.PUBLISHED) {
    data.publishedAt = new Date()
  }

  return db.post.update({
    where: { id: postId },
    data,
  })
}

export async function schedulePost(postId: string, scheduledFor: Date) {
  await db.publishJob.create({
    data: {
      postId,
      scheduledFor,
      status: 'PENDING',
    },
  })

  return db.post.update({
    where: { id: postId },
    data: {
      status: PostStatus.SCHEDULED,
      targetPublishDate: scheduledFor,
    },
  })
}

export async function publishPost(postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
  })

  if (!post || !post.draftMarkdown) {
    throw new Error('Post draft not found.')
  }

  const result = await publishPostToBlogger({
    title: post.title,
    contentMarkdown: post.draftMarkdown,
    labels: [post.category],
    metaDescription: post.metaDescription ?? undefined,
  })

  await db.publishJob.updateMany({
    where: { postId, status: 'PENDING' },
    data: { status: 'SUCCESS' },
  })

  return db.post.update({
    where: { id: postId },
    data: {
      status: PostStatus.PUBLISHED,
      publishedAt: new Date(),
      bloggerPostId: result.bloggerPostId,
      bloggerUrl: result.bloggerUrl,
    },
  })
}

export async function getProgressStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  if (weekStart > todayStart) weekStart.setDate(weekStart.getDate() - 7)

  const [todayDrafted, todayPublished, weekDrafted, weekPublished, weekApproved] =
    await Promise.all([
      db.post.count({
        where: { status: { in: ['DRAFTED', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'] }, updatedAt: { gte: todayStart } },
      }),
      db.post.count({
        where: { status: 'PUBLISHED', publishedAt: { gte: todayStart } },
      }),
      db.post.count({
        where: { status: { in: ['DRAFTED', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'] }, updatedAt: { gte: weekStart } },
      }),
      db.post.count({
        where: { status: 'PUBLISHED', publishedAt: { gte: weekStart } },
      }),
      db.post.count({
        where: { status: { in: ['APPROVED', 'SCHEDULED', 'PUBLISHED'] }, approvedAt: { gte: weekStart } },
      }),
    ])

  const totalPublished = await db.post.count({ where: { status: 'PUBLISHED' } })
  const totalDrafted = await db.post.count({
    where: { status: { in: ['DRAFTED', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'] } },
  })
  const totalQueued = await db.post.count({ where: { status: 'QUEUED' } })
  const totalKeywords = await db.keyword.count()
  const avgScore = await db.post.aggregate({
    _avg: { aiScore: true },
    where: { aiScore: { not: null } },
  })

  const recentPosts = await db.post.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      aiScore: true,
      wordCount: true,
      publishedAt: true,
      updatedAt: true,
      bloggerUrl: true,
    },
  })

  const categoryBreakdown = await db.post.groupBy({
    by: ['category'],
    _count: { id: true },
    where: { status: { not: 'ARCHIVED' } },
  })

  const statusBreakdown = await db.post.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  return {
    today: { drafted: todayDrafted, published: todayPublished },
    week: { drafted: weekDrafted, published: weekPublished, approved: weekApproved },
    totals: {
      published: totalPublished,
      drafted: totalDrafted,
      queued: totalQueued,
      keywords: totalKeywords,
      avgScore: Math.round(avgScore._avg.aiScore ?? 0),
    },
    recentPosts,
    categoryBreakdown: categoryBreakdown.map(c => ({
      category: c.category,
      count: c._count.id,
    })),
    statusBreakdown: statusBreakdown.map(s => ({
      status: s.status,
      count: s._count.id,
    })),
  }
}

export async function touchPaths() {
  revalidatePath('/')
  revalidatePath('/guide')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/keywords')
  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard/review')
  revalidatePath('/dashboard/publish')
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/progress')
  revalidatePath('/dashboard/monitor')
  revalidatePath('/dashboard/playbook')
}
