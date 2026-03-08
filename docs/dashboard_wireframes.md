# Dashboard And Pipeline Wireframes

## 목적

이 문서는 로컬 Blogger 관리자 웹앱의 첫 구현 화면을 와이어프레임 수준으로 정리한다.

## 전역 원칙

- 첫 화면에서 이번 주 할당량과 부족분이 바로 보여야 한다.
- 경고는 숨기지 않고 상단에 노출한다.
- 사람이 해야 하는 승인 작업과 AI가 처리 중인 작업을 분리해서 보여준다.
- 알림 메일 발송 상태를 대시보드에서 바로 확인할 수 있어야 한다.

## 1. Dashboard

```text
+----------------------------------------------------------------------------------+
| Blogger Admin                                                                    |
| Week: 2026-W11                     Blog: mylifehack-daily.blogspot.com          |
+----------------------------------------------------------------------------------+
| Weekly Quota                                                                     |
| Drafts  3 / 8    Reviews 2 / 6    Publishes 1 / 5    Pages 0 / 0               |
| Status: RED  Missing: Drafts 5, Publishes 4                                     |
+----------------------------------------------------------------------------------+
| Alerts                                                                           |
| [CRITICAL] Publish target below threshold                                        |
| [WARNING] AI-Productivity exceeds 50% of weekly output                           |
| [WARNING] 2 posts have 0 impressions after 14 days                               |
+----------------------------------------------------------------------------------+
| Human Review Queue                 | AI Pipeline                                 |
| Review waiting: 4                  | Draft queued: 6                             |
| Needs revision: 2                  | Draft generated today: 3                    |
| Approved today: 1                  | FAQ/meta pending: 2                         |
+----------------------------------------------------------------------------------+
| Publish Queue                      | Monitoring                                  |
| Scheduled: 3                       | Not indexed: 5                              |
| Failed today: 1                    | Zero impressions 14d: 2                     |
| Last published: 2026-03-08 18:00   | Refresh queue: 3                            |
+----------------------------------------------------------------------------------+
| Notification                                                                     |
| Primary email: kimcomplete8888@gmail.com                                         |
| Last sent: Weekly Draft Shortfall - SENT                                         |
| Failed notifications: 0                                                          |
+----------------------------------------------------------------------------------+
```

## 2. Weekly Quota Detail

```text
+----------------------------------------------------------------------------------+
| Weekly Quota Detail                                                              |
+----------------------------------------------------------------------------------+
| Week  | Draft Target | Review Target | Publish Target | Page Target | Status     |
| W11   | 8            | 6             | 5              | 0           | RED        |
+----------------------------------------------------------------------------------+
| Assignment List                                                                   |
| Mon - Generate drafts for Post 1, 5, 9, 13                                       |
| Tue - Generate drafts for Post 17, 2, 6, 10                                      |
| Thu - Human review for Post 1, 5, 9                                               |
| Fri - Final approval and scheduling for Post 1, 5                                 |
+----------------------------------------------------------------------------------+
```

## 3. Pipeline Board

```text
+----------------------------------------------------------------------------------+
| IDEA (12) | QUEUED (8) | DRAFTED (6) | REVIEW (4) | APPROVED (3) | SCHEDULED(2) |
+----------------------------------------------------------------------------------+
| Post 24   | Post 7     | Post 2      | Post 1     | Post 5       | Post 9       |
| Post 23   | Post 8     | Post 6      | Post 13    | Post 17      | Post 13      |
| ...       | ...        | ...         | ...        | ...          | ...          |
+----------------------------------------------------------------------------------+
| PUBLISHED (11) | REFRESH (3)                                                     |
+----------------------------------------------------------------------------------+
```

## 4. Notification Center

```text
+----------------------------------------------------------------------------------+
| Notification Center                                                              |
+----------------------------------------------------------------------------------+
| Channel         | Target                    | Event                    | Status    |
| Email           | kimcomplete8888@gmail.com | WEEKLY_PUBLISH_SHORTFALL | Enabled   |
| Email           | kimcomplete8888@gmail.com | PUBLISH_FAILURE          | Enabled   |
| Email           | kimcomplete8888@gmail.com | WEEKLY_SUMMARY           | Enabled   |
+----------------------------------------------------------------------------------+
| Recent Logs                                                                       |
| 2026-03-08 18:05  WEEKLY_DRAFT_SHORTFALL   SENT                                   |
| 2026-03-08 18:06  PUBLISH_FAILURE          FAILED                                 |
+----------------------------------------------------------------------------------+
```

## 5. 이메일 알림 메시지 예시

### Weekly shortfall

```text
Subject: [Blogger Ops] Weekly publish target is behind

Week: 2026-W11
Target publishes: 5
Current publishes: 1
Missing publishes: 4

Action needed:
- Review 2 approved posts
- Schedule 3 drafted posts
- Resolve 1 publish failure
```

### Publish failure

```text
Subject: [Blogger Ops] Publish failure detected

Post: How to Stop Paying for Apps You Can Replace for Free
Scheduled: 2026-03-08 18:00
Reason: Blogger API returned authentication error
Action needed: Reconnect Blogger credentials and retry
```

## 6. 구현 우선순위

1. 주간 할당량 카드
2. 파이프라인 보드
3. 알림 센터
4. 메일 로그 표시
5. 모니터링 카드
