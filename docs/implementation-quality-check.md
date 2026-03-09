# 자동 품질 검수 시스템

## 파일 위치

- `lib/services/quality-service.ts`

## 개요

AI로 생성된 초안을 자동으로 검수하여 품질 기준을 통과하면 바로 APPROVED 상태로 전환하고, 미통과 시 REVIEW 상태로 두어 수동 확인을 유도한다.

## 검수 항목 (7개, 총 100점)

| 항목 | 배점 | 통과 기준 |
|------|------|----------|
| word_count | 20 | 800단어 이상 |
| title_length | 10 | 30-70자 |
| faq_section | 15 | FAQ 섹션 존재 |
| structured_headings | 15 | H2 헤딩 3개 이상 |
| prohibited_topics | 15 | 의료/법률/세금 조언 없음 |
| adsense_policy | 15 | 도박/성인/무기 등 위반 없음 |
| emoji_limit | 10 | 이모지 3개 이하 |

## 통과 조건

- 총점 70점 이상
- 필수 항목(prohibited_topics, adsense_policy, word_count) 모두 통과

## 동작 흐름

```
Gemini 초안 생성
  -> runQualityCheck(title, markdown) 실행
  -> 점수 70+ 이고 필수 항목 통과 -> APPROVED 자동 전환
  -> 점수 70 미만 또는 필수 실패 -> REVIEW 상태 유지 (수동 확인)
  -> aiScore, reviewNotes에 결과 저장
```

## 금지 패턴

### 콘텐츠 금지 (prohibited_topics)
- 의료 진단/처방, 법률 조언, 세금 조언, 투자 조언, 대출 조언

### 애드센스 정책 위반 (adsense_policy)
- 카지노, 도박, 성인 콘텐츠, 불법, 약물 남용, 무기, 해킹 도구, 크랙 소프트웨어
