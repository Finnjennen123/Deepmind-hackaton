import { createNeonAuth } from '@neondatabase/auth/next/server'
import { NextRequest, NextResponse } from 'next/server'

const baseUrl = process.env.NEON_AUTH_BASE_URL
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET

// Only protect routes when Neon Auth is configured
const authMiddleware =
  baseUrl && cookieSecret
    ? createNeonAuth({
        baseUrl,
        cookies: { secret: cookieSecret },
      }).middleware({ loginUrl: '/auth/sign-in' })
    : null

export function middleware(request: NextRequest) {
  if (authMiddleware) {
    return authMiddleware(request)
  }
  return NextResponse.next()
}

export const config = {
  // Run on all routes except auth, api, and static assets
  matcher: ['/((?!auth|api|_next/static|_next/image|favicon.ico).*)'],
}
