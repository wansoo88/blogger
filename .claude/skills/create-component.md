---
name: create-component
description: >
  React/Next.js 컴포넌트 생성 워크플로우 스킬.
  shadcn/ui 기반 Server/Client Component를 베스트 프랙티스로 생성.
triggers:
  - 컴포넌트 만들어
  - 컴포넌트 추가
  - create component
  - 새 컴포넌트
  - 페이지 만들어
---

# 컴포넌트 생성 워크플로우

## STEP 1: 요구사항 확인
작업 시작 전 반드시 파악:
1. 컴포넌트 이름 및 도메인
2. Server Component / Client Component 여부
3. 필요한 Props 목록
4. 기존 shadcn/ui 컴포넌트 재사용 가능 여부

## STEP 2: 파일 위치 결정

```
공통 UI 컴포넌트     → components/ui/ComponentName.tsx
공통 레이아웃         → components/common/ComponentName.tsx
도메인별 컴포넌트     → components/[도메인]/ComponentName.tsx
특정 페이지 전용      → app/[route]/_components/ComponentName.tsx
```

## STEP 3-A: Server Component 템플릿 (기본)

```typescript
// components/[도메인]/ComponentName.tsx

import { cn } from '@/lib/utils'

interface ComponentNameProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

export async function ComponentName({
  title,
  description,
  className,
  children,
}: ComponentNameProps) {
  // 필요시 서버에서 데이터 페칭
  // const data = await someService.findAll()

  return (
    <section className={cn('', className)}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}
```

## STEP 3-B: Client Component 템플릿 (인터랙션 필요시)

```typescript
'use client'

// components/[도메인]/ComponentName.tsx

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ComponentNameProps {
  initialValue?: string
  onSuccess?: (result: unknown) => void
  className?: string
}

export function ComponentName({
  initialValue = '',
  onSuccess,
  className,
}: ComponentNameProps) {
  const [value, setValue] = useState(initialValue)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch('/api/[도메인]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? '오류 발생')
      toast.success('성공적으로 저장되었습니다')
      onSuccess?.(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {error && (
        <p role="alert" className="text-destructive text-sm">{error}</p>
      )}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="입력값"
        className="..."
      />
      <Button onClick={handleSubmit} disabled={isPending}>
        {isPending ? '처리 중...' : '저장'}
      </Button>
    </div>
  )
}
```

## STEP 3-C: 데이터 목록 컴포넌트 템플릿

```typescript
// Server Component + TanStack Query 조합

// 서버 버전 (app/[route]/page.tsx에서 직접 사용)
export async function ProductListServer() {
  const products = await productService.findAll()

  if (!products.length) {
    return <EmptyState message="등록된 상품이 없습니다" />
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard {...product} />
        </li>
      ))}
    </ul>
  )
}
```

## STEP 4: 인덱스 파일 업데이트

```typescript
// components/[도메인]/index.ts
export { ComponentName } from './ComponentName'
// 새 컴포넌트 추가 시 이 파일에도 export 추가
```

## STEP 5: 생성 완료 체크리스트
- [ ] TypeScript Props interface 정의
- [ ] className prop 추가 (외부 스타일 재정의 가능)
- [ ] 로딩 상태 처리 (비동기 작업 있을 경우)
- [ ] 에러 상태 처리 (role="alert" 포함)
- [ ] 빈 상태(Empty State) 처리
- [ ] 반응형 TailwindCSS 클래스 적용
- [ ] 접근성 속성 (aria-label, role)
- [ ] cn() 유틸로 className 병합
- [ ] index.ts export 추가

## 완료 보고 형식
```
✅ 컴포넌트 생성 완료

파일: components/[도메인]/ComponentName.tsx
타입: [Server / Client] Component
Props: [title, description?, className?]
shadcn/ui: [사용 컴포넌트 or 없음]

사용 예시:
<ComponentName title="제목" />
```
