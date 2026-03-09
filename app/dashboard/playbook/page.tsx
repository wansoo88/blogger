import Link from 'next/link'
import { autoScheduleAction, createRequiredPagesAction } from '@/app/actions'
import { REQUIRED_PAGES } from '@/lib/integrations/blogger'

const sections = [
  {
    id: 'getting-started',
    title: '1. Getting started',
    items: [
      'Create a Google Cloud project and enable the Blogger API and Gemini API.',
      'Generate a Gemini API key from Google AI Studio and add it to .env.local as GEMINI_API_KEY.',
      'For Blogger, set up OAuth 2.0 credentials: add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and BLOGGER_REFRESH_TOKEN to .env.local.',
      'Alternatively, use a short-lived BLOGGER_ACCESS_TOKEN for testing (expires in 1 hour).',
      'Find your BLOGGER_BLOG_ID from Blogger dashboard URL (the numeric ID) and add it to .env.local.',
      'Run pnpm prisma:migrate then pnpm dev to start the app.',
    ],
  },
  {
    id: 'adsense-approval',
    title: '2. AdSense approval checklist',
    items: [
      'Publish at least 30 high-quality posts before applying. Aim for 40-50 to be safe.',
      'Create all required pages: About, Contact, Privacy Policy, and Disclaimer. Use the buttons below to auto-create them on Blogger.',
      'Every post should be at least 800 words with clear structure (headings, lists, FAQ).',
      'Avoid thin content, duplicate content, and pages with only ads or affiliate links.',
      'Make sure the blog has a clear navigation structure with category labels.',
      'Use a clean Blogger template without excessive ads or pop-ups.',
      'Apply for AdSense only when you have consistent traffic (even minimal organic traffic helps).',
      'Wait at least 2-3 months of regular posting before applying.',
    ],
  },
  {
    id: 'content-strategy',
    title: '3. Content strategy',
    items: [
      'Phase 1 (weeks 1-8): Publish 7-10 posts per week across all categories to build volume.',
      'Phase 2 (weeks 9-16): Reduce to 5 posts per week. Focus on keywords with proven search volume.',
      'Phase 3 (ongoing): Maintain 3-5 posts per week. Start refreshing underperforming content.',
      'Distribute posts evenly across categories: AI Productivity, Money Saving, Digital How-To, Time Management, Home Organization, Work Tips.',
      'Target long-tail keywords (4+ words) with informational intent for easier ranking.',
      'Avoid topics in the YMYL (Your Money Your Life) category: medical, legal, financial advice.',
    ],
  },
  {
    id: 'quality-standards',
    title: '4. Quality standards',
    items: [
      'The auto-check system scores each draft on 7 criteria (max 100 points). Posts scoring 70+ auto-approve.',
      'Word count: minimum 800 words (target 1000-1500 for better ranking).',
      'Title length: 30-70 characters for optimal search display.',
      'Every post needs a FAQ section with 3-5 questions.',
      'At least 3 H2 headings for clear structure.',
      'No prohibited topics (medical/legal/tax advice).',
      'No AdSense policy violations (gambling, adult content, weapons, etc.).',
      'Minimal or no emojis in the final published content.',
      'Meta descriptions auto-generated: 140-155 characters with target keyword.',
    ],
  },
  {
    id: 'seo-checklist',
    title: '5. SEO checklist',
    items: [
      'Target keyword appears in the title naturally.',
      'Meta description includes the keyword and a clear benefit.',
      'FAQ sections auto-generate structured data (JSON-LD FAQPage schema) for rich snippets.',
      'Internal links are auto-inserted to related published posts.',
      'Category labels on Blogger act as topic silos for topical authority.',
      'URL slugs are auto-generated from the title for clean permalink structure.',
      'Submit your Blogger sitemap to Google Search Console: yourblog.blogspot.com/sitemap.xml.',
    ],
  },
  {
    id: 'publishing-schedule',
    title: '6. Publishing automation',
    items: [
      'The scheduler spaces posts 1-2 per day to appear natural to search engines.',
      'Publishing times target US Eastern peak hours (8-11 AM, 2-4 PM).',
      'Use the Auto-schedule button on the Publish page or below to batch-schedule all approved posts.',
      'Failed publishes are tracked with retry capability from the Publish page.',
      'Blogger OAuth tokens auto-refresh when BLOGGER_REFRESH_TOKEN is configured.',
    ],
  },
  {
    id: 'weekly-routine',
    title: '7. Weekly operating routine',
    items: [
      'Monday: Add new keywords (10-15). Run pipeline bootstrap to create post records.',
      'Tuesday-Thursday: Generate drafts. Posts passing quality check auto-approve. Review any flagged posts manually.',
      'Friday: Run auto-schedule for approved posts. Check publish queue for failures.',
      'Saturday: Run quota evaluation. Process notifications. Check progress page.',
      'Sunday: Review weekly numbers. Plan next week\'s keyword targets. Run weekly summary notification.',
    ],
  },
  {
    id: 'env-reference',
    title: '8. Environment variables',
    items: [
      'GEMINI_API_KEY - Required for draft generation (from Google AI Studio)',
      'GEMINI_MODEL - Optional, defaults to gemini-2.5-flash',
      'BLOGGER_BLOG_ID - Required for publishing (from Blogger dashboard URL)',
      'BLOGGER_REFRESH_TOKEN - Recommended for auto-refreshing OAuth tokens',
      'GOOGLE_CLIENT_ID - Required with refresh token flow',
      'GOOGLE_CLIENT_SECRET - Required with refresh token flow',
      'BLOGGER_ACCESS_TOKEN - Alternative to refresh token (short-lived)',
      'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS - For email notifications',
      'ALERT_EMAIL_TO - Notification recipient',
      'ALERT_EMAIL_FROM - Notification sender address',
    ],
  },
  {
    id: 'troubleshooting',
    title: '9. Troubleshooting',
    items: [
      'Draft generation fails: Check GEMINI_API_KEY is set and valid. Check API quota in Google Cloud console.',
      'Blogger publish fails with 401: Access token expired. Set up refresh token flow or generate a new access token.',
      'Blogger publish fails with 403: Check that the Blogger API is enabled in your Google Cloud project.',
      'Quality score too low: Check reviewNotes on the post detail for specific failures.',
      'Notifications show SKIPPED: SMTP credentials are not configured. Set all SMTP_* variables.',
      'Migration errors: Run npx prisma@6.5.0 migrate dev if using Prisma 6.x schema format.',
    ],
  },
]

