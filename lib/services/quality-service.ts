import { db } from '@/lib/db'

type QualityCheckResult = {
  passed: boolean
  score: number
  checks: {
    name: string
    passed: boolean
    detail: string
  }[]
}

const PROHIBITED_PATTERNS = [
  /\bdiagnos(e|is|tic)\b/i,
  /\bprescri(be|ption)\b/i,
  /\bmedical\s+advice\b/i,
  /\blegal\s+advice\b/i,
  /\btax\s+advice\b/i,
  /\binvestment\s+advice\b/i,
  /\bloan\s+advi(ce|sor)\b/i,
  /\bconsult\s+(a|your)\s+(doctor|lawyer|physician|attorney)\b/i,
]

const ADSENSE_VIOLATION_PATTERNS = [
  /\bcasino\b/i,
  /\bgambling\b/i,
  /\badult\s+content\b/i,
  /\billegal\b/i,
  /\bdrug(s)?\s+(use|abuse)\b/i,
  /\bweapon(s)?\b/i,
  /\bhacking\s+tool\b/i,
  /\bcrack(ed|ing)?\s+(software|key)\b/i,
]

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function hasFaqSection(text: string): boolean {
  const faqPatterns = [
    /^#{1,3}\s*FAQ/im,
    /^#{1,3}\s*Frequently\s+Asked/im,
    /^#{1,3}\s*Common\s+Questions/im,
    /\*\*Q:/im,
    /^Q\d*[:.]/im,
  ]
  return faqPatterns.some(p => p.test(text))
}

function hasStructuredHeadings(text: string): boolean {
  const h2Count = (text.match(/^##\s+/gm) || []).length
  return h2Count >= 3
}

function checkTitleLength(title: string): boolean {
  return title.length >= 30 && title.length <= 70
}

function hasProhibitedContent(text: string): string[] {
  return PROHIBITED_PATTERNS
    .filter(p => p.test(text))
    .map(p => p.source)
}

function hasAdsenseViolations(text: string): string[] {
  return ADSENSE_VIOLATION_PATTERNS
    .filter(p => p.test(text))
    .map(p => p.source)
}

function countEmojis(text: string): number {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu
  return (text.match(emojiRegex) || []).length
}

export function runQualityCheck(title: string, markdown: string): QualityCheckResult {
  const checks: QualityCheckResult['checks'] = []
  let totalScore = 0

  const wordCount = countWords(markdown)
  const wordsPassed = wordCount >= 800
  checks.push({
    name: 'word_count',
    passed: wordsPassed,
    detail: `${wordCount} words (minimum 800)`,
  })
  if (wordsPassed) totalScore += 20

  const titlePassed = checkTitleLength(title)
  checks.push({
    name: 'title_length',
    passed: titlePassed,
    detail: `${title.length} chars (target 30-70)`,
  })
  if (titlePassed) totalScore += 10

  const faqPassed = hasFaqSection(markdown)
  checks.push({
    name: 'faq_section',
    passed: faqPassed,
    detail: faqPassed ? 'FAQ section found' : 'No FAQ section detected',
  })
  if (faqPassed) totalScore += 15

  const headingsPassed = hasStructuredHeadings(markdown)
  checks.push({
    name: 'structured_headings',
    passed: headingsPassed,
    detail: headingsPassed ? '3+ H2 headings found' : 'Fewer than 3 H2 headings',
  })
  if (headingsPassed) totalScore += 15

  const prohibited = hasProhibitedContent(markdown)
  const prohibitedPassed = prohibited.length === 0
  checks.push({
    name: 'prohibited_topics',
    passed: prohibitedPassed,
    detail: prohibitedPassed
      ? 'No prohibited topics found'
      : `Found: ${prohibited.join(', ')}`,
  })
  if (prohibitedPassed) totalScore += 15

  const adsenseIssues = hasAdsenseViolations(markdown)
  const adsensePassed = adsenseIssues.length === 0
  checks.push({
    name: 'adsense_policy',
    passed: adsensePassed,
    detail: adsensePassed
      ? 'No AdSense policy violations'
      : `Violations: ${adsenseIssues.join(', ')}`,
  })
  if (adsensePassed) totalScore += 15

  const emojiCount = countEmojis(markdown)
  const emojiPassed = emojiCount <= 3
  checks.push({
    name: 'emoji_limit',
    passed: emojiPassed,
    detail: `${emojiCount} emojis found (max 3)`,
  })
  if (emojiPassed) totalScore += 10

  const allCriticalPassed = prohibitedPassed && adsensePassed && wordsPassed
  const passed = allCriticalPassed && totalScore >= 70

  return { passed, score: totalScore, checks }
}

export async function checkPostQuality(postId: string) {
  const post = await db.post.findUnique({ where: { id: postId } })

  if (!post || !post.draftMarkdown) {
    return { passed: false, score: 0, checks: [], error: 'Post or draft not found' }
  }

  const result = runQualityCheck(post.title, post.draftMarkdown)

  await db.post.update({
    where: { id: postId },
    data: {
      aiScore: result.score,
      reviewNotes: result.checks
        .map(c => `[${c.passed ? 'PASS' : 'FAIL'}] ${c.name}: ${c.detail}`)
        .join('\n'),
    },
  })

  return result
}
