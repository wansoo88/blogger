import { getPostMetricsSummary } from '@/lib/integrations/search-console'
import { getGA4Status, getTrafficSummary, getTrafficBySource } from '@/lib/integrations/ga4'
import { syncMetricsAction, evaluateAlertsAction } from '@/app/actions'
import { db } from '@/lib/db'

export default async function MonitorPage() {
  const summary = await getPostMetricsSummary()
  const ga4Status = getGA4Status()
  const traffic = ga4Status.configured ? await getTrafficSummary() : null
  const sources = ga4Status.configured ? await getTrafficBySource() : null
  const openAlerts = await db.alert.count({ where: { status: 'OPEN' } })

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="topbar">
          <p className="label">Health check</p>
          <form action={evaluateAlertsAction}>
            <button className="button-link primary" type="submit">
              Run alert evaluation
            </button>
          </form>
        </div>
        <p className="small-note">
          {openAlerts > 0
            ? `${openAlerts} open alert(s). Check the Alerts page for details.`
            : 'No open alerts.'}
        </p>
      </section>

      {traffic ? (
        <section className="grid grid-2 grid-4">
          <article className="panel accent-panel">
            <p className="label">Sessions (28d)</p>
            <div className="metric">{traffic.sessions.toLocaleString()}</div>
            <p>Users: {traffic.users.toLocaleString()}</p>
          </article>
          <article className="panel">
            <p className="label">Page Views (28d)</p>
            <div className="metric">{traffic.pageViews.toLocaleString()}</div>
            <p>New users: {traffic.newUsers.toLocaleString()}</p>
          </article>
          <article className="panel">
            <p className="label">Bounce Rate</p>
            <div className="metric">{traffic.bounceRate}%</div>
          </article>
          <article className="panel">
            <p className="label">Avg Session</p>
            <div className="metric">{Math.round(traffic.avgSessionDuration)}s</div>
          </article>
        </section>
      ) : (
        <section className="panel">
          <p className="label">Google Analytics 4</p>
          <p className="small-note">
            GA4 not configured. Add GA4_PROPERTY_ID and GA4_REFRESH_TOKEN to .env.local to enable traffic monitoring.
          </p>
        </section>
      )}

      {sources && sources.length > 0 ? (
        <section className="panel">
          <p className="label">Traffic sources (28d)</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Source</th><th>Sessions</th><th>Share</th></tr>
              </thead>
              <tbody>
                {sources.map(s => {
                  const total = sources.reduce((sum, x) => sum + x.sessions, 0)
                  const pct = total > 0 ? ((s.sessions / total) * 100).toFixed(1) : '0'
                  return (
                    <tr key={s.source}>
                      <td>{s.source}</td>
                      <td>{s.sessions.toLocaleString()}</td>
                      <td>{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="grid grid-2 grid-4">
        <article className="panel accent-panel">
          <p className="label">Published</p>
          <div className="metric">{summary.totalPublished}</div>
          <p>Total posts on Blogger</p>
        </article>
        <article className="panel">
          <p className="label">Indexed</p>
          <div className="metric">{summary.indexed}</div>
          <p>Not indexed: {summary.notIndexed}</p>
        </article>
        <article className="panel">
          <p className="label">Impressions (28d)</p>
          <div className="metric">{summary.totalImpressions.toLocaleString()}</div>
          <p>Zero impressions: {summary.zeroImpressions}</p>
        </article>
        <article className="panel">
          <p className="label">Clicks (28d)</p>
          <div className="metric">{summary.totalClicks.toLocaleString()}</div>
          <p>Zero clicks: {summary.zeroClicks}</p>
        </article>
      </section>

      <section className="panel">
        <div className="topbar">
          <p className="label">Search performance by post</p>
          <form action={syncMetricsAction}>
            <button className="button-link primary" type="submit">
              Sync from Search Console
            </button>
          </form>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Indexed</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th>Position</th>
                <th>Last checked</th>
              </tr>
            </thead>
            <tbody>
              {summary.posts.map(post => (
                <tr key={post.id}>
                  <td>
                    {post.bloggerUrl ? (
                      <a href={post.bloggerUrl} target="_blank" rel="noopener">
                        {post.title}
                      </a>
                    ) : (
                      post.title
                    )}
                  </td>
                  <td>
                    <span className={post.indexed ? 'badge' : 'badge badge-danger'}
                      style={post.indexed ? { background: 'rgba(15,118,110,0.1)', color: 'var(--accent)' } : undefined}>
                      {post.indexed ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>{post.impressions.toLocaleString()}</td>
                  <td>{post.clicks.toLocaleString()}</td>
                  <td>{(post.ctr * 100).toFixed(1)}%</td>
                  <td>{post.position ? post.position.toFixed(1) : '-'}</td>
                  <td className="small-note">
                    {post.lastChecked
                      ? new Date(post.lastChecked).toLocaleDateString()
                      : 'Never'}
                  </td>
                </tr>
              ))}
              {!summary.posts.length ? (
                <tr>
                  <td colSpan={7}>No published posts to monitor yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {summary.zeroImpressions > 0 ? (
        <section className="panel">
          <p className="label">Posts needing attention</p>
          <p className="small-note">These published posts have zero impressions in the last 28 days. Consider refreshing titles or content.</p>
          <ul className="list">
            {summary.posts
              .filter(p => p.impressions === 0)
              .map(p => (
                <li key={p.id}>
                  {p.bloggerUrl ? (
                    <a href={p.bloggerUrl} target="_blank" rel="noopener">{p.title}</a>
                  ) : p.title}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
