# SEO 최적화 구현

## 구현된 항목

### 1. 메타 디스크립션 자동 생성

- **파일**: `lib/integrations/gemini.ts`
- Gemini API로 초안 생성 시 메타 디스크립션도 병렬 생성
- 140-155자, 키워드 포함, 능동태, 이모지 없음
- Post 테이블의 `metaDescription` 필드에 저장
- DB 마이그레이션: `add_meta_description_to_post`

### 2. 구조화 데이터 (FAQ Schema)

- **파일**: `lib/integrations/blogger.ts` (`buildFaqSchema`)
- 마크다운의 FAQ 섹션을 자동 파싱
- JSON-LD `FAQPage` 스키마 생성
- Blogger 발행 시 HTML 본문 끝에 `<script type="application/ld+json">` 삽입
- Google 검색 결과에서 FAQ 리치 스니펫 노출 가능

### 3. 내부 링크 자동 삽입

- **파일**: `lib/services/internal-link-service.ts`
- 같은 카테고리의 발행된 글 우선 연결
- 부족 시 다른 카테고리 글도 포함 (최대 3개)
- "Related Posts" 섹션으로 마크다운 끝에 추가
- `internalLinkCount` 필드 자동 업데이트

### 4. URL 슬러그

- 제목 기반 자동 생성: `{slugified-title}-{keyword-id-6자}`
- Blogger 발행 시 별도 permalink 미설정 (Blogger 자체 URL 사용)

### 5. 카테고리 라벨

- Blogger 발행 시 `labels` 배열로 카테고리 전달
- 카테고리별 토픽 사일로 구조 형성

## 미구현 항목 (2차 작업)

- Search Console 연동 (색인 확인, 노출/클릭 추적)
- GA4 트래픽 분석
- 제목 A/B 테스트
- 사이트맵 자동 제출
