import { getProgressStats } from '@/lib/services/post-service'
import { getCurrentWeeklyQuota } from '@/lib/services/quota-service'

function ProgressBar({ current, target, label }: { current: number; target: number; label: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="small-note">{label}</span>
        <span className="small-note">{current} / {target} ({pct}%)</span>
      </div>
      <div style={{
        height: 10,
        borderRadius: 5,
        background: 'var(--line)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 5,
          background: pct >= 100
            ? 'var(--accent)'
            : pct >= 60
              ? '#b54708'
              : 'var(--danger)',
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

export default async function ProgressPage() {
  const stats = await getProgressStats()
  const quota = await getCurrentWeeklyQuota()

  return (
    <div className="section-stack">
      <section className="grid grid-2">
        <article className="panel accent-panel">
          <p className="label">Today</p>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div className="metric">{stats.today.drafted}</div>
              <p>Drafted</p>
            </div>
            <div>
              <div className="metric">{stats.today.published}</div>
              <p>Published</p>
            </div>
          </div>
        </article>
        <article className="panel">
          <p className="label">This week</p>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div className="metric">{stats.week.drafted}</div>
              <p>Drafted</p>
            </div>
            <div>
              <div className="metric">{stats.week.approved}</div>
              <p>Approved</p>
            </div>
            <div>
              <div className="metric">{stats.week.published}</div>
              <p>Published</p>
            </div>
          </div>
        </article>
      </section>

      {quota ? (
        <section className="panel">
          <p className="label">Weekly quota progress - {quota.isoWeek}</p>
          <ProgressBar
            current={quota.stats?.draftCount ?? 0}
            target={quota.targetDrafts}
            label="Drafts"
          />
          <ProgressBar
            current={quota.stats?.reviewCount ?? 0}
            target={quota.targetReviews}
            label="Reviews"
          />
          <ProgressBar
            current={quota.stats?.publishedCount ?? 0}
            target={quota.targetPublishes}
            label="Publishes"
          />
        </section>
      ) : (
        <section className="panel">
          <p className="label">Weekly quota</p>
          <p>No weekly quota configured yet. Create one from the quota settings.</p>
        </section>
      )}

      <section className="grid grid-2">
        <article className="panel">
          <p className="label">Overall totals</p>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                <tr><td>Total published</td><td><strong>{stats.totals.published}</strong></td></tr>
                <tr><td>Total drafted</td><td><strong>{stats.totals.drafted}</strong></td></tr>
                <tr><td>In queue</td><td><strong>{stats.totals.queued}</strong></td></tr>
                <tr><td>Keywords registered</td><td><strong>{stats.totals.keywords}</strong></td></tr>
                <tr><td>Average quality score</td><td><strong>{stats.totals.avgScore}/100</strong></td></tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <p className="label">Category distribution</p>
          {stats.categoryBreakdown.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Category</th><th>Count</th></tr>
                </thead>
                <tbody>
                  {stats.categoryBreakdown.map(c => (
                    <tr key={c.category}>
                      <td>{c.category.replace(/_/g, ' ')}</td>
                      <td>{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No posts yet.</p>
          )}
        </article>
      </section>

      <section className="panel">
        <p className="label">Pipeline status</p>
        {stats.statusBreakdown.length > 0 ? (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {stats.statusBreakdown.map(s => (
              <div key={s.status} className="panel" style={{ textAlign: 'center', minWidth: 100 }}>
                <div className="metric" style={{ fontSize: 24 }}>{s.count}</div>
                <p className="small-note">{s.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No posts in pipeline.</p>
        )}
      </section>

      <section className="panel">
        <p className="label">Recent activity</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Category</th>
                <th>Score</th>
                <th>Words</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPosts.map(post => (
                <tr key={post.id}>
                  <td>
                    {post.bloggerUrl ? (
                      <a href={post.bloggerUrl} target="_blank" rel="noopener">{post.title}</a>
                    ) : (
                      post.title
                    )}
                  </td>
                  <td>
                    <span className={
                      post.status === 'PUBLISHED' ? 'badge'
                        : post.status === 'REVIEW' ? 'badge badge-warn'
                          : 'badge'
                    } style={
                      post.status === 'PUBLISHED'
                        ? { background: 'rgba(15,118,110,0.1)', color: 'var(--accent)' }
                        : undefined
                    }>
                      {post.status}
                    </span>
                  </td>
                  <td className="small-note">{post.category.replace(/_/g, ' ')}</td>
                  <td>{post.aiScore ?? '-'}</td>
                  <td>{post.wordCount || '-'}</td>
                  <td className="small-note">{new Date(post.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
