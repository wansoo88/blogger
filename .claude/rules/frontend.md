# 프론트엔드 규칙 (.claude/rules/frontend.md)
# 이 규칙은 프론트엔드 관련 작업 시 항상 적용됩니다.

## 1. 컴포넌트 설계 원칙

### Server vs Client 판단 트리
```
데이터 페칭 필요?
  └─ YES → Server Component
     └─ 인터랙션(클릭, 입력) 필요?
        └─ YES → Server 내부에 Client 컴포넌트 조합

useState / useEffect / 이벤트 핸들러 필요?
  └─ YES → 'use client' 추가
     └─ 가능한 최하위 컴포넌트에만 적용 (범위 최소화)
```

### 데이터 페칭 패턴

```typescript
// ✅ Server Component — 직접 서비스 함수 호출
async function ProductList() {
  const products = await productService.findAll()
  return <ul>{products.map(p => <ProductCard key={p.id} {...p} />)}</ul>
}

// ✅ Client Component — TanStack Query 사용
'use client'
function ProductList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json()),
  })

  if (isLoading) return <Skeleton />
  if (error) return <ErrorState message="데이터를 불러올 수 없습니다" />
  if (!data?.length) return <EmptyState message="상품이 없습니다" />

  return <ul>{data.map(p => <ProductCard key={p.id} {...p} />)}</ul>
}
```

## 2. 폴더 구조 규칙

```
app/
├── (auth)/               # 인증 레이아웃 그룹
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/          # 대시보드 레이아웃 그룹
│   ├── layout.tsx
│   └── [도메인]/
│       ├── page.tsx
│       └── [id]/page.tsx
├── api/                  # API Route Handlers
├── error.tsx             # 에러 바운더리
├── not-found.tsx         # 404 페이지
└── layout.tsx

components/
├── ui/                   # shadcn/ui (직접 수정 금지)
├── common/               # 공통 레이아웃
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Sidebar.tsx
└── [도메인]/             # 도메인별 컴포넌트
    ├── index.ts          # re-export
    └── ComponentName.tsx

lib/
├── hooks/                # 커스텀 훅 (use*.ts)
├── utils/                # 유틸 함수
├── stores/               # Zustand 스토어
└── types/                # TypeScript 타입
```

## 3. 상태 관리 기준

| 상태 유형 | 도구 | 예시 |
|----------|------|------|
| 서버 데이터 캐시 | TanStack Query | API 응답, 목록 |
| 전역 UI 상태 | Zustand | 모달 열림, 사이드바 |
| 로컬 폼 상태 | useState | 입력값, 체크박스 |
| URL 상태 | useSearchParams | 필터, 페이지 |

## 4. 성능 최적화 필수 체크
- `<Image>` : 반드시 next/image 사용, width/height 명시
- `<Link>` : 반드시 next/link 사용
- Font : next/font/google 사용
- Heavy component : `dynamic(() => import('./Heavy'))` 적용
- 서버 컴포넌트 데이터 : `<Suspense fallback={<Skeleton/>}>` 래핑

## 5. 접근성(a11y) 체크리스트
- [ ] 버튼/링크에 `aria-label` 또는 텍스트 콘텐츠
- [ ] 이미지에 `alt` 속성
- [ ] 폼 요소에 `<label>` 연결
- [ ] 키보드 포커스 가능 여부 (Tab 키 테스트)
- [ ] 색상 대비 WCAG AA 기준 충족

## 6. TailwindCSS 사용 규칙
```typescript
// ✅ cn() 유틸로 조건부 클래스 병합
import { cn } from '@/lib/utils'

<div className={cn(
  'base-class',
  isActive && 'active-class',
  className  // 외부에서 전달받은 className 항상 마지막
)} />

// ❌ 금지: inline style, 하드코딩 색상
<div style={{ color: '#ff0000' }} />
<div className="text-[#ff0000]" />  // 임의 값은 최소화
```
