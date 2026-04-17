import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="container">
        <section className="hero">
          <p className="label">Blogger 로컬 관리자</p>
          <h1>콘텐츠 파이프라인 · 주간 할당량 · 수익 모니터링</h1>
          <p>
            Gemini 초안 생성, 수동 검수, 예약 발행, 주간 할당량 관리, 이메일 알림,
            AdSense·제휴 수익 집계를 한 앱에서 처리합니다.
          </p>
          <div className="actions">
            <Link className="button-link primary" href="/dashboard">
              대시보드 열기
            </Link>
            <Link className="button-link" href="/dashboard/revenue">
              수익 대시보드
            </Link>
            <Link className="button-link" href="/guide">
              사용 가이드
            </Link>
          </div>
        </section>
        <section className="grid grid-2" style={{ marginTop: 24 }}>
          <article className="panel accent-panel">
            <p className="label">자동화</p>
            <h2>웹 기반 콘텐츠 워크플로우</h2>
            <p>
              키워드 등록 → Gemini 초안 → 자동 품질 검수 → 승인 → 예약 발행까지
              같은 앱에서 처리합니다.
            </p>
          </article>
          <article className="panel">
            <p className="label">수익화</p>
            <h2>AdSense + 제휴 + 리프레시</h2>
            <ul className="list">
              <li>AdSense API 연동으로 글별 수익(RPM) 자동 수집.</li>
              <li>제휴 링크 클릭/전환 추적, 글별 수익 합산.</li>
              <li>저수익 장기 노출 글을 자동으로 리프레시 후보로 선별.</li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
