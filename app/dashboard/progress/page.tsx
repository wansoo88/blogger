import { getProgressStats } from '@/lib/services/post-service'
import { getCurrentWeeklyQuota } from '@/lib/services/quota-service'
import { CATEGORY_LABELS_KO } from '@/lib/services/keyword-score-service'
import { Category } from '@prisma/client'

const STATUS_LABELS_KO: Record<string, string> = {
  IDEA: '아이디어',
  QUEUED: '큐 대기',
  DRAFTED: '초안',
  REVIEW: '검수',
  APPROVED: '승인',
  SCHEDULED: '예약',
  PUBLISHED: '발행',
  REFRESH: '리프레시',
  ARCHIVED: '아카이브',
}

function ProgressBar({
  current,
  target,
  label,
}: {
  current: number
  target: number
  label: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span className="small-note">{label}</span>
        <span className="small-note">
          {current} / {target} ({pct}%)
        </span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 5,
          background: 'var(--line)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 5,
            background:
              pct >= 100
                ? 'var(--accent)'
                : pct >= 60
                  ? '#b54708'
                  : 'var(--danger)',
            transition: 'width 0.3s',
          }}
        />
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
          <p className="label">오늘</p>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div className="metric">{stats.today.drafted}</div>
              <p>초안 생성</p>
            </div>
            <div>
              <div className="metric">{stats.today.published}</div>
              <p>발행</p>
            </div>
          </div>
        </article>
        <article className="panel">
          <p className="label">이번 주</p>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div className="metric">{stats.week.drafted}</div>
              <p>초안</p>
            </div>
            <div>
              <div className="metric">{stats.week.approved}</div>
              <p>승인</p>
            </div>
            <div>
              <div className="metric">{stats.week.published}</div>
              <p>발행</p>
            </div>
          </div>
        </article>
      </section>

      {quota ? (
        <section className="panel">
          <p className="label">주간 할당량 진행 — {quota.isoWeek}</p>
          <ProgressBar
            current={quota.stats?.draftCount ?? 0}
            target={quota.targetDrafts}
            label="초안"
          />
          <ProgressBar
            current={quota.stats?.reviewCount ?? 0}
            target={quota.targetReviews}
            label="검수"
          />
          <ProgressBar
            current={quota.stats?.publishedCount ?? 0}
            target={quota.targetPublishes}
            label="발행"
          />
        </section>
      ) : (
        <section className="panel">
          <p className="label">주간 할당량</p>
          <p>
            아직 할당량이 설정되지 않았습니다. 할당량 API에서 먼저 생성하세요.
          </p>
        </section>
      )}

      <section className="grid grid-2">
        <article className="panel">
          <p className="label">전체 합계</p>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                <tr>
                  <td>누적 발행</td>
                  <td>
                    <strong>{stats.totals.published}</strong>
                  </td>
                </tr>
                <tr>
                  <td>초안 이상</td>
                  <td>
                    <strong>{stats.totals.drafted}</strong>
                  </td>
                </tr>
                <tr>
                  <td>큐 대기</td>
                  <td>
                    <strong>{stats.totals.queued}</strong>
                  </td>
                </tr>
                <tr>
                  <td>등록 키워드</td>
                  <td>
                    <strong>{stats.totals.keywords}</strong>
                  </td>
                </tr>
                <tr>
                  <td>평균 품질 점수</td>
                  <td>
                    <strong>{stats.totals.avgScore}/100</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <p className="label">카테고리 분포</p>
          {stats.categoryBreakdown.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>카테고리</th>
                    <th>글 수</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.categoryBreakdown.map((c) => (
                    <tr key={c.category}>
                      <td>{CATEGORY_LABELS_KO[c.category as Category] ?? c.category}</td>
                      <td>{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="small-note">아직 글이 없습니다.</p>
          )}
        </article>
      </section>

      <section className="panel">
        <p className="label">파이프라인 상태</p>
        {stats.statusBreakdown.length > 0 ? (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {stats.statusBreakdown.map((s) => (
              <div
                key={s.status}
                className="panel"
                style={{ textAlign: 'center', minWidth: 100 }}
              >
                <div className="metric" style={{ fontSize: 24 }}>
                  {s.count}
                </div>
                <p className="small-note">
                  {STATUS_LABELS_KO[s.status] ?? s.status}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="small-note">파이프라인에 글이 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <p className="label">최근 활동</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>제목</th>
                <th>상태</th>
                <th>카테고리</th>
                <th>점수</th>
                <th>단어수</th>
                <th>수정</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPosts.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="small-note" style={{ textAlign: 'center', padding: '16px 0' }}>
                      아직 활동이 없습니다.
                    </div>
                  </td>
                </tr>
              ) : (
                stats.recentPosts.map((post) => (
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
                      <span
                        className={
                          post.status === 'PUBLISHED'
                            ? 'badge'
                            : post.status === 'REVIEW'
                              ? 'badge badge-warn'
                              : 'badge'
                        }
                        style={
                          post.status === 'PUBLISHED'
                            ? {
                                background: 'rgba(15,118,110,0.1)',
                                color: 'var(--accent)',
                              }
                            : undefined
                        }
                      >
                        {STATUS_LABELS_KO[post.status] ?? post.status}
                      </span>
                    </td>
                    <td className="small-note">
                      {CATEGORY_LABELS_KO[post.category as Category] ?? post.category}
                    </td>
                    <td>{post.aiScore ?? '-'}</td>
                    <td>{post.wordCount || '-'}</td>
                    <td className="small-note">
                      {new Date(post.updatedAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
