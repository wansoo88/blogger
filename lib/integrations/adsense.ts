import { db } from '@/lib/db'

type AdSenseRow = {
  cells: { value: string }[]
}

type AdSenseReportResponse = {
  rows?: AdSenseRow[]
  headers?: { name: string }[]
}

type UrlMetrics = {
  pageViews: number
  adImpressions: number
  adClicks: number
  adCtr: number
  revenue: number
  pageRpm: number
  impressionRpm: number
}

async function getAccessToken(): Promise<string> {
  const refreshToken =
    process.env.GOOGLE_ADSENSE_REFRESH_TOKEN ??
    process.env.GOOGLE_SC_REFRESH_TOKEN ??
    process.env.BLOGGER_REFRESH_TOKEN
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      'AdSense 연동에는 GOOGLE_ADSENSE_REFRESH_TOKEN(또는 BLOGGER_REFRESH_TOKEN) + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET가 필요합니다.',
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
    throw new Error(`AdSense 토큰 갱신 실패: ${response.status} ${text}`)
  }

  const json = (await response.json()) as { access_token?: string }
  if (!json.access_token) {
    throw new Error('토큰 갱신 응답에 access_token이 없습니다.')
  }

  return json.access_token
}

export function getAdSenseStatus() {
  const accountId = process.env.ADSENSE_ACCOUNT_ID
  const hasRefreshToken = Boolean(
    process.env.GOOGLE_ADSENSE_REFRESH_TOKEN ??
      process.env.GOOGLE_SC_REFRESH_TOKEN ??
      process.env.BLOGGER_REFRESH_TOKEN,
  )
  const hasClientCredentials = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  )

  return {
    configured: Boolean(accountId && hasRefreshToken && hasClientCredentials),
    accountId: accountId ?? null,
    hasRefreshToken,
    hasClientCredentials,
  }
}

export async function fetchAdSenseReport(args: {
  startDate: string
  endDate: string
  rowLimit?: number
}) {
  const accountId = process.env.ADSENSE_ACCOUNT_ID
  if (!accountId) {
    throw new Error('ADSENSE_ACCOUNT_ID가 설정되지 않았습니다.')
  }

  const accessToken = await getAccessToken()
  const [sy, sm, sd] = args.startDate.split('-')
  const [ey, em, ed] = args.endDate.split('-')

  const url = new URL(
    `https://adsense.googleapis.com/v2/accounts/${accountId}/reports:generate`,
  )
  url.searchParams.set('dateRange', 'CUSTOM')
  url.searchParams.set('startDate.year', sy)
  url.searchParams.set('startDate.month', sm)
  url.searchParams.set('startDate.day', sd)
  url.searchParams.set('endDate.year', ey)
  url.searchParams.set('endDate.month', em)
  url.searchParams.set('endDate.day', ed)
  url.searchParams.append('dimensions', 'PAGE_URL')
  url.searchParams.append('metrics', 'PAGE_VIEWS')
  url.searchParams.append('metrics', 'AD_REQUESTS')
  url.searchParams.append('metrics', 'IMPRESSIONS')
  url.searchParams.append('metrics', 'CLICKS')
  url.searchParams.append('metrics', 'IMPRESSIONS_CTR')
  url.searchParams.append('metrics', 'ESTIMATED_EARNINGS')
  url.searchParams.append('metrics', 'PAGE_VIEWS_RPM')
  url.searchParams.append('metrics', 'IMPRESSIONS_RPM')
  url.searchParams.set('limit', String(args.rowLimit ?? 500))

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AdSense 보고서 조회 실패: ${response.status} ${text}`)
  }

  const json = (await response.json()) as AdSenseReportResponse
  return json.rows ?? []
}

function parseAdSenseRows(rows: AdSenseRow[]): Map<string, UrlMetrics> {
  const map = new Map<string, UrlMetrics>()
  for (const row of rows) {
    const [urlCell, pvCell, _adReqCell, impCell, clickCell, ctrCell, earningsCell, pageRpmCell, impRpmCell] =
      row.cells
    const url = urlCell?.value
    if (!url) continue

    map.set(url, {
      pageViews: Number(pvCell?.value ?? 0),
      adImpressions: Number(impCell?.value ?? 0),
      adClicks: Number(clickCell?.value ?? 0),
      adCtr: Number(ctrCell?.value ?? 0),
      revenue: Number(earningsCell?.value ?? 0),
      pageRpm: Number(pageRpmCell?.value ?? 0),
      impressionRpm: Number(impRpmCell?.value ?? 0),
    })
  }
  return map
}

export async function syncAdSenseRevenueForPublishedPosts() {
  const status = getAdSenseStatus()
  if (!status.configured) {
    return { synced: 0, skipped: true, reason: 'AdSense가 아직 설정되지 않았습니다.' }
  }

  const publishedPosts = await db.post.findMany({
    where: { status: 'PUBLISHED', bloggerUrl: { not: null } },
    select: { id: true, bloggerUrl: true, totalRevenue: true },
  })

  if (!publishedPosts.length) {
    return { synced: 0, skipped: false, reason: '발행된 글이 없습니다.' }
  }

  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  const startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  let rows: AdSenseRow[]
  try {
    rows = await fetchAdSenseReport({ startDate, endDate, rowLimit: 1000 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return { synced: 0, skipped: false, reason: message }
  }

  const urlMetrics = parseAdSenseRows(rows)
  const periodStart = new Date(startDate)
  const periodEnd = new Date(endDate)

  let synced = 0
  for (const post of publishedPosts) {
    if (!post.bloggerUrl) continue
    const metrics = urlMetrics.get(post.bloggerUrl)
    if (!metrics) continue

    await db.metricsSnapshot.create({
      data: {
        postId: post.id,
        adImpressions: metrics.adImpressions,
        adClicks: metrics.adClicks,
        adCtr: metrics.adCtr,
        revenue: metrics.revenue,
        rpm: metrics.impressionRpm,
        ecpm: metrics.impressionRpm,
        pageRpm: metrics.pageRpm,
        periodStart,
        periodEnd,
        source: 'adsense',
      },
    })

    await db.post.update({
      where: { id: post.id },
      data: {
        totalRevenue: post.totalRevenue + metrics.revenue,
        lastRevenueAt: new Date(),
      },
    })

    synced++
  }

  return { synced, skipped: false, reason: null }
}

export async function recordManualRevenue(input: {
  postId: string
  revenue: number
  adImpressions?: number
  adClicks?: number
  periodStart?: Date
  periodEnd?: Date
  note?: string
}) {
  const post = await db.post.findUnique({
    where: { id: input.postId },
    select: { id: true, totalRevenue: true, bloggerUrl: true },
  })
  if (!post) throw new Error('글을 찾을 수 없습니다.')

  const adImpressions = input.adImpressions ?? 0
  const adClicks = input.adClicks ?? 0
  const adCtr = adImpressions > 0 ? adClicks / adImpressions : 0
  const rpm = adImpressions > 0 ? (input.revenue / adImpressions) * 1000 : 0

  const snapshot = await db.metricsSnapshot.create({
    data: {
      postId: input.postId,
      adImpressions,
      adClicks,
      adCtr,
      revenue: input.revenue,
      rpm,
      ecpm: rpm,
      pageRpm: rpm,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      source: input.note ? `manual:${input.note}` : 'manual',
    },
  })

  await db.post.update({
    where: { id: input.postId },
    data: {
      totalRevenue: post.totalRevenue + input.revenue,
      lastRevenueAt: new Date(),
    },
  })

  return snapshot
}
