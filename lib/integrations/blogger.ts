function stripEmojis(text: string): string {
  return text.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
    '',
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function processInlineFormatting(line: string): string {
  return line
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}

function markdownToHtml(markdown: string): string {
  const cleaned = stripEmojis(markdown)
  const lines = cleaned.split('\n')
  const htmlParts: string[] = []
  let inList = false
  let listType: 'ul' | 'ol' = 'ul'

  function closeList() {
    if (inList) {
      htmlParts.push(listType === 'ul' ? '</ul>' : '</ol>')
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()

    if (!line.trim()) {
      closeList()
      continue
    }

    if (line.startsWith('### ')) {
      closeList()
      htmlParts.push(`<h3>${processInlineFormatting(escapeHtml(line.slice(4)))}</h3>`)
      continue
    }

    if (line.startsWith('## ')) {
      closeList()
      htmlParts.push(`<h2>${processInlineFormatting(escapeHtml(line.slice(3)))}</h2>`)
      continue
    }

    if (line.startsWith('# ')) {
      closeList()
      htmlParts.push(`<h2>${processInlineFormatting(escapeHtml(line.slice(2)))}</h2>`)
      continue
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)/)
    if (unorderedMatch) {
      if (!inList || listType !== 'ul') {
        closeList()
        htmlParts.push('<ul>')
        inList = true
        listType = 'ul'
      }
      htmlParts.push(`<li>${processInlineFormatting(escapeHtml(unorderedMatch[1]))}</li>`)
      continue
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)/)
    if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        closeList()
        htmlParts.push('<ol>')
        inList = true
        listType = 'ol'
      }
      htmlParts.push(`<li>${processInlineFormatting(escapeHtml(orderedMatch[1]))}</li>`)
      continue
    }

    closeList()
    htmlParts.push(`<p>${processInlineFormatting(escapeHtml(line))}</p>`)
  }

  closeList()
  return htmlParts.join('\n')
}

function buildFaqSchema(markdown: string): string | null {
  const faqStart = markdown.search(/^#{1,3}\s*FAQ/im)
  if (faqStart === -1) return null

  const faqSection = markdown.slice(faqStart)
  const qaPattern = /(?:^#{1,4}\s*(.+\?)\s*$|^\*\*(.+\?)\*\*\s*$|^Q\d*[:.]\s*(.+\?)\s*$)\n+([\s\S]*?)(?=\n(?:#{1,4}\s|Q\d*[:.]\s|\*\*.*\?\*\*|$))/gim
  const entries: { question: string; answer: string }[] = []

  let match
  while ((match = qaPattern.exec(faqSection)) !== null) {
    const question = (match[1] || match[2] || match[3] || '').trim()
    const answer = match[4]?.trim().replace(/\n+/g, ' ') || ''
    if (question && answer) {
      entries.push({ question, answer })
    }
  }

  if (!entries.length) {
    const lines = faqSection.split('\n').filter(l => l.trim())
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim()
      if (line.endsWith('?')) {
        const q = line.replace(/^[#*\d.:\-\s]+/, '').replace(/\*\*/g, '').trim()
        const a = lines[i + 1]?.trim().replace(/^[#*\d.:\-\s]+/, '').replace(/\*\*/g, '').trim()
        if (q && a && !a.endsWith('?')) {
          entries.push({ question: q, answer: a })
          i++
        }
      }
    }
  }

  if (!entries.length) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(e => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.answer,
      },
    })),
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = process.env.BLOGGER_REFRESH_TOKEN
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    const staticToken = process.env.BLOGGER_ACCESS_TOKEN
    if (staticToken) return staticToken
    throw new Error('No Blogger authentication configured. Set BLOGGER_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET, or BLOGGER_ACCESS_TOKEN.')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token refresh failed: ${response.status} ${text}`)
  }

  const json = (await response.json()) as { access_token?: string }
  if (!json.access_token) {
    throw new Error('Token refresh returned no access_token.')
  }

  return json.access_token
}

export async function publishPostToBlogger(args: {
  title: string
  contentMarkdown: string
  labels: string[]
  metaDescription?: string
}) {
  const blogId = process.env.BLOGGER_BLOG_ID

  if (!blogId) {
    throw new Error('BLOGGER_BLOG_ID is not configured.')
  }

  const accessToken = await refreshAccessToken()
  const htmlContent = markdownToHtml(args.contentMarkdown)
  const faqSchema = buildFaqSchema(args.contentMarkdown)
  const fullContent = faqSchema ? htmlContent + '\n' + faqSchema : htmlContent

  const response = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?isDraft=false`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: stripEmojis(args.title),
        content: fullContent,
        labels: args.labels,
      }),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Blogger publish failed: ${response.status} ${text}`)
  }

  const json = (await response.json()) as {
    id?: string
    url?: string
  }

  return {
    bloggerPostId: json.id ?? null,
    bloggerUrl: json.url ?? null,
  }
}

export async function createBloggerPage(args: {
  title: string
  contentHtml: string
}) {
  const blogId = process.env.BLOGGER_BLOG_ID
  if (!blogId) {
    throw new Error('BLOGGER_BLOG_ID is not configured.')
  }

  const accessToken = await refreshAccessToken()

  const response = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/pages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: args.title,
        content: args.contentHtml,
      }),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Blogger page creation failed: ${response.status} ${text}`)
  }

  const json = (await response.json()) as { id?: string; url?: string }
  return { pageId: json.id ?? null, pageUrl: json.url ?? null }
}

