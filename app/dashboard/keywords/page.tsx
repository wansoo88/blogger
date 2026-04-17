import { Category, Country } from "@prisma/client";
import {
  createKeywordAction,
  createPostFromKeywordAction,
  recomputeKeywordScoresAction,
  seedPipelineAction,
} from "@/app/actions";
import { listKeywords } from "@/lib/services/keyword-service";
import {
  CATEGORY_CPC_PRESETS,
  CATEGORY_LABELS_KO,
} from "@/lib/services/keyword-score-service";

const COUNTRY_LABELS: Record<Country, string> = {
  US: "미국",
  UK: "영국",
  CA: "캐나다",
  AU: "호주",
  SG: "싱가포르",
};

const STATUS_LABELS: Record<string, string> = {
  IDEA: "아이디어",
  QUEUED: "큐 대기",
  ASSIGNED: "할당됨",
  DRAFTED: "초안 완료",
  DROPPED: "폐기",
};

export default async function KeywordsPage() {
  const keywords = await listKeywords();

  return (
    <div className="section-stack">
      <section className="grid grid-2">
        <article className="panel">
          <p className="label">키워드 추가</p>
          <form action={createKeywordAction} className="form-grid">
            <input
              className="input"
              name="keyword"
              placeholder="예: best free ai tools for office workers"
              required
            />
            <div className="grid grid-2">
              <select
                className="input"
                name="category"
                defaultValue={Category.AI_PRODUCTIVITY}
              >
                {Object.values(Category).map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS_KO[category] ?? category}
                  </option>
                ))}
              </select>
              <select
                className="input"
                name="country"
                defaultValue={Country.US}
              >
                {Object.values(Country).map((country) => (
                  <option key={country} value={country}>
                    {COUNTRY_LABELS[country] ?? country}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-2">
              <select
                className="input"
                name="intent"
                defaultValue="informational"
              >
                <option value="informational">정보성 (informational)</option>
                <option value="commercial">상업성 (commercial)</option>
                <option value="transactional">거래성 (transactional)</option>
                <option value="navigational">탐색성 (navigational)</option>
              </select>
              <input
                className="input"
                name="priority"
                type="number"
                min="1"
                max="5"
                defaultValue="3"
                title="우선순위 (1~5)"
                placeholder="우선순위 1~5"
              />
            </div>
            <div className="grid grid-2">
              <input
                className="input"
                name="estimatedCpc"
                type="number"
                step="0.01"
                min="0"
                placeholder="예상 CPC USD (비워두면 카테고리 기본값)"
              />
              <input
                className="input"
                name="competitionScore"
                type="number"
                step="0.05"
                min="0"
                max="1"
                placeholder="경쟁도 0~1 (비워두면 기본값)"
              />
            </div>
            <input
              className="input"
              name="estimatedVolume"
              type="number"
              min="0"
              placeholder="월간 검색량 (선택)"
            />
            <textarea
              className="input textarea"
              name="notes"
              placeholder="메모나 집필 각도 (선택)"
            />
            <button className="button-link primary" type="submit">
              키워드 저장
            </button>
          </form>
        </article>

        <article className="panel">
          <p className="label">카테고리별 CPC 가이드</p>
          <p className="small-note">
            CPC가 비어있으면 아래 기본값으로 수익 점수를 계산합니다.
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>카테고리</th>
                  <th>기본 CPC</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(CATEGORY_CPC_PRESETS) as Category[]).map((c) => (
                  <tr key={c}>
                    <td>{CATEGORY_LABELS_KO[c] ?? c}</td>
                    <td>${CATEGORY_CPC_PRESETS[c].toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={recomputeKeywordScoresAction} style={{ marginTop: 12 }}>
            <button className="button-link" type="submit">
              전체 키워드 점수 재계산
            </button>
          </form>
          <form action={seedPipelineAction} style={{ marginTop: 8 }}>
            <button className="button-link" type="submit">
              키워드로 파이프라인 생성
            </button>
          </form>
        </article>
      </section>

      <section className="panel">
        <p className="label">
          키워드 큐 (수익 점수순, 총 {keywords.length}개)
        </p>
        {keywords.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p className="small-note" style={{ marginBottom: 8 }}>
              아직 등록된 키워드가 없습니다.
            </p>
            <p className="small-note">
              상단 폼에서 첫 키워드를 추가해보세요.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>키워드</th>
                  <th>카테고리</th>
                  <th>국가</th>
                  <th>의도</th>
                  <th>우선도</th>
                  <th>CPC</th>
                  <th>수익 점수</th>
                  <th>상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((keyword) => (
                  <tr key={keyword.id}>
                    <td>{keyword.keyword}</td>
                    <td className="small-note">
                      {CATEGORY_LABELS_KO[keyword.category] ?? keyword.category}
                    </td>
                    <td className="small-note">
                      {COUNTRY_LABELS[keyword.country] ?? keyword.country}
                    </td>
                    <td className="small-note">{keyword.intent}</td>
                    <td>{keyword.priority}</td>
                    <td>
                      {keyword.estimatedCpc
                        ? `$${keyword.estimatedCpc.toFixed(2)}`
                        : "-"}
                    </td>
                    <td>
                      <strong>
                        {keyword.revenueScore?.toFixed(2) ?? "-"}
                      </strong>
                    </td>
                    <td>
                      <span className="badge">
                        {STATUS_LABELS[keyword.status] ?? keyword.status}
                      </span>
                    </td>
                    <td>
                      {keyword.posts.length ? (
                        <span className="small-note">글 연결됨</span>
                      ) : (
                        <form action={createPostFromKeywordAction}>
                          <input
                            type="hidden"
                            name="keywordId"
                            value={keyword.id}
                          />
                          <button className="button-link" type="submit">
                            글 생성
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
  );
}
