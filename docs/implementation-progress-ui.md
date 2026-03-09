# 진척사항 및 가이드 UI

## 파일 위치

- `app/dashboard/progress/page.tsx` - 데일리/위클리 진척사항
- `app/dashboard/playbook/page.tsx` - 종합 운영 가이드

## Progress 페이지

### 경로
`/dashboard/progress`

### 표시 내용

1. **오늘 현황**: 오늘 드래프트 수, 오늘 발행 수
2. **이번 주 현황**: 이번 주 드래프트/승인/발행 수
3. **주간 할당량 프로그레스 바**: 드래프트/리뷰/발행 목표 대비 진행률
   - 100% 이상: 초록색 (accent)
   - 60-99%: 주황색 (warn)
   - 60% 미만: 빨간색 (danger)
4. **전체 누적 통계**: 총 발행, 총 드래프트, 대기열, 키워드 수, 평균 품질 점수
5. **카테고리 분포**: 카테고리별 글 수
6. **파이프라인 상태**: 상태별 글 수 (QUEUED, DRAFTED, REVIEW, APPROVED 등)
7. **최근 활동 로그**: 최근 20건의 글 업데이트 이력

### 데이터 소스
- `getProgressStats()` in `lib/services/post-service.ts`
- `getCurrentWeeklyQuota()` in `lib/services/quota-service.ts`

## Playbook 페이지

### 경로
`/dashboard/playbook`

### 섹션 구성

1. **Getting started** - Google Cloud 프로젝트 설정, API 키 설정 방법
2. **AdSense approval checklist** - 승인 요건, 필수 페이지 생성 버튼 포함
3. **Content strategy** - Phase 1/2/3 발행 전략, 카테고리 분배
4. **Quality standards** - 자동 검수 7개 항목 설명, 통과 기준
5. **SEO checklist** - 키워드, 메타 디스크립션, 구조화 데이터, 내부 링크
6. **Publishing automation** - 스케줄링 규칙, 자동 예약 버튼 포함
7. **Weekly operating routine** - 요일별 작업 가이드
8. **Environment variables** - 전체 환경변수 목록과 설명
9. **Troubleshooting** - 자주 발생하는 문제와 해결책

### 인터랙션
- 필수 페이지 생성 (About, Contact, Privacy, Disclaimer) -> Blogger Pages API
- 자동 스케줄링 실행 -> autoScheduleAction

## 네비게이션 변경

기존:
```
Overview | Keywords | Pipeline | Review | Publish | Alerts | Settings | Guide
```

변경 후:
```
Overview | Progress | Keywords | Pipeline | Review | Publish | Alerts | Settings | Playbook
```

- Guide 링크 제거 -> Playbook으로 대체 (더 포괄적인 내용)
- Progress 링크 추가 (Overview 바로 다음)
