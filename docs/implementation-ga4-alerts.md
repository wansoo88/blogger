# GA4 Integration & Alert System Implementation

## GA4 (Google Analytics 4) Integration

### File: `lib/integrations/ga4.ts`

GA4 Data API v1beta integration for traffic monitoring.

### Environment Variables
- `GA4_PROPERTY_ID`: GA4 property ID (from GA4 admin panel)
- `GA4_REFRESH_TOKEN`: OAuth refresh token (falls back to `BLOGGER_REFRESH_TOKEN`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: shared OAuth credentials

### Functions
- `getGA4Status()` - configuration check (no API call)
- `fetchGA4Report(args)` - low-level GA4 Data API wrapper
- `getTrafficSummary(days?)` - sessions, users, pageViews, bounceRate, avgSessionDuration, newUsers
- `getTrafficBySource(days?)` - sessions grouped by channel (Organic Search, Direct, Referral, etc.)
- `getTopPages(days?, limit?)` - top pages by pageViews

### Behavior when unconfigured
Returns empty arrays and zero values. No errors thrown.

---

## Quality Check Upgrade

### File: `lib/services/quality-service.ts`

### Changes
- **Pass threshold raised**: 70 -> 85 points
- **Score rebalancing**: Total max = 100 points
  - word_count: 15pt (was 20)
  - title_length: 5pt (was 10)
  - faq_section: 10pt (was 15)
  - structured_headings: 15pt
  - prohibited_topics: 15pt
  - adsense_policy: 15pt
  - keyword_density: 10pt (NEW)
  - readability: 10pt (NEW)
  - duplicate_intro: 5pt (NEW)

### New checks
1. **keyword_density**: Target keyword appears 3-10 times in text
2. **readability**: Average sentence length 10-25 words
3. **duplicate_intro**: Detects and penalizes generic AI openings

### Improvement suggestions
`getImprovementSuggestions()` returns actionable tips for each failed check. Included in `reviewNotes` when quality fails.

---

## Alert Evaluation System

### File: `lib/services/alert-service.ts`

Implements actual evaluation logic for 6 alert types that previously only existed in the schema.

### Alert Types Implemented

| Type | Trigger | Severity |
|------|---------|----------|
| CATEGORY_IMBALANCE | Any category > 40% of posts, or 0 posts | WARNING |
| QUALITY_FAILURE | Post stuck in REVIEW with score < 85 for 48+ hours | WARNING |
| INDEXING_DELAY | Published post not indexed after 7 days | WARNING/CRITICAL (14d) |
| ZERO_IMPRESSIONS | Published post with 0 impressions after 14 days | INFO/WARNING (30d) |
| ZERO_CLICKS | Post has impressions but 0 clicks after 14 days | INFO |
| PUBLISH_FAILURE | PublishJob with FAILED status | CRITICAL |

### Auto-resolution
All alerts auto-resolve when the underlying condition is fixed (post indexed, clicks received, job succeeds, etc.)

### Notification integration
INDEXING_DELAY and PUBLISH_FAILURE alerts are queued for email notification via `queueNotificationForAlert()`.

### Usage
- Manual: "Run alert evaluation" button on Monitor page
- Server action: `evaluateAlertsAction()`
- Programmatic: `evaluateAllAlerts()` returns `{ created, resolved, total, details }`

---

## UI Changes

### Monitor page (`app/dashboard/monitor/page.tsx`)
- Added GA4 traffic cards (sessions, pageViews, bounceRate, avgSessionDuration)
- Added traffic sources table
- Added "Run alert evaluation" button
- Shows open alert count

### Settings page (`app/dashboard/settings/page.tsx`)
- Added GA4 configuration section
- Shows GA4_PROPERTY_ID, GA4_REFRESH_TOKEN, OAuth credentials status
