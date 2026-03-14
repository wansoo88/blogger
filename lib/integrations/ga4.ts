const PROPERTY_ID    = process.env.GA4_PROPERTY_ID ?? ''
const REFRESH_TOKEN  = process.env.GA4_REFRESH_TOKEN
                     ?? process.env.BLOGGER_REFRESH_TOKEN
                     ?? ''
const CLIENT_ID      = process.env.GOOGLE_CLIENT_ID     ?? ''
const CLIENT_SECRET  = process.env.GOOGLE_CLIENT_SECRET  ?? ''

const GA4_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

let cachedAccessToken = ''
let tokenExpiresAt    = 0

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedAccessToken
  }

  if (!REFRESH_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('GA4 OAuth credentials not configured')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: REFRESH_TOKEN,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GA4 token refresh failed: ${res.status} ${text}`)
  }

  const json = await res.json()
  cachedAccessToken = json.access_token
  tokenExpiresAt    = Date.now() + json.expires_in * 1000
  return cachedAccessToken
}

export function getGA4Status() {
  return {
    configured:           !!(PROPERTY_ID && REFRESH_TOKEN && CLIENT_ID && CLIENT_SECRET),
    propertyId:           PROPERTY_ID || null,
    hasRefreshToken:      !!REFRESH_TOKEN,
    hasClientCredentials: !!(CLIENT_ID && CLIENT_SECRET),
  }
}

interface GA4Dimension { name: string }
interface GA4Metric { name: string }
interface GA4DateRange { startDate: string; endDate: string }
interface GA4OrderBy { metric?: { metricName: string }; desc?: boolean }

interface GA4ReportRequest {
  dimensions?: GA4Dimension[]
  metrics: GA4Metric[]
  dateRanges: GA4DateRange[]
  limit?: number
  orderBys?: GA4OrderBy[]
}

interface GA4Row {
  dimensionValues?: { value: string }[]
  metricValues?: { value: string }[]
}

interface GA4ReportResponse {
  rows?: GA4Row[]
  rowCount?: number
}

export async function fetchGA4Report(args: GA4ReportRequest): Promise<GA4ReportResponse> {
  const { configured } = getGA4Status()
  if (!configured) return { rows: [], rowCount: 0 }

  const token = await getAccessToken()
  const url = `${GA4_API_BASE}/properties/${PROPERTY_ID}:runReport`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GA4 API error: ${res.status} ${text}`)
  }

  return res.json()
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildDateRange(days: number): GA4DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  return { startDate: formatDate(start), endDate: formatDate(end) }
}

function metricVal(row: GA4Row, i: number): number {
  return parseFloat(row.metricValues?.[i]?.value ?? '0')
}

function dimVal(row: GA4Row, i: number): string {
  return row.dimensionValues?.[i]?.value ?? ''
}

export interface TrafficSummary {
  sessions: number
  users: number
  pageViews: number
  bounceRate: number
  avgSessionDuration: number
  newUsers: number
}

export async function getTrafficSummary(days = 28): Promise<TrafficSummary> {
  const empty = { sessions: 0, users: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0, newUsers: 0 }
  if (!getGA4Status().configured) return empty

  const data = await fetchGA4Report({
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'newUsers' },
    ],
    dateRanges: [buildDateRange(days)],
  })

  const row = data.rows?.[0]
  if (!row) return empty

  return {
    sessions:            metricVal(row, 0),
    users:               metricVal(row, 1),
    pageViews:           metricVal(row, 2),
    bounceRate:          Math.round(metricVal(row, 3) * 10000) / 100,
    avgSessionDuration:  Math.round(metricVal(row, 4) * 100) / 100,
    newUsers:            metricVal(row, 5),
  }
}

export interface TrafficBySource {
  source: string
  sessions: number
}

export async function getTrafficBySource(days = 28): Promise<TrafficBySource[]> {
  if (!getGA4Status().configured) return []

  const data = await fetchGA4Report({
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics:    [{ name: 'sessions' }],
    dateRanges: [buildDateRange(days)],
    orderBys:   [{ metric: { metricName: 'sessions' }, desc: true }],
  })

  return (data.rows ?? []).map(row => ({
    source:   dimVal(row, 0),
    sessions: metricVal(row, 0),
  }))
}

export interface TopPage {
  pagePath: string
  pageViews: number
  sessions: number
  avgSessionDuration: number
}

export async function getTopPages(days = 28, limit = 20): Promise<TopPage[]> {
  if (!getGA4Status().configured) return []

  const data = await fetchGA4Report({
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'averageSessionDuration' },
    ],
    dateRanges: [buildDateRange(days)],
    limit,
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
  })

  return (data.rows ?? []).map(row => ({
    pagePath:           dimVal(row, 0),
    pageViews:          metricVal(row, 0),
    sessions:           metricVal(row, 1),
    avgSessionDuration: Math.round(metricVal(row, 2) * 100) / 100,
  }))
}
