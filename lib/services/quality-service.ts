import { db } from '@/lib/db'

export type QualityCheckResult = {
  passed: boolean
  score: number
  checks: {
    name: string
    passed: boolean
    detail: string
  }[]
  suggestions: string[]
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

const AI_CLICHE_OPENINGS = [
  /^in today'?s (world|age|era|fast)/i,
  /^in this article/i,
  /^are you looking for/i,
  /^have you ever wondered/i,
  /^in the digital age/i,
  /^in this comprehensive guide/i,
  /^in this blog post/i,
  /^welcome to (this|our|the)/i,
  /^let'?s dive (in|into)/i,
  /^if you'?re like most/i,
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

function checkKeywordDensity(text: string, keyword?: string): { passed: boolean, count: number } {
  if (!keyword) return { passed: true, count: 0 }
  const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
  const count = (text.match(regex) || []).length
  return { passed: count >= 3 && count <= 10, count }
}

function checkReadability(text: string): { passed: boolean, avgLength: number } {
  const sentences = text
    .replace(/#{1,6}\s+.*/g, '')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  if (sentences.length === 0) return { passed: false, avgLength: 0 }
  const totalWords = sentences.reduce((sum, s) => sum + countWords(s), 0)
  const avgLength = Math.round(totalWords / sentences.length)
  return { passed: avgLength >= 10 && avgLength <= 25, avgLength }
}

function checkDuplicateIntro(text: string): boolean {
  const firstLine = text.slice(0, 150).trim()
  return !AI_CLICHE_OPENINGS.some(p => p.test(firstLine))
}

const SUGGESTION_MAP: Record<string, string> = {
  word_count: 'Add more detailed explanations or examples to reach 800+ words',
  title_length: 'Adjust title to 30-70 characters for optimal SEO',
  faq_section: 'Add a FAQ section with 3-5 common questions about the topic',
  structured_headings: 'Break content into 3+ sections with H2 headings',
  prohibited_topics: 'Remove or rephrase medical/legal/financial advice language',
  adsense_policy: 'Remove mentions of gambling, adult, illegal content, weapons',
  keyword_density: 'Include the target keyword 3-10 times naturally throughout the text',
  readability: 'Break long sentences into shorter ones (target 10-25 words per sentence)',
  duplicate_intro: 'Start with a unique hook instead of generic AI openings like "In today\'s world"',
}

export function getImprovementSuggestions(checks: QualityCheckResult['checks']): string[] {
  return checks
    .filter(c => !c.passed)
    .map(c => SUGGESTION_MAP[c.name])
    .filter(Boolean)
}

export function runQualityCheck(title: string, markdown: string, keyword?: string): QualityCheckResult {
  const checks: QualityCheckResult['checks'] = []
  let totalScore = 0

  // word_count (15pt)
  const wordCount = countWords(markdown)
  const wordsPassed = wordCount >= 800
  checks.push({
    name: 'word_count',
    passed: wordsPassed,
    detail: `${wordCount} words (minimum 800)`,
  })
  if (wordsPassed) totalScore += 15

  // title_length (5pt)
  const titlePassed = checkTitleLength(title)
  checks.push({
    name: 'title_length',
    passed: titlePassed,
    detail: `${title.length} chars (target 30-70)`,
  })
  if (titlePassed) totalScore += 5

  // faq_section (10pt)
  const faqPassed = hasFaqSection(markdown)
  checks.push({
    name: 'faq_section',
    passed: faqPassed,
    detail: faqPassed ? 'FAQ section found' : 'No FAQ section detected',
  })
  if (faqPassed) totalScore += 10

  // structured_headings (15pt)
  const headingsPassed = hasStructuredHeadings(markdown)
  checks.push({
    name: 'structured_headings',
    passed: headingsPassed,
    detail: headingsPassed ? '3+ H2 headings found' : 'Fewer than 3 H2 headings',
  })
  if (headingsPassed) totalScore += 15

  // prohibited_topics (15pt)
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

  // adsense_policy (15pt)
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

  // keyword_density (10pt)
  const { passed: keywordPassed, count: keywordCount } = checkKeywordDensity(markdown, keyword)
  checks.push({
    name: 'keyword_density',
    passed: keywordPassed,
    detail: keyword
      ? `"${keyword}" appears ${keywordCount} times (target 3-10)`
      : 'No keyword provided, skipped',
  })
  if (keywordPassed) totalScore += 10

  // readability (10pt)
  const { passed: readabilityPassed, avgLength } = checkReadability(markdown)
  checks.push({
    name: 'readability',
    passed: readabilityPassed,
    detail: `Avg sentence length: ${avgLength} words (target 10-25)`,
  })
  if (readabilityPassed) totalScore += 10

  // duplicate_intro (5pt)
  const introPassed = checkDuplicateIntro(markdown)
  checks.push({
    name: 'duplicate_intro',
    passed: introPassed,
    detail: introPassed
      ? 'Original intro detected'
      : 'Starts with generic AI-style opening',
  })
  if (introPassed) totalScore += 5

  const allCriticalPassed = prohibitedPassed && adsensePassed && wordsPassed
  const passed = allCriticalPassed && totalScore >= 85

  const suggestions = getImprovementSuggestions(checks)

  return { passed, score: totalScore, checks, suggestions }
}

export async function checkPostQuality(postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { keyword: true },
  })

  if (!post || !post.draftMarkdown) {
    return { passed: false, score: 0, checks: [], suggestions: [], error: 'Post or draft not found' }
  }

  const result = runQualityCheck(post.title, post.draftMarkdown, post.keyword?.keyword)

  const failedLines = result.checks
    .filter(c => !c.passed)
    .map(c => `[FAIL] ${c.name}: ${c.detail}`)
  const passedLines = result.checks
    .filter(c => c.passed)
    .map(c => `[PASS] ${c.name}: ${c.detail}`)
  const suggestionLines = result.suggestions.length
    ? ['', '--- Improvement suggestions ---', ...result.suggestions.map(s => `- ${s}`)]
    : []

  await db.post.update({
    where: { id: postId },
    data: {
      aiScore: result.score,
      reviewNotes: [...failedLines, ...passedLines, ...suggestionLines].join('\n'),
    },
  })

  return result
}