export const REQUIRED_PAGES = {
  about: {
    title: 'About',
    html: `<h2>About My Life Hack Daily</h2>
<p>My Life Hack Daily is a practical resource for busy workers and households looking to save time and money. We cover productivity tools, money-saving strategies, digital how-tos, and home organization tips.</p>
<p>Our goal is to provide actionable advice you can use right away. Every article focuses on real solutions with specific steps, tools, and numbers.</p>
<h3>What We Cover</h3>
<ul>
<li>AI and productivity tools for everyday work</li>
<li>Practical money-saving techniques with real calculations</li>
<li>Step-by-step digital guides and tutorials</li>
<li>Time management methods that fit real schedules</li>
<li>Home organization systems that stay organized</li>
</ul>
<h3>Contact</h3>
<p>Questions or suggestions? Reach out at <a href="mailto:kimcomplete8888@gmail.com">kimcomplete8888@gmail.com</a></p>`,
  },

  contact: {
    title: 'Contact Us',
    html: `<h2>Contact Us</h2>
<p>We appreciate your feedback and questions. Here is how to reach us:</p>
<ul>
<li>Email: <a href="mailto:kimcomplete8888@gmail.com">kimcomplete8888@gmail.com</a></li>
</ul>
<p>We typically respond within 2 business days. For content suggestions or corrections, please include the article URL in your message.</p>`,
  },

  privacy: {
    title: 'Privacy Policy',
    html: `<h2>Privacy Policy</h2>
<p>Last updated: ${new Date().toISOString().split('T')[0]}</p>
<h3>Information We Collect</h3>
<p>This site uses Google Analytics and Google AdSense. These services may collect anonymized usage data such as pages visited, time on site, and general geographic location.</p>
<h3>Cookies</h3>
<p>Google AdSense and Analytics use cookies to serve relevant ads and track site usage. You can control cookies through your browser settings.</p>
<h3>Third-Party Services</h3>
<ul>
<li>Google AdSense: <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener">Ad policies</a></li>
<li>Google Analytics: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Privacy policy</a></li>
</ul>
<h3>Your Rights</h3>
<p>You may request deletion of any personal data by contacting us at kimcomplete8888@gmail.com.</p>
<h3>Changes</h3>
<p>We may update this policy periodically. Changes will be posted on this page with an updated date.</p>`,
  },

  disclaimer: {
    title: 'Disclaimer',
    html: `<h2>Disclaimer</h2>
<p>The information on My Life Hack Daily is provided for general informational purposes only. While we strive to keep content accurate and up to date, we make no guarantees about completeness or reliability.</p>
<h3>Not Professional Advice</h3>
<p>Content on this site does not constitute medical, legal, financial, tax, or investment advice. Always consult a qualified professional for decisions in these areas.</p>
<h3>Affiliate Links and Ads</h3>
<p>This site may contain affiliate links and display ads through Google AdSense. We may earn a commission from qualifying purchases at no extra cost to you.</p>
<h3>Product Mentions</h3>
<p>Product names, prices, and features mentioned are accurate at the time of writing but may change. We recommend verifying current details before making purchase decisions.</p>`,
  },
}
