# 프로젝트 컨텍스트 (CLAUDE.md)
# ⚠️ 150줄 이내 유지 — 초과 내용은 docs/에 분리

## 프로젝트 개요
- **서비스명**: [서비스명을 여기에 작성]
- **목적**: [한 줄 서비스 설명]
- **타겟 사용자**: [주요 사용자 대상]

## 기술 스택
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS v3, shadcn/ui
- **상태관리**: Zustand (클라이언트), TanStack Query (서버 상태)
- **Backend**: Next.js API Routes (Route Handlers)
- **DB**: PostgreSQL + Prisma ORM
- **인증**: NextAuth.js v5
- **배포**: Vercel
- **테스트**: Vitest + React Testing Library
- **패키지 매니저**: pnpm

## 프로젝트 구조
@docs/architecture.md

## 핵심 개발 규칙
- App Router 사용 (Pages Router 절대 사용 금지)
- Server Component 기본값 → 필요시만 `use client` 추가
- API 응답 형식 통일: `{ data, error, meta }` 구조
- 모든 API 입력값 Zod로 검증
- DB 스키마 변경 시 반드시 docs/decisions.md에 ADR 기록

## 환경변수
- `.env.local`: 로컬 전용 (git 제외)
- `.env.example`: 필요 변수 목록 (git 포함, 값은 제외)

## 참조 문서 (온디맨드 로드 — 필요 시에만 @로 호출)
- 전체 아키텍처: @docs/architecture.md
- 의사결정 기록: @docs/decisions.md
- 버그 & 해결책: @docs/bugs.md
