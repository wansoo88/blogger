import Link from 'next/link'
import { getDashboardSummary } from '@/lib/services/dashboard-service'
import { getPrimaryNotificationChannel } from '@/lib/services/notification-service'
import { listPostsByStatus } from '@/lib/services/post-service'
import { db } from '@/lib/db'

function StatusBadge({ value }: { value: string }) {
  const className =
    value === 'FAILED' || value === 'CRITICAL'
      ? 'badge badge-danger'
      : 'badge badge-warn'

  return <span className={className}>{value}</span>
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary()
  const channel = await getPrimaryNotificationChannel()
  const posts = await listPostsByStatus()
  const reviewCount = posts.filter((post) => post.status === 'REVIEW').length
  const queuedCount = posts.filter((post) => post.status === 'QUEUED').length
  const approvedCount = posts.filter((post) => post.status === 'APPROVED').length
  const scheduledCount = posts.filter((post) => post.status === 'SCHEDULED').length
  const publishedCount = posts.filter((post) => post.status === 'PUBLISHED').length

  const avgScore = await db.post.aggregate({
    _avg: { aiScore: true },
    where: { aiScore: { not: null } },
  })

  const adsenseReady = publishedCount >= 30
  const adsenseProgress = Math.min(100, Math.round((publishedCount / 30) * 100))

  return (
    <div className="grid" style={{ gap: 24 }}>
      <section className="grid grid-2 grid-4">
        <article className="panel accent-panel">
          <p className="label">AdSense readiness</p>
          <div className="metric">{publishedCount} / 30</div>
          <p>{adsenseReady ? 'Ready to apply for AdSense.' : `${30 - publishedCount} more posts needed.`}</p>
          <div style={{
            height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.2)', marginTop: 8,
          }}>
            <div style={{
              height: '100%', width: `${adsenseProgress}%`, borderRadius: 3,
              background: 'rgba(255,255,255,0.8)',
            }} />
          </div>
        </article>
        <article className="panel">
          <p className="label">Quality score</p>
          <div className="metric">{Math.round(avgScore._avg.aiScore ?? 0)}</div>
          <p>Average across all scored posts</p>
        </article>
        <article className="panel">
          <p className="label">Review queue</p>
          <div className="metric">{reviewCount}</div>
          <p>Posts needing manual review</p>
        </article>
        <article className="panel">
          <p className="label">Ready to publish</p>
          <div className="metric">{approvedCount + scheduledCount}</div>
          <p>{approvedCount} approved, {scheduledCount} scheduled</p>
        </article>
      </section>

      <section className="grid grid-2">
        <section className="grid grid-2">
          <article className="panel">
            <p className="label">Week</p>
            <div className="metric">{summary.week}</div>
            <p>Open alerts: {summary.alertsOpen}</p>
          </article>

          <article className="panel">
            <p className="label">Draft quota</p>
            <div className="metric">
              {summary.draftActual} / {summary.draftTarget}
            </div>
            <p>Missing: {summary.missingDrafts}</p>
          </article>

          <article className="panel">
            <p className="label">Review quota</p>
            <div className="metric">
              {summary.reviewActual} / {summary.reviewTarget}
            </div>
            <p>Queued for generation: {queuedCount}</p>
          </article>

          <article className="panel">
            <p className="label">Publish quota</p>
            <div className="metric">
              {summary.publishActual} / {summary.publishTarget}
            </div>
            <p>Missing: {summary.missingPublishes}</p>
          </article>
        </section>

        <section className="grid grid-2">
          <article className="panel">
            <p className="label">Alert email</p>
            <div className="metric" style={{ fontSize: 20 }}>
              {channel?.target ?? 'kimcomplete8888@gmail.com'}
            </div>
            <p>
              Last status: <StatusBadge value={summary.lastNotificationStatus} />
            </p>
            <p>Mailer: {process.env.SMTP_HOST ? 'configured' : 'not set'}</p>
          </article>

          <article className="panel">
            <p className="label">Notification rules</p>
            <ul className="list">
              {channel?.rules.map((rule) => (
                <li key={rule.id}>{rule.event.replace(/_/g, ' ').toLowerCase()}</li>
              )) ?? <li>No rules configured</li>}
            </ul>
          </article>
        </section>
      </section>

      <section className="grid grid-2">
        <article className="panel">
          <p className="label">Quick actions</p>
          <div className="actions">
            <Link className="button-link primary" href="/dashboard/keywords">
              Keywords
            </Link>
            <Link className="button-link" href="/dashboard/pipeline">
              Pipeline
            </Link>
            <Link className="button-link" href="/dashboard/review">
              Review
            </Link>
            <Link className="button-link" href="/dashboard/publish">
              Publish
            </Link>
            <Link className="button-link" href="/dashboard/progress">
              Progress
            </Link>
            <Link className="button-link" href="/dashboard/monitor">
              Monitor
            </Link>
          </div>
        </article>

        <article className="panel">
          <p className="label">Getting started</p>
          <ul className="list">
            <li>Set GEMINI_API_KEY in .env.local for draft generation.</li>
            <li>Set Blogger credentials for publishing.</li>
            <li>Add keywords and generate drafts from the Pipeline page.</li>
            <li>See the <Link href="/dashboard/playbook" style={{ textDecoration: 'underline' }}>Playbook</Link> for full setup guide.</li>
          </ul>
        </article>
      </section>
    </div>
  )
}
