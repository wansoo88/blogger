# 의사결정 기록 (docs/decisions.md)
# 참조 방법: @docs/decisions.md
# ADR: Architecture Decision Record

## 작성 규칙
- DB 스키마 변경 시 반드시 ADR 추가
- 기술 스택 변경 시 반드시 ADR 추가
- 각 ADR은 번호 순서대로 추가

## ADR 템플릿
```
### ADR-[번호]: [제목]
- **날짜**: YYYY-MM-DD
- **상태**: 채택 | 검토중 | 폐기
- **결정**: 무엇을 결정했는가
- **이유**: 왜 이 결정을 했는가
- **대안**: 검토한 다른 옵션들
- **결과**: 이 결정의 영향 및 트레이드오프
```

---

## 채택된 의사결정

### ADR-001: Next.js App Router 선택
- **날짜**: 2025-01-01
- **상태**: 채택
- **결정**: Pages Router 대신 App Router 사용
- **이유**: Server Components 성능 최적화, React 18 최신 기능 활용, 미래 지향적 구조
- **대안**: Pages Router (더 많은 레퍼런스, 안정적)
- **결과**: Server/Client Component 구분 필요, 초기 학습 비용 있으나 장기적으로 유리

### ADR-002: Prisma ORM 선택
- **날짜**: 2025-01-01
- **상태**: 채택
- **결정**: 직접 SQL 대신 Prisma ORM 사용
- **이유**: TypeScript 타입 안전성, 마이그레이션 자동 관리, 우수한 DX
- **대안**: Drizzle ORM (더 가벼움), 직접 SQL (유연하지만 타입 없음)
- **결과**: 스키마 변경 시 마이그레이션 필수, 복잡한 쿼리는 raw SQL 사용

### ADR-003: NextAuth.js v5 선택
- **날짜**: 2025-01-01
- **상태**: 채택
- **결정**: 인증에 NextAuth.js v5 (Auth.js) 사용
- **이유**: Next.js 공식 통합, 소셜 로그인 지원, Edge Runtime 호환
- **대안**: Clerk (설정 간단하지만 유료), 직접 JWT 구현 (복잡)
- **결과**: 설정 복잡도 있으나 유연성 높음

### ADR-004: Zustand 상태관리 선택
- **날짜**: 2025-01-01
- **상태**: 채택
- **결정**: Redux 대신 Zustand 사용 (클라이언트 상태)
- **이유**: 보일러플레이트 최소화, 학습 곡선 낮음, TypeScript 친화적
- **대안**: Redux Toolkit (기능 많지만 복잡), Jotai (원자 단위 상태)
- **결과**: 간단한 전역 상태에 적합, 복잡한 상태는 TanStack Query 병행

### ADR-005: Blogger 운영용 로컬 DB로 SQLite 선택
- **날짜**: 2026-03-08
- **상태**: 채택
- **결정**: Blogger 운영 관리자 앱의 기본 저장소로 PostgreSQL 대신 SQLite 단일 파일 사용
- **이유**: 단일 사용자 운영, 로컬 중심 사용 패턴, 낮은 운영 비용, 백업 단순성, `.exe` 패키징 호환성
- **대안**: PostgreSQL (확장성 높지만 과함), Supabase/원격 DB (편리하지만 비용과 복잡도 증가), 파일 기반 JSON 저장소 (검색/상태 관리 취약)
- **결과**: 로컬 운영에는 단순하고 안정적이지만, 멀티유저 협업이나 고동시성 구조가 필요해지면 상위 DB로 이전 검토 필요

### ADR-006: 자동 품질 검수 시스템 도입
- **날짜**: 2026-03-09
- **상태**: 채택
- **결정**: AI 생성 초안에 7개 항목 자동 검수 적용, 70점 이상 자동 승인
- **이유**: 대량 발행 시 수동 검수 병목 해소, 애드센스 정책 위반 자동 차단, 일관된 품질 기준 유지
- **대안**: 전수 수동 검수 (시간 소모), 검수 없이 발행 (품질 위험)
- **결과**: 품질 통과 시 REVIEW 단계 건너뛰어 파이프라인 속도 향상, 미통과 시 수동 확인 유도

### ADR-007: Blogger OAuth Refresh Token 자동 갱신
- **날짜**: 2026-03-09
- **상태**: 채택
- **결정**: 정적 access token 대신 refresh token 기반 자동 갱신 도입
- **이유**: access token 1시간 만료로 운영 중단 위험, 자동화에 필수
- **대안**: 수동 토큰 갱신 (운영 부담), 서비스 계정 (Blogger API 미지원)
- **결과**: BLOGGER_REFRESH_TOKEN 설정 시 무중단 운영 가능, 미설정 시 기존 방식 폴백

### ADR-008: Post 모델에 metaDescription 필드 추가
- **날짜**: 2026-03-09
- **상태**: 채택
- **결정**: Post 테이블에 metaDescription 컬럼 추가, Gemini로 자동 생성
- **이유**: SEO 최적화에 메타 디스크립션 필수, 수동 작성 시 누락 위험
- **대안**: 초안 본문에서 첫 문장 추출 (품질 낮음), 수동 입력 (운영 부담)
- **결과**: 140-155자 최적 길이로 자동 생성, 키워드 자연 포함

