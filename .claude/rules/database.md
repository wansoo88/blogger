# 데이터베이스 규칙 (.claude/rules/database.md)
# Prisma ORM + PostgreSQL 작업 시 항상 적용됩니다.

## 1. Prisma 스키마 네이밍 컨벤션

```prisma
// ✅ 모델명: PascalCase 단수형
model User { ... }
model ProductOrder { ... }

// ✅ 필드명: camelCase
id        String   @id @default(cuid())
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
userId    String

// ✅ 테이블명 매핑: snake_case 복수형
@@map("users")
@@map("product_orders")

// ✅ 인덱스
@@index([userId, createdAt])
@@unique([email])
```

## 2. 표준 베이스 필드 (모든 모델 필수 포함)

```prisma
model [ModelName] {
  id        String   @id @default(cuid())  // CUID 사용 (UUID 아님)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("[table_name_plural]")
}
```

## 3. 관계 정의 표준 패턴

```prisma
model User {
  id      String  @id @default(cuid())
  email   String  @unique
  name    String?
  posts   Post[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model Post {
  id      String @id @default(cuid())
  title   String
  content String?
  userId  String         // FK 컬럼: [참조모델단수]_id
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])        // FK 컬럼에 인덱스 필수
  @@map("posts")
}
```

## 4. 마이그레이션 워크플로우

```bash
# ① 스키마 수정 (prisma/schema.prisma)

# ② 마이그레이션 파일 생성 (개발)
pnpm db:migrate -- --name [변경_설명]
# 예: pnpm db:migrate -- --name add_product_table

# ③ Prisma Client 타입 재생성
pnpm db:generate

# ④ docs/decisions.md에 ADR 기록 (스키마 변경 필수)
```

## 5. 쿼리 최적화 패턴

```typescript
// ✅ 목록 + 카운트 병렬 실행 (N+1 방지)
const [items, total] = await Promise.all([
  prisma.product.findMany({
    where: { userId },
    include: { category: true },  // 필요한 관계만 명시
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.product.count({ where: { userId } }),
])

// ✅ select로 필요한 필드만 조회
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true },
  // password 같은 민감 필드 제외
})

// ✅ 트랜잭션: 여러 테이블 동시 수정 시
const result = await prisma.$transaction([
  prisma.order.create({ data: orderData }),
  prisma.product.update({ where: { id }, data: { stock: { decrement: 1 } } }),
])
```

## 6. 인덱스 설계 기준
- FK 컬럼 (userId, orderId 등): 항상 `@@index` 추가
- WHERE 조건 자주 사용하는 컬럼: `@@index` 추가
- 유니크 제약: `@unique` 또는 `@@unique`
- 복합 인덱스: 카디널리티 높은 컬럼을 앞에

## 7. 금지 사항
- ❌ `prisma.[model].deleteMany({})` 조건 없이 실행
- ❌ `prisma.$queryRaw` 남용 (Prisma ORM 우선)
- ❌ include 없이 관계 데이터 루프 접근 (N+1 발생)
- ❌ 트랜잭션 없이 여러 테이블 동시 수정
- ❌ 개발 환경에서 `prisma db push` 사용 (migrate 사용)
