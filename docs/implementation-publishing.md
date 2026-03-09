# 발행 자동화 구현

## 파일 위치

- `lib/services/scheduler-service.ts` - 스케줄링 로직
- `lib/integrations/blogger.ts` - Blogger API 연동
- `app/actions.ts` - 서버 액션

## 발행 간격 자동화

### 규칙
- 하루 최대 2건 발행
- US Eastern 피크 시간대 기준: 8, 9, 10, 11, 14, 15, 16시
- 기존 예약 스케줄과 충돌하지 않도록 자동 배분

### 동작
1. `autoScheduleApprovedPosts()` 호출
2. APPROVED 상태의 모든 글을 조회
3. 기존 PublishJob 일정 확인
4. 일별 2건 한도 내에서 피크 시간에 배정
5. PublishJob 생성 + Post를 SCHEDULED 상태로 전환

### 사용
- Playbook 페이지의 "Auto-schedule all approved posts" 버튼
- 또는 `autoScheduleAction()` 서버 액션 직접 호출

## Blogger OAuth Refresh Token

### 기존 방식 (단기 토큰)
- `BLOGGER_ACCESS_TOKEN` 환경변수로 정적 토큰 사용
- 1시간 후 만료, 수동 갱신 필요

### 개선 방식 (자동 갱신)
- `BLOGGER_REFRESH_TOKEN` + `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` 설정
- 매 API 호출 시 자동으로 access token 갱신
- refresh token이 없으면 기존 정적 토큰으로 폴백

### 설정 방법
1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
2. Blogger API 사용 설정
3. OAuth 동의 화면 설정
4. Refresh token 획득 (OAuth Playground 등 사용)
5. .env.local에 3개 변수 설정

## HTML 변환 강화

### 기존
- 기본 마크다운 변환 (H1/H2/H3, 목록, 문단)

### 개선
- 순서 있는 목록 (`1.` 패턴) -> `<ol>` 변환
- 인라인 포맷팅: **볼드**, *이탤릭*, `코드`, [링크](url)
- HTML 이스케이프 처리 (XSS 방지)
- 이모지 자동 제거
- FAQ 구조화 데이터 자동 삽입

## 필수 페이지 생성

### 대상 페이지
- About
- Contact Us
- Privacy Policy
- Disclaimer

### 사용
- Playbook 페이지에서 각 페이지별 생성 버튼 클릭
- Blogger Pages API로 직접 생성
- 애드센스 신청 전 반드시 생성 필요

## 카테고리 분배 조회

- `getCategoryDistribution()` 함수로 파이프라인 내 카테고리별 분포 확인
- 특정 카테고리 편중 방지용
