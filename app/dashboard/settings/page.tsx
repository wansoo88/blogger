import { getMailerStatus } from '@/lib/integrations/mailer'
import { getSearchConsoleStatus } from '@/lib/integrations/search-console'
import { getAdSenseStatus } from '@/lib/integrations/adsense'

function settingRow(label: string, configured: boolean, value?: string | null) {
  return (
    <tr key={label}>
      <td>{label}</td>
      <td>
        <span
          className={configured ? 'badge' : 'badge badge-danger'}
          style={
            configured
              ? { background: 'rgba(15,118,110,0.1)', color: 'var(--accent)' }
              : undefined
          }
        >
          {configured ? '설정됨' : '미설정'}
        </span>
      </td>
      <td className="small-note">{value ?? '-'}</td>
    </tr>
  )
}

export default function SettingsPage() {
  const mailer = getMailerStatus()
  const searchConsole = getSearchConsoleStatus()
  const adsense = getAdSenseStatus()
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY)
  const bloggerBlogConfigured = Boolean(process.env.BLOGGER_BLOG_ID)
  const refreshTokenConfigured = Boolean(process.env.BLOGGER_REFRESH_TOKEN)
  const clientIdConfigured = Boolean(process.env.GOOGLE_CLIENT_ID)
  const clientSecretConfigured = Boolean(process.env.GOOGLE_CLIENT_SECRET)

  return (
    <div className="section-stack">
      <section className="panel">
        <p className="label">AI 초안 생성</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>항목</th>
                <th>상태</th>
                <th>값</th>
              </tr>
            </thead>
            <tbody>
              {settingRow(
                'GEMINI_API_KEY',
                geminiConfigured,
                geminiConfigured ? '설정됨' : null,
              )}
              {settingRow(
                'GEMINI_MODEL',
                true,
                process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <p className="label">Blogger 발행</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>항목</th>
                <th>상태</th>
                <th>값</th>
              </tr>
            </thead>
            <tbody>
              {settingRow(
                'BLOGGER_BLOG_ID',
                bloggerBlogConfigured,
                process.env.BLOGGER_BLOG_ID ?? null,
              )}
              {settingRow(
                'BLOGGER_REFRESH_TOKEN',
                refreshTokenConfigured,
                refreshTokenConfigured ? '설정됨 (자동 갱신)' : null,
              )}
              {settingRow(
                'BLOGGER_ACCESS_TOKEN',
                Boolean(process.env.BLOGGER_ACCESS_TOKEN),
                process.env.BLOGGER_ACCESS_TOKEN ? '설정됨 (정적)' : null,
              )}
              {settingRow(
                'GOOGLE_CLIENT_ID',
                clientIdConfigured,
                clientIdConfigured ? '설정됨' : null,
              )}
              {settingRow(
                'GOOGLE_CLIENT_SECRET',
                clientSecretConfigured,
                clientSecretConfigured ? '설정됨' : null,
              )}
            </tbody>
          </table>
        </div>
        <p className="small-note" style={{ marginTop: 12 }}>
          {refreshTokenConfigured
            ? 'OAuth refresh token이 설정되어 access token이 자동 갱신됩니다.'
            : 'BLOGGER_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET를 설정해 자동 갱신을 활성화하세요.'}
        </p>
      </section>

      <section className="panel">
        <p className="label">Search Console</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>항목</th>
                <th>상태</th>
                <th>값</th>
              </tr>
            </thead>
            <tbody>
              {settingRow(
                'SEARCH_CONSOLE_SITE_URL',
                Boolean(searchConsole.siteUrl),
                searchConsole.siteUrl,
              )}
              {settingRow(
                'OAuth 자격 증명',
                searchConsole.hasClientCredentials,
                searchConsole.hasClientCredentials ? '설정됨' : null,
              )}
            </tbody>
          </table>
        </div>
        <p className="small-note" style={{ marginTop: 12 }}>
          {searchConsole.configured
            ? 'Search Console이 연결되었습니다. SEO 모니터 페이지에서 동기화하세요.'
            : '.env.local에 SEARCH_CONSOLE_SITE_URL을 추가해 지표 동기화를 활성화하세요.'}
        </p>
      </section>

      <section className="panel">
        <p className="label">AdSense 수익 연동</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>항목</th>
                <th>상태</th>
                <th>값</th>
              </tr>
            </thead>
            <tbody>
              {settingRow(
                'ADSENSE_ACCOUNT_ID',
                Boolean(adsense.accountId),
                adsense.accountId,
              )}
              {settingRow(
                'Refresh token',
                adsense.hasRefreshToken,
                adsense.hasRefreshToken
                  ? 'GOOGLE_ADSENSE_REFRESH_TOKEN 또는 BLOGGER_REFRESH_TOKEN 사용'
                  : null,
              )}
              {settingRow(
                'OAuth 자격 증명',
                adsense.hasClientCredentials,
                adsense.hasClientCredentials ? '설정됨' : null,
              )}
            </tbody>
          </table>
        </div>
        <p className="small-note" style={{ marginTop: 12 }}>
          {adsense.configured
            ? 'AdSense Management API v2가 연결되었습니다. 수익 대시보드에서 동기화하세요.'
            : 'AdSense 승인 후 ADSENSE_ACCOUNT_ID를 설정하면 글별 수익(PAGE_URL 기준)이 자동 수집됩니다.'}
        </p>
      </section>

      <section className="panel">
        <p className="label">이메일 알림</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>항목</th>
                <th>상태</th>
                <th>값</th>
              </tr>
            </thead>
            <tbody>
              {settingRow('SMTP_HOST', mailer.configured, mailer.host)}
              {settingRow(
                'ALERT_EMAIL_FROM',
                Boolean(mailer.from),
                mailer.from,
              )}
              {settingRow(
                'ALERT_EMAIL_TO',
                Boolean(process.env.ALERT_EMAIL_TO),
                process.env.ALERT_EMAIL_TO ?? null,
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <p className="label">안내</p>
        <p className="small-note">
          모든 값은 <code className="code-inline">.env.local</code>에서 읽습니다. 이 페이지는 읽기 전용입니다.
          상세 설정 순서는 플레이북 페이지를 참고하세요.
        </p>
      </section>
    </div>
  )
}
