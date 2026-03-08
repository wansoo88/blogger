---
name: deploy
description: >
  Vercel 배포 전 검증 및 배포 워크플로우 스킬.
  6단계 체크리스트 후 사용자 확인을 받고 배포 진행.
triggers:
  - 배포해줘
  - deploy
  - vercel 배포
  - 프로덕션 반영
  - 배포 준비해줘
---

# Vercel 배포 워크플로우

## ⚠️ 중요 원칙
배포는 절대 자동으로 진행하지 않습니다.
모든 체크리스트 완료 후 **"배포를 진행할까요?"** 질문 후 확인을 받아야 합니다.

---

## STEP 1: 코드 품질 검증

```powershell
# TypeScript 타입 오류 확인
pnpm tsc --noEmit

# ESLint 검사
pnpm lint

# 로컬 빌드 테스트 (가장 중요)
pnpm build

# 테스트 실행
pnpm test
```

**오류 발생 시**: 즉시 중단 → 오류 수정 → 재시도

---

## STEP 2: 환경변수 동기화 확인

```
로컬 .env.local ↔ Vercel 환경변수 비교:

필수 확인 항목:
□ DATABASE_URL (프로덕션 DB URL)
□ NEXTAUTH_SECRET (랜덤 32자 이상 문자열)
□ NEXTAUTH_URL (https://your-domain.vercel.app)
□ [추가 외부 서비스 API 키]

확인 방법:
Vercel 대시보드 → 프로젝트 선택 → Settings → Environment Variables
```

---

## STEP 3: DB 마이그레이션 확인

```powershell
# 미적용 마이그레이션 상태 확인
pnpm db:status

# 🔴 프로덕션 DB 마이그레이션이 필요한 경우
# 반드시 DB 백업 후 진행할 것
DATABASE_URL=[프로덕션_DB_URL] pnpm db:migrate:deploy
```

---

## STEP 4: 배포 전 최종 체크리스트

**코드 품질**
```
□ 불필요한 console.log 제거 완료
□ TODO/FIXME 주석 확인 (배포 방해 여부)
□ .env 파일이 .gitignore에 포함됨
□ .env.example 업데이트 완료
```

**기능 검증**
```
□ 로그인 / 로그아웃 정상 동작
□ 핵심 사용자 플로우 테스트 완료
□ 모바일 반응형 확인
□ 에러 페이지 (404, 500) 정상 표시
```

**성능**
```
□ next/image 사용 (일반 <img> 없음)
□ 빌드 출력에서 번들 사이즈 확인
□ 불필요한 의존성 없음
```

---

## STEP 5: Git 커밋 & 푸시

```powershell
# 변경 파일 확인
git status

# 스테이징
git add .

# Conventional Commits 형식 커밋
git commit -m "feat: [기능 설명]"
# git commit -m "fix: [버그 수정 설명]"
# git commit -m "refactor: [리팩토링 설명]"

# main 브랜치 푸시 (Vercel 자동 배포 트리거)
git push origin main
```

---

## STEP 6: 배포 후 검증

```
Vercel 배포 완료 후 (약 1~3분 소요):

□ 프로덕션 URL 접속 정상 (https://your-app.vercel.app)
□ 로그인 동작 확인
□ 주요 API 응답 확인
□ 브라우저 콘솔 에러 없음
□ Vercel Functions 로그 확인 (이상 없음)
```

---

## 🔴 롤백 방법

**즉시 롤백 (Vercel 대시보드)**
```
Vercel 대시보드
→ 프로젝트 선택
→ Deployments 탭
→ 이전 성공 배포 선택
→ "..." 메뉴 → Redeploy
```

**Git으로 롤백**
```powershell
git revert [rollback-commit-hash]
git push origin main
```

---

## 완료 보고 형식

```
🚀 배포 체크리스트 완료

✅ 통과: TypeScript, Lint, Build, Test
✅ 환경변수: Vercel 동기화 확인
✅ DB: 마이그레이션 [없음 / 적용 완료]

⚠️ 주의사항: [있을 경우 기재]

예상 배포 URL: https://[app-name].vercel.app

---
배포를 진행할까요? (예/아니오)
```
