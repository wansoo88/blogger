# 아키텍처 문서 (docs/architecture.md)
# 참조 방법: @docs/architecture.md

## 목표

이 프로젝트는 `https://mylifehack-daily.blogspot.com/`를 운영하기 위한 `로컬 관리자 웹앱`을 만드는 것을 목표로 한다.

- 최종 발행 채널: Blogger
- 운영 도구: 로컬 웹앱
- 운영 DB: SQLite 단일 파일
- 역할: 키워드 관리, 초안 생성, 검수 대기열, 예약 발행, 성과 모니터링
- 운영 제어: 주간 할당량 계산, 부족분 경고, 이메일 알림 발송

## 핵심 아키텍처

### 요약

- UI: Next.js App Router
- 서버 로직: Next.js Route Handlers + Server Actions
- ORM: Prisma
- 로컬 DB: SQLite
- 외부 연동: Blogger API, Search Console API, GA4 API(선택), SMTP 또는 Gmail API
- 배포 형태: 우선 `localhost` 웹앱, 필요 시 `.exe` 패키징

### 상위 구조

```text
[User]
  -> [Local Admin Web App]
  -> [Prisma Service Layer]
  -> [SQLite DB]
  -> [Blogger API / Search Console API / Email Provider]
```

### 설계 원칙

- 운영자는 1명이므로 멀티유저 인증은 우선순위가 낮다.
- 데이터는 네트워크 DB가 아니라 로컬 단일 DB 파일로 관리한다.
- 자동화는 초안 생성까지, 발행은 사람 승인 후 진행한다.
- Blogger 내부 상태보다 로컬 DB 상태를 기준으로 운영한다.
- 주간 할당량 미달은 DB에서 계산하고 이메일 알림으로 통지한다.

## 권장 디렉토리 구조

```text
project-root/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                  # 전체 현황 대시보드
│   │   ├── quotas/
│   │   │   └── page.tsx              # 주간 할당량/부족분
│   │   ├── keywords/
│   │   │   └── page.tsx              # 키워드 큐
│   │   ├── posts/
│   │   │   ├── page.tsx              # 글 목록
│   │   │   └── [id]/
│   │   │       └── page.tsx          # 글 상세/검수
│   │   ├── pipeline/
│   │   │   └── page.tsx              # 상태별 파이프라인 뷰
│   │   ├── publish/
│   │   │   └── page.tsx              # 예약 발행 큐
│   │   ├── notifications/
│   │   │   └── page.tsx              # 알림 채널/로그
│   │   ├── monitor/
│   │   │   └── page.tsx              # 색인/성과 모니터링
│   │   └── settings/
│   │       └── page.tsx              # API 키, 블로그 설정
│   ├── api/
│   │   ├── keywords/
│   │   ├── posts/
│   │   ├── quotas/
│   │   ├── publish/
│   │   ├── notifications/
│   │   ├── sync/
│   │   └── monitor/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard/
│   ├── quota/
│   ├── posts/
│   ├── pipeline/
│   ├── notifications/
│   └── ui/
├── lib/
│   ├── db.ts                         # Prisma client
│   ├── services/
│   │   ├── keyword-service.ts
│   │   ├── draft-service.ts
│   │   ├── review-service.ts
│   │   ├── publish-service.ts
│   │   ├── monitor-service.ts
│   │   ├── quota-service.ts
│   │   └── notification-service.ts
│   ├── integrations/
│   │   ├── blogger.ts
│   │   ├── search-console.ts
│   │   ├── ga4.ts
│   │   └── mailer.ts
│   ├── validators/
│   └── types/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── data/
│   ├── app.db                        # SQLite 파일
│   ├── imports/
│   ├── exports/
│   └── backups/
├── automation/
│   ├── prompts/
│   ├── templates/
│   ├── reports/
│   └── logs/
├── docs/
│   ├── architecture.md
│   ├── decisions.md
│   ├── blogger_webapp_spec.md
│   ├── dashboard_wireframes.md
│   └── content_calendar.md
└── plan.md
```

## 데이터 흐름

### 글 생성 흐름

```text
[Keyword]
  -> [AI outline generation]
  -> [AI draft generation]
  -> [Local DB save]
  -> [Human review]
  -> [Approved]
  -> [Scheduled publish]
  -> [Blogger post URL save]
```

### 성과 모니터링 흐름

```text
[Published post]
  -> [Search Console sync]
  -> [MetricsSnapshot save]
  -> [Dashboard alert calculation]
  -> [Refresh queue]
```

