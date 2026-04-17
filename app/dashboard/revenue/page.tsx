import Link from 'next/link'
import { listPostsByStatus } from '@/lib/services/post-service'
import {
  formatKRW,
  formatUSD,
  getRevenueByCategory,
  getRevenueSummary,
  getTopEarningPosts,
} from '@/lib/services/revenue-service'
import { getAffiliateSummary } from '@/lib/services/affiliate-service'
import { getAdSenseStatus } from '@/lib/integrations/adsense'
import {
  recordManualRevenueAction,
  syncAdSenseRevenueAction,
} from '@/app/actions'

export default async function RevenuePage() {
  const [summary, topPosts, byCategory, affiliate, allPosts] = await Promise.all([
    getRevenueSummary(),
    getTopEarningPosts(10),
    getRevenueByCategory(),
    getAffiliateSummary(),
    listPostsByStatus(),
  ])

  const adsenseStatus = getAdSenseStatus()
  const publishedPosts = allPosts.filter((p) => p.status === 'PUBLISHED')

  const totalLifetime = summary.lifetime.totalRevenue
  const monthlyGoalUsd = 500_000 / 1350
  const goalProgress =
    monthlyGoalUsd > 0
      ? Math.min(100, Math.round((summary.last30.adsenseRevenue + summary.last30.affiliateRevenue) / monthlyGoalUsd * 100))
      : 0

  return (
    <div className="section-stack">
      <section className="grid grid-2 grid-4">
        <article className="panel accent-panel">
          <p className="label">누적 총 수익</p>
          <div className="metric">{formatUSD(totalLifetime)}</div>
          <p>약 {formatKRW(totalLifetime)}</p>
        </article>
        <article className="panel">
          <p className="label">최근 30일 AdSense</p>
          <div className="metric">{formatUSD(summary.last30.adsenseRevenue)}</div>
          <p>RPM {formatUSD(summary.last30.rpm)} / 1,000 노출</p>
        </article>
        <article className="panel">
          <p className="label">최근 30일 제휴</p>
          <div className="metric">{formatUSD(summary.last30.affiliateRevenue)}</div>
          <p>전환율 {(affiliate.conversionRate * 100).toFixed(1)}%</p>
        </article>
        <article className="panel">
          <p className="label">월 목표 달성률</p>
          <div className="metric">{goalProgress}%</div>
          <p>목표 월 50만원 ({formatUSD(monthlyGoalUsd)})</p>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'var(--line)',
              marginTop: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${goalProgress}%`,
                borderRadius: 3,
                background:
                  goalProgress >= 100
                    ? 'var(--accent)'
                    : goalProgress >= 60
                      ? '#b54708'
                      : 'var(--danger)',
              }}
            />
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="topbar">
          <div>
            <p className="label">AdSense 수익 동기화</p>
            <p className="small-note" style={{ margin: 0 }}>
              {adsenseStatus.configured
                ? 'AdSense가 연결되어 있습니다. 버튼을 눌러 최근 28일 수익을 가져옵니다.'
                : 'AdSense 미설정 상태입니다. 승인 전까지는 아래 수동 입력을 사용하세요.'}
            </p>
          </div>
          <form action={syncAdSenseRevenueAction}>
            <button
              className="button-link primary"
              type="submit"
              disabled={!adsenseStatus.configured}
              title={adsenseStatus.configured ? undefined : 'AdSense 미연결'}
            >
              AdSense 수익 가져오기
            </button>
          </form>
        </div>
      </section>

      <section className="grid grid-2">
        <article className="panel">
          <p className="label">카테고리별 수익</p>
          {byCategory.length === 0 ? (
            <p className="small-note">
              아직 기록된 수익이 없습니다. AdSense 동기화 또는 아래 수동 입력으로 시작하세요.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>카테고리</th>
                    <th>글 수</th>
                    <th>수익</th>
                    <th>평균/글</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((c) => (
                    <tr key={c.category}>
                      <td>{c.label}</td>
                      <td>{c.postCount}</td>
                      <td>{formatUSD(c.revenue)}</td>
                      <td className="small-note">{formatUSD(c.avgRevenuePerPost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel">
          <p className="label">상위 수익 글 TOP 10</p>
          {topPosts.length === 0 ? (
            <p className="small-note">
              발행 후 AdSense/제휴 수익이 기록되면 여기에 상위 10개가 표시됩니다.
            </p>
          ) : (
            <ol className="list">
              {topPosts.map((p) => (
                <li key={p.id} style={{ marginBottom: 6 }}>
                  {p.bloggerUrl ? (
                    <a href={p.bloggerUrl} target="_blank" rel="noopener">
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}{' '}
                  <span className="small-note">— {formatUSD(p.totalRevenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>

      <section className="panel">
        <p className="label">수동 수익 입력 (AdSense 미승인 기간용)</p>
        <p className="small-note">
          글을 선택하고 기간별 수익을 수동 입력합니다. 승인 전 애드센스 프로그램 데이터 또는 외부 광고 수익 기록에 사용하세요.
        </p>
        <form action={recordManualRevenueAction} className="form-grid">
          <select className="input" name="postId" required defaultValue="">
            <option value="" disabled>
              글 선택 —
            </option>
            {publishedPosts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <div className="grid grid-2">
            <input
              className="input"
              name="revenue"
              type="number"
              step="0.01"
              min="0"
              placeholder="수익(USD) 예: 1.25"
              required
            />
            <input
              className="input"
              name="note"
              placeholder="메모 예: 2026-04-01~15"
            />
          </div>
          <div className="grid grid-2">
            <input
              className="input"
              name="adImpressions"
              type="number"
              min="0"
              placeholder="광고 노출수 (선택)"
            />
            <input
              className="input"
              name="adClicks"
              type="number"
              min="0"
              placeholder="광고 클릭수 (선택)"
            />
          </div>
          <button className="button-link primary" type="submit">
            수익 기록
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="topbar">
          <p className="label">제휴 링크 요약</p>
          <Link className="button-link" href="/dashboard/affiliate">
            제휴 링크 관리
          </Link>
        </div>
        <div className="grid grid-4">
          <div>
            <p className="small-note">활성 링크</p>
            <div className="metric" style={{ fontSize: 24 }}>
              {affiliate.activeLinks} / {affiliate.totalLinks}
            </div>
          </div>
          <div>
            <p className="small-note">총 클릭</p>
            <div className="metric" style={{ fontSize: 24 }}>
              {affiliate.totalClicks.toLocaleString()}
            </div>
          </div>
          <div>
            <p className="small-note">전환</p>
            <div className="metric" style={{ fontSize: 24 }}>
              {affiliate.totalConversions.toLocaleString()}
            </div>
          </div>
          <div>
            <p className="small-note">누적 수익</p>
            <div className="metric" style={{ fontSize: 24 }}>
              {formatUSD(affiliate.totalRevenue)}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
