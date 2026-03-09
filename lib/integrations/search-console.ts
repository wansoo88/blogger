import { db } from '@/lib/db'

type SearchConsoleRow = {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

type SearchConsoleResponse = {
  rows?: SearchConsoleRow[]
}

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_SC_REFRESH_TOKEN ?? process.env.BLOGGER_REFRESH_TOKEN
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      'Search Console requires GOOGLE_SC_REFRESH_TOKEN (or BLOGGER_REFRESH_TOKEN) + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET.',
    )
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Search Console token refresh failed: ${response.status} ${text}`)
  }

  const json = (await response.json()) as { access_token?: string }
  if (!json.access_token) {
    throw new Error('Token refresh returned no access_token.')
  }

  return json.access_token
}

export function getSearchConsoleStatus() {
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL
  const hasRefreshToken = Boolean(
    process.env.GOOGLE_SC_REFRESH_TOKEN ?? process.env.BLOGGER_REFRESH_TOKEN,
  )
  const hasClientCredentials = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  )

  return {
    configured: Boolean(siteUrl && hasRefreshToken && hasClientCredentials),
    siteUrl: siteUrl ?? null,
    hasRefreshToken,
    hasClientCredentials,
  }
}

export async function fetchSearchAnalytics(args: {
  startDate: string
  endDate: string
  dimensions?: string[]
  rowLimit?: number
}) {
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL
  if (!siteUrl) {
    throw new Error('SEARCH_CONSOLE_SITE_URL is not configured.')
  }

  const accessToken = await getAccessToken()
  const encodedUrl = encodeURIComponent(siteUrl)

  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: args.startDate,
        endDate: args.endDate,
        dimensions: args.dimensions ?? ['page'],
        rowLimit: args.rowLimit ?? 100,
      }),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Search Console query failed: ${response.status} ${text}`)
  }

  const json = (await response.json()) as SearchConsoleResponse
  return json.rows ?? []
}

export async function syncMetricsForPublishedPosts() {
  const status = getSearchConsoleStatus()
  if (!status.configured) {
    return { synced: 0, skipped: true, reason: 'Search Console not configured' }
  }

  const publishedPosts = await db.post.findMany({
    where: {
      status: 'PUBLISHED',
      bloggerUrl: { not: null },
    },
    select: {
      id: true,
      bloggerUrl: true,
      title: true,
    },
  })

  if (!publishedPosts.length) {
    return { synced: 0, skipped: false, reason: 'No published posts with URLs' }
  }

  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  const startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  let rows: SearchConsoleRow[]
  try {
    rows = await fetchSearchAnalytics({
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 500,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { synced: 0, skipped: false, reason: message }
  }

  const urlMetrics = new Map<string, SearchConsoleRow>()
  for (const row of rows) {
    const pageUrl = row.keys[0]
    if (pageUrl) {
      urlMetrics.set(pageUrl, row)
    }
  }

  let synced = 0
  for (const post of publishedPosts) {
    if (!post.bloggerUrl) continue

    const metrics = urlMetrics.get(post.bloggerUrl)

    await db.metricsSnapshot.create({
      data: {
        postId: post.id,
        impressions: metrics?.impressions ?? 0,
        clicks: metrics?.clicks ?? 0,
        ctr: metrics?.ctr ?? 0,
        position: metrics?.position ?? null,
        indexed: (metrics?.impressions ?? 0) > 0,
      },
    })

    synced++
  }

  return { synced, skipped: false, reason: null }
}

export async function getPostMetricsSummary() {
  const posts = await db.post.findMany({
    where: {
      status: 'PUBLISHED',
      bloggerUrl: { not: null },
    },
    include: {
      metricSnapshots: {
        orderBy: { capturedAt: 'desc' },
        take: 1,
      },
    },
  })

  const summary = {
    totalPublished: posts.length,
    indexed: 0,
    notIndexed: 0,
    zeroImpressions: 0,
    zeroClicks: 0,
    totalImpressions: 0,
    totalClicks: 0,
    posts: [] as {
      id: string
      title: string
      bloggerUrl: string | null
      indexed: boolean
      impressions: number
      clicks: number
      ctr: number
      position: number | null
      lastChecked: Date | null
    }[],
  }

  for (const post of posts) {
    const latest = post.metricSnapshots[0]
    const indexed = latest?.indexed ?? false
    const impressions = latest?.impressions ?? 0
    const clicks = latest?.clicks ?? 0

    if (indexed) summary.indexed++
    else summary.notIndexed++
    if (impressions === 0) summary.zeroImpressions++
    if (clicks === 0) summary.zeroClicks++
    summary.totalImpressions += impressions
    summary.totalClicks += clicks

    summary.posts.push({
      id: post.id,
      title: post.title,
      bloggerUrl: post.bloggerUrl,
      indexed,
      impressions,
      clicks,
      ctr: latest?.ctr ?? 0,
      position: latest?.position ?? null,
      lastChecked: latest?.capturedAt ?? null,
    })
  }

  summary.posts.sort((a, b) => b.impressions - a.impressions)

  return summary
}
