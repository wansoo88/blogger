import { Category } from '@prisma/client'
import { db } from '@/lib/db'
import {
  createAffiliateLinkAction,
  deleteAffiliateLinkAction,
  markAffiliateConversionAction,
  toggleAffiliateLinkAction,
} from '@/app/actions'
import { listAffiliateLinks } from '@/lib/services/affiliate-service'
import { CATEGORY_LABELS_KO } from '@/lib/services/keyword-score-service'
import { formatUSD } from '@/lib/services/revenue-service'

export default async function AffiliatePage() {
  const links = await listAffiliateLinks()
  const publishedPosts = await db.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true },
    orderBy: { publishedAt: 'desc' },
    take: 200,
  })
  const recentClicks = await db.affiliateClick.findMany({
    orderBy: { clickedAt: 'desc' },
    take: 20,
    include: {
      affiliateLink: { select: { label: true, merchant: true } },
    },
  })

  return (
    <div className="section-stack">
      <section className="grid grid-2">
        <article className="panel">
          <p className="label">제휴 링크 추가</p>
          <form action={createAffiliateLinkAction} className="form-grid">
            <input
              className="input"
              name="label"
              placeholder="라벨 예: Notion AI 무료 체험"
              required
            />
            <div className="grid grid-2">
              <input
                className="input"
                name="merchant"
                placeholder="머천트 예: Notion"
                required
              />
              <select
                className="input"
                name="category"
                defaultValue={Category.AI_PRODUCTIVITY}
              >
                {Object.values(Category).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS_KO[c] ?? c}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="input"
              name="targetUrl"
              type="url"
              placeholder="https://www.merchant.com/?ref=yourid"
              required
            />
            <div className="grid grid-2">
              <input
                className="input"
                name="trackingSlug"
                placeholder="추적 슬러그 (선택) 예: notion-ai"
              />
              <select className="input" name="postId" defaultValue="">
                <option value="">연결 글 없음</option>
                {publishedPosts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-2">
              <input
                className="input"
                name="commissionRate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="커미션율 (0~1) 예: 0.2"
              />
              <input
                className="input"
                name="expectedPayout"
                type="number"
                step="0.01"
                min="0"
                placeholder="예상 건당 수익 USD"
              />
            </div>
            <textarea
              className="input textarea"
              name="notes"
              placeholder="메모 (선택)"
            />
            <button className="button-link primary" type="submit">
              제휴 링크 저장
            </button>
          </form>
        </article>

        <article className="panel">
          <p className="label">사용법</p>
          <ul className="list">
            <li>등록 후 <code className="code-inline">/api/affiliate/redirect/{'<슬러그>'}</code> 경로로 접근하면 클릭이 집계되고 대상 URL로 302 리다이렉트됩니다.</li>
            <li>Blogger 본문에는 짧은 앵커 텍스트 + 추적 링크를 삽입하세요.</li>
            <li>실제 페이아웃이 확정되면 아래 <strong>최근 클릭 로그</strong>에서 &quot;전환 처리&quot; 버튼으로 금액을 기록합니다.</li>
            <li>전환 처리된 수익은 해당 글의 <code className="code-inline">totalRevenue</code>에 자동 합산됩니다.</li>
          </ul>
        </article>
      </section>

      <section className="panel">
        <p className="label">등록된 제휴 링크 ({links.length}개)</p>
        {links.length === 0 ? (
          <p className="small-note">
            아직 등록된 제휴 링크가 없습니다. 위 폼에서 첫 링크를 추가하세요.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>라벨 / 머천트</th>
                  <th>카테고리</th>
                  <th>추적 URL</th>
                  <th>클릭 / 전환</th>
                  <th>수익</th>
                  <th>상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <strong>{link.label}</strong>
                      <div className="small-note">{link.merchant}</div>
                      {link.post ? (
                        <div className="small-note">
                          → {link.post.title}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {CATEGORY_LABELS_KO[link.category] ?? link.category}
                    </td>
                    <td>
                      <code className="code-inline">
                        /api/affiliate/redirect/{link.trackingSlug}
                      </code>
                    </td>
                    <td>
                      {link.clickCount} / {link.conversionCount}
                      <div className="small-note">
                        전환율{' '}
                        {link.clickCount > 0
                          ? ((link.conversionCount / link.clickCount) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </div>
                    </td>
                    <td>{formatUSD(link.totalRevenue)}</td>
                    <td>
                      <span
                        className="badge"
                        style={
                          link.isActive
                            ? {
                                background: 'rgba(15,118,110,0.1)',
                                color: 'var(--accent)',
                              }
                            : { background: 'var(--line)', color: 'var(--muted)' }
                        }
                      >
                        {link.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
                      >
                        <form action={toggleAffiliateLinkAction}>
                          <input type="hidden" name="id" value={link.id} />
                          <button className="button-link" type="submit">
                            {link.isActive ? '비활성화' : '활성화'}
                          </button>
                        </form>
                        <form action={deleteAffiliateLinkAction}>
                          <input type="hidden" name="id" value={link.id} />
                          <button className="button-link" type="submit">
                            삭제
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <p className="label">최근 클릭 로그 (최근 20건)</p>
        {recentClicks.length === 0 ? (
          <p className="small-note">아직 클릭 로그가 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>시각</th>
                  <th>링크</th>
                  <th>Referer</th>
                  <th>국가</th>
                  <th>상태</th>
                  <th>전환 기록</th>
                </tr>
              </thead>
              <tbody>
                {recentClicks.map((click) => (
                  <tr key={click.id}>
                    <td className="small-note">
                      {new Date(click.clickedAt).toLocaleString('ko-KR')}
                    </td>
                    <td>
                      {click.affiliateLink.label}
                      <div className="small-note">
                        {click.affiliateLink.merchant}
                      </div>
                    </td>
                    <td className="small-note">{click.referer ?? '-'}</td>
                    <td className="small-note">{click.country ?? '-'}</td>
                    <td>
                      {click.converted ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(15,118,110,0.1)',
                            color: 'var(--accent)',
                          }}
                        >
                          전환 {formatUSD(click.payout ?? 0)}
                        </span>
                      ) : (
                        <span className="badge badge-warn">대기</span>
                      )}
                    </td>
                    <td>
                      {click.converted ? null : (
                        <form
                          action={markAffiliateConversionAction}
                          className="inline-form"
                        >
                          <input type="hidden" name="clickId" value={click.id} />
                          <input
                            className="input"
                            style={{ width: 100, padding: 6 }}
                            name="payout"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="USD"
                            required
                          />
                          <button className="button-link" type="submit">
                            전환 기록
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