### 할당량/알림 흐름

```text
[WeeklyQuota]
  -> [WeeklyStat calculation]
  -> [Alert creation]
  -> [NotificationLog queue]
  -> [Email send to kimcomplete8888@gmail.com]
```

## SQLite 선택 이유

### 왜 SQLite인가

- 운영자가 1명이고 로컬 중심 작업이다.
- 별도 DB 서버 관리가 필요 없다.
- 백업이 단순하다.
- `.exe` 패키징 시 함께 배포하기 쉽다.
- 검수/발행/모니터링 규모가 크지 않아 성능상 충분하다.

### DB 파일 위치

- 기본 경로: `data/app.db`
- 백업 경로: `data/backups/app-YYYY-MM-DD.db`

### 운영 원칙

- SQLite를 단일 진실 공급원으로 사용한다.
- Blogger는 발행 채널이지 운영 상태 저장소가 아니다.
- 삭제보다 상태 변경을 우선한다.

## 권장 도메인 모델

### Keyword

- `id`
- `keyword`
- `category`
- `country`
- `intent`
- `priority`
- `status`
- `assignedWeek`
- `createdAt`

### Post

- `id`
- `keywordId`
- `title`
- `slug`
- `category`
- `status`
- `assignedWeek`
- `targetPublishDate`
- `draftMarkdown`
- `reviewNotes`
- `approvedAt`
- `publishedAt`
- `bloggerPostId`
- `bloggerUrl`

### WeeklyQuota

- `id`
- `isoWeek`
- `targetDrafts`
- `targetReviews`
- `targetPublishes`
- `targetPages`

### WeeklyStat

- `id`
- `weeklyQuotaId`
- `draftCount`
- `reviewCount`
- `approvedCount`
- `publishedCount`
- `missingDrafts`
- `missingPublishes`
- `lastCalculatedAt`

### PublishJob

- `id`
- `postId`
- `scheduledFor`
- `status`
- `attemptCount`
- `lastError`

### MetricsSnapshot

- `id`
- `postId`
- `capturedAt`
- `impressions`
- `clicks`
- `ctr`
- `position`
- `indexed`

### Alert

- `id`
- `type`
- `severity`
- `message`
- `status`
- `weeklyQuotaId`
- `postId`
- `createdAt`

### NotificationChannel

- `id`
- `type`
- `target`
- `isEnabled`

### NotificationRule

- `id`
- `channelId`
- `event`
- `sendImmediately`
- `dailyDigestHour`
- `weeklyDigestIsoDay`

### NotificationLog

- `id`
- `channelId`
- `alertId`
- `event`
- `subject`
- `status`
- `sentAt`

## 화면별 책임

### Dashboard

- 이번 주 목표 대비 발행 수
- 승인 대기 글 수
- 미색인 글 수
- 리프레시 필요 글 수
- 마지막 알림 메일 발송 결과

### Quotas

- 주간 목표 생성
- 부족분 계산
- 할당 글 목록 관리

### Keywords

- 키워드 큐 등록
- 우선순위 조정
- 카테고리 배분

### Posts

- 초안 생성
- 초안 수정
- 검수 노트 기록

### Pipeline

- `idea -> queued -> drafted -> review -> approved -> scheduled -> published -> refresh`

### Publish

- 예약 발행 큐
- Blogger 발행 결과
- 실패 재시도

### Monitor

- Search Console 데이터 동기화
- 노출/클릭 없는 글 탐지
- 제목 교체 후보 추적

### Notification Center

- 알림 채널 관리
- 메일 이벤트 설정
- 발송 로그 확인

## 서비스 계층 원칙

- API Route는 얇게 유지한다.
- 비즈니스 규칙은 `lib/services`에 둔다.
- Blogger API 호출은 `lib/integrations/blogger.ts`에서만 처리한다.
- Search Console 수집도 통합 레이어를 통해서만 처리한다.
- 이메일 발송은 `lib/integrations/mailer.ts`를 통해서만 처리한다.
- 주간 할당량 계산은 `quota-service.ts`가 담당한다.

## 확장 방향

### 1차

- 로컬 웹앱 + SQLite + Blogger 수동/반자동 발행
- 주간 할당량 집계
- 메일 알림 로그 저장

### 2차

- Search Console 자동 동기화
- 리프레시 추천 로직
- 템플릿 기반 반자동 리라이트
- 주간 부족분 메일 자동 발송

### 3차

- Electron 또는 Tauri 기반 `.exe` 패키징
- 로컬 알림
- 주간 자동 백업
