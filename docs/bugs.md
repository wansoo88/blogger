# 버그 & 해결책 기록 (docs/bugs.md)
# 참조 방법: @docs/bugs.md

## 작성 규칙
- 발생한 버그와 해결책을 누적 기록
- 재발 방지책까지 반드시 작성
- Claude Code에서 유사 에러 발생 시 이 파일 먼저 검색

## 버그 템플릿
```
### BUG-[번호]: [버그 제목]
- **날짜**: YYYY-MM-DD
- **상태**: 해결 | 진행중 | 보류
- **증상**: 어떤 문제가 발생했는가 (에러 메시지 포함)
- **원인**: 왜 발생했는가
- **해결책**: 어떻게 해결했는가 (코드 포함)
- **재발 방지**: 앞으로 어떻게 방지할 것인가
```

---

## 자주 발생하는 Next.js 버그 (참고용)

### BUG-001: Hydration Mismatch 오류
- **날짜**: -
- **상태**: 참고용
- **증상**: `Error: Hydration failed because the initial UI does not match`
- **원인**: 서버에서 렌더링한 HTML과 클라이언트에서 렌더링한 결과 불일치 (주로 날짜/시간, Math.random())
- **해결책**:
  ```typescript
  // 방법 1: suppressHydrationWarning
  <time suppressHydrationWarning>{new Date().toLocaleDateString()}</time>

  // 방법 2: useEffect로 클라이언트에서만 렌더링
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  ```
- **재발 방지**: 날짜/시간은 서버에서 ISO 문자열로 내려받아 클라이언트에서 포맷

### BUG-002: Prisma N+1 쿼리 성능 저하
- **날짜**: -
- **상태**: 참고용
- **증상**: 목록 조회 시 DB 쿼리가 N+1개 발생, 응답 느림
- **원인**: 루프 내에서 관계 데이터 접근
  ```typescript
  // ❌ N+1 발생
  const posts = await prisma.post.findMany()
  for (const post of posts) {
    const user = await prisma.user.findUnique({ where: { id: post.userId } })
  }
  ```
- **해결책**:
  ```typescript
  // ✅ include로 한 번에 조회
  const posts = await prisma.post.findMany({
    include: { user: { select: { name: true, email: true } } }
  })
  ```
- **재발 방지**: 관계 데이터 필요 시 항상 `include` 또는 `select` 사용

### BUG-003: Server Component에서 useRouter 오류
- **날짜**: -
- **상태**: 참고용
- **증상**: `Error: useRouter only works in Client Components`
- **원인**: Server Component에서 Client 전용 훅 사용
- **해결책**: `'use client'` 추가 또는 redirect() 서버 함수 사용
  ```typescript
  // Server Component에서 리다이렉트
  import { redirect } from 'next/navigation'
  if (!session) redirect('/login')
  ```
- **재발 방지**: use로 시작하는 훅은 Client Component에서만 사용

---
<!-- 실제 프로젝트 버그는 이 아래에 추가 -->
