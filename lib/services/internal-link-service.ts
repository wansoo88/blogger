import { db } from '@/lib/db'

export async function getRelatedPublishedPosts(postId: string, limit = 3) {
  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post) return []

  const related = await db.post.findMany({
    where: {
      id: { not: postId },
      status: 'PUBLISHED',
      bloggerUrl: { not: null },
      category: post.category,
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      bloggerUrl: true,
      category: true,
    },
  })

  if (related.length < limit) {
    const otherCategory = await db.post.findMany({
      where: {
        id: { notIn: [postId, ...related.map(r => r.id)] },
        status: 'PUBLISHED',
        bloggerUrl: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit - related.length,
      select: {
        id: true,
        title: true,
        bloggerUrl: true,
        category: true,
      },
    })
    related.push(...otherCategory)
  }

  return related
}

export function insertInternalLinks(
  markdown: string,
  links: { title: string; bloggerUrl: string | null }[],
): string {
  if (!links.length) return markdown

  const validLinks = links.filter(l => l.bloggerUrl)
  if (!validLinks.length) return markdown

  const linkSection = [
    '',
    '## Related Posts',
    '',
    ...validLinks.map(l => `- [${l.title}](${l.bloggerUrl})`),
    '',
  ].join('\n')

  const existingRelated = markdown.match(/^##\s*(Related|You Might Also|See Also)/im)
  if (existingRelated) return markdown

  return markdown.trimEnd() + '\n' + linkSection
}

export async function addInternalLinksToPost(postId: string) {
  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post || !post.draftMarkdown) return null

  const related = await getRelatedPublishedPosts(postId)
  if (!related.length) return post

  const updated = insertInternalLinks(post.draftMarkdown, related)
  const linkCount = related.filter(r => r.bloggerUrl).length

  return db.post.update({
    where: { id: postId },
    data: {
      draftMarkdown: updated,
      internalLinkCount: linkCount,
    },
  })
}