### ADR-009: 수익화 데이터 레이어 확장 및 AdSense 연동
- **날짜**: 2026-04-16
- **상태**: 채택
- **결정**:
  - `MetricsSnapshot`에 `adImpressions`, `adClicks`, `adCtr`, `revenue`, `rpm`, `ecpm`, `pageRpm`, `periodStart`, `periodEnd`, `source` 필드 추가
  - `Post`에 `totalRevenue`, `lifetimeImpressions`, `lifetimeClicks`, `lastRevenueAt`, `refreshScore`, `needsRefresh` 추가
  - `Keyword`에 `estimatedCpc`, `competitionScore`, `estimatedVolume`, `revenueScore` 추가
  - 신규 모델 `AffiliateLink`, `AffiliateClick`
  - `AlertType`에 `REVENUE_DROP`, `LOW_RPM_POST`, `REFRESH_CANDIDATE` 추가
  - `lib/integrations/adsense.ts`: AdSense Management API v2 연동 (refresh token + PAGE_URL 기준 PAGE_VIEWS_RPM/ESTIMATED_EARNINGS 수집)
- **이유**: 기존 `MetricsSnapshot`은 노출/클릭만 추적하여 실제 수익 지표(RPM, 수익금액) 반영 불가. 수익 기반 의사결정(고수익 카테고리 우선 생산, 저수익 글 리프레시, 제휴 링크 전환 추적)이 설계 당시부터 공백이었음.
- **대안**:
  - Google Analytics 4에서만 간접 추정 (정확도 낮음)
  - 수익 필드 제외하고 운영자가 스프레드시트 병행 관리 (자동화 불가)
- **결과**:
  - AdSense 승인 후 자동으로 URL별 수익 동기화 가능
  - 키워드 생산 우선순위에 수익성 반영 가능 (ADR-010)
  - 제휴 수익원 다각화 기반 마련
  - 미승인 상태에서도 `recordManualRevenue`로 수동 입력 가능

### ADR-010: 수익성 기반 키워드 우선순위 재설계
- **날짜**: 2026-04-16
- **상태**: 채택
- **결정**:
  - `computeKeywordRevenueScore(keyword)` = `priority` × `intentMultiplier` × `cpc` × `(1 - competition)` × `log10(volume + 10)`
  - intent 가중치: `transactional`=1.6, `commercial`=1.4, `informational`=1.0, `navigational`=0.6
  - 카테고리별 기본 CPC 프리셋: `MONEY_SAVING`($2.5), `AI_PRODUCTIVITY`($1.8), `DIGITAL_HOWTO`($1.2), `WORK_TIPS`($0.9), 기타($0.7)
  - 키워드 생성 시 `estimatedCpc` 미입력이면 카테고리 프리셋 자동 적용
  - 키워드 큐 기본 정렬을 `revenueScore` 내림차순으로 변경
- **이유**: 현행은 `priority` 1~5 정수만 사용하여 "고수익 저경쟁 키워드"가 "저수익 고경쟁 키워드"보다 뒤로 밀릴 수 있음. AdSense RPM은 키워드 의도/CPC에 크게 좌우되므로 우선순위에 반영 필수.
- **대안**:
  - 외부 SEO 도구(Ahrefs, SEMrush) 자동 연동 (비용)
  - 발행 후 실제 RPM만으로 재학습 (초기 데이터 부족)
- **결과**: 수동 입력 + 카테고리 프리셋 하이브리드로 초기 운영 가능, 실제 RPM 데이터 축적 후 알고리즘 재조정 여지.

### ADR-011: 제휴 마케팅(Affiliate) 수익원 다각화 도입
- **날짜**: 2026-04-16
- **상태**: 채택
- **결정**:
  - `AffiliateLink` 모델 (라벨, 머천트, 대상 URL, trackingSlug, 커미션율, 예상 페이아웃, 카테고리, 활성 여부, 집계 카운터)
  - `AffiliateClick` 모델 (클릭 로그, referer, userAgent, country, 전환 여부, payout)
  - `/api/affiliate/redirect/[slug]` 라우트: 클릭 집계 후 302 리다이렉트
  - 로컬 단축 링크는 Blogger 본문에 삽입 가능 형태로 노출
- **이유**: AdSense 단일 수익원 의존은 정책 위반 1회로 수익 전멸 위험. 제품 리뷰/비교 카테고리는 Affiliate CVR이 AdSense RPM보다 5~10배 높은 경우가 많음.
- **대안**:
  - Amazon/쿠팡 단축 링크를 본문에 직접 삽입 (클릭 추적 불가)
  - 별도 외부 추적 서비스 사용 (비용, 의존성)
- **결과**: 로컬 DB에서 클릭/전환 로깅, 리다이렉트 후 머천트 URL로 302, 글별 수익 합산 가능.

### ADR-012: 저수익 글 자동 리프레시 추천 로직
- **날짜**: 2026-04-16
- **상태**: 채택
- **결정**:
  - `refreshScore = w1·(ageDays/30) + w2·(impressions/100) - w3·(revenue*10) - w4·(ctr*100)`
  - 조건: 발행 30일 경과 + 노출 100회 이상 + 수익 $1 미만 → 리프레시 후보
  - 후보 글은 `needsRefresh = true` + `REFRESH_CANDIDATE` 알림 발생
  - 대시보드에서 일괄 조회/상태 변경 가능
- **이유**: 저수익 글이 지속 누적되면 사이트 전체 품질 신호 약화. 수동 모니터링은 30개 이상부터 병목.
- **대안**: 모든 글 90일 주기 리프레시 (비효율), 수동 선별 (확장성 부족)
- **결과**: 자동으로 재작성 후보 풀이 만들어지고, 운영자는 상위 몇 개만 실행하면 됨.

---
<!-- 새로운 ADR은 이 아래에 추가 -->
