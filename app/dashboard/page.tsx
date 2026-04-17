import Link from 'next/link'
import { getDashboardSummary } from '@/lib/services/dashboard-service'
import { getPrimaryNotificationChannel } from '@/lib/services/notification-service'
import { listPostsByStatus } from '@/lib/services/post-service'
import { db } from '@/lib/db'
import {
  formatUSD,
  formatKRW,
  getRevenueSummary,
} from '@/lib/services/revenue-service'
import { getAffiliateSummary } from '@/lib/services/affiliate-service'

function StatusBadge({ value }: { value: string }) {
  const className =
    value === 'FAILED' || value === 'CRITICAL'
      ? 'badge badge-danger'
      : value === 'SENT'
        ? 'badge'
        : 'badge badge-warn'

  const style =
    value === 'SENT'
      ? { background: 'rgba(15,118,110,0.1)', color: 'var(--accent)' }
      : undefined

  return (
    <span className={className} style={style}>
      {value}
    </span>
  )
}

export default async function DashboardPage() {
  const [summary, channel, posts, revenue, affiliate] = await Promise.all([
    getDashboardSummary(),
    getPrimaryNotificationChannel(),
    listPostsByStatus(),
    getRevenueSummary(),
    getAffiliateSummary(),
  ])

  const reviewCount = posts.filter((post) => post.status === 'REVIEW').length
  const queuedCount = posts.filter((post) => post.status === 'QUEUED').length
  const approvedCount = posts.filter((post) => post.status === 'APPROVED').length
  const scheduledCount = posts.filter((post) => post.status === 'SCHEDULED').length
  const publishedCount = posts.filter((post) => post.status === 'PUBLISHED').length
  const refreshCount = await db.post.count({ where: { needsRefresh: true } })

  const avgScore = await db.post.aggregate({
    _avg: { aiScore: true },
    where: { aiScore: { not: null } },
  })

  const adsenseReady = publishedCount >= 30
  const adsenseProgress = Math.min(100, Math.round((publishedCount / 30) * 100))

  const monthlyGoalUsd = 500_000 / 1350
  const last30Total =
    revenue.last30.adsenseRevenue + revenue.last30.affiliateRevenue
  const goalProgress =
    monthlyGoalUsd > 0 ? Math.min(100, Math.round((last30Total / monthlyGoalUsd) * 100)) : 0

  return (
    <div className="grid" style={{ gap: 24 }}>
      <section className="grid grid-2 grid-4">
        <article className="panel accent-panel">
          <p className="label">AdSense 승인 준비</p>
          <div className="metric">
            {publishedCount} / 30
          </div>
          <p>
            {adsenseReady
              ? '승인 신청 가능한 상태입니다.'
              : `앞으로 ${30 - publishedCount}개 더 필요합니다.`}
          </p>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.2)',
              marginTop: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${adsenseProgress}%`,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.8)',
              }}
            />
          </div>
        </article>
        <article className="panel">
          <p className="label">품질 점수 평균</p>
          <div className="metric">{Math.round(avgScore._avg.aiScore ?? 0)}</div>
          <p>자동 검수 통과 기준: 70점</p>
        </article>
        <article className="panel">
          <p className="label">검수 대기</p>
          <div className="metric">{reviewCount}</div>
          <p>수동 확인이 필요한 글</p>
        </article>
        <article className="panel">
          <p className="label">발행 준비</p>
          <div className="metric">{approvedCount + scheduledCount}</div>
          <p>
            승인 {approvedCount} · 예약 {scheduledCount}
          </p>
        </article>
      </section>

      <section className="grid grid-2 grid-4">
        <article className="panel accent-panel">
          <p className="label">최근 30일 총 수익</p>
          <div className="metric">{formatUSD(last30Total)}</div>
          <p>약 {formatKRW(last30Total)}</p>
        </article>
        <article className="panel">
          <p className="label">AdSense RPM (30d)</p>
          <div className="metric">{formatUSD(revenue.last30.rpm)}</div>
          <p>1,000 노출당 수익</p>
        </article>
        <article className="panel">
          <p className="label">제휴 누적 수익</p>
          <div className="metric">{formatUSD(affiliate.totalRevenue)}</div>
          <p>
            전환 {affiliate.totalConversions} / 클릭 {affiliate.totalClicks}
          </p>
        </article>
        <article className="panel">
          <p className="label">월 목표 달성률</p>
          <div className="metric">{goalProgress}%</div>
          <p>목표 월 50만원</p>
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

      <section className="grid grid-2">
        <section className="grid grid-2">
          <article className="panel">
            <p className="label">이번 주</p>
            <div className="metric">{summary.week}</div>
            <p>열린 알림: {summary.alertsOpen}</p>
          </article>

          <article className="panel">
            <p className="label">초안 할당량</p>
            <div className="metric">
              {summary.draftActual} / {summary.draftTarget}
            </div>
            <p>부족: {summary.missingDrafts}</p>
          </article>

          <article className="panel">
            <p className="label">검수 할당량</p>
            <div className="metric">
              {summary.reviewActual} / {summary.reviewTarget}
            </div>
            <p>초안 생성 대기: {queuedCount}</p>
          </article>

          <article className="panel">
            <p className="label">발행 할당량</p>
            <div className="metric">
              {summary.publishActual} / {summary.publishTarget}
            </div>
            <p>부족: {summary.missingPublishes}</p>
          </article>
        </section>

        <section className="grid grid-2">
          <article className="panel">
            <p className="label">알림 수신 이메일</p>
            <div className="metric" style={{ fontSize: 20 }}>
              {channel?.target ?? 'kimcomplete8888@gmail.com'}
            </div>
            <p>
              최근 상태: <StatusBadge value={summary.lastNotificationStatus} />
            </p>
            <p>메일러: {process.env.SMTP_HOST ? '설정됨' : '미설정'}</p>
          </article>

          <article className="panel">
            <p className="label">리프레시 필요 글</p>
            <div className="metric">{refreshCount}</div>
            <p>저수익 · 저 CTR 자동 선별</p>
            <Link className="button-link" href="/dashboard/refresh">
              리프레시 후보 보기
            </Link>
          </article>
        </section>
      </section>

      <section className="grid grid-2">
        <article className="panel">
          <p className="label">빠른 실행</p>
          <div className="actions">
            <Link className="button-link primary" href="/dashboard/revenue">
              수익 대시보드
            </Link>
            <Link className="button-link" href="/dashboard/keywords">
              키워드
            </Link>
            <Link className="button-link" href="/dashboard/pipeline">
              파이프라인
            </Link>
            <Link className="button-link" href="/dashboard/review">
              검수
            </Link>
            <Link className="button-link" href="/dashboard/publish">
              발행
            </Link>
            <Link className="button-link" href="/dashboard/affiliate">
              제휴 링크
            </Link>
          </div>
        </article>

        <article className="panel">
          <p className="label">시작하기</p>
          <ul className="list">
            <li>
              <code className="code-inline">.env.local</code>에 <code className="code-inline">GEMINI_API_KEY</code>를 설정해 초안 생성을 활성화하세요.
            </li>
            <li>
              Blogger 자격 증명을 설정해 자동 발행을 연결하세요.
            </li>
            <li>
              키워드를 등록한 뒤 파이프라인에서 초안을 생성합니다.
            </li>
            <li>
              AdSense 승인 후 <code className="code-inline">ADSENSE_ACCOUNT_ID</code>를 설정하면 수익이 자동 집계됩니다.
            </li>
            <li>
              세부 순서는{' '}
              <Link
                href="/dashboard/playbook"
                style={{ textDecoration: 'underline' }}
              >
                플레이북
              </Link>
              에서 확인하세요.
            </li>
          </ul>
        </article>
      </section>
    </div>
  )
}
