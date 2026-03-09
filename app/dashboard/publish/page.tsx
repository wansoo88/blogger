import { PostStatus } from '@prisma/client'
import { autoScheduleAction, publishPostAction, schedulePostAction } from '@/app/actions'
import { getPublishPosts } from '@/lib/services/post-service'

export default async function PublishPage() {
  const posts = await getPublishPosts()
  const approvedCount = posts.filter(p => p.status === PostStatus.APPROVED).length

  return (
    <div className="section-stack">
      {approvedCount > 0 ? (
        <section className="panel">
          <div className="topbar">
            <div>
              <p className="label">Auto-schedule</p>
              <p>{approvedCount} approved post(s) ready. Auto-schedule assigns 1-2 per day at US peak hours.</p>
            </div>
            <form action={autoScheduleAction}>
              <button className="button-link primary" type="submit">
                Auto-schedule {approvedCount} post(s)
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <p className="label">Publish queue</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <strong>{post.title}</strong>
                    <div className="small-note">{post.keyword?.keyword ?? 'No keyword'}</div>
                  </td>
                  <td>
                    <span className={
                      post.status === 'PUBLISHED' ? 'badge'
                        : post.status === 'SCHEDULED' ? 'badge badge-warn'
                          : 'badge'
                    } style={
                      post.status === 'PUBLISHED'
                        ? { background: 'rgba(15,118,110,0.1)', color: 'var(--accent)' }
                        : undefined
                    }>
                      {post.status}
                    </span>
                  </td>
                  <td className="small-note">
                    {post.publishJobs[0]?.scheduledFor
                      ? new Date(post.publishJobs[0].scheduledFor).toLocaleString()
                      : 'Not scheduled'}
                  </td>
                  <td>{post.aiScore ?? '-'}</td>
                  <td>
                    <div className="actions">
                      {post.status === PostStatus.APPROVED ? (
                        <form action={schedulePostAction} className="inline-form">
                          <input type="hidden" name="postId" value={post.id} />
                          <input className="input" name="scheduledFor" type="datetime-local" required />
                          <button className="button-link primary" type="submit">
                            Schedule
                          </button>
                        </form>
                      ) : null}
                      {post.status === PostStatus.SCHEDULED ? (
                        <form action={publishPostAction}>
                          <input type="hidden" name="postId" value={post.id} />
                          <button className="button-link" type="submit">
                            Publish to Blogger
                          </button>
                        </form>
                      ) : null}
                      {post.status === PostStatus.PUBLISHED && post.bloggerUrl ? (
                        <a className="button-link" href={post.bloggerUrl} target="_blank" rel="noopener">
                          Open live post
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!posts.length ? (
                <tr>
                  <td colSpan={5}>No posts in the publish queue. Approve posts from the Review or Pipeline page.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
