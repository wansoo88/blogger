import { db } from '@/lib/db'
import { PostStatus, PublishJobStatus } from '@prisma/client'

const US_PEAK_HOURS = [8, 9, 10, 11, 14, 15, 16]
const MAX_POSTS_PER_DAY = 2
const US_TIMEZONE_OFFSET = -5

function toUSEastern(date: Date): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  return new Date(utc + US_TIMEZONE_OFFSET * 3600000)
}

function fromUSEastern(year: number, month: number, day: number, hour: number): Date {
  const local = new Date(year, month, day, hour, 0, 0)
  const utc = local.getTime() - US_TIMEZONE_OFFSET * 3600000
  return new Date(utc)
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export async function getNextAvailableSlots(count: number) {
  const existingJobs = await db.publishJob.findMany({
    where: {
      status: { in: [PublishJobStatus.PENDING, PublishJobStatus.SUCCESS] },
      scheduledFor: { gte: new Date() },
    },
    orderBy: { scheduledFor: 'asc' },
  })

  const dayCountMap = new Map<string, number>()
  for (const job of existingJobs) {
    const usTime = toUSEastern(job.scheduledFor)
    const key = getDateKey(usTime)
    dayCountMap.set(key, (dayCountMap.get(key) ?? 0) + 1)
  }

  const slots: Date[] = []
  const now = toUSEastern(new Date())
  let currentDay = new Date(now)
  currentDay.setDate(currentDay.getDate() + 1)

  let attempts = 0
  while (slots.length < count && attempts < 60) {
    attempts++
    const key = getDateKey(currentDay)
    const dayUsed = dayCountMap.get(key) ?? 0

    if (dayUsed < MAX_POSTS_PER_DAY) {
      const availableHours = US_PEAK_HOURS.filter((_, i) => i >= dayUsed)
      const hour = availableHours[0] ?? US_PEAK_HOURS[0]

      const slotTime = fromUSEastern(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate(),
        hour,
      )
      slots.push(slotTime)
      dayCountMap.set(key, dayUsed + 1)

      if (dayUsed + 1 >= MAX_POSTS_PER_DAY) {
        currentDay.setDate(currentDay.getDate() + 1)
      }
    } else {
      currentDay.setDate(currentDay.getDate() + 1)
    }
  }

  return slots
}

export async function autoScheduleApprovedPosts() {
  const approved = await db.post.findMany({
    where: { status: PostStatus.APPROVED },
    orderBy: [{ createdAt: 'asc' }],
    include: { keyword: true },
  })

  if (!approved.length) return { scheduled: 0, posts: [] }

  const slots = await getNextAvailableSlots(approved.length)
  const results = []

  for (let i = 0; i < Math.min(approved.length, slots.length); i++) {
    const post = approved[i]
    const scheduledFor = slots[i]

    await db.publishJob.create({
      data: {
        postId: post.id,
        scheduledFor,
        status: PublishJobStatus.PENDING,
      },
    })

    const updated = await db.post.update({
      where: { id: post.id },
      data: {
        status: PostStatus.SCHEDULED,
        targetPublishDate: scheduledFor,
      },
    })

    results.push(updated)
  }

  return { scheduled: results.length, posts: results }
}

export async function getCategoryDistribution() {
  const posts = await db.post.findMany({
    where: {
      status: { in: ['QUEUED', 'DRAFTED', 'REVIEW', 'APPROVED', 'SCHEDULED'] },
    },
    select: { category: true, status: true },
  })

  const distribution = new Map<string, number>()
  for (const post of posts) {
    distribution.set(post.category, (distribution.get(post.category) ?? 0) + 1)
  }

  return Object.fromEntries(distribution)
}
