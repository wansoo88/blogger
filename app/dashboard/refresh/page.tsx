import Link from 'next/link'
import { recomputeRefreshScoresAction, updatePostStatusAction } from '@/app/actions'
import { listRefreshCandidates } from '@/lib/services/revenue-service'
import { formatUSD } from '@/lib/services/revenue-service'
import { CATEGORY_LABELS_KO } from '@/lib/services/keyword-score-service'

export default async function RefreshPage() {
  const candidates = await listRefreshCandidates(30)

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="topbar">
          <div>
            <p className="label">리프레시 후보 분석</p>
            <p style={{ margin: 0 }}>
              발행 30일 이상 + 노출 100회 이상 + 누적 수익 $1 미만인 글을 자동으로 선별합니다.
            </p>
          </div>
          <form action={recomputeRefreshScoresAction}>
            <button className="button-link primary" type="submit">
              리프레시 점수 재계산
            </button>
          </form>
        </div>
      </section>

      <section className="panel">
        <p className="label">리프레시 후보 ({candidates.length}개)</p>
        {candidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p className="small-note" style={{ marginBottom: 12 }}>
              현재 리프레시가 필요한 글이 없습니다.
            </p>
            <p className="small-note">
              상단 &quot;리프레시 점수 재계산&quot; 버튼을 눌러 평가를 실행하세요.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>제목</th>
                  <th>카테고리</th>
                  <th>발행 경과</th>
                  <th>최근 노출</th>
                  <th>누적 수익</th>
                  <th>리프레시 점수</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((post) => {
                  const latest = post.metricSnapshots[0]
                  const ageDays = post.publishedAt
                    ? Math.floor(
                        (Date.now() - new Date(post.publishedAt).getTime()) /
                          (24 * 60 * 60 * 1000),
                      )
                    : 0
                  return (
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
                      <td className="small-note">
                        {CATEGORY_LABELS_KO[post.category] ?? post.category}
                      </td>
                      <td>{ageDays}일</td>
                      <td>{(latest?.impressions ?? 0).toLocaleString()}</td>
                      <td>{formatUSD(post.totalRevenue)}</td>
                      <td>
                        <span className="badge badge-warn">
                          {post.refreshScore?.toFixed(1) ?? '-'}
                        </span>
                      </td>
                      <td>
                        <form
                          action={updatePostStatusAction}
                          className="inline-form"
                        >
                          <input type="hidden" name="postId" value={post.id} />
                          <input type="hidden" name="status" value="REFRESH" />
                          <button className="button-link" type="submit">
                            REFRESH 상태로 변경
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <p className="label">리프레시 체크리스트</p>
        <ul className="list">
          <li>상위 점수 3~5개만 선택 — 대량 재작성은 품질 저하 유발.</li>
          <li>제목/H2를 고쇼 의도(comparison, best, vs, review)로 재구성.</li>
          <li>CTA 재배치: 첫 스크롤 내 광고 1개 + 결론부 제휴 링크.</li>
          <li>업데이트 날짜 본문 표기 ({new Date().getFullYear()}년 최신).</li>
          <li>Search Console에서 페이지 색인 재요청.</li>
        </ul>
        <Link className="button-link" href="/dashboard/pipeline">
          파이프라인에서 REFRESH 상태 글 확인
        </Link>
      </section>
    </div>
  )
}
