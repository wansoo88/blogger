---
name: create-api
description: >
  Next.js API Route Handler 생성 워크플로우 스킬.
  Zod 검증 + Service 레이어 + 인증을 포함한 표준 패턴으로 생성.
triggers:
  - API 만들어
  - 엔드포인트 추가
  - create api
  - route handler 생성
  - API 추가해줘
---

# API Route Handler 생성 워크플로우

## STEP 1: 요구사항 확인
작업 시작 전 반드시 파악:
1. 도메인명 (예: products, orders, users)
2. 필요한 HTTP 메서드 (GET / POST / PUT / DELETE)
3. 인증 필요 여부
4. 요청 데이터 구조 (Body / Query Params)
5. 응답 데이터 구조

## STEP 2: 파일 생성 순서 (이 순서대로 생성)

```
① lib/validators/[도메인].ts    → Zod 스키마 먼저
② lib/services/[도메인].ts      → 비즈니스 로직
③ app/api/[도메인]/route.ts     → Route Handler
④ app/api/[도메인]/[id]/route.ts → 단건 CRUD (필요시)
```

## STEP 3: Zod 스키마 작성

```typescript
// lib/validators/[도메인].ts
import { z } from 'zod'

export const Create[도메인]Schema = z.object({
  name: z.string().min(1, '이름은 필수입니다').max(100),
  description: z.string().max(500).optional(),
  // 필드 추가...
})

export const Update[도메인]Schema = Create[도메인]Schema.partial()

export const [도메인]QuerySchema = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
})

// 타입 export
export type Create[도메인]Input = z.infer<typeof Create[도메인]Schema>
export type Update[도메인]Input = z.infer<typeof Update[도메인]Schema>
export type [도메인]Query       = z.infer<typeof [도메인]QuerySchema>
```

## STEP 4: Service 레이어 작성

```typescript
// lib/services/[도메인].ts
import { prisma } from '@/lib/db'
import type { Create[도메인]Input, Update[도메인]Input } from '@/lib/validators/[도메인]'

export const [도메인]Service = {
  // 목록 조회 (사용자 격리 필수)
  async findAll({ page = 1, limit = 20, userId, search }: {
    page?: number; limit?: number; userId: string; search?: string
  }) {
    const where = {
      userId,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    }
    const [items, total] = await Promise.all([
      prisma.[도메인].findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.[도메인].count({ where }),
    ])
    return { items, total, page, limit }
  },

  // 단건 조회 (소유권 확인)
  async findById(id: string, userId: string) {
    return prisma.[도메인].findFirst({ where: { id, userId } })
  },

  // 생성
  async create(data: Create[도메인]Input, userId: string) {
    return prisma.[도메인].create({ data: { ...data, userId } })
  },

  // 수정 (소유권 확인 후)
  async update(id: string, data: Update[도메인]Input, userId: string) {
    const existing = await this.findById(id, userId)
    if (!existing) return null
    return prisma.[도메인].update({ where: { id }, data })
  },

  // 삭제 (소유권 확인 후)
  async delete(id: string, userId: string) {
    const existing = await this.findById(id, userId)
    if (!existing) return null
    return prisma.[도메인].delete({ where: { id } })
  },
}
```

## STEP 5: Route Handler 작성

### 목록/생성 (route.ts)
```typescript
// app/api/[도메인]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { [도메인]Service } from '@/lib/services/[도메인]'
import { Create[도메인]Schema, [도메인]QuerySchema } from '@/lib/validators/[도메인]'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }
    const { searchParams } = new URL(request.url)
    const query = [도메인]QuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: query.error.issues } },
        { status: 400 }
      )
    }
    const result = await [도메인]Service.findAll({ ...query.data, userId: session.user.id })
    return NextResponse.json({
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    })
  } catch (error) {
    console.error('[도메인] GET error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    }
    const body = await request.json()
    const validated = Create[도메인]Schema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: validated.error.issues } },
        { status: 400 }
      )
    }
    const item = await [도메인]Service.create(validated.data, session.user.id)
    return NextResponse.json({ data: item }, { status: 201 })
  } catch (error) {
    console.error('[도메인] POST error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
```

### 단건 CRUD ([id]/route.ts)
```typescript
// app/api/[도메인]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { [도메인]Service } from '@/lib/services/[도메인]'
import { Update[도메인]Schema } from '@/lib/validators/[도메인]'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    const item = await [도메인]Service.findById(params.id, session.user.id)
    if (!item) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    return NextResponse.json({ data: item })
  } catch (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    const body = await request.json()
    const validated = Update[도메인]Schema.safeParse(body)
    if (!validated.success) return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
    const item = await [도메인]Service.update(params.id, validated.data, session.user.id)
    if (!item) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    return NextResponse.json({ data: item })
  } catch (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    const item = await [도메인]Service.delete(params.id, session.user.id)
    if (!item) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
```

## STEP 6: 생성 완료 체크리스트
- [ ] Zod 스키마 (Create/Update/Query) 작성
- [ ] Service 레이어 분리
- [ ] 모든 API 인증(auth()) 적용
- [ ] userId로 데이터 격리 확인
- [ ] 표준 에러 응답 형식 준수
- [ ] console.error 로그 추가
- [ ] HTTP 상태코드 올바르게 사용

## 완료 보고 형식
```
✅ API 생성 완료

생성된 파일:
  - app/api/[도메인]/route.ts
  - app/api/[도메인]/[id]/route.ts
  - lib/services/[도메인].ts
  - lib/validators/[도메인].ts

엔드포인트:
  GET    /api/[도메인]       목록 조회 (인증 필요)
  POST   /api/[도메인]       생성     (인증 필요)
  GET    /api/[도메인]/:id   단건 조회 (인증 필요)
  PUT    /api/[도메인]/:id   수정     (인증 필요)
  DELETE /api/[도메인]/:id   삭제     (인증 필요)
```
