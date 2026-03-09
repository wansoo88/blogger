# 콘텐츠 품질 개선

## 파일 위치

- `lib/integrations/gemini.ts` - 프롬프트 및 생성 로직

## 카테고리별 프롬프트 다양화

각 카테고리에 맞는 전용 가이드라인 적용:

| 카테고리 | 핵심 가이드 |
|----------|------------|
| AI_PRODUCTIVITY | 도구 비교, 워크플로 개선, 무료 티어/가격 정보, 10분 이내 설정 가이드 |
| MONEY_SAVING | 구체적 절약 금액으로 시작, 계산/비교 테이블, 5분 이내 퀵윈 |
| DIGITAL_HOWTO | 번호 매긴 단계별 지침, 실수 방지, 트러블슈팅 팁 |
| TIME_MANAGEMENT | 일상 시나리오로 시작, 주간 스케줄 샘플, 주당 절약 시간 수치 |
| HOME_ORGANIZATION | 방/구역별 접근, 준비물 목록과 비용, 유지 루틴 |
| WORK_TIPS | 구체적 상황 기반, 대화/이메일 템플릿, 재택/사무실 모두 커버 |

## 자연스러운 문체 규칙

### 적용된 규칙
- 친구가 커피 마시며 실용적 조언을 나누는 톤
- 짧은 문단 (2-3문장 이하)
- 문장 길이 변화 (짧은 핵심 문장 + 긴 설명 문장 혼합)
- 이모지 사용 금지 (생성 후 자동 제거)

### 금지 표현
- "In this article", "Without further ado", "In today's fast-paced world"
- "game-changer", "unlock", "dive into", "harness", "leverage", "revolutionize", "cutting-edge"
- "So,", "Well,", "Now,"로 문단 시작

### 필수 요소
- 구체적 숫자, 날짜, 예시 사용
- 조언에 WHY 설명 포함
- 최소 1개의 사실적 사례/케이스 스터디
- 섹션 끝에 실행 가능한 요약

## 이모지 처리

- Gemini 생성 결과에서 이모지 자동 제거 (stripEmojis)
- HTML 변환 시에도 이모지 제거
- 품질 검수에서 이모지 3개 초과 시 감점

## 메타 디스크립션 생성

- 초안 생성과 병렬로 별도 Gemini 호출
- 규칙: 140-155자, 키워드 포함, 능동태, 혜택/행동 유도
- Post.metaDescription 필드에 저장
