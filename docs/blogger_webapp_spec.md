# Blogger Web App Spec

## 목적

이 문서는 Blogger 운영을 위한 로컬 관리자 웹앱의 화면 구조와 기능 요구사항을 정의한다.

## 제품 개요

- 사용 형태: `localhost`에서 실행하는 단일 사용자 관리자 도구
- 주요 기능: 콘텐츠 파이프라인 관리, 주간 할당량 추적, 사람 승인, Blogger 발행, Search Console 모니터링, 이메일 알림
- 데이터 저장: SQLite 단일 파일

## 핵심 화면

### 1. Dashboard

- 이번 주 목표 발행 수
- 현재 발행 수
- 승인 대기 글 수
- 예약 발행 글 수
- 미색인 글 수
- 14일 이상 무노출 글 수
- 카테고리별 비중
- 마지막 알림 발송 상태

### 2. Weekly Quota Panel

- 주간 초안 목표
- 주간 검수 목표
- 주간 발행 목표
- 현재 달성 수치
- 부족분
- 상태 색상

### 3. Keyword Queue

- 키워드 등록
- 카테고리 지정
- 국가 지정
- 우선순위 지정
- 상태 변경
- 주차 할당

### 4. Draft Studio

- 제목 후보 5개 표시
- 아웃라인 생성 버튼
- 본문 초안 생성 버튼
- FAQ 자동 생성
- 메타 설명 생성
- 내부링크 추천

### 5. Review Queue

- 검수 대기 글 목록
- 사람 검수 체크리스트
- 반려 사유 입력
- 승인 처리

### 6. Publish Queue

- 승인된 글 목록
- 예약 시각 설정
- Blogger 발행
- 발행 실패 재시도

### 7. Notification Center

- 이메일 수신 주소
- 이벤트별 알림 on/off
- 최근 발송 로그
- 실패한 메일 재시도

### 8. Monitor

- 색인 상태
- impressions/clicks/CTR
- 제목 교체 후보
- 리프레시 필요 글

## 사람 검수 체크리스트

- 제목이 검색 의도와 맞는가
- 첫 문단이 너무 일반적이지 않은가
- 실제 절약/시간 단축 포인트가 있는가
- FAQ가 중복되지 않는가
- 과장 표현이 없는가
- 정책 위험 주제가 아닌가

## 기본 이메일 설정

- 기본 수신자: `kimcomplete8888@gmail.com`
- 채널 타입: 이메일
- 기본 이벤트:
- `WEEKLY_DRAFT_SHORTFALL`
- `WEEKLY_APPROVAL_SHORTFALL`
- `WEEKLY_PUBLISH_SHORTFALL`
- `PUBLISH_FAILURE`
- `WEEKLY_SUMMARY`

## 자동화 규칙

### 자동화 가능

- 키워드 큐 정렬
- 제목 생성
- 아웃라인 생성
- 초안 생성
- FAQ/메타 설명 생성
- 리포트 요약
- 주간 부족분 계산
- 알림 메일 큐 적재

### 수동 유지

- 최종 사실 검수
- 제목 확정
- 발행 승인
- 정책 위험 확인
- 메일 수신 정책 변경

## 경고 로직

### 생산 경고

- 수요일 18:00까지 초안 4개 미만
- 금요일 18:00까지 승인 3개 미만
- 일요일 21:00까지 발행 5개 미만

### 품질 경고

- 본문 길이 1,000단어 미만
- 내부링크 2개 미만
- FAQ 3개 미만
- 실사용 예시 없음

### 검색 경고

- 게시 7일 후 미색인
- 게시 14일 후 impressions 0
- 게시 30일 후 clicks 0

### 알림 경고

- 주간 초안 목표 미달
- 주간 검수 목표 미달
- 주간 발행 목표 미달
- 발행 실패

## 최소 데이터 테이블

- `keywords`
- `posts`
- `publish_jobs`
- `metrics_snapshots`
- `alerts`
- `weekly_quotas`
- `weekly_stats`
- `notification_channels`
- `notification_rules`
- `notification_logs`

## 첫 구현 우선순위

1. Dashboard
2. Weekly Quota Panel
3. Keyword Queue
4. Draft Studio
5. Review Queue
6. Publish Queue
7. Notification Center
8. Monitor
