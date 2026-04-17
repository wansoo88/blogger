import Link from "next/link";

const navGroups = [
  {
    label: "운영",
    items: [
      { href: "/dashboard", label: "개요" },
      { href: "/dashboard/progress", label: "진행 현황" },
      { href: "/dashboard/keywords", label: "키워드" },
      { href: "/dashboard/pipeline", label: "파이프라인" },
      { href: "/dashboard/review", label: "검수" },
      { href: "/dashboard/publish", label: "발행" },
    ],
  },
  {
    label: "수익화",
    items: [
      { href: "/dashboard/revenue", label: "수익" },
      { href: "/dashboard/affiliate", label: "제휴 링크" },
      { href: "/dashboard/refresh", label: "리프레시 후보" },
      { href: "/dashboard/monitor", label: "SEO 모니터" },
    ],
  },
  {
    label: "시스템",
    items: [
      { href: "/dashboard/notifications", label: "알림" },
      { href: "/dashboard/settings", label: "설정" },
      { href: "/dashboard/playbook", label: "플레이북" },
    ],
  },
];

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="page-shell">
      <div className="container section-stack">
        <section className="hero">
          <p className="label">Blogger 운영 콘솔</p>
          <div className="topbar">
            <div>
              <h1 style={{ marginBottom: 8 }}>자동화 콘텐츠 워크플로우</h1>
              <p style={{ margin: 0 }}>
                키워드 관리 · Gemini 초안 생성 · 검수 · 예약 발행 · 수익 모니터링을
                한 화면에서 처리합니다.
              </p>
            </div>
            <div className="actions">
              <Link className="button-link" href="/">
                홈
              </Link>
            </div>
          </div>
          <div className="nav-groups">
            {navGroups.map((group) => (
              <div key={group.label} className="nav-group">
                <span className="nav-group-label">{group.label}</span>
                <nav className="nav-strip">
                  {group.items.map((link) => (
                    <Link
                      key={link.href}
                      className="nav-pill"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}
