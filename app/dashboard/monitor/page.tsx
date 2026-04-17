import { getPostMetricsSummary } from '@/lib/integrations/search-console'
import { syncAdSenseRevenueAction, syncMetricsAction } from '@/app/actions'
import { db } from '@/lib/db'
import { formatUSD } from '@/lib/services/revenue-service'
import { getAdSenseStatus } from '@/lib/integrations/adsense'

export default async function MonitorPage() {
  const summary = await getPostMetricsSummary()
  const adsenseStatus = getAdSenseStatus()

  const revenueMap = new Map<string, number>()
  const posts = await db.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, totalRevenue: true },
  })
  for (const p of posts) revenueMap.set(p.id, p.totalRevenue)

  return (
    <div className="section-stack">
      <section className="grid grid-2 grid-4">
        <article className="panel accent-panel">
          <p className="label">발행된 글</p>
          <div className="metric">{summary.totalPublished}</div>
          <p>Blogger 전체 발행 글 수</p>
        </article>
        <article className="panel">
          <p className="label">색인 현황</p>
          <div className="metric">{summary.indexed}</div>
          <p>미색인: {summary.notIndexed}</p>
        </article>
        <article className="panel">
          <p className="label">28일 노출</p>
          <div className="metric">
            {summary.totalImpressions.toLocaleString()}
          </div>
          <p>노출 0 글: {summary.zeroImpressions}</p>
        </article>
        <article className="panel">
          <p className="label">28일 클릭</p>
          <div className="metric">
            {summary.totalClicks.toLocaleString()}
          </div>
          <p>클릭 0 글: {summary.zeroClicks}</p>
        </article>
      </section>

      <section className="panel">
        <div className="topbar">
          <p className="label">글별 검색 성과 + 수익</p>
          <div className="actions">
            <form action={syncMetricsAction}>
              <button className="button-link primary" type="submit">
                Search Console 동기화
              </button>
            </form>
            <form action={syncAdSenseRevenueAction}>
              <button
                className="button-link"
                type="submit"
                disabled={!adsenseStatus.configured}
                title={
                  adsenseStatus.configured ? undefined : 'AdSense 미연결'
                }
              >
                AdSense 수익 동기화
              </button>
            </form>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>제목</th>
                <th>색인</th>
                <th>노출</th>
                <th>클릭</th>
                <th>CTR</th>
                <th>순위</th>
                <th>누적 수익</th>
                <th>최근 확인</th>
              </tr>
            </thead>
            <tbody>
              {summary.posts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div
                      style={{ textAlign: 'center', padding: '24px 0' }}
                      className="small-note"
                    >
                      아직 모니터링할 발행 글이 없습니다.
                    </div>
                  </td>
                </tr>
              ) : (
                summary.posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      {post.bloggerUrl ? (
                        <a
                          href={post.bloggerUrl}
                          target="_blank"
                          rel="noopener"
                        >
                          {post.title}
                        </a>
                      ) : (
                        post.title
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          post.indexed ? 'badge' : 'badge badge-danger'
                        }
                        style={
                          post.indexed
                            ? {
                                background: 'rgba(15,118,110,0.1)',
                                color: 'var(--accent)',
                              }
                            : undefined
                        }
                      >
                        {post.indexed ? '색인' : '미색인'}
                      </span>
                    </td>
                    <td>{post.impressions.toLocaleString()}</td>
                    <td>{post.clicks.toLocaleString()}</td>
                    <td>{(post.ctr * 100).toFixed(1)}%</td>
                    <td>{post.position ? post.position.toFixed(1) : '-'}</td>
                    <td>{formatUSD(revenueMap.get(post.id) ?? 0)}</td>
                    <td className="small-note">
                      {post.lastChecked
                        ? new Date(post.lastChecked).toLocaleDateString(
                            'ko-KR',
                          )
                        : '미동기화'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {summary.zeroImpressions > 0 ? (
        <section className="panel">
          <p className="label">리프레시가 필요한 글</p>
          <p className="small-note">
            지난 28일간 노출이 0인 글입니다. 제목/본문 업데이트를 고려하세요.
          </p>
          <ul className="list">
            {summary.posts
              .filter((p) => p.impressions === 0)
              .map((p) => (
                <li key={p.id}>
                  {p.bloggerUrl ? (
                    <a href={p.bloggerUrl} target="_blank" rel="noopener">
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
