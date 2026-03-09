import { getMailerStatus } from '@/lib/integrations/mailer'
import { getSearchConsoleStatus } from '@/lib/integrations/search-console'

function settingRow(label: string, configured: boolean, value?: string | null) {
  return (
    <tr key={label}>
      <td>{label}</td>
      <td>
        <span className={configured ? 'badge' : 'badge badge-danger'}
          style={configured ? { background: 'rgba(15,118,110,0.1)', color: 'var(--accent)' } : undefined}>
          {configured ? 'configured' : 'missing'}
        </span>
      </td>
      <td className="small-note">{value ?? '-'}</td>
    </tr>
  )
}

export default function SettingsPage() {
  const mailer = getMailerStatus()
  const searchConsole = getSearchConsoleStatus()
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY)
  const bloggerBlogConfigured = Boolean(process.env.BLOGGER_BLOG_ID)
  const refreshTokenConfigured = Boolean(process.env.BLOGGER_REFRESH_TOKEN)
  const clientIdConfigured = Boolean(process.env.GOOGLE_CLIENT_ID)
  const clientSecretConfigured = Boolean(process.env.GOOGLE_CLIENT_SECRET)

  return (
    <div className="section-stack">
      <section className="panel">
        <p className="label">AI draft generation</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Setting</th><th>Status</th><th>Value</th></tr>
            </thead>
            <tbody>
              {settingRow('GEMINI_API_KEY', geminiConfigured, geminiConfigured ? 'set' : null)}
              {settingRow('GEMINI_MODEL', true, process.env.GEMINI_MODEL ?? 'gemini-2.5-flash')}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <p className="label">Blogger publishing</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Setting</th><th>Status</th><th>Value</th></tr>
            </thead>
            <tbody>
              {settingRow('BLOGGER_BLOG_ID', bloggerBlogConfigured, process.env.BLOGGER_BLOG_ID ?? null)}
              {settingRow('BLOGGER_REFRESH_TOKEN', refreshTokenConfigured, refreshTokenConfigured ? 'set (auto-refresh)' : null)}
              {settingRow('BLOGGER_ACCESS_TOKEN', Boolean(process.env.BLOGGER_ACCESS_TOKEN), process.env.BLOGGER_ACCESS_TOKEN ? 'set (static)' : null)}
              {settingRow('GOOGLE_CLIENT_ID', clientIdConfigured, clientIdConfigured ? 'set' : null)}
              {settingRow('GOOGLE_CLIENT_SECRET', clientSecretConfigured, clientSecretConfigured ? 'set' : null)}
            </tbody>
          </table>
        </div>
        <p className="small-note" style={{ marginTop: 12 }}>
          {refreshTokenConfigured
            ? 'OAuth refresh token configured. Access tokens auto-renew.'
            : 'Set BLOGGER_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET for auto-refresh.'}
        </p>
      </section>

      <section className="panel">
        <p className="label">Search Console</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Setting</th><th>Status</th><th>Value</th></tr>
            </thead>
            <tbody>
              {settingRow('SEARCH_CONSOLE_SITE_URL', Boolean(searchConsole.siteUrl), searchConsole.siteUrl)}
              {settingRow('OAuth credentials', searchConsole.hasClientCredentials, searchConsole.hasClientCredentials ? 'set' : null)}
            </tbody>
          </table>
        </div>
        <p className="small-note" style={{ marginTop: 12 }}>
          {searchConsole.configured
            ? 'Search Console configured. Use Monitor page to sync metrics.'
            : 'Add SEARCH_CONSOLE_SITE_URL to .env.local to enable metrics sync.'}
        </p>
      </section>

      <section className="panel">
        <p className="label">Email notifications</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Setting</th><th>Status</th><th>Value</th></tr>
            </thead>
            <tbody>
              {settingRow('SMTP_HOST', mailer.configured, mailer.host)}
              {settingRow('ALERT_EMAIL_FROM', Boolean(mailer.from), mailer.from)}
              {settingRow('ALERT_EMAIL_TO', Boolean(process.env.ALERT_EMAIL_TO), process.env.ALERT_EMAIL_TO ?? null)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <p className="label">About</p>
        <p className="small-note">
          All values are read from .env.local. This page is read-only.
          See the Playbook page for detailed setup instructions.
        </p>
      </section>
    </div>
  )
}
