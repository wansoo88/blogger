const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

type GeminiGenerateArgs = {
  title: string
  keyword: string
  category: string
  country: string
}

type GeminiDraftResult = {
  model: string
  draft: string
  metaDescription: string
}

const CATEGORY_PROMPTS: Record<string, string> = {
  AI_PRODUCTIVITY: [
    'Focus on practical tool comparisons and workflow improvements.',
    'Include before/after scenarios showing time saved.',
    'Mention free tiers, pricing, and alternatives.',
    'Give step-by-step setup instructions readers can follow in under 10 minutes.',
  ].join('\n'),

  MONEY_SAVING: [
    'Lead with a specific dollar amount readers can save.',
    'Include at least one real calculation or comparison table.',
    'Cover both short-term savings and long-term financial impact.',
    'Add a "quick wins" section with actions that take under 5 minutes.',
  ].join('\n'),

  DIGITAL_HOWTO: [
    'Write numbered step-by-step instructions.',
    'Include common mistakes and how to avoid them.',
    'Add troubleshooting tips for each major step.',
    'Keep technical jargon minimal and explain any terms used.',
  ].join('\n'),

  TIME_MANAGEMENT: [
    'Start with a relatable daily scenario.',
    'Include a sample daily or weekly schedule.',
    'Focus on one technique at a time rather than listing many.',
    'Add metrics: hours saved per week, tasks completed per day.',
  ].join('\n'),

  HOME_ORGANIZATION: [
    'Structure around room-by-room or zone-by-zone approach.',
    'Include a supply list with approximate costs.',
    'Add before/after descriptions.',
    'Include maintenance routines to keep things organized.',
  ].join('\n'),

  WORK_TIPS: [
    'Ground advice in specific workplace situations.',
    'Include dialogue examples or email templates where relevant.',
    'Cover both remote and office settings.',
    'Focus on measurable outcomes.',
  ].join('\n'),
}

const WRITING_STYLE_RULES = [
  'Write like a knowledgeable friend sharing practical advice over coffee.',
  'Use short paragraphs (2-3 sentences max).',
  'Vary sentence length. Mix short punchy sentences with longer explanatory ones.',
  'Never use filler phrases like "In this article" or "Without further ado" or "In today\'s fast-paced world".',
  'Never use "game-changer", "unlock", "dive into", "harness", "leverage", "revolutionize", "cutting-edge".',
  'Do not start paragraphs with "So," or "Well," or "Now,".',
  'Do not use emojis anywhere in the text.',
  'Use specific numbers, dates, and examples instead of vague claims.',
  'When giving advice, explain WHY it works, not just WHAT to do.',
  'Include at least one personal-sounding anecdote or case study.',
  'End sections with actionable takeaways, not generic summaries.',
]

function buildDraftPrompt(args: GeminiGenerateArgs) {
  const categoryGuide = CATEGORY_PROMPTS[args.category] ?? CATEGORY_PROMPTS.AI_PRODUCTIVITY

  return [
    'Write a practical English blog post for a lifehack site.',
    '',
    `Target keyword: ${args.keyword}`,
    `Working title: ${args.title}`,
    `Category: ${args.category}`,
    `Target audience: ${args.country} readers looking to save time and money`,
    '',
    '--- STRUCTURE ---',
    '1. Opening hook (2-3 sentences that describe a problem the reader faces)',
    '2. Quick answer (1 paragraph giving the core solution upfront)',
    '3. Detailed walkthrough (step-by-step with numbered or bulleted lists)',
    '4. Real example or case study (use realistic names, numbers, timelines)',
    '5. Time or money saved section (concrete figures)',
    '6. FAQ section with 3-5 questions (use "## FAQ" as the heading)',
    '7. Brief closing paragraph with one clear next action',
    '',
    '--- CATEGORY GUIDELINES ---',
    categoryGuide,
    '',
    '--- WRITING STYLE ---',
    ...WRITING_STYLE_RULES,
    '',
    '--- CONSTRAINTS ---',
    '- Length: 1000 to 1500 words.',
    '- Do not give medical, legal, tax, loan, or investment advice.',
    '- Do not mention gambling, adult content, weapons, or illegal activities.',
    '- Output markdown only. No HTML tags.',
    '- Use ## for main headings, ### for sub-headings.',
    '- Do not include a title heading (the title is set separately).',
  ].join('\n')
}

function buildMetaDescriptionPrompt(title: string, keyword: string) {
  return [
    `Write a meta description for this blog post.`,
    `Title: ${title}`,
    `Keyword: ${keyword}`,
    '',
    'Rules:',
    '- 140 to 155 characters.',
    '- Include the target keyword naturally.',
    '- Write in active voice.',
    '- End with a benefit or call to action.',
    '- No emojis, no quotes, no special characters.',
    '- Output the meta description text only, nothing else.',
  ].join('\n')
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini request failed: ${response.status} ${text}`)
  }

  const json = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }

  const text = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('\n')
    .trim()

  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  return text
}

function stripEmojis(text: string): string {
  return text.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
    '',
  )
}

export async function generateDraftWithGemini(args: GeminiGenerateArgs): Promise<GeminiDraftResult> {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.')
  }

  const [draftRaw, metaRaw] = await Promise.all([
    callGemini(apiKey, model, buildDraftPrompt(args)),
    callGemini(apiKey, model, buildMetaDescriptionPrompt(args.title, args.keyword)),
  ])

  const draft = stripEmojis(draftRaw)
  const metaDescription = stripEmojis(metaRaw).slice(0, 160)

  return { model, draft, metaDescription }
}
