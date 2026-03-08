# 백엔드 규칙 (.claude/rules/backend.md)
# 이 규칙은 API 및 서버 로직 작업 시 항상 적용됩니다.

## 1. Route Handler 표준 패턴

```typescript
// app/api/[도메인]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { [도메인]Service } from '@/lib/services/[도메인]'
import { Create[도메인]Schema, QuerySchema } from '@/lib/validators/[도메인]'

export async function GET(request: NextRequest) {
  try {
    // ① 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // ② 쿼리 파라미터 검증
    const { searchParams } = new URL(request.url)
    const query = QuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: query.error.issues } },
        { status: 400 }
      )
    }

    // ③ 서비스 호출 (userId로 데이터 격리)
    const result = await [도메인]Service.findAll({
      ...query.data,
      userId: session.user.id,
    })

    // ④ 표준 응답
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
```

## 2. Service Layer 표준 패턴

```typescript
// lib/services/[도메인].ts
import { prisma } from '@/lib/db'
import type { Create[도메인]Input } from '@/lib/validators/[도메인]'

export const [도메인]Service = {
  async findAll({ page = 1, limit = 20, userId }: {
    page?: number; limit?: number; userId: string
  }) {
    const [items, total] = await Promise.all([
      prisma.[도메인].findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.[도메인].count({ where: { userId } }),
    ])
    return { items, total, page, limit }
  },

  async findById(id: string, userId: string) {
    // ⚠️ 반드시 userId로 소유권 확인
    return prisma.[도메인].findFirst({ where: { id, userId } })
  },

  async create(data: Create[도메인]Input, userId: string) {
    return prisma.[도메인].create({ data: { ...data, userId } })
  },

  async update(id: string, data: Partial<Create[도메인]Input>, userId: string) {
    const existing = await this.findById(id, userId)
    if (!existing) return null // 404
    return prisma.[도메인].update({ where: { id }, data })
  },

  async delete(id: string, userId: string) {
    const existing = await this.findById(id, userId)
    if (!existing) return null // 404
    return prisma.[도메인].delete({ where: { id } })
  },
}
```

## 3. Zod 검증 표준 패턴

```typescript
// lib/validators/[도메인].ts
import { z } from 'zod'

export const Create[도메인]Schema = z.object({
  name: z.string().min(1, '이름은 필수입니다').max(100),
  description: z.string().max(500).optional(),
})

export const Update[도메인]Schema = Create[도메인]Schema.partial()

export const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
})

export type Create[도메인]Input = z.infer<typeof Create[도메인]Schema>
export type Update[도메인]Input = z.infer<typeof Update[도메인]Schema>
```

## 4. Prisma 클라이언트 싱글톤

```typescript
// lib/db.ts — 이 패턴만 사용, 절대 변경 금지
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## 5. HTTP 상태코드 기준
| 코드 | 상황 |
|------|------|
| 200 | 조회 성공 |
| 201 | 생성 성공 |
| 400 | Validation Error |
| 401 | 미인증 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복) |
| 500 | 서버 오류 |

## 6. 보안 필수 체크리스트
- [ ] 모든 POST/PUT/DELETE에 인증(auth()) 적용
- [ ] 사용자 데이터: findFirst({ where: { id, userId } }) 패턴으로 격리
- [ ] 입력값 Zod safeParse 검증
- [ ] Raw SQL 사용 시 파라미터 바인딩 사용
- [ ] 민감한 필드 응답에서 제외 (비밀번호 등)
