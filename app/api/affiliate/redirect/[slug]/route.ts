import { NextRequest, NextResponse } from 'next/server'
import { recordAffiliateClick } from '@/lib/services/affiliate-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const link = await recordAffiliateClick({
    slug,
    referer: request.headers.get('referer'),
    userAgent: request.headers.get('user-agent'),
    country: request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry'),
  })

  if (!link) {
    return NextResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: '활성화된 제휴 링크를 찾을 수 없습니다.',
        },
      },
      { status: 404 },
    )
  }

  return NextResponse.redirect(link.targetUrl, 302)
}