export default function PlaybookPage() {
  return (
    <div className="section-stack">
      <section className="panel">
        <p className="label">Table of contents</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {sections.map(s => (
            <a key={s.id} className="button-link" href={`#${s.id}`}>{s.title}</a>
          ))}
        </div>
      </section>

      {sections.map(section => (
        <section key={section.id} id={section.id} className="panel">
          <p className="label">{section.title}</p>
          <ul className="list">
            {section.items.map((item, i) => (
              <li key={i} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>

          {section.id === 'adsense-approval' ? (
            <div style={{ marginTop: 16 }}>
              <p className="label">Create required Blogger pages</p>
              <div className="actions">
                {Object.entries(REQUIRED_PAGES).map(([key, page]) => (
                  <form key={key} action={createRequiredPagesAction}>
                    <input type="hidden" name="pageKey" value={key} />
                    <button className="button-link" type="submit">
                      Create {page.title} page
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}

          {section.id === 'publishing-schedule' ? (
            <div style={{ marginTop: 16 }}>
              <form action={autoScheduleAction}>
                <button className="button-link primary" type="submit">
                  Auto-schedule all approved posts
                </button>
              </form>
            </div>
          ) : null}
        </section>
      ))}

      <section className="panel">
        <p className="label">Quick links</p>
        <div className="actions">
          <Link className="button-link primary" href="/dashboard/progress">View progress</Link>
          <Link className="button-link" href="/dashboard/keywords">Manage keywords</Link>
          <Link className="button-link" href="/dashboard/pipeline">Open pipeline</Link>
          <Link className="button-link" href="/dashboard/review">Review drafts</Link>
          <Link className="button-link" href="/dashboard/publish">Publish queue</Link>
          <Link className="button-link" href="/dashboard/settings">Settings</Link>
        </div>
      </section>
    </div>
  )
}
